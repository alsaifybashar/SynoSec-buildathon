import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AiAgent, AiTool, Application, Runtime, Workflow, WorkflowRun } from "@synosec/contracts";
import { WorkflowTraceSection } from "@/features/workflows/workflow-trace-section";

const workflow: Workflow = {
  id: "10000000-0000-0000-0000-000000000001",
  name: "OSI Single-Agent",
  status: "active",
  description: "Workflow debug transcript test",
  applicationId: "20000000-0000-0000-0000-000000000001",
  runtimeId: "30000000-0000-0000-0000-000000000001",
  agentId: "50000000-0000-0000-0000-000000000001",
  objective: "Run one evidence-backed workflow pass.",
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
    minFindings: 0
  },
  resultSchemaVersion: 1,
  handoffSchema: null,
  stages: [
    {
      id: "40000000-0000-0000-0000-000000000001",
      label: "OSI Security Pass",
      agentId: "50000000-0000-0000-0000-000000000001",
      ord: 0,
      objective: "Run one evidence-backed workflow pass.",
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
        minFindings: 0
      },
      resultSchemaVersion: 1,
      handoffSchema: null
    }
  ],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
};

const run: WorkflowRun = {
  id: "60000000-0000-0000-0000-000000000001",
  workflowId: workflow.id,
  status: "completed",
  currentStepIndex: 1,
  startedAt: "2026-04-21T00:00:00.000Z",
  completedAt: "2026-04-21T00:01:00.000Z",
  trace: [],
  events: [
    {
      id: "70000000-0000-0000-0000-000000000001",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 0,
      type: "stage_started",
      status: "running",
      title: "OSI Security Pass started",
      summary: "Started the workflow stage.",
      detail: null,
      payload: {},
      createdAt: "2026-04-21T00:00:00.000Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000002",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 1,
      type: "system_message",
      status: "completed",
      title: "Single-agent runtime bootstrapped",
      summary: "Loaded the preconfigured scope, target, approved tools, and verification policy for this run.",
      detail: "Application: Demo App\nTarget: http://localhost:8888/\nRuntime: Demo Runtime",
      payload: {
        lane: "system",
        messageKind: "bootstrap"
      },
      createdAt: "2026-04-21T00:00:00.500Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000002a",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 2,
      type: "system_message",
      status: "completed",
      title: "Rendered system prompt",
      summary: "Persisted the exact system instruction payload used to drive the workflow pipeline.",
      detail: "system prompt text",
      payload: {
        lane: "system",
        messageKind: "prompt",
        fullPrompt: "system prompt text"
      },
      createdAt: "2026-04-21T00:00:01.000Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000002b",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 3,
      type: "system_message",
      status: "completed",
      title: "Rendered task prompt",
      summary: "Persisted the exact task prompt delivered to the agent for this run.",
      detail: "",
      payload: {
        lane: "system",
        messageKind: "prompt",
        promptKind: "task",
        fullPrompt: ""
      },
      createdAt: "2026-04-21T00:00:01.500Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000002c",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 4,
      type: "system_message",
      status: "completed",
      title: "Tool context",
      summary: "Persisted the tool inventory exposed to the workflow model.",
      detail: [
        "Evidence tools",
        "",
        "Web Probe: Probe the web target.",
        "",
        "Built-in actions",
        "",
        "report_finding: Persist one evidence-backed workflow finding.",
        "complete_run: Finish the workflow pipeline successfully.",
        "fail_run: Finish the workflow pipeline as failed."
      ].join("\n"),
      payload: {
        title: "Tool context",
        summary: "Persisted the tool inventory exposed to the workflow model.",
        body: [
          "Evidence tools",
          "",
          "Web Probe: Probe the web target.",
          "",
          "Built-in actions",
          "",
          "report_finding: Persist one evidence-backed workflow finding.",
          "complete_run: Finish the workflow pipeline successfully.",
          "fail_run: Finish the workflow pipeline as failed."
        ].join("\n")
      },
      createdAt: "2026-04-21T00:00:01.750Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000003",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 5,
      type: "model_decision",
      status: "completed",
      title: "Agent selected Web Probe",
      summary: "The agent selected Web Probe as the next evidence action.",
      detail: [
        "The agent selected Web Probe for concrete web evidence against localhost:8888.",
        "",
        "{",
        "  \"action\": \"call_tool\",",
        "  \"toolId\": \"tool-1\",",
        "  \"input\": {",
        "    \"target\": \"localhost\",",
        "    \"baseUrl\": \"http://localhost:8888\",",
        "    \"layer\": \"L7\"",
        "  },",
        "  \"reasoning\": \"Probe the exposed web surface first.\"",
        "}",
        "",
        "This should give us immediate application-layer evidence before closeout."
      ].join("\n"),
      payload: {
        lane: "agent",
        messageKind: "decision",
        reasoning: "Probe the exposed web surface first.",
        rawModelOutput: [
          "The agent selected Web Probe for concrete web evidence against localhost:8888.",
          "",
          "{",
          "  \"action\": \"call_tool\",",
          "  \"toolId\": \"tool-1\",",
          "  \"input\": {",
          "    \"target\": \"localhost\",",
          "    \"baseUrl\": \"http://localhost:8888\",",
          "    \"layer\": \"L7\"",
          "  },",
          "  \"reasoning\": \"Probe the exposed web surface first.\"",
          "}",
          "",
          "This should give us immediate application-layer evidence before closeout."
        ].join("\n")
      },
      createdAt: "2026-04-21T00:00:02.000Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000004",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 6,
      type: "tool_call",
      status: "running",
      title: "Web Probe invoked",
      summary: "Calling Web Probe for localhost:8888.",
      detail: "{\"url\":\"http://localhost:8888\"}",
      payload: {
        toolName: "Web Probe",
        toolInput: {
          url: "http://localhost:8888"
        }
      },
      createdAt: "2026-04-21T00:00:03.000Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000005",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 7,
      type: "tool_result",
      status: "completed",
      title: "Web Probe completed",
      summary: "The web probe returned a live HTTP service.",
      detail: "HTTP/1.1 200 OK",
      payload: {
        toolName: "Web Probe",
        fullOutput: "HTTP/1.1 200 OK",
        observationSummaries: ["HTTP service responded with 200 OK.", "Headers were returned immediately."]
      },
      createdAt: "2026-04-21T00:00:03.500Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000006",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 8,
      type: "finding_reported",
      status: "completed",
      title: "Finding recorded",
      summary: "The workflow reported an informational exposure.",
      detail: null,
      payload: {
        finding: {
          id: "80000000-0000-0000-0000-000000000001",
          workflowRunId: "60000000-0000-0000-0000-000000000001",
          workflowStageId: workflow.stages[0]!.id,
          title: "Missing security headers",
          type: "other",
          severity: "medium",
          confidence: 0.82,
          evidence: [
            {
              sourceTool: "Web Probe",
              quote: "HTTP/1.1 200 OK"
            }
          ],
          impact: "Responses are missing baseline hardening headers.",
          recommendation: "Return HSTS and frame protection headers.",
          target: {
            host: "localhost"
          },
          createdAt: "2026-04-21T00:00:03.750Z"
        }
      },
      createdAt: "2026-04-21T00:00:03.750Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000007",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 9,
      type: "verification",
      status: "completed",
      title: "Evidence checkpoint after Web Probe",
      summary: "Accepted 2 observation reference(s) from Web Probe as usable evidence for L7.",
      detail: "Accepted evidence summaries: HTTP service responded with 200 OK.\nHeaders were returned immediately.",
      payload: {
        lane: "verification",
        messageKind: "accept"
      },
      createdAt: "2026-04-21T00:00:03.900Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000008",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 10,
      type: "agent_summary",
      status: "completed",
      title: "Agent summarized the run",
      summary: "The agent recorded the final operator-facing summary.",
      detail: "Service reachable and a missing-header issue was captured.",
      payload: {},
      createdAt: "2026-04-21T00:00:03.950Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000008",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 11,
      type: "stage_completed",
      status: "completed",
      title: "OSI Security Pass completed",
      summary: "The workflow finished and persisted its latest report artifacts.",
      detail: "Run completed successfully.",
      payload: {},
      createdAt: "2026-04-21T00:00:04.000Z"
    }
  ]
};

