const DEFAULT_WORKFLOW_RUN_CONCURRENCY = 1;
const WORKFLOW_RUN_CONCURRENCY_ENV = "WORKFLOW_RUN_CONCURRENCY";

type ScheduledRunTask = () => Promise<void>;

export class WorkflowRunScheduler {
  private readonly concurrency: number;
  private readonly queue: string[] = [];
  private readonly queuedOrRunning = new Set<string>();
  private readonly tasks = new Map<string, ScheduledRunTask>();
  private activeCount = 0;

  constructor() {
    this.concurrency = getWorkflowRunConcurrency();
  }

  schedule(runId: string, task: ScheduledRunTask) {
    if (this.queuedOrRunning.has(runId)) {
      return false;
    }

    this.queuedOrRunning.add(runId);
    this.tasks.set(runId, task);
    this.queue.push(runId);
    void this.drain();
    return true;
  }

  private async drain(): Promise<void> {
    while (this.activeCount < this.concurrency) {
      const runId = this.queue.shift();
      if (!runId) {
        return;
      }

      const task = this.tasks.get(runId);
      if (!task) {
        this.queuedOrRunning.delete(runId);
        continue;
      }

      this.tasks.delete(runId);
      this.activeCount += 1;

      void task()
        .catch(() => undefined)
        .finally(() => {
          this.activeCount -= 1;
          this.queuedOrRunning.delete(runId);
          void this.drain();
        });
    }
  }
}

function getWorkflowRunConcurrency() {
  const rawValue = process.env[WORKFLOW_RUN_CONCURRENCY_ENV];
  if (!rawValue) {
    return DEFAULT_WORKFLOW_RUN_CONCURRENCY;
  }

  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return DEFAULT_WORKFLOW_RUN_CONCURRENCY;
  }

  return Math.floor(parsedValue);
}
