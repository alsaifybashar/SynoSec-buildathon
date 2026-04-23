import type { WorkflowRun, WorkflowRunStreamMessage } from "@synosec/contracts";

type WorkflowRunStreamBroadcastMessage = WorkflowRunStreamMessage | {
  type: "model_output";
  run: WorkflowRun;
  source: "local" | "hosted";
  text: string;
  final: boolean;
  createdAt: string;
};

type RunListener = (message: WorkflowRunStreamBroadcastMessage) => void;

export class WorkflowRunStream {
  private readonly listeners = new Map<string, Set<RunListener>>();

  subscribe(runId: string, listener: RunListener) {
    const existing = this.listeners.get(runId);
    if (existing) {
      existing.add(listener);
    } else {
      this.listeners.set(runId, new Set([listener]));
    }

    return () => {
      const current = this.listeners.get(runId);
      if (!current) {
        return;
      }

      current.delete(listener);
      if (current.size === 0) {
        this.listeners.delete(runId);
      }
    };
  }

  publish(runId: string, message: WorkflowRunStreamBroadcastMessage) {
    const listeners = this.listeners.get(runId);
    if (!listeners || listeners.size === 0) {
      return;
    }

    for (const listener of listeners) {
      listener(message);
    }
  }
}