const applications: Application[] = [{
  id: workflow.applicationId,
  name: "Demo App",
  baseUrl: "http://localhost:8888",
  environment: "development",
  status: "active",
  lastScannedAt: null,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
}];

const runtimes: Runtime[] = [{
  id: workflow.runtimeId ?? "",
  name: "Demo Runtime",
  serviceType: "api",
  provider: "docker",
  environment: "development",
  region: "local",
  status: "healthy",
  applicationId: workflow.applicationId,
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
}];

const agents: AiAgent[] = [{
  id: workflow.agentId,
  name: "Local Orchestrator",
  status: "active",
  description: "Execution agent",
  providerId: "provider-1",
  systemPrompt: "Use evidence-backed actions only.",
  modelOverride: null,
  toolIds: ["tool-1"],
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
}];

const tools: AiTool[] = [{
  id: "tool-1",
  name: "Web Probe",
  status: "active",
  source: "custom",
  description: "Probe the web target.",
  binary: "curl",
  executorType: "bash",
  bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
  capabilities: ["web-recon"],
  category: "web",
  riskTier: "passive",
  notes: null,
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 30000,
  inputSchema: {
    type: "object",
    properties: {
      url: {
        type: "string"
      }
    },
    required: ["url"]
  },
  outputSchema: {
    type: "object",
    properties: {}
  },
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
}];

