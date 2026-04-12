import type { DfsNode } from "@synosec/contracts";
import { createDfsNode, getNextPendingNode } from "../db/neo4j.js";

// ---------------------------------------------------------------------------
// DFS Priority Queue
// ---------------------------------------------------------------------------

export class DfsQueue {
  /**
   * Enqueue a node — persists to Neo4j so the queue survives across restarts
   * and can be queried by the Neo4j graph model.
   */
  async enqueue(node: DfsNode): Promise<void> {
    await createDfsNode(node);
  }

  /**
   * Pop the highest riskScore pending node at or below maxDepth.
   * Delegates to Neo4j for persistence-backed priority ordering.
   */
  async dequeue(scanId: string, maxDepth: number): Promise<DfsNode | null> {
    return getNextPendingNode(scanId, maxDepth);
  }

  /**
   * Check if any pending nodes remain for the given scan within depth limit.
   */
  async hasPending(scanId: string, maxDepth: number): Promise<boolean> {
    const next = await getNextPendingNode(scanId, maxDepth);
    return next !== null;
  }
}
