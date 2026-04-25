import {
  getAuditForScan,
  getLayerCoverageForScan,
  getSecurityVulnerabilitiesForScan,
  getSingleAgentScanReport
} from "@/engine/scans/scan-store.js";

export async function getRunVulnerabilities(scanId: string) {
  return getSecurityVulnerabilitiesForScan(scanId);
}

export async function getRunCoverage(scanId: string) {
  return getLayerCoverageForScan(scanId);
}

export async function getRunTrace(scanId: string) {
  return getAuditForScan(scanId);
}

export async function getRunReport(scanId: string) {
  return getSingleAgentScanReport(scanId);
}
