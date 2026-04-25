import { randomUUID } from "crypto";
import type { Scan, ToolRequest, ToolRun, ValidationStatus, WsEvent } from "@synosec/contracts";
import type { ToolExecutionTransport } from "@/integrations/connectors/transport.js";
import { evidenceStore } from "./evidence-store.js";

// ---------------------------------------------------------------------------
// Replay Scheduler
//
// When a finding reaches `single_source` status, the broker schedules a
// replay of the exact tool + arguments that produced it. The replay outcome
// drives the finding's next validation state:
//
//   confirmed  → cross_validated
//   contradicted → suspected  (flagged for human review)
//   blocked    → replay_pending  (rate-limited or over time budget)
// ---------------------------------------------------------------------------

export interface ReplayJob {
  findingId: string;
  findingTitle: string;
  scanId: string;
  tacticId: string;
  agentId: string;
  originalToolRunId: string;
  originalRequest: ToolRequest;
}

type ReplayOutcome =
  | { kind: "confirmed" }
  | { kind: "contradicted"; reason: string }
  | { kind: "blocked"; reason: string };

export interface ReplaySchedulerOptions {
  broadcast: (event: WsEvent) => void;
  transport: ToolExecutionTransport;
  timeBudgetMs?: number;
}

export class ReplayScheduler {
  private readonly timeBudgetMs: number;

  constructor(private readonly options: ReplaySchedulerOptions) {
    this.timeBudgetMs = options.timeBudgetMs ?? 60_000;
  }

  schedule(scan: Scan, job: ReplayJob): void {
    this.run(scan, job).catch((err: unknown) => {
      console.warn(
        `[replay-scheduler] unhandled error scanId=${job.scanId} findingId=${job.findingId}: ${String(err)}`
      );
    });
  }

  private async run(scan: Scan, job: ReplayJob): Promise<void> {
    const outcome = await this.executeReplay(scan, job);
    this.applyOutcome(job, outcome);
  }

  private applyOutcome(job: ReplayJob, outcome: ReplayOutcome): void {
    let newStatus: ValidationStatus;
    let reason: string;

    if (outcome.kind === "confirmed") {
      newStatus = "cross_validated";
      reason = "Replay confirmed the original finding with identical observations.";
    } else if (outcome.kind === "contradicted") {
      newStatus = "suspected";
      reason = outcome.reason;
    } else {
      newStatus = "replay_pending";
      reason = outcome.reason;
    }

    evidenceStore.updateFindingValidationStatus(job.scanId, job.findingId, newStatus);
    this.options.broadcast({
      type: "finding_validated",
      findingId: job.findingId,
      validationStatus: newStatus,
      reason
    });

    console.info(
      `[replay-scheduler] findingId=${job.findingId} outcome=${outcome.kind} newStatus=${newStatus}`
    );
  }

  private async executeReplay(scan: Scan, job: ReplayJob): Promise<ReplayOutcome> {
    const replayRunId = randomUUID();
    const startedAt = new Date().toISOString();
    const commandPreview = typeof job.originalRequest.parameters["commandPreview"] === "string"
      ? job.originalRequest.parameters["commandPreview"]
      : job.originalRequest.tool;

    const replayToolRun: ToolRun = {
      id: replayRunId,
      scanId: scan.id,
      tacticId: job.tacticId,
      agentId: job.agentId,
      ...(job.originalRequest.toolId ? { toolId: job.originalRequest.toolId } : {}),
      tool: job.originalRequest.tool,
      executorType: job.originalRequest.executorType,
      capabilities: job.originalRequest.capabilities,
      target: job.originalRequest.target,
      ...(job.originalRequest.port !== undefined ? { port: job.originalRequest.port } : {}),
      status: "running",
      riskTier: job.originalRequest.riskTier,
      justification: `[replay] ${job.originalRequest.justification}`,
      commandPreview: `[replay] ${commandPreview}`,
      dispatchMode: this.options.transport.dispatchMode,
      startedAt
    };

    evidenceStore.addToolRun(replayToolRun);
    this.options.broadcast({ type: "tool_run_started", toolRun: replayToolRun });

    let adapterResult: Awaited<ReturnType<ToolExecutionTransport["execute"]>>;

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`time budget exceeded after ${this.timeBudgetMs}ms`)),
          this.timeBudgetMs
        )
      );

      adapterResult = await Promise.race([
        this.options.transport.execute({
          scanId: scan.id,
          tacticId: job.tacticId,
          agentId: job.agentId,
          toolRun: replayToolRun,
          request: job.originalRequest
        }),
        timeoutPromise
      ]);
    } catch (err: unknown) {
      const reason = err instanceof Error ? err.message : String(err);
      const isRateLimitOrBudget = /rate.?limit|time.?budget|timed?.?out|exceeded/i.test(reason);

      const failedRun: ToolRun = {
        ...replayToolRun,
        status: "failed",
        completedAt: new Date().toISOString(),
        statusReason: reason,
        output: reason,
        exitCode: 1
      };
      evidenceStore.updateToolRun(failedRun);
      this.options.broadcast({ type: "tool_run_completed", toolRun: failedRun });

      return isRateLimitOrBudget
        ? { kind: "blocked", reason }
        : { kind: "contradicted", reason };
    }

    const runFailed = adapterResult.exitCode !== 0;
    const completedRun: ToolRun = {
      ...replayToolRun,
      status: runFailed ? "failed" : "completed",
      completedAt: new Date().toISOString(),
      output: adapterResult.output,
      exitCode: adapterResult.exitCode,
      ...(adapterResult.statusReason ? { statusReason: adapterResult.statusReason } : {})
    };
    evidenceStore.updateToolRun(completedRun);
    this.options.broadcast({ type: "tool_run_completed", toolRun: completedRun });

    for (const obs of adapterResult.observations) {
      evidenceStore.addObservation(obs);
      this.options.broadcast({ type: "observation_added", observation: obs });
    }

    if (runFailed) {
      return {
        kind: "contradicted",
        reason: `Replay exited with code ${adapterResult.exitCode}${adapterResult.statusReason ? `: ${adapterResult.statusReason}` : ""}.`
      };
    }

    if (adapterResult.observations.length === 0) {
      return {
        kind: "contradicted",
        reason: "Replay produced no observations — original finding not reproduced."
      };
    }

    const targetTitle = job.findingTitle.toLowerCase().trim();
    const confirming = adapterResult.observations.some(
      (obs) => obs.title.toLowerCase().trim() === targetTitle
    );

    return confirming
      ? { kind: "confirmed" }
      : { kind: "contradicted", reason: "Replay observations did not match the original finding title." };
  }
}
