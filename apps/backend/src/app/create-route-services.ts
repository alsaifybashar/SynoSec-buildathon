import { SingleAgentScanService } from "@/features/scans/single-agent-scan.service.js";
import { OrchestratorService } from "@/features/orchestrator/orchestrator.service.js";
import { OrchestratorStream } from "@/features/orchestrator/orchestrator.stream.js";
import { WorkflowExecutionService } from "@/features/workflows/workflow-execution.service.js";
import { WorkflowRunStream } from "@/features/workflows/workflow-run-stream.js";
import type { AppDependencies } from "@/app/create-app.js";

export function createRouteServices(dependencies: Pick<
  AppDependencies,
  | "applicationsRepository"
  | "runtimesRepository"
  | "aiProvidersRepository"
  | "aiAgentsRepository"
  | "aiToolsRepository"
  | "workflowsRepository"
>) {
  const orchestratorStream = new OrchestratorStream();
  const orchestratorService = new OrchestratorService(orchestratorStream, dependencies.aiProvidersRepository);
  const workflowRunStream = new WorkflowRunStream();
  const singleAgentScanService = new SingleAgentScanService(
    dependencies.applicationsRepository,
    dependencies.runtimesRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository
  );
  const workflowExecutionService = new WorkflowExecutionService(
    dependencies.workflowsRepository,
    dependencies.applicationsRepository,
    dependencies.runtimesRepository,
    dependencies.aiAgentsRepository,
    dependencies.aiProvidersRepository,
    dependencies.aiToolsRepository,
    workflowRunStream,
    singleAgentScanService
  );

  return {
    orchestratorStream,
    orchestratorService,
    workflowRunStream,
    workflowExecutionService
  };
}
