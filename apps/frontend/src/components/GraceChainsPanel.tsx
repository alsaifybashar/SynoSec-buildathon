import { useMemo } from "react";
import { Link2, Radar, Target } from "lucide-react";
import type { Finding, VulnerabilityChain } from "@synosec/contracts";

export interface GraceChainsPanelProps {
  chains: VulnerabilityChain[];
  findings: Finding[];
  selectedChainId: string | null;
  prioritizedTargets: string[];
  onSelectChain: (chainId: string | null) => void;
}

function riskClass(value: number): string {
  if (value >= 0.8) return "text-red-400 border-red-500/30 bg-red-500/10";
  if (value >= 0.6) return "text-orange-400 border-orange-500/30 bg-orange-500/10";
  return "text-yellow-400 border-yellow-500/30 bg-yellow-500/10";
}

export function GraceChainsPanel({
  chains,
  findings,
  selectedChainId,
  prioritizedTargets,
  onSelectChain
}: GraceChainsPanelProps) {
  const findingMap = useMemo(() => new Map(findings.map((finding) => [finding.id, finding])), [findings]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">
            GRACE Chains <span className="ml-1 font-mono text-sm text-gray-400">({chains.length})</span>
          </h3>
          <button
            type="button"
            onClick={() => onSelectChain(null)}
            className="rounded border border-gray-700 px-2 py-1 text-xs text-gray-400 hover:border-gray-500 hover:text-white"
          >
            Clear selection
          </button>
        </div>

        {prioritizedTargets.length > 0 && (
          <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
              <Target className="h-3.5 w-3.5" />
              Prioritized Targets
            </p>
            <div className="flex flex-wrap gap-2">
              {prioritizedTargets.map((target) => (
                <span
                  key={target}
                  className="rounded-full border border-emerald-500/20 bg-gray-950 px-2.5 py-1 font-mono text-xs text-emerald-200"
                >
                  {target}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {chains.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-600">
            No GRACE chains detected yet
          </div>
        ) : (
          <div className="space-y-4">
            {chains.map((chain) => {
              const isSelected = chain.id === selectedChainId;
              return (
                <button
                  key={chain.id}
                  type="button"
                  onClick={() => onSelectChain(isSelected ? null : chain.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    isSelected
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-900/80"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{chain.title}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {chain.startTarget} → {chain.endTarget}
                      </p>
                    </div>
                    <div className={`rounded-lg border px-2 py-1 font-mono text-xs ${riskClass(chain.compositeRisk)}`}>
                      risk {Math.round(chain.compositeRisk * 100)}%
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-gray-300">
                    {chain.narrative ?? "GRACE linked related findings into a probable exploit chain."}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-1 text-sky-300">
                      {chain.technique}
                    </span>
                    <span className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 font-mono text-gray-300">
                      confidence {Math.round(chain.confidence * 100)}%
                    </span>
                    <span className="rounded-full border border-gray-700 bg-gray-950 px-2.5 py-1 font-mono text-gray-300">
                      {chain.chainLength} steps
                    </span>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                      <Link2 className="h-3.5 w-3.5" />
                      Linked Findings
                    </p>
                    <div className="space-y-2">
                      {chain.findingIds.map((findingId) => {
                        const finding = findingMap.get(findingId);
                        return (
                          <div key={findingId} className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                            <p className="text-sm text-gray-200">{finding?.title ?? findingId}</p>
                            <p className="mt-1 text-xs text-gray-500">
                              {finding?.technique ?? "Unknown technique"} · {finding?.validationStatus ?? "unverified"}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {chain.links.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        <Radar className="h-3.5 w-3.5" />
                        Chain Links
                      </p>
                      <div className="space-y-2">
                        {chain.links
                          .slice()
                          .sort((left, right) => left.order - right.order)
                          .map((link) => (
                            <div key={`${link.fromFindingId}-${link.toFindingId}`} className="flex items-center justify-between rounded bg-gray-950 px-3 py-2 text-xs text-gray-400">
                              <span className="truncate">
                                {findingMap.get(link.fromFindingId)?.title ?? link.fromFindingId} →{" "}
                                {findingMap.get(link.toFindingId)?.title ?? link.toFindingId}
                              </span>
                              <span className="ml-3 font-mono text-gray-300">
                                {Math.round(link.probability * 100)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
