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
import { confidenceEngine } from "./confidence-engine.js";
import { evidenceStore } from "./evidence-store.js";
import { authorizeToolRequest } from "./policy.js";
import { parseScanTarget } from "../tools/scan-tools.js";

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

export class BrokerExecutionError extends Error {
  constructor(
    message: string,
    readonly details: {
      scanId: string;
      nodeId: string;
      agentId: string;
      adapter: string;
      tool: string;
      target: string;
      port?: number;
      toolRunId: string;
      reason: string;
    }
  ) {
    super(message);
    this.name = "BrokerExecutionError";
  }
}

function commandPreview(request: ToolRequest): string {
  const parsedTarget = parseScanTarget(request.target);
  const host = parsedTarget.host;
  const port = request.port ?? parsedTarget.port;
  const scheme = parsedTarget.scheme ?? (port === 443 || port === 8443 ? "https" : "http");
  const baseUrl = `${scheme}://${host}${port ? `:${port}` : ""}`;

  switch (request.adapter) {
    case "network_scan":
      return `nmap -sn ${host}`;
    case "service_scan":
      return `nmap -sV ${host}${port ? ` -p ${port}` : ""}`;
    case "session_audit":
      return request.service === "smb"
        ? `smbclient -L ${host} -N`
        : `ssh-audit ${host}`;
    case "tls_audit":
      return `sslscan ${host}:${port ?? 443}`;
    case "http_probe":
      return `curl -I ${baseUrl}`;
    case "web_fingerprint":
      return `whatweb ${baseUrl}`;
    case "db_injection_check":
      return `sqlmap -u ${baseUrl}/ --batch`;
    case "content_discovery":
      return `ffuf -u ${baseUrl}/FUZZ -w /usr/share/dirb/wordlists/common.txt`;
    case "nikto_scan":
      return `nikto -h ${host} -p ${port ?? 80} -Tuning x 6 2`;
    case "nuclei_scan":
      return `nuclei -u ${baseUrl} -severity medium,high,critical`;
    case "vuln_check":
      return `curl -k -s ${baseUrl}/search?q=%3Cscript%3E`;
    default:
      return `${request.tool} ${host}${port ? `:${port}` : ""}`;
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
          confidenceEngine.registerObservation(observation, input.scan.id);
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
        const reason = error instanceof Error ? error.message : String(error);
        const failedToolRun: ToolRun = {
          ...toolRun,
          status: "failed",
          completedAt: new Date().toISOString(),
          statusReason: reason,
          output: [
            `Broker adapter failure`,
            `adapter=${request.adapter}`,
            `tool=${request.tool}`,
            `target=${request.target}${request.port !== undefined ? `:${request.port}` : ""}`,
            "",
            error instanceof Error ? error.stack ?? error.message : String(error)
          ].join("\n"),
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
            error: reason
          }
        });

        // Log the failure but continue — a single tool failure must not terminate the scan.
        // BrokerExecutionError is reserved for hard policy violations, not tool-level errors.
        console.warn(
          `[broker] tool-run-failed adapter=${request.adapter} tool=${request.tool} target=${request.target} reason=${reason}`
        );
        continue;
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
