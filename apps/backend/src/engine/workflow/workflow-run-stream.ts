import type { WorkflowRunStreamMessage } from "@synosec/contracts";
import { InMemoryRunStream } from "@/engine/streams/in-memory-run-stream.js";

export class WorkflowRunStream extends InMemoryRunStream<WorkflowRunStreamMessage> {}
