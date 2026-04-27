import type { InternalObservation } from "@synosec/contracts";

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
  registerObservation(obs: InternalObservation, scanId: string): ObservationRegistration {
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

  private makeKey(scanId: string, title: string): string {
    return `${scanId}:${title.toLowerCase().trim()}`;
  }
}

// Singleton — one engine per process, keyed internally by scanId
export const confidenceEngine = new ConfidenceEngine();
