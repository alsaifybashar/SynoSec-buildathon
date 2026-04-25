export class InMemoryRunStream<Message> {
  private readonly listeners = new Map<string, Set<(message: Message) => void>>();

  subscribe(runId: string, listener: (message: Message) => void) {
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

  publish(runId: string, message: Message) {
    const listeners = this.listeners.get(runId);
    if (!listeners || listeners.size === 0) {
      return;
    }

    for (const listener of listeners) {
      listener(message);
    }
  }
}
