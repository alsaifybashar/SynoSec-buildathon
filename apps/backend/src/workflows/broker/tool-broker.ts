import { randomUUID } from "crypto";
import type {
  AgentNote,
  Finding,
  Observation,
  Scan,
  ToolRequest,
  ToolRun,
  ValidationStatus,
  WsEvent
} from "@synosec/contracts";
import { createAuditEntry } from "@/platform/db/neo4j.js";
import { confidenceEngine } from "@/workflows/broker/confidence-engine.js";
import { evidenceStore } from "@/workflows/broker/evidence-store.js";
import { authorizeToolRequest } from "@/workflows/broker/policy.js";
import { parseScanTarget } from "@/workflows/tools/scan-tools.js";
import {
  createToolExecutionTransport,
  type ToolExecutionTransport
} from "@/integrations/connectors/transport.js";

interface BrokerOptions {
  broadcast: (event: WsEvent) => void;
  transport?: ToolExecutionTransport;
}

interface ExecuteRequestsInput {
  scan: Scan;
  tacticId: string;
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
      tacticId: string;
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
      return port
        ? `nmap -sCV -A -p ${port} ${host}`
        : `nmap -sCV -A ${host}`;
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
    case "subdomain_enum":
      return request.tool === "amass"
        ? `amass enum -passive -d ${host}`
        : `subfinder -silent -d ${host}`;
    case "httpx_probe":
      return `httpx -silent -status-code -title -tech-detect -u ${baseUrl}`;
    case "web_crawl":
      return `katana -u ${baseUrl} -silent`;
    case "historical_urls":
      return request.tool === "gau"
        ? `gau ${host}`
        : `waybackurls ${host}`;
    case "feroxbuster_scan":
      return `feroxbuster -u ${baseUrl} --silent`;
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
    case "external_tool": {
      const binary = typeof request.parameters["binary"] === "string" ? request.parameters["binary"] : request.tool;
      const args = Array.isArray(request.parameters["args"])
        ? (request.parameters["args"] as string[]).join(" ")
        : `${host}${port ? ` ${port}` : ""}`;
      return `${binary} ${args}`.trim();
    }
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
  tacticId: string,
  agentId: string,
  observations: Observation[]
): Omit<Finding, "id" | "createdAt"> {
  const [primary] = observations;
  const validationStatus = validationStatusFor(observations);
  const severity = primary?.severity ?? "info";

  return {
    tacticId,
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
  private readonly transport: ToolExecutionTransport;

  constructor(private readonly options: BrokerOptions) {
    this.transport = options.transport ?? createToolExecutionTransport();
  }

  private publishAgentNote(
    scanId: string,
    agentId: string,
    input: Omit<AgentNote, "id" | "scanId" | "agentId" | "createdAt">
  ): void {
    const agentNote: AgentNote = {
      id: randomUUID(),
      scanId,
      agentId,
      createdAt: new Date().toISOString(),
      ...input
    };
    evidenceStore.addAgentNote(agentNote);
    this.options.broadcast({ type: "agent_note_added", agentNote });
  }

  async executeRequests(input: ExecuteRequestsInput): Promise<ExecuteRequestsResult> {
    const toolRuns: ToolRun[] = [];
    const observations: Observation[] = [];

    for (const request of input.requests) {
      const startedAt = new Date().toISOString();
      const decision = authorizeToolRequest(input.scan, request);
      const toolRun: ToolRun = {
        id: randomUUID(),
        scanId: input.scan.id,
        tacticId: input.tacticId,
        agentId: input.agentId,
        adapter: request.adapter,
        tool: request.tool,
        target: request.target,
        ...(request.port !== undefined ? { port: request.port } : {}),
        status: decision.allowed ? "running" : "denied",
        riskTier: request.riskTier,
        justification: request.justification,
        commandPreview: commandPreview(request),
        dispatchMode: this.transport.dispatchMode,
        startedAt,
        ...(decision.allowed ? {} : { completedAt: startedAt, statusReason: decision.reason })
      };

      evidenceStore.addToolRun(toolRun);
      toolRuns.push(toolRun);
      this.options.broadcast({ type: "tool_run_started", toolRun });
      this.publishAgentNote(input.scan.id, input.agentId, {
        tacticId: input.tacticId,
        toolRunId: toolRun.id,
        stage: "execution",
        title: `Queued ${request.adapter}`,
        summary: `Scheduled ${request.tool} against ${request.target}${request.port !== undefined ? `:${request.port}` : ""}.`,
        detail: `${request.justification}\n\nCommand preview:\n${toolRun.commandPreview}`
      });

      await createAuditEntry({
        id: randomUUID(),
        scanId: input.scan.id,
        timestamp: startedAt,
        actor: "mcp-broker",
        action: decision.allowed ? "tool-run-authorized" : "tool-run-denied",
        targetTacticId: input.tacticId,
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
        const adapterResult = await this.transport.execute({
          scanId: input.scan.id,
          tacticId: input.tacticId,
          agentId: input.agentId,
          toolRun,
          request
        });

        for (const observation of adapterResult.observations) {
          confidenceEngine.registerObservation(observation, input.scan.id);
          evidenceStore.addObservation(observation);
          observations.push(observation);
          this.options.broadcast({ type: "observation_added", observation });
          this.publishAgentNote(input.scan.id, input.agentId, {
            tacticId: input.tacticId,
            toolRunId: toolRun.id,
            stage: "analysis",
            title: observation.title,
            summary: observation.summary,
            detail: observation.evidence
          });
        }

        const completedToolRun: ToolRun = {
          ...toolRun,
          ...(adapterResult.connectorId ? { connectorId: adapterResult.connectorId } : {}),
          ...(adapterResult.leasedAt ? { leasedAt: adapterResult.leasedAt } : {}),
          ...(adapterResult.leaseExpiresAt ? { leaseExpiresAt: adapterResult.leaseExpiresAt } : {}),
          status: "completed",
          completedAt: new Date().toISOString(),
          output: adapterResult.output,
          exitCode: adapterResult.exitCode,
          ...(adapterResult.statusReason ? { statusReason: adapterResult.statusReason } : {})
        };
        evidenceStore.updateToolRun(completedToolRun);
        toolRuns[toolRuns.length - 1] = completedToolRun;
        this.options.broadcast({ type: "tool_run_completed", toolRun: completedToolRun });
        this.publishAgentNote(input.scan.id, input.agentId, {
          tacticId: input.tacticId,
          toolRunId: completedToolRun.id,
          stage: "execution",
          title: `${request.adapter} completed`,
          summary: `Completed ${request.tool} against ${request.target}${request.port !== undefined ? `:${request.port}` : ""} with exit code ${adapterResult.exitCode}.`,
          detail: adapterResult.output
        });
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
        this.publishAgentNote(input.scan.id, input.agentId, {
          tacticId: input.tacticId,
          toolRunId: failedToolRun.id,
          stage: "execution",
          title: `${request.adapter} failed`,
          summary: `Execution failed for ${request.tool} against ${request.target}${request.port !== undefined ? `:${request.port}` : ""}.`,
          detail: reason
        });

        await createAuditEntry({
          id: randomUUID(),
          scanId: input.scan.id,
          timestamp: new Date().toISOString(),
          actor: "mcp-broker",
          action: "tool-run-failed",
          targetTacticId: input.tacticId,
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
      findingFromObservationGroup(input.scan.id, input.tacticId, input.agentId, group)
    );

    for (const finding of findings) {
      this.publishAgentNote(input.scan.id, input.agentId, {
        tacticId: input.tacticId,
        stage: "finding",
        title: finding.title,
        summary: finding.description,
        detail: finding.evidence
      });
    }

    return { toolRuns, observations, findings };
  }
}
