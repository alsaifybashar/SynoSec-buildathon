import { useState } from "react";
import { ChevronDown, ChevronRight, Terminal } from "lucide-react";
import type { Finding, Severity, VulnerabilityChain } from "@synosec/contracts";
import { severityOrder } from "@synosec/contracts";

export interface FindingsPanelProps {
  findings: Finding[];
  selectedNodeId?: string | null;
  selectedChain?: VulnerabilityChain | null;
}

const SEVERITY_COLORS: Record<Severity, { badge: string; dot: string; border: string }> = {
  critical: {
    badge: "bg-red-500/20 text-red-400 border-red-500/40",
    dot: "bg-red-500",
    border: "border-l-red-500",
  },
  high: {
    badge: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    dot: "bg-orange-500",
    border: "border-l-orange-500",
  },
  medium: {
    badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    dot: "bg-yellow-500",
    border: "border-l-yellow-500",
  },
  low: {
    badge: "bg-blue-400/20 text-blue-400 border-blue-400/40",
    dot: "bg-blue-400",
    border: "border-l-blue-400",
  },
  info: {
    badge: "bg-gray-500/20 text-gray-400 border-gray-500/40",
    dot: "bg-gray-500",
    border: "border-l-gray-500",
  },
};

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

function SeverityBadge({ severity }: { severity: Severity }) {
  const colors = SEVERITY_COLORS[severity];
  return (
    <span
      className={`inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase ${colors.badge}`}
    >
      {severity}
    </span>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const [expanded, setExpanded] = useState(false);
  const colors = SEVERITY_COLORS[finding.severity];
  const confidencePct = Math.round(finding.confidence * 100);

  return (
    <div
      className={`border-l-2 ${colors.border} mb-1 overflow-hidden rounded-r-lg border border-l-2 border-gray-800 bg-gray-900`}
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-800/50"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-gray-500" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-gray-500" />
        )}
        <SeverityBadge severity={finding.severity} />
        <span className="flex-1 truncate text-sm text-gray-200">{finding.title}</span>
        <span className="font-mono text-xs text-gray-500">{confidencePct}%</span>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-gray-800 px-4 py-3">
          {/* Description */}
          <p className="text-sm leading-relaxed text-gray-300">{finding.description}</p>

          {/* Technique */}
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Technique
              </p>
              <span className="font-mono text-xs text-green-400">{finding.technique}</span>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Validation
              </p>
              <span className="font-mono text-xs text-emerald-300">
                {finding.validationStatus ?? (finding.validated ? "validated" : "unverified")}
              </span>
            </div>
          </div>

          {finding.confidenceReason && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                Confidence Reason
              </p>
              <p className="text-xs leading-relaxed text-gray-400">{finding.confidenceReason}</p>
            </div>
          )}

          {/* Evidence */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Evidence
            </p>
            <pre className="overflow-x-auto rounded bg-gray-950 p-3 font-mono text-xs leading-relaxed text-gray-300">
              {finding.evidence}
            </pre>
          </div>

          {/* Reproduce command */}
          {finding.reproduceCommand && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <Terminal className="h-3 w-3" /> Reproduce
              </p>
              <pre className="overflow-x-auto rounded bg-gray-950 p-3 font-mono text-xs text-green-400">
                {finding.reproduceCommand}
              </pre>
            </div>
          )}

          {/* Node ID */}
          <p className="font-mono text-[10px] text-gray-600">
            node: {finding.nodeId} · agent: {finding.agentId}
          </p>
        </div>
      )}
    </div>
  );
}

export function FindingsPanel({ findings, selectedNodeId, selectedChain }: FindingsPanelProps) {
  const [severityFilter, setSeverityFilter] = useState<Severity | "all">("all");
  const selectedChainIds = new Set(selectedChain?.findingIds ?? []);

  const displayed = findings
    .filter((f) => !selectedNodeId || f.nodeId === selectedNodeId)
    .filter((f) => selectedChainIds.size === 0 || selectedChainIds.has(f.id))
    .filter((f) => severityFilter === "all" || f.severity === severityFilter)
    .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

  const counts = SEVERITY_ORDER.reduce(
    (acc, s) => {
      acc[s] = findings.filter((f) => f.severity === s).length;
      return acc;
    },
    {} as Record<Severity, number>
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">
            Findings{" "}
            <span className="ml-1 font-mono text-sm text-gray-400">({findings.length})</span>
          </h3>
        </div>

        {/* Severity count chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setSeverityFilter("all")}
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              severityFilter === "all"
                ? "bg-gray-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            All
          </button>
          {SEVERITY_ORDER.map((s) => {
            if (!counts[s]) return null;
            const colors = SEVERITY_COLORS[s];
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSeverityFilter(s)}
                className={`rounded border px-2 py-0.5 text-xs font-medium transition-colors ${
                  severityFilter === s ? colors.badge : "border-transparent bg-gray-800 text-gray-400"
                }`}
              >
                <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${colors.dot}`} />
                {s} {counts[s]}
              </button>
            );
          })}
        </div>

        {selectedNodeId && (
          <p className="mt-2 font-mono text-xs text-gray-500">
            Filtered to node: {selectedNodeId}
          </p>
        )}

        {selectedChain && (
          <p className="mt-1 font-mono text-xs text-emerald-300">
            Chain: {selectedChain.title}
          </p>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4">
        {displayed.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-gray-600">
            {findings.length === 0 ? "No findings yet" : "No findings match the current filter"}
          </div>
        ) : (
          <div className="space-y-1">
            {/* Group by severity */}
            {SEVERITY_ORDER.map((sev) => {
              const group = displayed.filter((f) => f.severity === sev);
              if (!group.length) return null;
              return (
                <div key={sev} className="mb-4">
                  <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${SEVERITY_COLORS[sev].dot}`}
                    />
                    {sev} <span className="text-gray-600">({group.length})</span>
                  </p>
                  {group.map((f) => (
                    <FindingRow key={f.id} finding={f} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
