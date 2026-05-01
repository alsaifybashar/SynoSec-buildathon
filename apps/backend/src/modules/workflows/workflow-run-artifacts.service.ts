import {
  buildWorkflowRunReport,
  buildWorkflowTranscript,
  getToolLookup,
  attackPathSummaryFromWorkflowFindings,
  getWorkflowReportedFindings,
  getWorkflowRunCoverage,
  type Workflow,
  type WorkflowRunCoverageResponse,
  type WorkflowRunFindingsResponse,
  type WorkflowRunReport,
  type WorkflowRunTranscriptResponse
} from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import { resolveWorkflowStageTools, type AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { WorkflowsRepository } from "./workflows.repository.js";

export class WorkflowRunArtifactsService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly aiToolsRepository: AiToolsRepository
  ) {}

  async getTranscript(runId: string): Promise<WorkflowRunTranscriptResponse> {
    const { run, workflow } = await this.loadRunContext(runId);
    const tools = await this.loadTools(workflow);

    return {
      runId: run.id,
      transcript: buildWorkflowTranscript({
        workflow,
        run,
        toolLookup: getToolLookup(tools),
        running: run.status === "running"
      }),
      attackPaths: attackPathSummaryFromWorkflowFindings(getWorkflowReportedFindings(run), reportStageHandoff(run))
    };
  }

  async getFindings(runId: string): Promise<WorkflowRunFindingsResponse> {
    const { run } = await this.loadRunContext(runId);
    return {
      runId: run.id,
      findings: getWorkflowReportedFindings(run)
    };
  }

  async getCoverage(runId: string): Promise<WorkflowRunCoverageResponse> {
    const { run } = await this.loadRunContext(runId);
    return {
      runId: run.id,
      layers: getWorkflowRunCoverage(run)
    };
  }

  async getReport(runId: string): Promise<WorkflowRunReport> {
    const { run } = await this.loadRunContext(runId);
    const report = buildWorkflowRunReport(run);
    if (!report) {
      throw new RequestError(404, "Workflow run report not found.");
    }
    return report;
  }

  private async loadRunContext(runId: string) {
    const run = await this.workflowsRepository.getRunById(runId);
    if (!run) {
      throw new RequestError(404, "Workflow run not found.");
    }

    const workflow = await this.workflowsRepository.getById(run.workflowId);
    if (!workflow) {
      throw new RequestError(404, "Workflow not found.");
    }

    return { run, workflow };
  }

  private async loadTools(workflow: Workflow) {
    const registryPage = await this.aiToolsRepository.list({
      page: 1,
      pageSize: 100,
      sortBy: "name",
      sortDirection: "asc"
    });
    const toolIds = new Set<string>();
    for (const stage of workflow.stages) {
      for (const tool of resolveWorkflowStageTools(registryPage.items, stage.allowedToolIds)) {
        toolIds.add(tool.id);
      }
    }

    return registryPage.items.filter((tool) => toolIds.has(tool.id));
  }
}

function reportStageHandoff(run: Awaited<ReturnType<WorkflowsRepository["getRunById"]>>) {
  const latest = run?.events
    .filter((event) => event.type === "stage_result_submitted")
    .slice()
    .sort((left, right) => right.ord - left.ord)[0];
  const stageResult = latest?.payload?.["stageResult"];
  if (!stageResult || typeof stageResult !== "object" || Array.isArray(stageResult)) {
    return null;
  }
  const handoff = (stageResult as Record<string, unknown>)["handoff"];
  return handoff ?? null;
}
