import { useEffect, useState } from "react";
import { ClipboardList, CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import type { AuditEntry } from "@synosec/contracts";

interface AuditLogProps {
  scanId: string | null;
}

const ACTION_ICONS: Record<string, { icon: typeof Info; color: string }> = {
  "scan-started": { icon: CheckCircle, color: "text-green-400" },
  "scan-complete": { icon: CheckCircle, color: "text-green-500" },
  "scan-aborted": { icon: XCircle, color: "text-orange-400" },
  "round-complete": { icon: Info, color: "text-blue-400" },
  "agent-error": { icon: XCircle, color: "text-red-400" },
  "cross-validation-complete": { icon: CheckCircle, color: "text-purple-400" },
  "node-skipped-out-of-scope": { icon: AlertTriangle, color: "text-yellow-400" },
};

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return ts;
  }
}

export function AuditLog({ scanId }: AuditLogProps) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!scanId) {
      setEntries([]);
      return;
    }

    setIsLoading(true);
    fetch(`/api/scan/${scanId}/audit`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<AuditEntry[]>;
      })
      .then(setEntries)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [scanId]);

  if (!scanId) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-600">
        <div className="text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">No active scan</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-600">
        <p className="text-sm">Loading audit log…</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-600">
        <div className="text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="text-sm">No audit entries yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-200">Audit Trail</h2>
          <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
            {entries.length} events
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="relative border-l border-gray-800 pl-6">
          {entries.map((entry) => {
            const meta = ACTION_ICONS[entry.action] ?? { icon: Info, color: "text-gray-400" };
            const Icon = meta.icon;

            return (
              <div key={entry.id} className="group mb-5 last:mb-0">
                {/* Dot on timeline */}
                <span
                  className={`absolute -left-[7px] mt-0.5 h-3 w-3 rounded-full border-2 border-gray-950 bg-gray-700 ${meta.color.replace("text-", "bg-")} opacity-80`}
                />

                <div className="rounded-lg border border-gray-800 bg-gray-900 p-3 transition-colors group-hover:border-gray-700">
                  {/* Row 1: actor + time */}
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
                      <span className="font-mono text-xs font-semibold text-gray-300">
                        {entry.actor}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-gray-600">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>

                  {/* Row 2: action */}
                  <p className="text-xs text-gray-400">
                    <span className="rounded bg-gray-800 px-1.5 py-0.5 font-mono text-[10px] text-gray-300">
                      {entry.action}
                    </span>
                  </p>

                  {/* Row 3: scope validity */}
                  <div className="mt-1.5 flex items-center gap-1">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${entry.scopeValid ? "bg-green-500" : "bg-red-500"}`}
                    />
                    <span className="text-[10px] text-gray-600">
                      {entry.scopeValid ? "In scope" : "Out of scope"}
                    </span>
                  </div>

                  {/* Details */}
                  {Object.keys(entry.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-[10px] text-gray-600 hover:text-gray-400">
                        Details
                      </summary>
                      <pre className="mt-1 overflow-x-auto rounded bg-gray-950 p-2 font-mono text-[10px] text-gray-400">
                        {JSON.stringify(entry.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
