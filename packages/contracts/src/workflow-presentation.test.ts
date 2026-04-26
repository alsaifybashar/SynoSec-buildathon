import { describe, expect, it } from "vitest";
import {
  defaultWorkflowStageSystemPrompt,
  defaultWorkflowTaskPromptTemplate,
  type AiAgent,
  type Workflow,
  type WorkflowRun
} from "./resources.js";
import { buildWorkflowTranscript, getWorkflowRunContextTokenEstimate, getWorkflowRunModelStepCount, getWorkflowRunTokenUsage } from "./workflow-presentation.js";

const workflow: Workflow = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "Streaming Workflow",
  status: "active",
  description: null,
  agentId: "30000000-0000-0000-0000-000000000001",
  objective: "Preserve streamed text and tools.",
  stageSystemPrompt: defaultWorkflowStageSystemPrompt,
  taskPromptTemplate: defaultWorkflowTaskPromptTemplate,
  allowedToolIds: ["tool-1"],
  requiredEvidenceTypes: [],
  findingPolicy: {
    taxonomy: "typed-core-v1",
    allowedTypes: ["other"]
  },
  completionRule: {
    requireStageResult: false,
    requireToolCall: false,
    allowEmptyResult: true,
    minFindings: 0,
    requireReachableSurface: false,
    requireEvidenceBackedWeakness: false,
    requireOsiCoverageStatus: false,
    requireChainedFindings: false
  },
  resultSchemaVersion: 1,
  handoffSchema: null,
  stages: [],
  createdAt: "2026-04-25T00:00:00.000Z",
  updatedAt: "2026-04-25T00:00:00.000Z"
};

const agents: AiAgent[] = [{
  id: workflow.agentId,
  name: "Streaming Agent",
  status: "active",
  description: null,
  systemPrompt: "Be precise.",
  toolIds: ["tool-1"],
  createdAt: "2026-04-25T00:00:00.000Z",
  updatedAt: "2026-04-25T00:00:00.000Z"
}];

