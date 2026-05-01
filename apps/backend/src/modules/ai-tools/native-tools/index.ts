import type { NativeToolImplementation } from "./types.js";
import {
  nativeAuthArtifactValidationImplementation,
  nativeAuthArtifactValidationTool,
  nativeAuthFlowProbeImplementation,
  nativeAuthFlowProbeTool,
  nativeAuthLoginProbeImplementation,
  nativeAuthLoginProbeTool
} from "./auth-flow-probe.js";

const nativeToolImplementations = [
  nativeAuthLoginProbeImplementation,
  nativeAuthArtifactValidationImplementation,
  nativeAuthFlowProbeImplementation
] as const;

const nativeToolsById = new Map<string, NativeToolImplementation>(
  nativeToolImplementations.map((implementation) => [implementation.tool.id, implementation])
);

export const builtinNativeAiTools = [
  nativeAuthLoginProbeTool,
  nativeAuthArtifactValidationTool,
  nativeAuthFlowProbeTool
];

export function getNativeToolImplementation(toolId: string) {
  return nativeToolsById.get(toolId) ?? null;
}

export type { NativeToolImplementation, NativeToolParseContext, NativeToolPlanContext, NativeToolResult } from "./types.js";
