import { randomUUID } from "crypto";
import type {
  AgentNote,
  AiTool,
  Finding,
  Observation,
  Scan,
  ToolRequest,
  ToolRun,
  ValidationStatus,
  WsEvent
} from "@synosec/contracts";
import { buildScriptCommandPreview } from "@/engine/tools/script-executor.js";
import { createAuditEntry } from "@/engine/scans/index.js";
import { confidenceEngine } from "./confidence-engine.js";
import { evidenceStore } from "./evidence-store.js";
import { authorizeToolRequest } from "./policy.js";
import { ReplayScheduler } from "./replay-scheduler.js";
import {
  applyConstraintInputs,
  authorizeToolAgainstConstraints,
  type EffectiveExecutionConstraintSet
} from "@/engine/workflow/execution-constraints.js";
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
  constraintSet?: EffectiveExecutionConstraintSet;
  toolLookup?: Record<string, AiTool>;
}

interface ExecuteRequestsResult {
  toolRuns: ToolRun[];
  observations: Observation[];
  findings: Finding[];
}

export class BrokerExecutionError extends Error {
  constructor(
    message: string,
    readonly details: {
      scanId: string;
      tacticId: string;
      agentId: string;
      toolId?: string;
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
  return buildScriptCommandPreview(request);
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
      ...(primary.toolId ? { toolId: primary.toolId } : {}),
      tool: primary.tool,
      executorType: "bash",
      capabilities: primary.capabilities,
      target: primary.target,
      port: primary.port,
      layer: "L7",
      riskTier: "passive",
      justification: primary.summary,
      sandboxProfile: "read-only-parser",
      privilegeProfile: "read-only-network",
      parameters: {
        bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"derived observation\"}'",
        commandPreview: primary.tool,
        toolInput: { target: primary.target }
      }
    }) : undefined,
    validated: validationStatus === "cross_validated" || validationStatus === "reproduced",
    validationStatus,
    evidenceRefs: observations.map((observation) => observation.id),
    sourceToolRuns: [...new Set(observations.map((observation) => observation.toolRunId))],
    confidenceReason:
      validationStatus === "cross_validated"
        ? "Multiple corroborating observations were recorded for the same hypothesis."
        : "Single tool execution produced the current evidence set."
  };
}

export class ToolBroker {
  private readonly transport: ToolExecutionTransport;
  private readonly replayScheduler: ReplayScheduler;

