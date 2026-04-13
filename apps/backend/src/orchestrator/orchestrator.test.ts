import { describe, expect, it, vi } from "vitest";
import type { DfsNode, Observation } from "@synosec/contracts";
import { Orchestrator } from "./orchestrator.js";

vi.mock("../db/neo4j.js", async () => {
  const actual = await vi.importActual("../db/neo4j.js");
  return {
    ...actual,
    getVulnerabilityChains: vi.fn().mockResolvedValue([]),
    boostNodeRiskScore: vi.fn().mockResolvedValue(undefined),
    createAuditEntry: vi.fn().mockResolvedValue(undefined),
    createFinding: vi.fn().mockResolvedValue(undefined),
    getFindingsForScan: vi.fn().mockResolvedValue([]),
    linkDiscoveredNodes: vi.fn().mockResolvedValue(undefined),
    updateNodeStatus: vi.fn().mockResolvedValue(undefined),
    updateScanStatus: vi.fn().mockResolvedValue(undefined)
  };
});

function makeNode(overrides: Partial<DfsNode> = {}): DfsNode {
  return {
    id: "node-1",
    scanId: "scan-1",
    target: "staging.synosec.local",
    layer: "L4",
    riskScore: 0.5,
    status: "pending",
    parentId: null,
    depth: 0,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

function makeObservation(overrides: Partial<Observation> = {}): Observation {
  return {
    id: "obs-1",
    scanId: "scan-1",
    nodeId: "node-1",
    toolRunId: "run-1",
    adapter: "service_scan",
    target: "staging.synosec.local",
    port: 443,
    key: "open-port:443",
    title: "Open HTTPS service on 443",
    summary: "https is reachable on staging.synosec.local:443.",
    severity: "info",
    confidence: 0.93,
    evidence: "443/tcp open https",
    technique: "TCP SYN scan",
    relatedKeys: [],
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

describe("Orchestrator service-driven expansion", () => {
  it("derives child nodes from observed open services instead of fixed templates", () => {
    const orchestrator = new Orchestrator(() => undefined, { provider: "local" });

    const children = (orchestrator as unknown as {
      deriveChildNodes: (node: DfsNode, observations: Observation[]) => DfsNode[];
    }).deriveChildNodes(makeNode(), [
      makeObservation({ port: 22, title: "Open SSH service on 22" }),
      makeObservation({ port: 443, title: "Open HTTPS service on 443" }),
      makeObservation({ port: 5432, title: "Open POSTGRESQL service on 5432" })
    ]);

    expect(children).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ layer: "L5", service: "ssh", port: 22 }),
        expect.objectContaining({ layer: "L6", service: "https", port: 443 }),
        expect.objectContaining({ layer: "L7", service: "https", port: 443 }),
        expect.objectContaining({ layer: "L7", service: "postgresql", port: 5432 })
      ])
    );
    expect(children).toHaveLength(4);
  });

  it("does not derive children for non-L4 nodes", () => {
    const orchestrator = new Orchestrator(() => undefined, { provider: "local" });

    const children = (orchestrator as unknown as {
      deriveChildNodes: (node: DfsNode, observations: Observation[]) => DfsNode[];
    }).deriveChildNodes(makeNode({ layer: "L7" }), [makeObservation()]);

    expect(children).toEqual([]);
  });

  it("never rediscoveres an already known path", async () => {
    const orchestrator = new Orchestrator(() => undefined, { provider: "local" });
    const child = {
      target: "staging.synosec.local",
      layer: "L7" as const,
      service: "https",
      port: 443,
      riskScore: 0.68,
      status: "pending" as const,
      depth: 1
    };

    const registerPathCandidate = (orchestrator as unknown as {
      registerPathCandidate: (
        scanId: string,
        parentNodeId: string,
        node: typeof child,
        evidenceKey: string
      ) => Promise<{ outcome: string; nodeId: string }>;
    }).registerPathCandidate.bind(orchestrator);

    const first = await registerPathCandidate("scan-1", "parent-1", child, "evidence-a");
    const duplicate = await registerPathCandidate("scan-1", "parent-2", child, "evidence-a");
    const samePathWithNewEvidence = await registerPathCandidate("scan-1", "parent-3", child, "evidence-b");

    expect(first.outcome).toBe("new");
    expect(duplicate.outcome).toBe("linked");
    expect(duplicate.nodeId).toBe(first.nodeId);
    expect(samePathWithNewEvidence.outcome).toBe("linked");
    expect(samePathWithNewEvidence.nodeId).toBe(first.nodeId);
  });
});
