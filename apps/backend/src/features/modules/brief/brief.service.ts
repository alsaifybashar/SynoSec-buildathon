import { type BriefResponse } from "@synosec/contracts";

export function buildBriefResponse(): BriefResponse {
  return {
    headline: "Manual backend fetch completed.",
    actions: [
      "Enumerate reachable hosts before deeper probing.",
      "Re-run high-severity services with authenticated checks.",
      "Queue new nodes for depth-first traversal."
    ],
    generatedAt: new Date().toISOString()
  };
}
