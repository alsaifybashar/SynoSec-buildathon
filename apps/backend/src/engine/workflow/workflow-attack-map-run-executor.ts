import { randomUUID } from "node:crypto";
import type { WorkflowRun, WorkflowStageResult, WorkflowTraceEvent } from "@synosec/contracts";
import { getWorkflowReportedFindings } from "@synosec/contracts";
import type { AttackMapNode, AttackPlan, AttackPlanPhase } from "@/engine/orchestrator/index.js";
import type { ResolvedAiTool } from "@/modules/ai-tools/index.js";
import { RequestError } from "@/shared/http/request-error.js";
import { createAttackMapFindingSubmission, createWorkflowReportedFinding } from "./workflow-finding-factory.js";
import type {
  RuntimeStartContext,
  WorkflowRuntimePorts,
  WorkflowRunWriterPort
} from "./workflow-runtime-types.js";
import { WorkflowRunPreflight } from "./workflow-run-preflight.js";

function clipText(value: unknown, maxLength: number, fallback = "") {
  if (typeof value !== "string") {
    return fallback;
  }

  return value.slice(0, maxLength);
}

export class AttackMapWorkflowRunExecutor {
  constructor(
    private readonly ports: WorkflowRuntimePorts,
    private readonly preflight: WorkflowRunPreflight,
    private readonly writer: WorkflowRunWriterPort
  ) {}

