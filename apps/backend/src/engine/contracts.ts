import type { StartWorkflowRunBody, WorkflowLaunch, WorkflowRunStreamMessage } from "@synosec/contracts";

export type RunStream<Message> = {
  subscribe(runId: string, listener: (message: Message) => void): () => void;
  publish(runId: string, message: Message): void;
};

export type WorkflowExecutionEngine = {
  startRun(workflowId: string, input?: StartWorkflowRunBody): Promise<WorkflowLaunch>;
  cancelRun(runId: string): Promise<void>;
  stepRun(runId: string): Promise<void>;
};

export type WorkflowRunEventStream = RunStream<WorkflowRunStreamMessage>;
