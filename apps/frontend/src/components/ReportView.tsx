import type { ReactNode } from "react";
import { Printer } from "lucide-react";
import type { Report, Severity } from "@synosec/contracts";

export interface ReportViewProps {
  report: Report;
}

const SEVERITY_STYLES: Record<Severity, { card: string; badge: string; label: string }> = {
  critical: {
    card: "border-red-500/30 bg-red-500/10",
    badge: "bg-red-500/20 text-red-400",
    label: "Critical",
  },
  high: {
    card: "border-orange-500/30 bg-orange-500/10",
    badge: "bg-orange-500/20 text-orange-400",
    label: "High",
  },
  medium: {
    card: "border-yellow-500/30 bg-yellow-500/10",
    badge: "bg-yellow-500/20 text-yellow-400",
    label: "Medium",
  },
  low: {
    card: "border-blue-400/30 bg-blue-400/10",
    badge: "bg-blue-400/20 text-blue-400",
    label: "Low",
  },
  info: {
    card: "border-gray-600/30 bg-gray-700/20",
    badge: "bg-gray-600/20 text-gray-400",
    label: "Info",
  },
};

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

function SeverityCard({ severity, count }: { severity: Severity; count: number }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <div className={`rounded-lg border p-4 ${s.card}`}>
      <p className="text-2xl font-bold text-white">{count}</p>
      <p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${s.badge} inline-block rounded px-2 py-0.5`}>
        {s.label}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
      <span className="h-px flex-1 bg-gray-800" />
      {children}
      <span className="h-px flex-1 bg-gray-800" />
    </h3>
  );
}

export function ReportView({ report }: ReportViewProps) {
  const generatedAt = new Date(report.generatedAt).toLocaleString();

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6">
      {/* Title bar */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Security Report</h2>
          <p className="mt-1 font-mono text-xs text-gray-500">
            Scan {report.scanId} · Generated {generatedAt}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            title="Export as PDF"
          >
            <Printer className="h-3.5 w-3.5" />
            Export PDF
          </button>
          <div className="rounded-lg border border-green-500/20 bg-green-500/5 px-3 py-2 text-right">
            <p className="font-mono text-2xl font-bold text-green-400">{report.totalFindings}</p>
            <p className="text-xs text-gray-500">total findings</p>
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div>
        <SectionTitle>Executive Summary</SectionTitle>
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <p className="leading-relaxed text-gray-300">{report.executiveSummary}</p>
        </div>
      </div>

      {/* Severity Breakdown */}
      <div>
        <SectionTitle>Findings by Severity</SectionTitle>
        <div className="grid grid-cols-5 gap-3">
          {SEVERITY_ORDER.map((s) => (
            <SeverityCard key={s} severity={s} count={report.findingsBySeverity[s]} />
          ))}
        </div>
      </div>

      {/* Top Risks */}
      {report.topRisks.length > 0 && (
        <div>
          <SectionTitle>Top Risks</SectionTitle>
          <div className="overflow-hidden rounded-lg border border-gray-800">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Severity
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Title
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Target
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Recommendation
                  </th>
                </tr>
              </thead>
              <tbody>
                {report.topRisks.map((risk, i) => {
                  const s = SEVERITY_STYLES[risk.severity];
                  return (
                    <tr
                      key={i}
                      className="border-b border-gray-800 bg-gray-950 last:border-0 hover:bg-gray-900"
                    >
                      <td className="px-4 py-3">
                        <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${s.badge}`}>
                          {risk.severity}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-200">{risk.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">
                        {risk.nodeTarget}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{risk.recommendation}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Attack Paths */}
      {report.attackPaths.length > 0 && (
        <div>
          <SectionTitle>Attack Paths</SectionTitle>
          <div className="space-y-3">
            {report.attackPaths.map((path, i) => {
              const riskPct = Math.round(path.risk * 100);
              return (
                <div
                  key={i}
                  className="rounded-lg border border-gray-800 bg-gray-900 p-4"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Path {i + 1}
                    </span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        riskPct >= 80
                          ? "text-red-400"
                          : riskPct >= 60
                          ? "text-orange-400"
                          : "text-yellow-400"
                      }`}
                    >
                      Risk {riskPct}%
                    </span>
                  </div>

                  {/* Node chain */}
                  <div className="mb-3 flex flex-wrap items-center gap-1">
                    {path.nodeIds.map((id, j) => (
                      <span key={id} className="flex items-center gap-1">
                        <span className="rounded bg-gray-800 px-2 py-0.5 font-mono text-xs text-gray-300">
                          {id}
                        </span>
                        {j < path.nodeIds.length - 1 && (
                          <span className="text-gray-600">→</span>
                        )}
                      </span>
                    ))}
                  </div>

                  <p className="text-sm text-gray-400">{path.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
