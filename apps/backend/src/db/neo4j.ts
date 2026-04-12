import neo4j, { type Driver, type Session } from "neo4j-driver";
import type {
  AuditEntry,
  DfsNode,
  Finding,
  NodeStatus,
  OsiLayer,
  Scan,
  ScanStatus,
  ValidationStatus,
  VulnerabilityChain
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
  try {
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
      // GRACE schema
      await session.run(
        "CREATE CONSTRAINT chain_id_unique IF NOT EXISTS FOR (c:VulnerabilityChain) REQUIRE c.id IS UNIQUE"
      );
      await session.run(
        "CREATE CONSTRAINT target_host_unique IF NOT EXISTS FOR (t:Target) REQUIRE t.host IS UNIQUE"
      );
      await session.run(
        "CREATE INDEX finding_severity IF NOT EXISTS FOR (f:Finding) ON (f.severity)"
      );
      await session.run(
        "CREATE INDEX finding_confidence IF NOT EXISTS FOR (f:Finding) ON (f.confidence)"
      );
      await session.run(
        "CREATE INDEX chain_risk IF NOT EXISTS FOR (c:VulnerabilityChain) ON (c.compositeRisk)"
      );
      await session.run(
        "CREATE INDEX dfsnode_depth IF NOT EXISTS FOR (n:DfsNode) ON (n.depth)"
      );
    });
    console.log("Neo4j schema initialized");
  } catch (err: unknown) {
    console.error("Neo4j schema init error (continuing):", err instanceof Error ? err.message : err);
  }
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
  const evidenceRefsJson = typeof row["evidenceRefsJson"] === "string" ? row["evidenceRefsJson"] : "[]";
  const sourceToolRunsJson =
    typeof row["sourceToolRunsJson"] === "string" ? row["sourceToolRunsJson"] : "[]";
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
    ...(row["validationStatus"] != null
      ? { validationStatus: String(row["validationStatus"]) as Finding["validationStatus"] }
      : {}),
    ...(row["evidenceRefsJson"] != null ? { evidenceRefs: JSON.parse(evidenceRefsJson) as string[] } : {}),
    ...(row["sourceToolRunsJson"] != null
      ? { sourceToolRuns: JSON.parse(sourceToolRunsJson) as string[] }
      : {}),
    ...(row["confidenceReason"] != null ? { confidenceReason: String(row["confidenceReason"]) } : {}),
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
         ORDER BY n.depth DESC, n.riskScore DESC
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
          validationStatus: $validationStatus,
          evidenceRefsJson: $evidenceRefsJson,
          sourceToolRunsJson: $sourceToolRunsJson,
          confidenceReason: $confidenceReason,
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
          validationStatus: finding.validationStatus ?? null,
          evidenceRefsJson: JSON.stringify(finding.evidenceRefs ?? []),
          sourceToolRunsJson: JSON.stringify(finding.sourceToolRuns ?? []),
          confidenceReason: finding.confidenceReason ?? null,
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

// ---------------------------------------------------------------------------
// Finding updates
// ---------------------------------------------------------------------------

export async function updateFindingValidation(
  findingId: string,
  validationStatus: ValidationStatus,
  confidence: number,
  confidenceReason: string
): Promise<void> {
  try {
    await withSession(async (session) => {
      await session.run(
        `MATCH (f:Finding {id: $findingId})
         SET f.validationStatus = $validationStatus,
             f.confidence = $confidence,
             f.confidenceReason = $confidenceReason,
             f.validated = $validated`,
        {
          findingId,
          validationStatus,
          confidence,
          confidenceReason,
          validated: validationStatus === "cross_validated" || validationStatus === "reproduced"
        }
      );
    });
  } catch (err: unknown) {
    console.error("updateFindingValidation error:", err instanceof Error ? err.message : err);
  }
}

// ---------------------------------------------------------------------------
// GRACE — VulnerabilityChain repo
// ---------------------------------------------------------------------------

