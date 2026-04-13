import type { OsiLayer, ScanLlmConfig, ScanScope } from "@synosec/contracts";
import { analyzeTargetInput } from "../tools/scan-tools.js";

const toolBackedLayers: OsiLayer[] = ["L4", "L6", "L7"];

export function getSupportedLayersForRun(llmConfig?: ScanLlmConfig): OsiLayer[] {
  void llmConfig;
  return [...toolBackedLayers];
}

export function normalizeScopeForRun(scope: ScanScope, llmConfig?: ScanLlmConfig): ScanScope {
  const supported = new Set(getSupportedLayersForRun(llmConfig));
  const normalizedLayers = scope.layers.filter((layer) => supported.has(layer));
  const normalizedTargets = scope.targets.map((target) => analyzeTargetInput(target).normalizedTarget);
  const normalizedExclusions = scope.exclusions.map((target) => analyzeTargetInput(target).normalizedTarget);

  return {
    ...scope,
    targets: [...new Set(normalizedTargets)],
    exclusions: [...new Set(normalizedExclusions)],
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
