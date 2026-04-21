import { render, screen } from "@testing-library/react";
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
  stages: [
    {
      id: "40000000-0000-0000-0000-000000000001",
      label: "OSI Security Pass",
      agentId: "50000000-0000-0000-0000-000000000001",
      ord: 0,
      objective: "Run one evidence-backed single-agent pass.",
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
      summary: "Started the single-agent stage.",
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
      title: "Rendered system prompt",
      summary: "Persisted the exact system instruction payload used to drive the single-agent loop.",
      detail: "system prompt text",
      payload: {
        lane: "system",
        messageKind: "prompt",
        fullPrompt: "system prompt text"
      },
      createdAt: "2026-04-21T00:00:01.000Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000003",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 2,
      type: "model_decision",
      status: "completed",
      title: "Agent selected Web Probe",
      summary: "The agent selected Web Probe as the next evidence action.",
      detail: "{\"action\":\"call_tool\"}",
      payload: {
        lane: "agent",
        messageKind: "decision",
        reasoning: "Probe the exposed web surface first."
      },
      createdAt: "2026-04-21T00:00:02.000Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000004",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 3,
      type: "verification",
      status: "completed",
      title: "Verifier accepted the scan closeout",
      summary: "The structured closeout satisfied the single-agent completion contract for this run.",
      detail: "closeout accepted",
      payload: {
        lane: "verification",
        messageKind: "accept"
      },
      createdAt: "2026-04-21T00:00:03.000Z"
    },
    {
      id: "70000000-0000-0000-0000-000000000005",
      workflowRunId: "60000000-0000-0000-0000-000000000001",
      workflowId: workflow.id,
      workflowStageId: workflow.stages[0]!.id,
      stepIndex: 0,
      ord: 4,
      type: "stage_completed",
      status: "completed",
      title: "OSI Security Pass completed",
      summary: "The single-agent workflow finished and persisted its latest report artifacts.",
      detail: null,
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
  id: workflow.stages[0]!.agentId,
  name: "Single-Agent Security Runner",
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
    properties: {}
  },
  outputSchema: {
    type: "object",
    properties: {}
  },
  createdAt: "2026-04-21T00:00:00.000Z",
  updatedAt: "2026-04-21T00:00:00.000Z"
}];

describe("WorkflowTraceSection", () => {
  it("renders persisted system, agent, and verification transcript turns", () => {
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
      />
    );

    expect(screen.getByText("Rendered system prompt")).toBeInTheDocument();
    expect(screen.getByText("Agent selected Web Probe")).toBeInTheDocument();
    expect(screen.getByText("Verifier accepted the scan closeout")).toBeInTheDocument();
    expect(screen.getByText("evidence dossier · sealed")).toBeInTheDocument();
    expect(screen.getByText("Workflow Trace")).toBeInTheDocument();
    expect(container.querySelector("details")).toBeFalsy();
  });

  it("keeps the workflow trace visible while the workflow run is still active", () => {
    render(
      <WorkflowTraceSection
        workflow={workflow}
        applications={applications}
        runtimes={runtimes}
        agents={agents}
        tools={tools}
        run={run}
        running={true}
        summaryCard={{
          toolCount: 1,
          toolNames: [tools[0]!.name]
        }}
      />
    );

    expect(screen.getByText("Workflow Trace")).toBeInTheDocument();
    expect(screen.getByText("Rendered system prompt")).toBeInTheDocument();
  });
});
