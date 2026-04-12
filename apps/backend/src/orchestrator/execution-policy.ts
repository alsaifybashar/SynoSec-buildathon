import type { OsiLayer, ScanLlmConfig, ScanScope } from "@synosec/contracts";

const localToolBackedLayers: OsiLayer[] = ["L4", "L6", "L7"];

export function isLocalToolGroundedRun(llmConfig?: ScanLlmConfig): boolean {
  return llmConfig?.provider === "local";
}

export function getSupportedLayersForRun(llmConfig?: ScanLlmConfig): OsiLayer[] {
  if (isLocalToolGroundedRun(llmConfig)) {
    return [...localToolBackedLayers];
  }
  return ["L3", "L4", "L5", "L6", "L7"];
}

export function normalizeScopeForRun(scope: ScanScope, llmConfig?: ScanLlmConfig): ScanScope {
  const supported = new Set(getSupportedLayersForRun(llmConfig));
  const normalizedLayers = scope.layers.filter((layer) => supported.has(layer));

  return {
    ...scope,
    layers: normalizedLayers.length > 0 ? normalizedLayers : getSupportedLayersForRun(llmConfig)
  };
}

export function getInitialLayerForScope(scope: ScanScope): OsiLayer {
  return scope.layers[0] ?? "L3";
}

export function shouldRunSecondaryLlmPasses(llmConfig?: ScanLlmConfig): boolean {
  return !isLocalToolGroundedRun(llmConfig);
}
