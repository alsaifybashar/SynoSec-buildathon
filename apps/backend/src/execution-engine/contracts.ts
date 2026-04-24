import type { WorkflowRun, WorkflowRunStreamMessage } from "@synosec/contracts";
import type { OrchestratorEvent, OrchestratorRunRecord } from "@/execution-engine/orchestrator/index.js";

export type RunStream<Message> = {
  subscribe(runId: string, listener: (message: Message) => void): () => void;
  publish(runId: string, message: Message): void;
};

export type WorkflowExecutionEngine = {
  startRun(workflowId: string): Promise<WorkflowRun>;
  stepRun(runId: string): Promise<void>;
};

export type WorkflowRunEventStream = RunStream<WorkflowRunStreamMessage>;

export type OrchestratorExecutionEngine = {
  createRun(targetUrl: string, providerId: string): Promise<OrchestratorRunRecord>;
  getRun(id: string): Promise<OrchestratorRunRecord | null>;
  listRuns(): Promise<OrchestratorRunRecord[]>;
  startAsync(runId: string, targetUrl: string, providerId: string): void;
};

export type OrchestratorEventStream = RunStream<OrchestratorEvent>;