const activeRun: WorkflowRun = {
  ...run,
  status: "running",
  completedAt: null
};

const streamedNarrationRun: WorkflowRun = {
  id: "60000000-0000-0000-0000-000000000010",
  workflowId: workflow.id,
  status: "running",
  currentStepIndex: 1,
  startedAt: "2026-04-21T00:00:00.000Z",
  completedAt: null,
  trace: [],
  events: [
    {
      id: "stream-1",
      workflowRunId: "60000000-0000-0000-0000-000000000010",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
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
      createdAt: "2026-04-21T00:00:00.100Z"
    },
    {
      id: "stream-2",
      workflowRunId: "60000000-0000-0000-0000-000000000010",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 1,
      type: "model_decision",
      status: "running",
      title: "Model streamed text",
      summary: "Checking the web entrypoint before expanding coverage.",
      detail: "Checking the web entrypoint before expanding coverage.",
      payload: {
        rawStreamPartType: "text",
        text: "Checking the web entrypoint before expanding coverage."
      },
      createdAt: "2026-04-21T00:00:00.200Z"
    },
    {
      id: "stream-3",
      workflowRunId: "60000000-0000-0000-0000-000000000010",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 2,
      type: "tool_call",
      status: "running",
      title: "Calling Web Probe",
      summary: "Invoked Web Probe.",
      detail: "{\"url\":\"http://localhost:8888\"}",
      payload: {
        rawStreamPartType: "tool-call",
        toolName: "Web Probe",
        input: "{\"url\":\"http://localhost:8888\"}"
      },
      createdAt: "2026-04-21T00:00:00.300Z"
    },
    {
      id: "stream-4",
      workflowRunId: "60000000-0000-0000-0000-000000000010",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 3,
      type: "tool_result",
      status: "completed",
      title: "Web Probe returned",
      summary: "HTTP 200 confirmed.",
      detail: "HTTP/1.1 200 OK",
      payload: {
        rawStreamPartType: "tool-result",
        toolName: "Web Probe",
        summary: "HTTP 200 confirmed.",
        observations: ["HTTP service responded with 200 OK."]
      },
      createdAt: "2026-04-21T00:00:00.400Z"
    },
    {
      id: "stream-5",
      workflowRunId: "60000000-0000-0000-0000-000000000010",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 4,
      type: "model_decision",
      status: "running",
      title: "Model streamed text",
      summary: "The surface is reachable, so the next step is header-focused validation.",
      detail: "The surface is reachable, so the next step is header-focused validation.",
      payload: {
        rawStreamPartType: "text",
        text: "The surface is reachable, so the next step is header-focused validation."
      },
      createdAt: "2026-04-21T00:00:00.500Z"
    }
  ]
};