function rowToChain(row: Record<string, unknown>): VulnerabilityChain {
  const findingIdsJson = typeof row["findingIdsJson"] === "string" ? row["findingIdsJson"] : "[]";
  const linksJson = typeof row["linksJson"] === "string" ? row["linksJson"] : "[]";
  return {
    id: String(row["id"]),
    scanId: String(row["scanId"]),
    title: String(row["title"]),
    compositeRisk: typeof row["compositeRisk"] === "number"
      ? row["compositeRisk"]
      : parseFloat(String(row["compositeRisk"])),
    technique: String(row["technique"]),
    findingIds: JSON.parse(findingIdsJson) as string[],
    links: JSON.parse(linksJson) as VulnerabilityChain["links"],
    startTarget: String(row["startTarget"]),
    endTarget: String(row["endTarget"]),
    chainLength: toNumber(row["chainLength"]),
    confidence: typeof row["confidence"] === "number"
      ? row["confidence"]
      : parseFloat(String(row["confidence"])),
    ...(row["narrative"] != null ? { narrative: String(row["narrative"]) } : {}),
    createdAt: String(row["createdAt"])
  };
}

export async function createVulnerabilityChain(chain: VulnerabilityChain): Promise<void> {
  try {
    await withSession(async (session) => {
      await session.run(
        `MERGE (c:VulnerabilityChain {id: $id})
         SET c.scanId = $scanId,
             c.title = $title,
             c.compositeRisk = $compositeRisk,
             c.technique = $technique,
             c.findingIdsJson = $findingIdsJson,
             c.linksJson = $linksJson,
             c.startTarget = $startTarget,
             c.endTarget = $endTarget,
             c.chainLength = $chainLength,
             c.confidence = $confidence,
             c.narrative = $narrative,
             c.createdAt = $createdAt`,
        {
          id: chain.id,
          scanId: chain.scanId,
          title: chain.title,
          compositeRisk: chain.compositeRisk,
          technique: chain.technique,
          findingIdsJson: JSON.stringify(chain.findingIds),
          linksJson: JSON.stringify(chain.links),
          startTarget: chain.startTarget,
          endTarget: chain.endTarget,
          chainLength: neo4j.int(chain.chainLength),
          confidence: chain.confidence,
          narrative: chain.narrative ?? null,
          createdAt: chain.createdAt
        }
      );

      // Link chain to scan
      await session.run(
        `MATCH (s:Scan {id: $scanId}), (c:VulnerabilityChain {id: $chainId})
         MERGE (s)-[:HAS_CHAIN]->(c)`,
        { scanId: chain.scanId, chainId: chain.id }
      );
    });
  } catch (err: unknown) {
    console.error("createVulnerabilityChain error:", err instanceof Error ? err.message : err);
  }
}

export async function linkFindingsInChain(
  chainId: string,
  findingIds: string[]
): Promise<void> {
  try {
    await withSession(async (session) => {
      for (let i = 0; i < findingIds.length; i++) {
        const findingId = findingIds[i];
        if (!findingId) continue;
        await session.run(
          `MATCH (c:VulnerabilityChain {id: $chainId}), (f:Finding {id: $findingId})
           MERGE (c)-[:INCLUDES {order: $order}]->(f)`,
          { chainId, findingId, order: neo4j.int(i) }
        );
        // Create LEADS_TO edges between consecutive findings
        if (i > 0) {
          const prevId = findingIds[i - 1];
          if (prevId) {
            await session.run(
              `MATCH (f1:Finding {id: $fromId}), (f2:Finding {id: $toId})
               MERGE (f1)-[:LEADS_TO {chainId: $chainId}]->(f2)`,
              { fromId: prevId, toId: findingId, chainId }
            );
          }
        }
      }
    });
  } catch (err: unknown) {
    console.error("linkFindingsInChain error:", err instanceof Error ? err.message : err);
  }
}

