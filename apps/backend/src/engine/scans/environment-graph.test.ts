import { describe, expect, it } from "vitest";
import { buildEnvironmentGraphFromScope } from "./environment-graph.js";

describe("buildEnvironmentGraphFromScope", () => {
  it("creates host, subnet, service, and reachability edges from an environment scope", () => {
    const graph = buildEnvironmentGraphFromScope("scan-1", {
      environmentName: "Prod",
      targets: ["10.0.0.0/24", "https://app.example.com"],
      exclusions: [],
      trustZones: [{ id: "dmz", name: "DMZ", hosts: ["app.example.com"] }],
      connectivity: [{ from: "app.example.com", to: "db.internal", port: 5432, protocol: "tcp", evidence: "declared route" }],
      layers: ["L3", "L4", "L5"],
      maxDepth: 3,
      maxDurationMinutes: 15,
      rateLimitRps: 5,
      allowActiveExploits: false,
      graceEnabled: true,
      graceRoundInterval: 3,
      cyberRangeMode: "live"
    });

    expect(graph.nodes.some((node) => node.type === "subnet" && node.host === "10.0.0.0/24")).toBe(true);
    expect(graph.nodes.some((node) => node.type === "host" && node.host === "app.example.com")).toBe(true);
    expect(graph.nodes.some((node) => node.type === "service" && node.host === "db.internal:5432/tcp")).toBe(true);
    expect(graph.nodes.every((node) => node.id.startsWith("scan-1:"))).toBe(true);
    expect(graph.edges.some((edge) => edge.edgeType === "reaches" && edge.evidence === "declared route")).toBe(true);
    expect(graph.edges.some((edge) => edge.edgeType === "hosts")).toBe(true);
  });

  it("namespaces node ids per scan so repeated scopes do not collide", () => {
    const scope = {
      environmentName: "Prod",
      targets: ["https://app.example.com"],
      exclusions: [],
      trustZones: [],
      connectivity: [{ from: "app.example.com", to: "db.internal", port: 5432, protocol: "tcp" as const }],
      layers: ["L3", "L4", "L5"],
      maxDepth: 3,
      maxDurationMinutes: 15,
      rateLimitRps: 5,
      allowActiveExploits: false,
      graceEnabled: true,
      graceRoundInterval: 3,
      cyberRangeMode: "live" as const
    };

    const graphA = buildEnvironmentGraphFromScope("scan-a", scope);
    const graphB = buildEnvironmentGraphFromScope("scan-b", scope);

    const graphBNodeIds = new Set(graphB.nodes.map((node) => node.id));
    expect(graphA.nodes.some((node) => graphBNodeIds.has(node.id))).toBe(false);
    expect(graphA.edges.every((edge) => edge.from.startsWith("scan-a:") && edge.to.startsWith("scan-a:"))).toBe(true);
    expect(graphB.edges.every((edge) => edge.from.startsWith("scan-b:") && edge.to.startsWith("scan-b:"))).toBe(true);
  });
});