const rejectedModelRun: WorkflowRun = {
  id: "60000000-0000-0000-0000-000000000099",
  workflowId: workflow.id,
  status: "running",
  currentStepIndex: 1,
  startedAt: "2026-04-21T00:00:00.000Z",
  completedAt: null,
  trace: [],
  events: [
    {
      id: "rejected-1",
      workflowRunId: "60000000-0000-0000-0000-000000000099",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 0,
      type: "system_message",
      status: "completed",
      title: "Single-agent runtime bootstrapped",
      summary: "Loaded the preconfigured scope, target, approved tools, and verification policy for this run.",
      detail: null,
      payload: {},
      createdAt: "2026-04-21T00:00:00.100Z"
    },
    {
      id: "rejected-2",
      workflowRunId: "60000000-0000-0000-0000-000000000099",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 1,
      type: "model_decision",
      status: "completed",
      title: "Model produced unsupported output",
      summary: "The model response did not match one of the supported structured actions.",
      detail: [
        "{",
        "  \"osilayer\": \"L7\",",
        "  \"evidenceaction\": \"target/baseUrl/layer\",",
        "  \"rationale\": \"Layer-specific strategy maximizes coverage.\"",
        "}"
      ].join("\n"),
      payload: {
        rawModelOutput: [
          "{",
          "  \"osilayer\": \"L7\",",
          "  \"evidenceaction\": \"target/baseUrl/layer\",",
          "  \"rationale\": \"Layer-specific strategy maximizes coverage.\"",
          "}"
        ].join("\n")
      },
      createdAt: "2026-04-21T00:00:01.000Z"
    },
    {
      id: "rejected-3",
      workflowRunId: "60000000-0000-0000-0000-000000000099",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 2,
      type: "verification",
      status: "failed",
      title: "Verifier rejected the model action",
      summary: "Unsupported action <missing> was returned by the model.",
      detail: "The agent must emit one of the supported structured actions before the run can continue.",
      payload: {
        lane: "verification",
        messageKind: "challenge",
        action: ""
      },
      createdAt: "2026-04-21T00:00:01.100Z"
    }
  ]
};

const failedToolRun: WorkflowRun = {
  id: "60000000-0000-0000-0000-000000000100",
  workflowId: workflow.id,
  status: "running",
  currentStepIndex: 1,
  startedAt: "2026-04-21T00:00:00.000Z",
  completedAt: null,
  trace: [],
  events: [
    {
      id: "toolfail-1",
      workflowRunId: "60000000-0000-0000-0000-000000000100",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 0,
      type: "model_decision",
      status: "completed",
      title: "Agent selected Web Probe",
      summary: "The agent selected Web Probe as the next evidence action.",
      detail: "Retry the web probe with normalized inputs.",
      payload: {
        rawModelOutput: "Retry the web probe with normalized inputs."
      },
      createdAt: "2026-04-21T00:00:02.000Z"
    },
    {
      id: "toolfail-2",
      workflowRunId: "60000000-0000-0000-0000-000000000100",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 1,
      type: "tool_call",
      status: "running",
      title: "Web Probe invoked",
      summary: "Calling Web Probe for localhost:8888.",
      detail: "{\"url\":\"http://localhost:8888\"}",
      payload: {
        toolId: "tool-1",
        toolName: "Web Probe",
        toolInput: {
          url: "http://localhost:8888"
        }
      },
      createdAt: "2026-04-21T00:00:02.100Z"
    },
    {
      id: "toolfail-3",
      workflowRunId: "60000000-0000-0000-0000-000000000100",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 2,
      type: "tool_result",
      status: "failed",
      title: "Web Probe returned failed",
      summary: "connection refused",
      detail: "curl: (7) Failed to connect to localhost port 8888",
      payload: {
        toolId: "tool-1",
        toolName: "Web Probe",
        fullOutput: "curl: (7) Failed to connect to localhost port 8888",
        observationSummaries: []
      },
      createdAt: "2026-04-21T00:00:02.300Z"
    },
    {
      id: "toolfail-4",
      workflowRunId: "60000000-0000-0000-0000-000000000100",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 3,
      type: "verification",
      status: "failed",
      title: "Evidence checkpoint after Web Probe",
      summary: "Web Probe did not complete cleanly; the agent must retry, switch tools, or record the layer as blocked.",
      detail: "Tool status: failed (connection refused)\n\nObservation count: 0",
      payload: {
        lane: "verification",
        messageKind: "challenge",
        toolId: "tool-1",
        toolName: "Web Probe",
        accepted: false
      },
      createdAt: "2026-04-21T00:00:02.400Z"
    }
  ]
};