export async function getVulnerabilityChains(scanId: string): Promise<VulnerabilityChain[]> {
  try {
    return await withSession(async (session) => {
      const result = await session.run(
        `MATCH (c:VulnerabilityChain {scanId: $scanId})
         RETURN c
         ORDER BY c.compositeRisk DESC`,
        { scanId }
      );
      return result.records.map((r) =>
        rowToChain(r.get("c").properties as Record<string, unknown>)
      );
    });
  } catch (err: unknown) {
    console.error("getVulnerabilityChains error:", err instanceof Error ? err.message : err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// GRACE — DFS node boost + graph queries
// ---------------------------------------------------------------------------

export async function boostNodeRiskScore(
  scanId: string,
  target: string,
  layer: OsiLayer,
  boost: number
): Promise<void> {
  try {
    await withSession(async (session) => {
      await session.run(
        `MATCH (n:DfsNode {scanId: $scanId, target: $target, layer: $layer, status: 'pending'})
         SET n.riskScore = CASE
           WHEN n.riskScore + $boost > 1.0 THEN 1.0
           ELSE n.riskScore + $boost
         END`,
        { scanId, target, layer, boost }
      );
    });
  } catch (err: unknown) {
    console.error("boostNodeRiskScore error:", err instanceof Error ? err.message : err);
  }
}

export async function getAttackSurfaceClusters(
  scanId: string
): Promise<Array<{ target: string; totalFindings: number; riskWeight: number }>> {
  try {
    return await withSession(async (session) => {
      const result = await session.run(
        `MATCH (n:DfsNode {scanId: $scanId})-[:HAS_FINDING]->(f:Finding)
         RETURN n.target AS target,
                COUNT(f) AS totalFindings,
                SUM(CASE
                  WHEN f.severity = 'critical' THEN 4
                  WHEN f.severity = 'high' THEN 3
                  WHEN f.severity = 'medium' THEN 2
                  WHEN f.severity = 'low' THEN 1
                  ELSE 0
                END) AS riskWeight
         ORDER BY riskWeight DESC
         LIMIT 5`,
        { scanId }
      );
      return result.records.map((r) => ({
        target: String(r.get("target")),
        totalFindings: toNumber(r.get("totalFindings")),
        riskWeight: toNumber(r.get("riskWeight"))
      }));
    });
  } catch (err: unknown) {
    console.error("getAttackSurfaceClusters error:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function detectVulnerabilityChains(
  scanId: string
): Promise<Array<{ startTarget: string; trigger: string; endTarget: string; impact: string; chainConfidence: number }>> {
  try {
    return await withSession(async (session) => {
      const result = await session.run(
        `MATCH (n1:DfsNode {scanId: $scanId})-[:DISCOVERED*1..3]->(n2:DfsNode)
         MATCH (n1)-[:HAS_FINDING]->(f1:Finding)
         MATCH (n2)-[:HAS_FINDING]->(f2:Finding)
         WHERE f1.severity IN ['high', 'critical']
           AND f2.severity IN ['high', 'critical']
           AND f1.confidence > 0.7
           AND f2.confidence > 0.7
           AND n1.id <> n2.id
         RETURN n1.target AS startTarget,
                f1.title AS trigger,
                n2.target AS endTarget,
                f2.title AS impact,
                (f1.confidence + f2.confidence) / 2 AS chainConfidence
         ORDER BY chainConfidence DESC
         LIMIT 20`,
        { scanId }
      );
      return result.records.map((r) => ({
        startTarget: String(r.get("startTarget")),
        trigger: String(r.get("trigger")),
        endTarget: String(r.get("endTarget")),
        impact: String(r.get("impact")),
        chainConfidence: typeof r.get("chainConfidence") === "number"
          ? r.get("chainConfidence") as number
          : parseFloat(String(r.get("chainConfidence")))
      }));
    });
  } catch (err: unknown) {
    console.error("detectVulnerabilityChains error:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function findOrphanedHighRiskFindings(
  scanId: string
): Promise<string[]> {
  try {
    return await withSession(async (session) => {
      const result = await session.run(
        `MATCH (n:DfsNode {scanId: $scanId})-[:HAS_FINDING]->(f:Finding)
         WHERE f.severity IN ['high', 'critical']
           AND (f.validationStatus = 'single_source' OR f.validationStatus IS NULL)
           AND NOT EXISTS {
             MATCH (n2:DfsNode {scanId: $scanId})-[:HAS_FINDING]->(f2:Finding)
             WHERE f2.title = f.title AND f2.id <> f.id
           }
         RETURN f.id AS findingId`,
        { scanId }
      );
      return result.records.map((r) => String(r.get("findingId")));
    });
  } catch (err: unknown) {
    console.error("findOrphanedHighRiskFindings error:", err instanceof Error ? err.message : err);
    return [];
  }
}
