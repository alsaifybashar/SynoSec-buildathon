import type { OsiLayer, ScanLlmConfig, ScanScope } from "@synosec/contracts";

const toolBackedLayers: OsiLayer[] = ["L4", "L6", "L7"];

export function getSupportedLayersForRun(llmConfig?: ScanLlmConfig): OsiLayer[] {
  void llmConfig;
  return [...toolBackedLayers];
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
  return scope.layers[0] ?? "L4";
}

export function shouldRunSecondaryLlmPasses(llmConfig?: ScanLlmConfig): boolean {
  void llmConfig;
  return false;
}
