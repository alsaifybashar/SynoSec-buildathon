import type { Scan } from "@synosec/contracts";
import {
  createScan,
  getScan
} from "@/engine/scans/scan-store.js";

export async function ensureScanRecord(scan: Scan): Promise<Scan> {
  const existing = await getScan(scan.id);
  if (existing) {
    return existing;
  }

  await createScan(scan);
  return scan;
}