  async execute(context: RuntimeStartContext): Promise<void> {
    const { workflow, run, targetRecord, constraintSet } = context;
    const stage = this.preflight.getOrderedStages(workflow)[0]!;
    const { agent, provider } = await this.preflight.loadStageDependencies(stage, targetRecord, constraintSet, "attack-map");
    const orchestrator = this.ports.orchestratorExecutionEngine as unknown as any;

    const target = {
      baseUrl: constraintSet.normalizedTarget.baseUrl ?? targetRecord.baseUrl ?? `http://${constraintSet.normalizedTarget.host}`,
      host: constraintSet.normalizedTarget.host,
      ...(constraintSet.normalizedTarget.port === undefined ? {} : { port: constraintSet.normalizedTarget.port })
    };
    const plannerTools = (
      await Promise.all(stage.allowedToolIds.map((toolId) => this.ports.toolRuntime.get(toolId)))
    ).filter((candidate): candidate is ResolvedAiTool => Boolean(candidate));

    let currentRun = await this.writer.appendEvent(
      run,
      this.writer.createEvent(run, workflow.id, stage.id, run.events.length, "stage_started", "running", {
        stageLabel: stage.label
      }, `Stage started: ${stage.label}`, `Started ${stage.label}.`),
      { currentStepIndex: 0 }
    );
    let ord = currentRun.events.length;
    const appendEvent = async (
      type: WorkflowTraceEvent["type"],
      status: WorkflowTraceEvent["status"],
      payload: Record<string, unknown>,
      title: string,
      summary: string,
      detail?: string | null,
      patch?: { status?: WorkflowRun["status"]; completedAt?: string | null }
    ) => {
      currentRun = await this.writer.appendEvent(
        currentRun,
        this.writer.createEvent(currentRun, workflow.id, stage.id, ord++, type, status, payload, title, summary, detail),
        patch
      );
      return currentRun;
    };
    const emitReasoning = (phase: string, title: string, summary: string) => appendEvent(
      "reasoning",
      "completed",
      { phase, title, summary },
      title,
      summary,
      null
    );

    const toolActivityById = new Map<string, { phase: string; toolId: string | null; toolName: string; command: string }>();
    const recordToolActivity = async (activity: Record<string, unknown>) => {
      const id = typeof activity["id"] === "string" ? activity["id"] : randomUUID();
      const phase = typeof activity["phase"] === "string" ? activity["phase"] : "execution";
      const toolId = typeof activity["toolId"] === "string" ? activity["toolId"] : null;
      const toolName = typeof activity["toolName"] === "string" ? activity["toolName"] : "Tool";
      const command = typeof activity["command"] === "string" ? activity["command"] : toolName;
      toolActivityById.set(id, { phase, toolId, toolName, command });
      await appendEvent(
        "tool_call",
        "running",
        { phase, toolId, toolName, toolInput: command },
        `Tool started: ${toolName}`,
        `${toolName} started for ${phase}.`,
        command
      );
    };
    const updateToolActivity = async (id: string, patch: Record<string, unknown>) => {
      const activity = toolActivityById.get(id);
      if (!activity) {
        throw new RequestError(500, `Workflow attack-map tool activity ${id} is missing.`);
      }
      const outputPreview = typeof patch["outputPreview"] === "string" ? patch["outputPreview"] : null;
      const status = patch["status"] === "failed" ? "failed" : "completed";
      await appendEvent(
        "tool_result",
        status,
        {
          phase: activity.phase,
          toolId: activity.toolId,
          toolName: activity.toolName,
          toolInput: activity.command,
          output: outputPreview,
          exitCode: typeof patch["exitCode"] === "number" ? patch["exitCode"] : null
        },
        `Tool completed: ${activity.toolName}`,
        outputPreview ?? `${activity.toolName} ${status}.`,
        outputPreview
      );
    };
    const appendReconProbeEvent = async (probe: {
      toolName: string;
      command: string;
      output: string;
      status: "completed" | "failed";
    }) => {
      await appendEvent(
        "tool_call",
        "running",
        { phase: "recon", toolId: null, toolName: probe.toolName, input: probe.command },
        `Tool started: ${probe.toolName}`,
        `${probe.toolName} started for recon.`,
        probe.command
      );
      const outputPreview = probe.status === "failed"
        ? `${probe.toolName} failed during recon.`
        : `${probe.toolName} completed during recon.`;
      await appendEvent(
        "tool_result",
        probe.status,
        {
          phase: "recon",
          toolId: null,
          toolName: probe.toolName,
          summary: outputPreview,
          fullOutput: probe.output
        },
        `Tool completed: ${probe.toolName}`,
        outputPreview,
        probe.output
      );
    };

    const plannerToolContext = this.formatToolContextSections([{
      title: "Planner-visible tools",
      tools: plannerTools.map((tool) => ({
        name: tool.tool.name,
        description: tool.tool.description
      }))
    }]);

    if (plannerToolContext) {
      await appendEvent(
        "system_message",
        "completed",
        {
          title: "Tool context",
          summary: "Persisted the attack-map tool inventory exposed to the planner.",
          body: plannerToolContext
        },
        "Tool context",
        "Persisted the attack-map tool inventory exposed to the planner.",
        plannerToolContext
      );
    }

    const recon = await orchestrator.runRecon(target.baseUrl, run.id, provider, provider.model, (phase: string, title: string, summary: string) => {
      void emitReasoning(phase, title, summary);
    });
    for (const probe of recon.probes) {
      await appendReconProbeEvent(probe);
    }
    await appendEvent(
      "system_message",
      "completed",
      {
        title: "Recon completed",
        summary: `Recon completed for ${target.baseUrl}.`,
        body: JSON.stringify({ openPorts: recon.openPorts, technologies: recon.technologies, serverInfo: recon.serverInfo }, null, 2),
        phase: "recon"
      },
      "Recon completed",
      `Recon completed for ${target.baseUrl}.`,
      clipText(recon.rawCurl, 1000)
    );

    let plan = await orchestrator.createPlan(target.baseUrl, recon, plannerTools, provider, provider.model, (phase: string, title: string, summary: string) => {
      void emitReasoning(phase, title, summary);
    });
    await appendEvent(
      "system_message",
      "completed",
      {
        title: "Attack plan created",
        summary: plan.summary,
        body: JSON.stringify(plan, null, 2),
        phase: "planning",
        plan
      },
      "Attack plan created",
      plan.summary,
      JSON.stringify(plan, null, 2)
    );

    const findingNodes: AttackMapNode[] = [];
    let phaseIndex = 0;
    while (phaseIndex < plan.phases.length) {
      const phase = plan.phases[phaseIndex] as AttackPlanPhase | undefined;
      phaseIndex += 1;
      if (!phase || phase.status === "completed" || phase.status === "skipped") {
        continue;
      }

      const result = await orchestrator.executePhase(
        target.baseUrl,
        phase,
        recon,
        run.id,
        provider,
        provider.model,
        (reasonPhase: string, title: string, summary: string) => {
          void emitReasoning(reasonPhase, title, summary);
        },
        recordToolActivity,
        updateToolActivity
      );

      for (const finding of result.findings) {
        const severity = ["critical", "high", "medium", "low", "info"].includes(finding.severity)
          ? finding.severity as "critical" | "high" | "medium" | "low" | "info"
          : "medium";
        const workflowFinding = createWorkflowReportedFinding({
          runId: currentRun.id,
          submission: createAttackMapFindingSubmission({
            target,
            title: finding.title,
            severity,
            description: finding.description,
            vector: finding.vector,
            evidence: result.toolAttempts.length > 0
              ? result.toolAttempts.slice(0, 3).map((attempt: { toolRunId: string; toolName: string; output: string }) => ({
                  sourceTool: attempt.toolName,
                  quote: clipText(finding.rawEvidence ?? attempt.output, 600, finding.title),
                  artifactRef: attempt.toolRunId
                }))
              : [{
                  sourceTool: phase.name,
                  quote: clipText(finding.rawEvidence ?? finding.description, 600, finding.title),
                  externalUrl: target.baseUrl
                }],
            toolCommandPreview: result.probeCommand || null,
            tags: ["attack-map", "workflow-orchestrator", phase.name.toLowerCase().replace(/\s+/g, "-")]
          })
        });
        await appendEvent(
          "finding_reported",
          "completed",
          { finding: workflowFinding, phase: phase.name },
          `Finding reported: ${workflowFinding.title}`,
          `${workflowFinding.severity.toUpperCase()} ${workflowFinding.type} on ${workflowFinding.target.host}.`,
          workflowFinding.impact
        );
        findingNodes.push({
          id: workflowFinding.id,
          type: "finding",
          label: workflowFinding.title,
          status: "completed",
          severity,
          data: {
            description: workflowFinding.impact,
            vector: finding.vector
          }
        });
      }

      plan = {
        ...plan,
        phases: plan.phases.map((candidate: AttackPlanPhase) => candidate.id === phase.id
          ? { ...candidate, status: "completed" as const }
          : candidate)
      };

      if (typeof orchestrator.adaptAttackPlan === "function") {
        plan = await orchestrator.adaptAttackPlan(
          target.baseUrl,
          plan,
          phase,
          result.findings,
          getWorkflowReportedFindings(currentRun),
          recon,
          plannerTools,
          provider,
          provider.model,
          (reasonPhase: string, title: string, summary: string) => {
            void emitReasoning(reasonPhase, title, summary);
          }
        );
        await appendEvent(
          "system_message",
          "completed",
          {
            title: "Attack plan updated",
            summary: plan.summary,
            body: JSON.stringify(plan, null, 2),
            phase: "planning",
            plan
          },
          "Attack plan updated",
          plan.summary,
          JSON.stringify(plan, null, 2)
        );
      }
    }

    for (const finding of findingNodes.filter((node) => node.severity === "critical" || node.severity === "high" || node.severity === "medium").slice(0, 4)) {
      const deepFindings = await orchestrator.deepDiveFinding(
        target.baseUrl,
        finding,
        findingNodes,
        recon,
        provider,
        provider.model,
        (phase: string, title: string, summary: string) => {
          void emitReasoning(phase, title, summary);
        }
      );
      for (const child of deepFindings) {
        const workflowFinding = createWorkflowReportedFinding({
          runId: currentRun.id,
          submission: createAttackMapFindingSubmission({
            target,
            title: child.label,
            severity: child.severity ?? "medium",
            description: String(child.data["description"] ?? ""),
            vector: String(child.data["vector"] ?? ""),
            evidence: [{
              sourceTool: "deep_analysis",
              quote: clipText(child.data["description"] ?? child.label, 600, child.label),
              externalUrl: target.baseUrl
            }],
            tags: ["attack-map", "workflow-orchestrator", "deep-analysis"]
          })
        });
        await appendEvent(
          "finding_reported",
          "completed",
          { finding: workflowFinding, phase: "deep_analysis", derivedFrom: finding.label },
          `Finding reported: ${workflowFinding.title}`,
          `${workflowFinding.severity.toUpperCase()} ${workflowFinding.type} on ${workflowFinding.target.host}.`,
          workflowFinding.impact
        );
        findingNodes.push({
          id: workflowFinding.id,
          type: "finding",
          label: workflowFinding.title,
          status: "completed",
          severity: workflowFinding.severity,
          data: {
            description: workflowFinding.impact,
            vector: String(child.data["vector"] ?? "")
          }
        });
      }
    }

    const chains = findingNodes.length >= 2
      ? await orchestrator.correlateAttackChains(findingNodes, target.baseUrl, provider, provider.model, (phase: string, title: string, summary: string) => {
          void emitReasoning(phase, title, summary);
        })
      : [];
    const executedPhaseCount = plan.phases.filter((phase: AttackPlanPhase) => phase.status === "completed").length;
    const skippedPhaseCount = plan.phases.filter((phase: AttackPlanPhase) => phase.status === "skipped").length;

    const stageResult: WorkflowStageResult = {
      status: "completed",
      summary: `Attack-map workflow completed. ${executedPhaseCount} phases executed, ${skippedPhaseCount} phases skipped, ${getWorkflowReportedFindings(currentRun).length} findings reported, ${chains.length} attack chains identified.`,
      findingIds: getWorkflowReportedFindings(currentRun).map((finding) => finding.id),
      recommendedNextStep: "Investigate the highest-severity workflow findings and validate the reported attack paths.",
      residualRisk: `Overall attack-map risk remains ${plan.overallRisk}.`,
      handoff: null,
      submittedAt: new Date().toISOString()
    };

    currentRun = await appendEvent(
      "stage_result_submitted",
      "completed",
      { stageResult },
      `Stage result submitted: ${stage.label}`,
      stageResult.summary,
      stageResult.residualRisk
    );
    currentRun = await appendEvent(
      "stage_completed",
      "completed",
      { stageResult, stageLabel: stage.label },
      `Stage completed: ${stage.label}`,
      stageResult.summary
    );
    await appendEvent(
      "run_completed",
      "completed",
      {
        title: "Attack-map workflow completed",
        summary: stageResult.summary,
        body: plan.summary,
        overallRisk: plan.overallRisk,
        chainCount: chains.length,
        findingNodeCount: getWorkflowReportedFindings(currentRun).length,
        recommendedNextStep: stageResult.recommendedNextStep,
        residualRisk: stageResult.residualRisk
      },
      "Attack-map workflow completed",
      stageResult.summary,
      plan.summary,
      {
        status: "completed",
        completedAt: new Date().toISOString()
      }
    );
    await this.writer.createExecutionReport(currentRun.id);
  }

  private formatToolContextSections(sections: Array<{ title: string; tools: Array<{ name: string; description: string | null | undefined }> }>) {
    return sections
      .map((section) => {
        const lines = section.tools.map((tool) => `${tool.name}: ${tool.description?.trim() || "No description provided."}`);
        if (lines.length === 0) {
          return null;
        }
        return `${section.title}\n\n${lines.join("\n")}`;
      })
      .filter((section): section is string => Boolean(section))
      .join("\n\n");
  }
}
