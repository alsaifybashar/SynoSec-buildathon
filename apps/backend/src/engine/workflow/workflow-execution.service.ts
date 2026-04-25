import type { WorkflowRuntimePorts } from "./workflow-runtime.js";
import { WorkflowRuntimeService } from "./workflow-runtime.js";

export class WorkflowExecutionService extends WorkflowRuntimeService {
  constructor(ports: WorkflowRuntimePorts) {
    super(ports);
  }
}
