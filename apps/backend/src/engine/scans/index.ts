export {
  createAuditEntry,
  createDfsNode,
  createEscalationRoute,
  createScan,
  createSecurityVulnerability,
  getEscalationRoutesForScan,
  getEnvironmentGraphForScan,
  getScan,
  updateNodeStatus,
  upsertLayerCoverage
} from "./scan-store.js";
export { selectToolsForContext } from "./runtime/tool-selector.js";
export {
  buildCrossScanPatternLearningSnapshot,
  buildCrossScanPatternLearningSnapshotFromRows,
  inferPatternTargetType
} from "./runtime/pattern-learning.js";
export type { ToolSelectorContext, ToolSelectionPatternBias } from "./runtime/tool-selector.js";
export type {
  AssertionPattern,
  CrossScanPatternLearningSnapshot,
  EscalationRoutePattern,
  ToolTargetPattern
} from "./runtime/pattern-learning.js";
