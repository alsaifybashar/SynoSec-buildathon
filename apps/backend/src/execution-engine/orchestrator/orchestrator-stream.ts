import { InMemoryRunStream } from "@/execution-engine/streams/in-memory-run-stream.js";

export type OrchestratorEvent =
  | { type: "phase_changed"; phase: string; status: string }
  | { type: "node_added"; node: AttackMapNode }
  | { type: "node_updated"; node: AttackMapNode }
  | { type: "edge_added"; edge: AttackMapEdge }
  | { type: "plan_created"; plan: AttackPlan }
  | { type: "reasoning"; phase: string; title: string; summary: string }
  | { type: "tool_started"; phase: string; toolName: string; command: string; startedAt: string }
  | { type: "tool_completed"; phase: string; toolName: string; command: string; startedAt: string; completedAt: string; durationMs: number; exitCode: number; outputPreview: string }
  | { type: "log"; level: "info" | "warn" | "error"; message: string }
  | { type: "completed"; summary: string }
  | { type: "failed"; error: string };

export type AttackMapNodeType = "target" | "port" | "tech" | "vector" | "scan" | "finding" | "chain";
export type AttackMapNodeStatus = "pending" | "scanning" | "completed" | "vulnerable" | "blocked";
export type Severity = "info" | "low" | "medium" | "high" | "critical";

export type AttackMapNode = {
  id: string;
  type: AttackMapNodeType;
  label: string;
  status: AttackMapNodeStatus;
  severity?: Severity;
  parentId?: string;
  data: Record<string, unknown>;
};

export type AttackMapEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  kind?: "discovery" | "chain";
};

export type AttackPlanPhase = {
  id: string;
  name: string;
  priority: "critical" | "high" | "medium" | "low";
  rationale: string;
  targetService: string;
  tools: string[];
  status: "pending" | "running" | "completed" | "skipped";
};

export type AttackPlan = {
  phases: AttackPlanPhase[];
  overallRisk: "critical" | "high" | "medium" | "low";
  summary: string;
};

export class OrchestratorStream extends InMemoryRunStream<OrchestratorEvent> {}