const summaryOnlyToolRun: WorkflowRun = {
  ...run,
  id: "60000000-0000-0000-0000-000000000101",
  events: run.events.map((event) => {
    if (event.type !== "tool_result") {
      return { ...event, workflowRunId: "60000000-0000-0000-0000-000000000101" };
    }

    return {
      ...event,
      workflowRunId: "60000000-0000-0000-0000-000000000101",
      summary: "Web Probe completed.",
      detail: null,
      payload: {
        toolId: "tool-1",
        toolName: "Web Probe"
      }
    };
  })
};

describe("WorkflowTraceSection", () => {
  it("renders the Duplex workflow thread as inline reading flow with compact tool subtitles", () => {
    const { container } = render(
      <WorkflowTraceSection
        workflow={workflow}
        applications={applications}
        runtimes={runtimes}
        agents={agents}
        tools={tools}
        run={run}
        running={false}
        summaryCard={{
          toolCount: 1,
          toolNames: [tools[0]!.name]
        }}
        showFullDetails={false}
      />
    );

    expect(screen.queryByText("Thread · Workflow Transcript · Duplex Flow")).not.toBeInTheDocument();
    expect(screen.getByText("Prompt context")).toBeInTheDocument();
    expect(screen.getByText("System prompt")).toBeInTheDocument();
    expect(screen.getByText("Tool segment")).toBeInTheDocument();
    expect(screen.getByText("Structured tool segment")).toBeInTheDocument();
    expect(screen.queryByText("Rendered system prompt")).not.toBeInTheDocument();
    expect(screen.queryByText("Built-in actions")).not.toBeInTheDocument();
    expect(screen.getByText("Probe the exposed web surface first.")).toBeInTheDocument();
    expect(screen.getByText(/Called Web Probe/)).toBeInTheDocument();
    expect(screen.getByText(/\{ "url": "http:\/\/localhost.../)).toBeInTheDocument();
    expect(screen.getByText("HTTP service responded with 200 OK.")).toBeInTheDocument();
    expect(screen.getByText("Headers were returned immediately.")).toBeInTheDocument();
    expect(screen.queryByText("HTTP/1.1 200 OK")).not.toBeInTheDocument();
    expect(screen.getByText("Evidence checkpoint after Web Probe")).toBeInTheDocument();
    expect(screen.getAllByText("Findings").length).toBeGreaterThan(0);
    expect(screen.getByText("Run sealed")).toBeInTheDocument();
    expect(screen.queryByText("{\"url\":\"http://localhost:8888\"}")).not.toBeInTheDocument();
    expect(container.querySelector(".duplex-entry")).toBeTruthy();
  });

  it("reveals raw payloads and verbose details when full details mode is enabled", () => {
    render(
      <WorkflowTraceSection
        workflow={workflow}
        applications={applications}
        runtimes={runtimes}
        agents={agents}
        tools={tools}
        run={run}
        running={false}
        summaryCard={{
          toolCount: 1,
          toolNames: [tools[0]!.name]
        }}
        showFullDetails
      />
    );

    expect(screen.getAllByText(/http:\/\/localhost:8888/).length).toBeGreaterThan(0);
    expect(screen.getByText("Output")).toBeInTheDocument();
    expect(screen.getByText("Input")).toBeInTheDocument();
    expect(screen.getByText("HTTP/1.1 200 OK")).toBeInTheDocument();
    expect(screen.getByText("Observations")).toBeInTheDocument();
    expect(screen.getByText("HTTP service responded with 200 OK.")).toBeInTheDocument();
    expect(screen.getByText("Headers were returned immediately.")).toBeInTheDocument();
  });

  it("renders reconstructed structured tool context behind a disclosure", () => {
    render(
      <WorkflowTraceSection
        workflow={workflow}
        applications={applications}
        runtimes={runtimes}
        agents={agents}
        tools={tools}
        run={run}
        running={false}
        summaryCard={{
          toolCount: 1,
          toolNames: [tools[0]!.name]
        }}
        showFullDetails={false}
      />
    );

    expect(screen.getByText("4 tools and actions available to the model.")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Structured tool segment"));

    expect(screen.getByText("Web Probe")).toBeInTheDocument();
    expect(screen.getByText("report_finding")).toBeInTheDocument();
    expect(screen.getByText("complete_run")).toBeInTheDocument();
    expect(screen.getByText("fail_run")).toBeInTheDocument();
    expect(screen.getAllByText("Input schema").length).toBeGreaterThan(0);
    expect(screen.getByText(/"required": \[\s*"url"/)).toBeInTheDocument();
    expect(screen.getAllByText(/"url"/).length).toBeGreaterThan(0);
  });

  it("renders a fallback compact output line when a completed tool has no non-redundant output preview", () => {
    render(
      <WorkflowTraceSection
        workflow={workflow}
        applications={applications}
        runtimes={runtimes}
        agents={agents}
        tools={tools}
        run={summaryOnlyToolRun}
        running={false}
        summaryCard={{
          toolCount: 1,
          toolNames: [tools[0]!.name]
        }}
        showFullDetails={false}
      />
    );

    expect(screen.getByText("completed with no summarized output.")).toBeInTheDocument();
  });

  it("keeps the Duplex workflow thread visible while the workflow run is still active", () => {
    render(
      <WorkflowTraceSection
        workflow={workflow}
        applications={applications}
        runtimes={runtimes}
        agents={agents}
        tools={tools}
        run={activeRun}
        running={true}
        summaryCard={{
          toolCount: 1,
          toolNames: [tools[0]!.name]
        }}
        showFullDetails={false}
      />
    );

    expect(screen.queryByText("Thread · Workflow Transcript · Duplex Flow")).not.toBeInTheDocument();
    expect(screen.getByText("Prompt context")).toBeInTheDocument();
    expect(screen.getAllByText("Agent typing").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Findings").length).toBeGreaterThan(0);
  });

  it("renders streamed narration separately from tool activity for active runs", () => {
    render(
      <WorkflowTraceSection
        workflow={workflow}
        applications={applications}
        runtimes={runtimes}
        agents={agents}
        tools={tools}
        run={streamedNarrationRun}
        running={true}
        summaryCard={{
          toolCount: 1,
          toolNames: [tools[0]!.name]
        }}
        showFullDetails={false}
      />
    );

    expect(screen.getByText(/Checking the web entrypoint before expanding coverage\./)).toBeInTheDocument();
    expect(screen.getByText(/The surface is reachable, so the next step is header-focused validation\./)).toBeInTheDocument();
    expect(screen.getByText(/Called Web Probe/)).toBeInTheDocument();
    expect(screen.getByText("HTTP service responded with 200 OK.")).toBeInTheDocument();
  });

  it("renders standardized model and tool error atoms with retry guidance", () => {
    const { rerender } = render(
      <WorkflowTraceSection
        workflow={workflow}
        applications={applications}
        runtimes={runtimes}
        agents={agents}
        tools={tools}
        run={rejectedModelRun}
        running={true}
        summaryCard={{
          toolCount: 1,
          toolNames: [tools[0]!.name]
        }}
        showFullDetails={false}
      />
    );

    expect(screen.getByText("Model output rejected")).toBeInTheDocument();
    expect(screen.getByText(/The agent must emit one of the supported structured actions/)).toBeInTheDocument();

    rerender(
      <WorkflowTraceSection
        workflow={workflow}
        applications={applications}
        runtimes={runtimes}
        agents={agents}
        tools={tools}
        run={failedToolRun}
        running={true}
        summaryCard={{
          toolCount: 1,
          toolNames: [tools[0]!.name]
        }}
        showFullDetails={false}
      />
    );

    expect(screen.getByText("Web Probe error")).toBeInTheDocument();
    expect(screen.getByText(/Tool status: failed/)).toBeInTheDocument();
    expect(screen.getAllByText("failed").length).toBeGreaterThan(0);
  });

  it("renders the Duplex empty state when no run exists yet", () => {
    render(
      <WorkflowTraceSection
        workflow={workflow}
        applications={applications}
        runtimes={runtimes}
        agents={agents}
        tools={tools}
        run={null}
        running={false}
        summaryCard={{
          toolCount: 1,
          toolNames: [tools[0]!.name]
        }}
        showFullDetails={false}
      />
    );

    expect(screen.getByText("No run yet")).toBeInTheDocument();
    expect(screen.getByText("Start the first Duplex session")).toBeInTheDocument();
  });
});
