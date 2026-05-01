import { describe, expect, it } from "vitest";
import { WorkflowRunStream } from "@/engine/workflow/workflow-run-stream.js";
import { WorkflowExecutionService } from "@/engine/workflow/workflow-execution.service.js";
import { createToolRuntime } from "@/modules/ai-tools/tool-runtime.js";
import { ExecutionReportsService } from "@/modules/execution-reports/index.js";
import { buildAiAgent } from "../../../fixtures/builders/ai-agent.js";
import { buildTarget } from "../../../fixtures/builders/target.js";
import { buildWorkflow } from "../../../fixtures/builders/workflow.js";
import { createTestBackendDependencies } from "../../../fixtures/dependencies/create-test-backend-dependencies.js";
import { FakeWorkflowScheduler } from "../../../drivers/fake-workflow-scheduler.js";
import { FakeWorkflowSessionRunner } from "../../../drivers/fake-workflow-session-runner.js";

describe("WorkflowExecutionService", () => {
  it("schedules launched runs through the injected scheduler", async () => {
    const target = buildTarget();
    const agent = buildAiAgent();
    const workflow = buildWorkflow({ agentId: agent.id });
    const dependencies = createTestBackendDependencies({
      targets: [target],
      agents: [agent],
      workflows: [workflow]
    });
    const scheduler = new FakeWorkflowScheduler();
    const sessionRunner = new FakeWorkflowSessionRunner();
    const service = new WorkflowExecutionService({
      workflowsRepository: dependencies.workflowsRepository,
      targetsRepository: dependencies.targetsRepository,
      aiAgentsRepository: dependencies.aiAgentsRepository,
      aiToolsRepository: dependencies.aiToolsRepository,
      toolRuntime: createToolRuntime(dependencies.aiToolsRepository),
      workflowRunStream: new WorkflowRunStream(),
      executionReportsService: new ExecutionReportsService(),
      fixedAiRuntime: {
        provider: "anthropic",
        providerName: "Anthropic",
        model: "claude-haiku-4-5",
        label: "Anthropic · claude-haiku-4-5",
        apiKey: "test-anthropic-key",
        promptCachingEnabled: true,
        promptCachingTtl: "1h"
      }
    }, {
      scheduler,
      sessionRunner
    });

    const launch = await service.startRun(workflow.id);

    expect(launch.workflowId).toBe(workflow.id);
    expect(scheduler.scheduledRunIds).toHaveLength(1);
    expect(sessionRunner.runIds).toEqual([]);
  });
});
