import type {
  AiTool,
  ConnectorActionBatch,
  ConnectorActionExecutionResult,
  InternalObservation,
  ToolRequest,
  ToolRun
} from "@synosec/contracts";

export interface NativeToolPlanContext {
  tool: AiTool;
}

export interface NativeToolParseContext {
  request: ToolRequest;
  toolRun: ToolRun;
  scanId: string;
  tacticId: string;
}

export interface NativeToolResult {
  summary: string;
  observations: InternalObservation[];
  statusReason?: string;
  artifacts?: [];
  debug?: {
    attempts: number;
    actionIds: string[];
    parserNotes?: string[];
  };
  exitCode: number;
}

export interface NativeToolImplementation<TInput = Record<string, unknown>> {
  readonly tool: AiTool;
  parseInput(rawInput: unknown): TInput;
  plan(input: TInput, context: NativeToolPlanContext): ConnectorActionBatch;
  parse(
    actionResults: ConnectorActionExecutionResult["actionResults"],
    input: TInput,
    context: NativeToolParseContext
  ): NativeToolResult;
}
