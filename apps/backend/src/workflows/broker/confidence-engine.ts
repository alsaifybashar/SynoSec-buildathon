import type { Finding, Observation, ValidationStatus } from "@synosec/contracts";
import { updateFindingValidation } from "@/platform/db/scan-store.js";

// ---------------------------------------------------------------------------
// Confidence Engine
// Tracks cross-node observations and propagates Bayesian confidence updates
// to findings when corroborating evidence arrives from different nodes.
// ---------------------------------------------------------------------------

interface ObservationRegistration {
  isCorroborated: boolean;
  aggregatedConfidence: number;
}

interface ConfidenceRecord {
  confidence: number;
  sourceCount: number;
  lastUpdated: string;
}

export class ConfidenceEngine {
  // Key: `${scanId}:${normalizedTitle}` → aggregated confidence record
  private registry = new Map<string, ConfidenceRecord>();

  /**
   * Register an observation. Returns whether it corroborates an existing
   * observation and the new aggregated confidence.
   */
  registerObservation(obs: Observation, scanId: string): ObservationRegistration {
    const key = this.makeKey(scanId, obs.title);
    const existing = this.registry.get(key);

    if (!existing) {
      this.registry.set(key, {
        confidence: obs.confidence,
        sourceCount: 1,
        lastUpdated: new Date().toISOString()
      });
      return { isCorroborated: false, aggregatedConfidence: obs.confidence };
    }

    // Bayesian update: P(A or B) = 1 - (1-A)(1-B)
    const aggregated = 1 - (1 - existing.confidence) * (1 - obs.confidence);
    const updated: ConfidenceRecord = {
      confidence: aggregated,
      sourceCount: existing.sourceCount + 1,
      lastUpdated: new Date().toISOString()
    };
    this.registry.set(key, updated);

    return { isCorroborated: true, aggregatedConfidence: aggregated };
  }

  /**
   * Get the current aggregated confidence for a given scan + title key.
   */
  getAggregatedConfidence(scanId: string, title: string): number {
    return this.registry.get(this.makeKey(scanId, title))?.confidence ?? 0;
  }

  /**
   * Derive updated validation status for a finding based on aggregated evidence.
 * Persists the update to the scan store and returns the updated finding.
   */
  async propagateToFinding(finding: Finding, scanId: string): Promise<Finding> {
    const key = this.makeKey(scanId, finding.title);
    const record = this.registry.get(key);

    if (!record) return finding;

    const newStatus = this.deriveStatus(record.sourceCount, record.confidence);
    const reason = this.buildReason(record);

    if (newStatus !== finding.validationStatus || Math.abs(record.confidence - finding.confidence) > 0.01) {
      await updateFindingValidation(finding.id, newStatus, record.confidence, reason);
      return {
        ...finding,
        confidence: record.confidence,
        validationStatus: newStatus,
        confidenceReason: reason
      };
    }

    return finding;
  }

  /**
   * Clear scan state — call when a scan is complete or aborted.
   */
  clearScan(scanId: string): void {
    for (const key of this.registry.keys()) {
      if (key.startsWith(`${scanId}:`)) {
        this.registry.delete(key);
      }
    }
  }

  private makeKey(scanId: string, title: string): string {
    return `${scanId}:${title.toLowerCase().trim()}`;
  }

  private deriveStatus(sourceCount: number, confidence: number): ValidationStatus {
    if (confidence < 0.3) return "rejected";
    if (sourceCount >= 3 && confidence >= 0.85) return "reproduced";
    if (sourceCount >= 2 && confidence >= 0.7) return "cross_validated";
    if (sourceCount === 1) return "single_source";
    return "unverified";
  }

  private buildReason(record: ConfidenceRecord): string {
    if (record.sourceCount >= 3) {
      return `Confirmed by ${record.sourceCount} independent observation sources (confidence: ${(record.confidence * 100).toFixed(0)}%).`;
    }
    if (record.sourceCount === 2) {
      return `Corroborated by 2 observation sources via Bayesian update (confidence: ${(record.confidence * 100).toFixed(0)}%).`;
    }
    return `Single observation source (confidence: ${(record.confidence * 100).toFixed(0)}%).`;
  }
}

// Singleton — one engine per process, keyed internally by scanId
export const confidenceEngine = new ConfidenceEngine();
