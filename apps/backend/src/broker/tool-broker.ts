import { randomUUID } from "crypto";
import type {
  Finding,
  Observation,
  Scan,
  ToolRequest,
  ToolRun,
  ValidationStatus,
  WsEvent
} from "@synosec/contracts";
import { createAuditEntry } from "../db/neo4j.js";
import { executeAdapter } from "./adapters.js";
import { evidenceStore } from "./evidence-store.js";
import { authorizeToolRequest } from "./policy.js";

interface BrokerOptions {
  broadcast: (event: WsEvent) => void;
}

interface ExecuteRequestsInput {
  scan: Scan;
  nodeId: string;
  agentId: string;
  requests: ToolRequest[];
}

interface ExecuteRequestsResult {
  toolRuns: ToolRun[];
  observations: Observation[];
  findings: Array<Omit<Finding, "id" | "createdAt">>;
}

function commandPreview(request: ToolRequest): string {
  switch (request.adapter) {
    case "network_scan":
      return `nmap -sn ${request.target}`;
    case "service_scan":
      return `nmap -sV ${request.target}`;
    case "session_audit":
      return request.service === "smb"
        ? `smbclient -L ${request.target} -N`
        : `ssh-audit ${request.target}`;
    case "tls_audit":
      return `sslscan ${request.target}:${request.port ?? 443}`;
    case "http_probe":
      return `curl -I http://${request.target}:${request.port ?? 80}`;
    case "web_fingerprint":
      return `whatweb http://${request.target}:${request.port ?? 80}`;
    case "db_injection_check":
      return `sqlmap -u http://${request.target}/ --batch`;
    case "content_discovery":
      return `ffuf -u http://${request.target}:${request.port ?? 80}/FUZZ`;
    default:
      return `${request.tool} ${request.target}`;
  }
}

function validationStatusFor(observationGroup: Observation[]): ValidationStatus {
  if (observationGroup.length >= 2) return "cross_validated";
  return "single_source";
}

function findingFromObservationGroup(
  scanId: string,
  nodeId: string,
  agentId: string,
  observations: Observation[]
): Omit<Finding, "id" | "createdAt"> {
  const [primary] = observations;
  const validationStatus = validationStatusFor(observations);
  const severity = primary?.severity ?? "info";

  return {
    nodeId,
    scanId,
    agentId,
    severity,
    confidence: Math.max(...observations.map((observation) => observation.confidence)),
    title: primary?.title ?? "Derived observation",
    description: observations.map((observation) => observation.summary).join(" "),
    evidence: observations.map((observation) => observation.evidence).join("\n\n"),
    technique: primary?.technique ?? "Observation synthesis",
    reproduceCommand: primary ? commandPreview({
      tool: primary.adapter,
      adapter: primary.adapter,
      target: primary.target,
      port: primary.port,
      layer: "L7",
      riskTier: "passive",
      justification: primary.summary,
      parameters: {}
    }) : undefined,
    validated: validationStatus === "cross_validated" || validationStatus === "reproduced",
    validationStatus,
    evidenceRefs: observations.map((observation) => observation.id),
    sourceToolRuns: [...new Set(observations.map((observation) => observation.toolRunId))],
    confidenceReason:
      validationStatus === "cross_validated"
        ? "Multiple corroborating observations were recorded for the same hypothesis."
        : "Single adapter produced the current evidence set."
  };
}

export class ToolBroker {
  constructor(private readonly options: BrokerOptions) {}

  async executeRequests(input: ExecuteRequestsInput): Promise<ExecuteRequestsResult> {
    const toolRuns: ToolRun[] = [];
    const observations: Observation[] = [];

    for (const request of input.requests) {
      const startedAt = new Date().toISOString();
      const decision = authorizeToolRequest(input.scan, request);
      const toolRun: ToolRun = {
        id: randomUUID(),
        scanId: input.scan.id,
        nodeId: input.nodeId,
        agentId: input.agentId,
        adapter: request.adapter,
        tool: request.tool,
        target: request.target,
        ...(request.port !== undefined ? { port: request.port } : {}),
        status: decision.allowed ? "running" : "denied",
        riskTier: request.riskTier,
        justification: request.justification,
        commandPreview: commandPreview(request),
        startedAt,
        ...(decision.allowed ? {} : { completedAt: startedAt, statusReason: decision.reason })
      };

      evidenceStore.addToolRun(toolRun);
      toolRuns.push(toolRun);
      this.options.broadcast({ type: "tool_run_started", toolRun });

      await createAuditEntry({
        id: randomUUID(),
        scanId: input.scan.id,
        timestamp: startedAt,
        actor: "mcp-broker",
        action: decision.allowed ? "tool-run-authorized" : "tool-run-denied",
        targetNodeId: input.nodeId,
        scopeValid: decision.allowed,
        details: {
          adapter: request.adapter,
          tool: request.tool,
          target: request.target,
          riskTier: request.riskTier,
          reason: decision.reason
        }
      });

      if (!decision.allowed) {
        this.options.broadcast({ type: "tool_run_completed", toolRun });
        continue;
      }

      try {
        const adapterResult = await executeAdapter({
          scanId: input.scan.id,
          nodeId: input.nodeId,
          toolRun,
          request
        });

        for (const observation of adapterResult.observations) {
          evidenceStore.addObservation(observation);
          observations.push(observation);
          this.options.broadcast({ type: "observation_added", observation });
        }

        const completedToolRun: ToolRun = {
          ...toolRun,
          status: "completed",
          completedAt: new Date().toISOString(),
          output: adapterResult.output,
          exitCode: adapterResult.exitCode
        };
        evidenceStore.updateToolRun(completedToolRun);
        toolRuns[toolRuns.length - 1] = completedToolRun;
        this.options.broadcast({ type: "tool_run_completed", toolRun: completedToolRun });
      } catch (error: unknown) {
        const failedToolRun: ToolRun = {
          ...toolRun,
          status: "failed",
          completedAt: new Date().toISOString(),
          statusReason: error instanceof Error ? error.message : String(error),
          output: error instanceof Error ? error.stack ?? error.message : String(error),
          exitCode: 1
        };
        evidenceStore.updateToolRun(failedToolRun);
        toolRuns[toolRuns.length - 1] = failedToolRun;
        this.options.broadcast({ type: "tool_run_completed", toolRun: failedToolRun });

        await createAuditEntry({
          id: randomUUID(),
          scanId: input.scan.id,
          timestamp: new Date().toISOString(),
          actor: "mcp-broker",
          action: "tool-run-failed",
          targetNodeId: input.nodeId,
          scopeValid: true,
          details: {
            adapter: request.adapter,
            tool: request.tool,
            target: request.target,
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }

    const grouped = new Map<string, Observation[]>();
    for (const observation of observations) {
      const existing = grouped.get(observation.title) ?? [];
      existing.push(observation);
      grouped.set(observation.title, existing);
    }

    const findings = [...grouped.values()].map((group) =>
      findingFromObservationGroup(input.scan.id, input.nodeId, input.agentId, group)
    );

    return { toolRuns, observations, findings };
  }
}
