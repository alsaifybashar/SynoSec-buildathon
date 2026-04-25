import {
  buildWorkflowRunReport,
  buildWorkflowTranscript,
  getToolLookup,
  getWorkflowReportedFindings,
  getWorkflowRunCoverage,
  type Workflow,
  type WorkflowRunCoverageResponse,
  type WorkflowRunFindingsResponse,
  type WorkflowRunReport,
  type WorkflowRunTranscriptResponse
} from "@synosec/contracts";
import { RequestError } from "@/shared/http/request-error.js";
import type { AiAgentsRepository } from "@/modules/ai-agents/index.js";
import type { AiToolsRepository } from "@/modules/ai-tools/index.js";
import type { WorkflowsRepository } from "./workflows.repository.js";

export class WorkflowRunArtifactsService {
  constructor(
    private readonly workflowsRepository: WorkflowsRepository,
    private readonly aiAgentsRepository: AiAgentsRepository,
    private readonly aiToolsRepository: AiToolsRepository
  ) {}

  async getTranscript(runId: string): Promise<WorkflowRunTranscriptResponse> {
    const { run, workflow } = await this.loadRunContext(runId);
    const agents = await this.loadAgents(workflow);
    const tools = await this.loadTools(workflow, agents);

    return {
      runId: run.id,
      transcript: buildWorkflowTranscript({
        workflow,
        run,
        agents,
        toolLookup: getToolLookup(tools),
        running: run.status === "running",
        liveModelOutput: null
      })
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

  private async loadAgents(workflow: Workflow) {
    const uniqueAgentIds = workflow.agentId ? [workflow.agentId] : [];
    const agents = await Promise.all(uniqueAgentIds.map(async (agentId) => this.aiAgentsRepository.getById(agentId)));
    return agents.filter((agent): agent is NonNullable<typeof agent> => Boolean(agent));
  }

  private async loadTools(
    workflow: Workflow,
    agents: Awaited<ReturnType<WorkflowRunArtifactsService["loadAgents"]>>
  ) {
    const toolIds = new Set<string>();
    for (const toolId of workflow.allowedToolIds ?? []) {
      toolIds.add(toolId);
    }
    for (const agent of agents) {
      for (const toolId of agent.toolIds) {
        toolIds.add(toolId);
      }
    }

    const tools = await Promise.all([...toolIds].map(async (toolId) => this.aiToolsRepository.getById(toolId)));
    return tools.filter((tool): tool is NonNullable<typeof tool> => Boolean(tool));
  }
}
