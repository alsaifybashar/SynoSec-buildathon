import neo4j, { type Driver, type Session } from "neo4j-driver";
import type {
  AuditEntry,
  DfsNode,
  Finding,
  NodeStatus,
  Scan,
  ScanStatus
} from "@synosec/contracts";

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

let driver: Driver | null = null;

export function getNeo4jDriver(): Driver {
  if (!driver) {
    const uri = process.env["NEO4J_URI"] ?? "bolt://localhost:7687";
    const user = process.env["NEO4J_USER"] ?? "neo4j";
    const password = process.env["NEO4J_PASSWORD"] ?? "synosec-dev";
    driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }
  return driver;
}

export async function ensureNeo4jAvailable(): Promise<void> {
  await getNeo4jDriver().verifyConnectivity();
}

export async function closeNeo4jDriver(): Promise<void> {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

async function withSession<T>(fn: (session: Session) => Promise<T>): Promise<T> {
  const d = getNeo4jDriver();
  const session = d.session();
  try {
    return await fn(session);
  } finally {
    await session.close();
  }
}

// ---------------------------------------------------------------------------
// Schema init
// ---------------------------------------------------------------------------

export async function initNeo4jSchema(): Promise<void> {
  await withSession(async (session) => {
    await session.run(
      "CREATE CONSTRAINT scan_id_unique IF NOT EXISTS FOR (s:Scan) REQUIRE s.id IS UNIQUE"
    );
    await session.run(
      "CREATE CONSTRAINT dfsnode_id_unique IF NOT EXISTS FOR (n:DfsNode) REQUIRE n.id IS UNIQUE"
    );
    await session.run(
      "CREATE CONSTRAINT finding_id_unique IF NOT EXISTS FOR (f:Finding) REQUIRE f.id IS UNIQUE"
    );
    await session.run(
      "CREATE CONSTRAINT auditentry_id_unique IF NOT EXISTS FOR (a:AuditEntry) REQUIRE a.id IS UNIQUE"
    );
    await session.run(
      "CREATE INDEX dfsnode_scanid IF NOT EXISTS FOR (n:DfsNode) ON (n.scanId)"
    );
    await session.run(
      "CREATE INDEX finding_scanid IF NOT EXISTS FOR (f:Finding) ON (f.scanId)"
    );
    await session.run(
      "CREATE INDEX finding_nodeid IF NOT EXISTS FOR (f:Finding) ON (f.nodeId)"
    );
  });
  console.log("Neo4j schema initialized");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNumber(val: unknown): number {
  if (typeof val === "number") return val;
  if (neo4j.isInt(val as neo4j.Integer)) return (val as neo4j.Integer).toNumber();
  if (typeof val === "string") return parseInt(val, 10);
  return 0;
}

function rowToScan(row: Record<string, unknown>): Scan {
  const scopeJson = typeof row["scopeJson"] === "string" ? row["scopeJson"] : "{}";
  return {
    id: String(row["id"]),
    scope: JSON.parse(scopeJson) as Scan["scope"],
    status: String(row["status"]) as ScanStatus,
    currentRound: toNumber(row["currentRound"]),
    nodesTotal: toNumber(row["nodesTotal"]),
    nodesComplete: toNumber(row["nodesComplete"]),
    createdAt: String(row["createdAt"]),
    ...(row["completedAt"] ? { completedAt: String(row["completedAt"]) } : {})
  };
}

function rowToNode(row: Record<string, unknown>): DfsNode {
  return {
    id: String(row["id"]),
    scanId: String(row["scanId"]),
    target: String(row["target"]),
    layer: String(row["layer"]) as DfsNode["layer"],
    ...(row["service"] != null ? { service: String(row["service"]) } : {}),
    ...(row["port"] != null ? { port: toNumber(row["port"]) } : {}),
    riskScore: typeof row["riskScore"] === "number" ? row["riskScore"] : parseFloat(String(row["riskScore"])),
    status: String(row["status"]) as NodeStatus,
    parentId: row["parentId"] != null ? String(row["parentId"]) : null,
    depth: toNumber(row["depth"]),
    createdAt: String(row["createdAt"])
  };
}

function rowToFinding(row: Record<string, unknown>): Finding {
  return {
    id: String(row["id"]),
    nodeId: String(row["nodeId"]),
    scanId: String(row["scanId"]),
    agentId: String(row["agentId"]),
    severity: String(row["severity"]) as Finding["severity"],
    confidence: typeof row["confidence"] === "number" ? row["confidence"] : parseFloat(String(row["confidence"])),
    title: String(row["title"]),
    description: String(row["description"]),
    evidence: String(row["evidence"]),
    technique: String(row["technique"]),
    ...(row["reproduceCommand"] != null ? { reproduceCommand: String(row["reproduceCommand"]) } : {}),
    validated: row["validated"] === true || row["validated"] === "true",
    createdAt: String(row["createdAt"])
  };
}

function rowToAudit(row: Record<string, unknown>): AuditEntry {
  const detailsJson = typeof row["detailsJson"] === "string" ? row["detailsJson"] : "{}";
  return {
    id: String(row["id"]),
    scanId: String(row["scanId"]),
    timestamp: String(row["timestamp"]),
    actor: String(row["actor"]),
    action: String(row["action"]),
    ...(row["targetNodeId"] != null ? { targetNodeId: String(row["targetNodeId"]) } : {}),
    scopeValid: row["scopeValid"] === true || row["scopeValid"] === "true",
    details: JSON.parse(detailsJson) as Record<string, unknown>
  };
}

// ---------------------------------------------------------------------------
// Scan repo
// ---------------------------------------------------------------------------

export async function createScan(scan: Scan): Promise<void> {
  try {
    await withSession(async (session) => {
      await session.run(
        `CREATE (s:Scan {
          id: $id,
          scopeJson: $scopeJson,
          status: $status,
          currentRound: $currentRound,
          nodesTotal: $nodesTotal,
          nodesComplete: $nodesComplete,
          createdAt: $createdAt
        })`,
        {
          id: scan.id,
          scopeJson: JSON.stringify(scan.scope),
          status: scan.status,
          currentRound: neo4j.int(scan.currentRound),
          nodesTotal: neo4j.int(scan.nodesTotal),
          nodesComplete: neo4j.int(scan.nodesComplete),
          createdAt: scan.createdAt
        }
      );
    });
  } catch (err: unknown) {
    console.error("createScan error:", err instanceof Error ? err.message : err);
  }
}

export async function getScan(id: string): Promise<Scan | null> {
  try {
    return await withSession(async (session) => {
      const result = await session.run("MATCH (s:Scan {id: $id}) RETURN s", { id });
      if (result.records.length === 0) return null;
      const row = result.records[0]?.get("s").properties as Record<string, unknown>;
      return rowToScan(row);
    });
  } catch (err: unknown) {
    console.error("getScan error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function listScans(): Promise<Scan[]> {
  try {
    return await withSession(async (session) => {
      const result = await session.run("MATCH (s:Scan) RETURN s ORDER BY s.createdAt DESC");
      return result.records.map((r) => rowToScan(r.get("s").properties as Record<string, unknown>));
    });
  } catch (err: unknown) {
    console.error("listScans error:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function updateScanStatus(
  id: string,
  status: ScanStatus,
  extra?: Partial<Scan>
): Promise<void> {
  try {
    await withSession(async (session) => {
      const sets: string[] = ["s.status = $status"];
      const params: Record<string, unknown> = { id, status };

      if (extra?.currentRound !== undefined) {
        sets.push("s.currentRound = $currentRound");
        params["currentRound"] = neo4j.int(extra.currentRound);
      }
      if (extra?.nodesTotal !== undefined) {
        sets.push("s.nodesTotal = $nodesTotal");
        params["nodesTotal"] = neo4j.int(extra.nodesTotal);
      }
      if (extra?.nodesComplete !== undefined) {
        sets.push("s.nodesComplete = $nodesComplete");
        params["nodesComplete"] = neo4j.int(extra.nodesComplete);
      }
      if (extra?.completedAt !== undefined) {
        sets.push("s.completedAt = $completedAt");
        params["completedAt"] = extra.completedAt;
      }

      await session.run(`MATCH (s:Scan {id: $id}) SET ${sets.join(", ")}`, params);
    });
  } catch (err: unknown) {
    console.error("updateScanStatus error:", err instanceof Error ? err.message : err);
  }
}

// ---------------------------------------------------------------------------
// DfsNode repo
// ---------------------------------------------------------------------------

export async function createDfsNode(node: DfsNode): Promise<void> {
  try {
    await withSession(async (session) => {
      await session.run(
        `CREATE (n:DfsNode {
          id: $id,
          scanId: $scanId,
          target: $target,
          layer: $layer,
          service: $service,
          port: $port,
          riskScore: $riskScore,
          status: $status,
          parentId: $parentId,
          depth: $depth,
          createdAt: $createdAt
        })`,
        {
          id: node.id,
          scanId: node.scanId,
          target: node.target,
          layer: node.layer,
          service: node.service ?? null,
          port: node.port != null ? neo4j.int(node.port) : null,
          riskScore: node.riskScore,
          status: node.status,
          parentId: node.parentId ?? null,
          depth: neo4j.int(node.depth),
          createdAt: node.createdAt
        }
      );

      // Create HAS_NODE relationship
      await session.run(
        `MATCH (s:Scan {id: $scanId}), (n:DfsNode {id: $nodeId})
         MERGE (s)-[:HAS_NODE]->(n)`,
        { scanId: node.scanId, nodeId: node.id }
      );

      // Create DISCOVERED relationship if child
      if (node.parentId) {
        await session.run(
          `MATCH (parent:DfsNode {id: $parentId}), (child:DfsNode {id: $childId})
           MERGE (parent)-[:DISCOVERED]->(child)`,
          { parentId: node.parentId, childId: node.id }
        );
      }
    });
  } catch (err: unknown) {
    console.error("createDfsNode error:", err instanceof Error ? err.message : err);
  }
}

export async function getDfsNode(id: string): Promise<DfsNode | null> {
  try {
    return await withSession(async (session) => {
      const result = await session.run("MATCH (n:DfsNode {id: $id}) RETURN n", { id });
      if (result.records.length === 0) return null;
      return rowToNode(result.records[0]?.get("n").properties as Record<string, unknown>);
    });
  } catch (err: unknown) {
    console.error("getDfsNode error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function getNextPendingNode(
  scanId: string,
  maxDepth: number
): Promise<DfsNode | null> {
  try {
    return await withSession(async (session) => {
      const result = await session.run(
        `MATCH (n:DfsNode {scanId: $scanId, status: 'pending'})
         WHERE n.depth <= $maxDepth
         RETURN n
         ORDER BY n.riskScore DESC
         LIMIT 1`,
        { scanId, maxDepth: neo4j.int(maxDepth) }
      );
      if (result.records.length === 0) return null;
      return rowToNode(result.records[0]?.get("n").properties as Record<string, unknown>);
    });
  } catch (err: unknown) {
    console.error("getNextPendingNode error:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function updateNodeStatus(id: string, status: NodeStatus): Promise<void> {
  try {
    await withSession(async (session) => {
      await session.run("MATCH (n:DfsNode {id: $id}) SET n.status = $status", { id, status });
    });
  } catch (err: unknown) {
    console.error("updateNodeStatus error:", err instanceof Error ? err.message : err);
  }
}

export async function getGraphForScan(
  scanId: string
): Promise<{ nodes: DfsNode[]; edges: Array<{ source: string; target: string }> }> {
  try {
    return await withSession(async (session) => {
      const nodesResult = await session.run(
        "MATCH (n:DfsNode {scanId: $scanId}) RETURN n",
        { scanId }
      );
      const nodes = nodesResult.records.map((r) =>
        rowToNode(r.get("n").properties as Record<string, unknown>)
      );

      const edgesResult = await session.run(
        `MATCH (parent:DfsNode {scanId: $scanId})-[:DISCOVERED]->(child:DfsNode {scanId: $scanId})
         RETURN parent.id AS source, child.id AS target`,
        { scanId }
      );
      const edges = edgesResult.records.map((r) => ({
        source: String(r.get("source")),
        target: String(r.get("target"))
      }));

      return { nodes, edges };
    });
  } catch (err: unknown) {
    console.error("getGraphForScan error:", err instanceof Error ? err.message : err);
    return { nodes: [], edges: [] };
  }
}

export async function getAttackPaths(
  scanId: string
): Promise<Array<{ nodeIds: string[]; risk: number; description: string }>> {
  try {
    return await withSession(async (session) => {
      const result = await session.run(
        `MATCH path=(root:DfsNode {scanId: $scanId, depth: 0})-[:DISCOVERED*]->(n:DfsNode)-[:HAS_FINDING]->(f:Finding)
         WHERE f.severity IN ['high', 'critical']
         WITH path, f, nodes(path) AS pathNodes
         RETURN [node IN pathNodes | node.id] AS nodeIds,
                f.severity AS severity,
                f.title AS title,
                n.target AS target
         LIMIT 10`,
        { scanId }
      );

      return result.records.map((r) => {
        const sev = String(r.get("severity"));
        const risk = sev === "critical" ? 0.95 : 0.75;
        const nodeIds = (r.get("nodeIds") as unknown[]).map(String);
        const title = String(r.get("title"));
        const target = String(r.get("target"));
        return {
          nodeIds,
          risk,
          description: `Attack path to ${target} via ${title}`
        };
      });
    });
  } catch (err: unknown) {
    console.error("getAttackPaths error:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Finding repo
// ---------------------------------------------------------------------------

export async function createFinding(finding: Finding): Promise<void> {
  try {
    await withSession(async (session) => {
      await session.run(
        `CREATE (f:Finding {
          id: $id,
          nodeId: $nodeId,
          scanId: $scanId,
          agentId: $agentId,
          severity: $severity,
          confidence: $confidence,
          title: $title,
          description: $description,
          evidence: $evidence,
          technique: $technique,
          reproduceCommand: $reproduceCommand,
          validated: $validated,
          createdAt: $createdAt
        })`,
        {
          id: finding.id,
          nodeId: finding.nodeId,
          scanId: finding.scanId,
          agentId: finding.agentId,
          severity: finding.severity,
          confidence: finding.confidence,
          title: finding.title,
          description: finding.description,
          evidence: finding.evidence,
          technique: finding.technique,
          reproduceCommand: finding.reproduceCommand ?? null,
          validated: finding.validated,
          createdAt: finding.createdAt
        }
      );

      // Link to node
      await session.run(
        `MATCH (n:DfsNode {id: $nodeId}), (f:Finding {id: $findingId})
         MERGE (n)-[:HAS_FINDING]->(f)`,
        { nodeId: finding.nodeId, findingId: finding.id }
      );
    });
  } catch (err: unknown) {
    console.error("createFinding error:", err instanceof Error ? err.message : err);
  }
}

export async function getFindingsForScan(scanId: string): Promise<Finding[]> {
  try {
    return await withSession(async (session) => {
      const result = await session.run(
        "MATCH (f:Finding {scanId: $scanId}) RETURN f ORDER BY f.createdAt DESC",
        { scanId }
      );
      return result.records.map((r) =>
        rowToFinding(r.get("f").properties as Record<string, unknown>)
      );
    });
  } catch (err: unknown) {
    console.error("getFindingsForScan error:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function getFindingsForNode(nodeId: string): Promise<Finding[]> {
  try {
    return await withSession(async (session) => {
      const result = await session.run(
        "MATCH (f:Finding {nodeId: $nodeId}) RETURN f ORDER BY f.createdAt DESC",
        { nodeId }
      );
      return result.records.map((r) =>
        rowToFinding(r.get("f").properties as Record<string, unknown>)
      );
    });
  } catch (err: unknown) {
    console.error("getFindingsForNode error:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Audit repo
// ---------------------------------------------------------------------------

export async function createAuditEntry(entry: AuditEntry): Promise<void> {
  try {
    await withSession(async (session) => {
      await session.run(
        `CREATE (a:AuditEntry {
          id: $id,
          scanId: $scanId,
          timestamp: $timestamp,
          actor: $actor,
          action: $action,
          targetNodeId: $targetNodeId,
          scopeValid: $scopeValid,
          detailsJson: $detailsJson
        })`,
        {
          id: entry.id,
          scanId: entry.scanId,
          timestamp: entry.timestamp,
          actor: entry.actor,
          action: entry.action,
          targetNodeId: entry.targetNodeId ?? null,
          scopeValid: entry.scopeValid,
          detailsJson: JSON.stringify(entry.details)
        }
      );
    });
  } catch (err: unknown) {
    console.error("createAuditEntry error:", err instanceof Error ? err.message : err);
  }
}

export async function getAuditForScan(scanId: string): Promise<AuditEntry[]> {
  try {
    return await withSession(async (session) => {
      const result = await session.run(
        "MATCH (a:AuditEntry {scanId: $scanId}) RETURN a ORDER BY a.timestamp ASC",
        { scanId }
      );
      return result.records.map((r) =>
        rowToAudit(r.get("a").properties as Record<string, unknown>)
      );
    });
  } catch (err: unknown) {
    console.error("getAuditForScan error:", err instanceof Error ? err.message : err);
    return [];
  }
}