describe("buildWorkflowTranscript", () => {
  it("preserves whitespace across streamed text and reasoning chunks", () => {
    const run: WorkflowRun = {
      id: "50000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowLaunchId: "60000000-0000-0000-0000-000000000001",
      targetId: "70000000-0000-0000-0000-000000000001",
      status: "running",
      currentStepIndex: 0,
      startedAt: "2026-04-25T00:00:00.000Z",
      completedAt: null,
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: [
        {
          id: "start-step",
          workflowRunId: "50000000-0000-0000-0000-000000000001",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 0,
          type: "system_message",
          status: "completed",
          title: "Model step started",
          summary: "Started a new model step.",
          detail: null,
          payload: {
            rawStreamPartType: "start-step"
          },
          createdAt: "2026-04-25T00:00:00.000Z"
        },
        {
          id: "text-1",
          workflowRunId: "50000000-0000-0000-0000-000000000001",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 1,
          type: "model_decision",
          status: "running",
          title: "Model streamed text",
          summary: "Hello ",
          detail: "Hello ",
          payload: {
            rawStreamPartType: "text",
            text: "Hello "
          },
          createdAt: "2026-04-25T00:00:00.100Z"
        },
        {
          id: "text-2",
          workflowRunId: "50000000-0000-0000-0000-000000000001",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 2,
          type: "model_decision",
          status: "running",
          title: "Model streamed text",
          summary: "world",
          detail: "world",
          payload: {
            rawStreamPartType: "text",
            text: "world"
          },
          createdAt: "2026-04-25T00:00:00.200Z"
        },
        {
          id: "reasoning-1",
          workflowRunId: "50000000-0000-0000-0000-000000000001",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 3,
          type: "model_decision",
          status: "running",
          title: "Model streamed reasoning",
          summary: "Think ",
          detail: "Think ",
          payload: {
            rawStreamPartType: "reasoning",
            text: "Think "
          },
          createdAt: "2026-04-25T00:00:00.300Z"
        },
        {
          id: "reasoning-2",
          workflowRunId: "50000000-0000-0000-0000-000000000001",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 4,
          type: "model_decision",
          status: "running",
          title: "Model streamed reasoning",
          summary: "carefully",
          detail: "carefully",
          payload: {
            rawStreamPartType: "reasoning",
            text: "carefully"
          },
          createdAt: "2026-04-25T00:00:00.400Z"
        },
        {
          id: "finish-step",
          workflowRunId: "50000000-0000-0000-0000-000000000001",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 5,
          type: "system_message",
          status: "completed",
          title: "Model step finished",
          summary: "Step finished with reason: stop.",
          detail: null,
          payload: {
            rawStreamPartType: "finish-step"
          },
          createdAt: "2026-04-25T00:00:00.500Z"
        }
      ]
    };

    const transcript = buildWorkflowTranscript({
      workflow,
      run,
      agents,
      toolLookup: {},
      running: true
    });

    const assistantTurn = transcript.items.find((item) => item.kind === "assistant_turn");
    expect(assistantTurn && assistantTurn.kind === "assistant_turn" ? assistantTurn.body : null).toBe("Hello world");
    expect(assistantTurn && assistantTurn.kind === "assistant_turn" ? assistantTurn.reasoning : null).toBe("Think carefully");
  });

  it("normalizes raw tool stream part names and keeps toolCallId on transcript details", () => {
    const run: WorkflowRun = {
      id: "50000000-0000-0000-0000-000000000002",
      workflowId: workflow.id,
      workflowLaunchId: "60000000-0000-0000-0000-000000000002",
      targetId: "70000000-0000-0000-0000-000000000002",
      status: "completed",
      currentStepIndex: 0,
      startedAt: "2026-04-25T00:00:00.000Z",
      completedAt: "2026-04-25T00:00:01.000Z",
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: [
        {
          id: "tool-call",
          workflowRunId: "50000000-0000-0000-0000-000000000002",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 0,
          type: "tool_call",
          status: "running",
          title: "Calling Web Probe",
          summary: "Started streaming arguments.",
          detail: "{\"url\":\"http://localhost\"}",
          payload: {
            rawStreamPartType: "tool-call",
            toolCallId: "call-1",
            toolId: "tool-1",
            toolName: "Web Probe",
            input: "{\"url\":\"http://localhost\"}"
          },
          createdAt: "2026-04-25T00:00:00.100Z"
        },
        {
          id: "tool-result",
          workflowRunId: "50000000-0000-0000-0000-000000000002",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 1,
          type: "tool_result",
          status: "completed",
          title: "Web Probe returned",
          summary: "200 OK",
          detail: "HTTP/1.1 200 OK",
          payload: {
            rawStreamPartType: "tool-result",
            toolCallId: "call-1",
            toolId: "tool-1",
            toolName: "Web Probe",
            output: {
              ok: true
            },
            summary: "200 OK"
          },
          createdAt: "2026-04-25T00:00:00.200Z"
        }
      ]
    };

    const transcript = buildWorkflowTranscript({
      workflow,
      run,
      agents,
      toolLookup: {
        "tool-1": "Web Probe"
      },
      running: false
    });

    const assistantTurn = transcript.items.find((item) => item.kind === "assistant_turn");
    expect(assistantTurn && assistantTurn.kind === "assistant_turn" ? assistantTurn.details[0]?.kind : null).toBe("tool_call");
    if (!assistantTurn || assistantTurn.kind !== "assistant_turn") {
      throw new Error("assistant turn missing");
    }
    expect(assistantTurn.details[0]?.kind === "tool_call" ? assistantTurn.details[0].toolCallId : null).toBe("call-1");
    expect(assistantTurn.details[1]?.kind === "tool_result" ? assistantTurn.details[1].toolCallId : null).toBe("call-1");
  });

  it("prefers persisted full tool output over serialized tool result JSON", () => {
    const run: WorkflowRun = {
      id: "50000000-0000-0000-0000-000000000002a",
      workflowId: workflow.id,
      workflowLaunchId: "60000000-0000-0000-0000-000000000002a",
      targetId: "70000000-0000-0000-0000-000000000002",
      status: "completed",
      currentStepIndex: 0,
      startedAt: "2026-04-25T00:00:00.000Z",
      completedAt: "2026-04-25T00:00:01.000Z",
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: [
        {
          id: "tool-result",
          workflowRunId: "50000000-0000-0000-0000-000000000002a",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 0,
          type: "tool_result",
          status: "completed",
          title: "Web Probe returned",
          summary: "200 OK",
          detail: "HTTP/1.1 200 OK",
          payload: {
            toolId: "tool-1",
            toolName: "Web Probe",
            fullOutput: "HTTP/1.1 200 OK",
            output: {
              ok: true
            },
            summary: "200 OK"
          },
          createdAt: "2026-04-25T00:00:00.200Z"
        }
      ]
    };

    const transcript = buildWorkflowTranscript({
      workflow,
      run,
      agents,
      toolLookup: {
        "tool-1": "Web Probe"
      },
      running: false
    });

    const assistantTurn = transcript.items.find((item) => item.kind === "assistant_turn");
    if (!assistantTurn || assistantTurn.kind !== "assistant_turn") {
      throw new Error("assistant turn missing");
    }
    expect(assistantTurn.details[0]?.kind === "tool_result" ? assistantTurn.details[0].body : null).toBe("HTTP/1.1 200 OK");
  });

  it("does not synthesize assistant prose for a turn that only contains tool results", () => {
    const run: WorkflowRun = {
      id: "50000000-0000-0000-0000-000000000003",
      workflowId: workflow.id,
      workflowLaunchId: "60000000-0000-0000-0000-000000000003",
      targetId: "70000000-0000-0000-0000-000000000003",
      status: "completed",
      currentStepIndex: 0,
      startedAt: "2026-04-25T00:00:00.000Z",
      completedAt: "2026-04-25T00:00:01.000Z",
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: [
        {
          id: "start-step",
          workflowRunId: "50000000-0000-0000-0000-000000000003",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 0,
          type: "system_message",
          status: "completed",
          title: "Model step started",
          summary: "Started a new model step.",
          detail: null,
          payload: {
            rawStreamPartType: "start-step"
          },
          createdAt: "2026-04-25T00:00:00.000Z"
        },
        {
          id: "tool-result",
          workflowRunId: "50000000-0000-0000-0000-000000000003",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 1,
          type: "tool_result",
          status: "completed",
          title: "HTTP Recon returned",
          summary: "Discovered an HTTP 200 response on the target.",
          detail: "HTTP/1.1 200 OK",
          payload: {
            toolId: "tool-1",
            toolName: "HTTP Recon",
            summary: "Discovered an HTTP 200 response on the target."
          },
          createdAt: "2026-04-25T00:00:00.100Z"
        },
        {
          id: "finish-step",
          workflowRunId: "50000000-0000-0000-0000-000000000003",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 2,
          type: "system_message",
          status: "completed",
          title: "Model step finished",
          summary: "Step finished with reason: stop.",
          detail: null,
          payload: {
            rawStreamPartType: "finish-step"
          },
          createdAt: "2026-04-25T00:00:00.200Z"
        }
      ]
    };

    const transcript = buildWorkflowTranscript({
      workflow,
      run,
      agents,
      toolLookup: {
        "tool-1": "HTTP Recon"
      },
      running: false
    });

    const assistantTurn = transcript.items.find((item) => item.kind === "assistant_turn");
    if (!assistantTurn || assistantTurn.kind !== "assistant_turn") {
      throw new Error("assistant turn missing");
    }
    expect(assistantTurn.body).toBeNull();
    expect(assistantTurn.details[0]?.kind === "tool_result" ? assistantTurn.details[0].summary : null)
      .toBe("Discovered an HTTP 200 response on the target.");
  });

  it("does not append duplicate live output when streamed text events already exist", () => {
    const run: WorkflowRun = {
      id: "50000000-0000-0000-0000-000000000004",
      workflowId: workflow.id,
      workflowLaunchId: "60000000-0000-0000-0000-000000000004",
      targetId: "70000000-0000-0000-0000-000000000004",
      status: "running",
      currentStepIndex: 0,
      startedAt: "2026-04-25T00:00:00.000Z",
      completedAt: null,
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: [
        {
          id: "start-step-live",
          workflowRunId: "50000000-0000-0000-0000-000000000004",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 0,
          type: "system_message",
          status: "completed",
          title: "Model step started",
          summary: "Started a new model step.",
          detail: null,
          payload: {
            rawStreamPartType: "start-step"
          },
          createdAt: "2026-04-25T00:00:00.000Z"
        },
        {
          id: "text-live",
          workflowRunId: "50000000-0000-0000-0000-000000000004",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 1,
          type: "model_decision",
          status: "running",
          title: "Model streamed text",
          summary: "Hello",
          detail: "Hello",
          payload: {
            rawStreamPartType: "text",
            text: "Hello"
          },
          createdAt: "2026-04-25T00:00:00.100Z"
        }
      ]
    };

    const transcript = buildWorkflowTranscript({
      workflow,
      run,
      agents,
      toolLookup: {},
      running: true
    });

    expect(transcript.items.filter((item) => item.kind === "assistant_turn")).toHaveLength(1);
    const assistantTurn = transcript.items.find((item) => item.kind === "assistant_turn");
    expect(assistantTurn && assistantTurn.kind === "assistant_turn" ? assistantTurn.body : null).toBe("Hello");
  });

  it("prefers final totalUsage over step usage when computing workflow run token usage", () => {
    const run: WorkflowRun = {
      id: "50000000-0000-0000-0000-000000000005",
      workflowId: workflow.id,
      workflowLaunchId: "60000000-0000-0000-0000-000000000005",
      targetId: "70000000-0000-0000-0000-000000000005",
      status: "completed",
      currentStepIndex: 0,
      startedAt: "2026-04-25T00:00:00.000Z",
      completedAt: "2026-04-25T00:00:01.000Z",
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: [
        {
          id: "finish-step-usage",
          workflowRunId: "50000000-0000-0000-0000-000000000005",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 0,
          type: "system_message",
          status: "completed",
          title: "Model step finished",
          summary: "Step finished with reason: stop.",
          detail: null,
          payload: {
            rawStreamPartType: "finish-step",
            usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 }
          },
          createdAt: "2026-04-25T00:00:00.500Z"
        },
        {
          id: "finish-total-usage",
          workflowRunId: "50000000-0000-0000-0000-000000000005",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 1,
          type: "system_message",
          status: "completed",
          title: "Model stream finished",
          summary: "Stream finished with reason: stop.",
          detail: null,
          payload: {
            rawStreamPartType: "finish",
            totalUsage: { inputTokens: 20, outputTokens: 8, totalTokens: 28 }
          },
          createdAt: "2026-04-25T00:00:01.000Z"
        }
      ]
    };

    expect(getWorkflowRunTokenUsage(run)).toEqual({
      inputTokens: 20,
      outputTokens: 8,
      totalTokens: 28
    });
  });

  it("falls back to summing finish-step usage when no final totalUsage exists", () => {
    const run: WorkflowRun = {
      id: "50000000-0000-0000-0000-000000000006",
      workflowId: workflow.id,
      workflowLaunchId: "60000000-0000-0000-0000-000000000006",
      targetId: "70000000-0000-0000-0000-000000000006",
      status: "running",
      currentStepIndex: 1,
      startedAt: "2026-04-25T00:00:00.000Z",
      completedAt: null,
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: [
        {
          id: "finish-step-usage-1",
          workflowRunId: "50000000-0000-0000-0000-000000000006",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 0,
          type: "system_message",
          status: "completed",
          title: "Model step finished",
          summary: "Step finished with reason: stop.",
          detail: null,
          payload: {
            rawStreamPartType: "finish-step",
            usage: { inputTokens: 3, outputTokens: 2, totalTokens: 5 }
          },
          createdAt: "2026-04-25T00:00:00.500Z"
        },
        {
          id: "finish-step-usage-2",
          workflowRunId: "50000000-0000-0000-0000-000000000006",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 1,
          ord: 1,
          type: "system_message",
          status: "completed",
          title: "Model step finished",
          summary: "Step finished with reason: stop.",
          detail: null,
          payload: {
            rawStreamPartType: "finish-step",
            usage: { inputTokens: 4, outputTokens: 1, totalTokens: 5 }
          },
          createdAt: "2026-04-25T00:00:01.000Z"
        }
      ]
    };

    expect(getWorkflowRunTokenUsage(run)).toEqual({
      inputTokens: 7,
      outputTokens: 3,
      totalTokens: 10
    });
  });

  it("estimates final-step context load from the last persisted start-step request body", () => {
    const run: WorkflowRun = {
      id: "50000000-0000-0000-0000-000000000007",
      workflowId: workflow.id,
      workflowLaunchId: "60000000-0000-0000-0000-000000000007",
      targetId: "70000000-0000-0000-0000-000000000007",
      status: "running",
      currentStepIndex: 1,
      startedAt: "2026-04-25T00:00:00.000Z",
      completedAt: null,
      tokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      trace: [],
      events: [
        {
          id: "start-step-request-1",
          workflowRunId: "50000000-0000-0000-0000-000000000007",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 0,
          ord: 0,
          type: "system_message",
          status: "completed",
          title: "Model step started",
          summary: "Started a new model step.",
          detail: null,
          payload: {
            rawStreamPartType: "start-step",
            request: {
              system: "A".repeat(4000),
              messages: [{ role: "user", content: "B".repeat(4000) }]
            }
          },
          createdAt: "2026-04-25T00:00:00.100Z"
        },
        {
          id: "start-step-request-2",
          workflowRunId: "50000000-0000-0000-0000-000000000007",
          workflowId: workflow.id,
          workflowStageId: null,
          stepIndex: 1,
          ord: 1,
          type: "system_message",
          status: "completed",
          title: "Model step started",
          summary: "Started a new model step.",
          detail: null,
          payload: {
            rawStreamPartType: "start-step",
            request: {
              system: "A".repeat(4000),
              messages: [
                { role: "user", content: "B".repeat(4000) },
                { role: "assistant", content: "C".repeat(4000) }
              ]
            }
          },
          createdAt: "2026-04-25T00:00:00.200Z"
        }
      ]
    };

    expect(getWorkflowRunContextTokenEstimate(run)).toBeGreaterThan(2000);
    expect(getWorkflowRunContextTokenEstimate(run)).toBeLessThan(5000);
    expect(getWorkflowRunModelStepCount(run)).toBe(2);
  });
});
