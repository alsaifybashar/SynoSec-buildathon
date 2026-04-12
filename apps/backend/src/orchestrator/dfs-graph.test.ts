import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DfsNode } from "@synosec/contracts";

// ---------------------------------------------------------------------------
// Mock Neo4j module before importing DfsQueue
// ---------------------------------------------------------------------------

const mockCreateDfsNode = vi.fn<(node: DfsNode) => Promise<void>>().mockResolvedValue(undefined);
const mockGetNextPendingNode = vi.fn<(scanId: string, maxDepth: number) => Promise<DfsNode | null>>();

vi.mock("../db/neo4j.js", () => ({
  createDfsNode: mockCreateDfsNode,
  getNextPendingNode: mockGetNextPendingNode
}));

// Import AFTER mocking
const { DfsQueue } = await import("./dfs-graph.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeNode(overrides: Partial<DfsNode> = {}): DfsNode {
  return {
    id: "node-1",
    scanId: "scan-1",
    target: "192.168.1.10",
    layer: "L3",
    riskScore: 0.5,
    status: "pending",
    parentId: null,
    depth: 0,
    createdAt: new Date().toISOString(),
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DfsQueue", () => {
  let queue: InstanceType<typeof DfsQueue>;

  beforeEach(() => {
    vi.clearAllMocks();
    queue = new DfsQueue();
  });

  describe("enqueue", () => {
    it("calls createDfsNode with the given node", async () => {
      const node = makeNode({ id: "test-node", scanId: "scan-abc" });

      await queue.enqueue(node);

      expect(mockCreateDfsNode).toHaveBeenCalledOnce();
      expect(mockCreateDfsNode).toHaveBeenCalledWith(node);
    });

    it("enqueues multiple nodes without error", async () => {
      const nodes = [
        makeNode({ id: "n1", riskScore: 0.9 }),
        makeNode({ id: "n2", riskScore: 0.5 }),
        makeNode({ id: "n3", riskScore: 0.3 })
      ];

      for (const node of nodes) {
        await queue.enqueue(node);
      }

      expect(mockCreateDfsNode).toHaveBeenCalledTimes(3);
    });
  });

  describe("dequeue", () => {
    it("returns the highest riskScore pending node", async () => {
      const highRiskNode = makeNode({ id: "high-risk", riskScore: 0.9 });
      mockGetNextPendingNode.mockResolvedValueOnce(highRiskNode);

      const result = await queue.dequeue("scan-1", 3);

      expect(mockGetNextPendingNode).toHaveBeenCalledWith("scan-1", 3);
      expect(result).toEqual(highRiskNode);
    });

    it("returns null when no pending nodes remain", async () => {
      mockGetNextPendingNode.mockResolvedValueOnce(null);

      const result = await queue.dequeue("scan-empty", 3);

      expect(result).toBeNull();
    });

    it("respects the maxDepth limit by passing it to getNextPendingNode", async () => {
      mockGetNextPendingNode.mockResolvedValueOnce(null);

      await queue.dequeue("scan-1", 2);

      expect(mockGetNextPendingNode).toHaveBeenCalledWith("scan-1", 2);
    });
  });

  describe("hasPending", () => {
    it("returns true when a pending node exists", async () => {
      mockGetNextPendingNode.mockResolvedValueOnce(makeNode());

      const result = await queue.hasPending("scan-1", 3);

      expect(result).toBe(true);
    });

    it("returns false when no pending nodes exist", async () => {
      mockGetNextPendingNode.mockResolvedValueOnce(null);

      const result = await queue.hasPending("scan-empty", 3);

      expect(result).toBe(false);
    });

    it("passes maxDepth to getNextPendingNode", async () => {
      mockGetNextPendingNode.mockResolvedValueOnce(null);

      await queue.hasPending("scan-1", 5);

      expect(mockGetNextPendingNode).toHaveBeenCalledWith("scan-1", 5);
    });

    it("respects depth=0 limit for root-only scans", async () => {
      // A node at depth 1 should not be returned when maxDepth=0
      mockGetNextPendingNode.mockResolvedValueOnce(null);

      const result = await queue.hasPending("scan-1", 0);

      expect(mockGetNextPendingNode).toHaveBeenCalledWith("scan-1", 0);
      expect(result).toBe(false);
    });
  });
});
