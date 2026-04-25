import type { OrchestratorRunRecord } from "./orchestrator-execution-service.js";

export interface AttackMapRunLaunchPort {
  createRun(targetUrl: string, providerId: string): Promise<OrchestratorRunRecord>;
}

export interface AttackMapRunStartPort {
  runAttackMapRun(runId: string): Promise<void>;
}

export class AttackMapRunLauncher {
  constructor(
    private readonly createPort: AttackMapRunLaunchPort,
    private readonly startPort: AttackMapRunStartPort
  ) {}

  create(targetUrl: string, providerId: string): Promise<OrchestratorRunRecord> {
    return this.createPort.createRun(targetUrl, providerId);
  }

  start(runId: string): void {
    void this.startPort.runAttackMapRun(runId);
  }
}
