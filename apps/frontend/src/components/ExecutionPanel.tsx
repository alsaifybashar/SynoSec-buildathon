import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, TerminalSquare } from "lucide-react";
import type { Observation, ToolRun } from "@synosec/contracts";

export interface ExecutionPanelProps {
  toolRuns: ToolRun[];
  observations: Observation[];
}

function formatTimestamp(value?: string): string {
  if (!value) return "running";
  try {
    return new Date(value).toLocaleTimeString();
  } catch {
    return value;
  }
}

function statusClass(status: ToolRun["status"]): string {
  switch (status) {
    case "completed":
      return "text-emerald-300 border-emerald-500/20 bg-emerald-500/10";
    case "running":
      return "text-sky-300 border-sky-500/20 bg-sky-500/10";
    case "failed":
      return "text-red-300 border-red-500/20 bg-red-500/10";
    case "denied":
      return "text-orange-300 border-orange-500/20 bg-orange-500/10";
    default:
      return "text-gray-300 border-gray-700 bg-gray-900";
  }
}

export function ExecutionPanel({ toolRuns, observations }: ExecutionPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const observationsByRunId = useMemo(() => {
    const map = new Map<string, Observation[]>();
    for (const observation of observations) {
      const existing = map.get(observation.toolRunId) ?? [];
      existing.push(observation);
      map.set(observation.toolRunId, existing);
    }
    return map;
  }, [observations]);

  if (toolRuns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-600">
        <div className="text-center">
          <TerminalSquare className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">No tool executions yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-gray-800 px-4 py-3">
        <h3 className="font-semibold text-white">
          Execution Log <span className="ml-1 font-mono text-sm text-gray-400">({toolRuns.length})</span>
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          Every command, status, raw output, and derived observation.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {toolRuns.map((toolRun) => {
            const runObservations = observationsByRunId.get(toolRun.id) ?? [];
            const isExpanded = expandedIds.has(toolRun.id);
            return (
              <div key={toolRun.id} className="rounded-xl border border-gray-800 bg-gray-900">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedIds((prev) => {
                      const next = new Set(prev);
                      if (next.has(toolRun.id)) next.delete(toolRun.id);
                      else next.add(toolRun.id);
                      return next;
                    })
                  }
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <TerminalSquare className="h-4 w-4 text-green-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm text-gray-200">{toolRun.commandPreview}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {toolRun.tool} · {toolRun.adapter} · {toolRun.target}
                      {toolRun.port ? `:${toolRun.port}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase ${statusClass(toolRun.status)}`}>
                      {toolRun.status}
                    </span>
                    <p className="mt-1 font-mono text-[10px] text-gray-500">
                      {formatTimestamp(toolRun.completedAt ?? toolRun.startedAt)}
                    </p>
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-4 border-t border-gray-800 px-4 py-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Justification
                        </p>
                        <p className="text-sm text-gray-300">{toolRun.justification}</p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Exit Status
                        </p>
                        <p className="font-mono text-sm text-gray-300">
                          {toolRun.exitCode ?? "-"} {toolRun.statusReason ? `· ${toolRun.statusReason}` : ""}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Command
                      </p>
                      <pre className="overflow-x-auto rounded bg-gray-950 p-3 font-mono text-xs text-green-400">
                        {toolRun.commandPreview}
                      </pre>
                    </div>

                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Raw Output
                      </p>
                      <pre className="max-h-80 overflow-auto rounded bg-gray-950 p-3 font-mono text-xs leading-relaxed text-gray-300">
                        {toolRun.output ?? toolRun.statusReason ?? "No output captured."}
                      </pre>
                    </div>

                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Derived Observations
                      </p>
                      {runObservations.length === 0 ? (
                        <p className="text-xs text-gray-500">No observations derived from this command.</p>
                      ) : (
                        <div className="space-y-2">
                          {runObservations.map((observation) => (
                            <div key={observation.id} className="rounded-lg border border-gray-800 bg-gray-950 px-3 py-2">
                              <p className="text-sm text-gray-200">{observation.title}</p>
                              <p className="mt-1 text-xs text-gray-500">
                                {observation.technique} · {Math.round(observation.confidence * 100)}% confidence
                              </p>
                              <p className="mt-2 text-xs text-gray-400">{observation.summary}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