  constructor(private readonly options: BrokerOptions) {
    this.transport = options.transport ?? createToolExecutionTransport();
    this.replayScheduler = new ReplayScheduler({
      broadcast: options.broadcast,
      transport: this.transport
    });
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
    const requestByToolRunId = new Map<string, ToolRequest>();

    for (const request of input.requests) {
      const startedAt = new Date().toISOString();
      const tool = request.toolId ? input.toolLookup?.[request.toolId] : undefined;
      const constraintDecision = input.constraintSet && tool
        ? authorizeToolAgainstConstraints(input.constraintSet, tool, request)
        : null;
      const scopedRequest = input.constraintSet ? applyConstraintInputs(request, input.constraintSet) : request;
      const decision = !constraintDecision || constraintDecision.allowed
        ? authorizeToolRequest(input.scan, scopedRequest)
        : { allowed: false, reason: constraintDecision.reason };
      const toolRun: ToolRun = {
        id: randomUUID(),
        scanId: input.scan.id,
        tacticId: input.tacticId,
        agentId: input.agentId,
        ...(scopedRequest.toolId ? { toolId: scopedRequest.toolId } : {}),
        tool: scopedRequest.tool,
        executorType: scopedRequest.executorType,
        capabilities: scopedRequest.capabilities,
        target: scopedRequest.target,
        ...(scopedRequest.port !== undefined ? { port: scopedRequest.port } : {}),
        status: decision.allowed ? "running" : "denied",
        riskTier: scopedRequest.riskTier,
        justification: scopedRequest.justification,
        commandPreview: commandPreview(scopedRequest),
        dispatchMode: this.transport.dispatchMode,
        startedAt,
        ...(decision.allowed ? {} : { completedAt: startedAt, statusReason: decision.reason })
      };

      evidenceStore.addToolRun(toolRun);
      toolRuns.push(toolRun);
      requestByToolRunId.set(toolRun.id, scopedRequest);
      this.options.broadcast({ type: "tool_run_started", toolRun });
      this.publishAgentNote(input.scan.id, input.agentId, {
        tacticId: input.tacticId,
        toolRunId: toolRun.id,
        stage: "execution",
        title: `Queued ${scopedRequest.tool}`,
        summary: `Scheduled ${scopedRequest.tool} against ${scopedRequest.target}${scopedRequest.port !== undefined ? `:${scopedRequest.port}` : ""}.`,
        detail: `${scopedRequest.justification}\n\nCommand preview:\n${toolRun.commandPreview}`
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
          toolId: scopedRequest.toolId,
          tool: scopedRequest.tool,
          capabilities: scopedRequest.capabilities,
          target: scopedRequest.target,
          riskTier: scopedRequest.riskTier,
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
          request: scopedRequest
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

        const runFailed = adapterResult.exitCode !== 0;
        const completedToolRun: ToolRun = {
          ...toolRun,
          ...(adapterResult.connectorId ? { connectorId: adapterResult.connectorId } : {}),
          ...(adapterResult.leasedAt ? { leasedAt: adapterResult.leasedAt } : {}),
          ...(adapterResult.leaseExpiresAt ? { leaseExpiresAt: adapterResult.leaseExpiresAt } : {}),
          status: runFailed ? "failed" : "completed",
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
          title: `${scopedRequest.tool} ${runFailed ? "failed" : "completed"}`,
          summary: `${runFailed ? "Finished" : "Completed"} ${scopedRequest.tool} against ${scopedRequest.target}${scopedRequest.port !== undefined ? `:${scopedRequest.port}` : ""} with exit code ${adapterResult.exitCode}.`,
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
            `Broker tool execution failure`,
            `toolId=${scopedRequest.toolId ?? "n/a"}`,
            `tool=${scopedRequest.tool}`,
            `target=${scopedRequest.target}${scopedRequest.port !== undefined ? `:${scopedRequest.port}` : ""}`,
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
          title: `${scopedRequest.tool} failed`,
          summary: `Execution failed for ${scopedRequest.tool} against ${scopedRequest.target}${scopedRequest.port !== undefined ? `:${scopedRequest.port}` : ""}.`,
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
            toolId: scopedRequest.toolId,
            tool: scopedRequest.tool,
            target: scopedRequest.target,
            error: reason
          }
        });

        // Log the failure but continue — a single tool failure must not terminate the scan.
        // BrokerExecutionError is reserved for hard policy violations, not tool-level errors.
        console.warn(
          `[broker] tool-run-failed toolId=${scopedRequest.toolId ?? "n/a"} tool=${scopedRequest.tool} target=${scopedRequest.target} reason=${reason}`
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

    const now = new Date().toISOString();
    const findings: Finding[] = [...grouped.values()].map((group) => ({
      id: randomUUID(),
      createdAt: now,
      ...findingFromObservationGroup(input.scan.id, input.tacticId, input.agentId, group)
    }));

    for (const finding of findings) {
      evidenceStore.addFinding(finding);
      this.options.broadcast({ type: "finding_added", finding });
      this.publishAgentNote(input.scan.id, input.agentId, {
        tacticId: input.tacticId,
        stage: "finding",
        title: finding.title,
        summary: finding.description,
        detail: finding.evidence
      });

      if (finding.validationStatus === "single_source") {
        const primaryRunId = finding.sourceToolRuns?.[0];
        const originalRequest = primaryRunId ? requestByToolRunId.get(primaryRunId) : undefined;
        if (originalRequest) {
          this.replayScheduler.schedule(input.scan, {
            findingId: finding.id,
            findingTitle: finding.title,
            scanId: input.scan.id,
            tacticId: input.tacticId,
            agentId: input.agentId,
            originalToolRunId: primaryRunId!,
            originalRequest
          });
        }
      }
    }

    return { toolRuns, observations, findings };
  }
}
