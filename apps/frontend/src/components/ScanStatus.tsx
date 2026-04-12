import { useEffect, useState } from "react";
import { StopCircle, Clock, RefreshCw } from "lucide-react";
import type { Scan, ScanStatus as ScanStatusType } from "@synosec/contracts";
import { Button } from "./ui/button";

export interface ScanStatusProps {
  scan: Scan;
  onAbort: () => void;
  roundSummary: string;
}

const STATUS_CONFIG: Record<
  ScanStatusType,
  { label: string; dot: string; text: string }
> = {
  pending: { label: "Pending", dot: "bg-gray-500", text: "text-gray-400" },
  running: { label: "Running", dot: "bg-green-400 animate-pulse", text: "text-green-400" },
  complete: { label: "Complete", dot: "bg-green-600", text: "text-green-500" },
  aborted: { label: "Aborted", dot: "bg-orange-500", text: "text-orange-400" },
  failed: { label: "Failed", dot: "bg-red-500", text: "text-red-400" },
};

function useElapsed(startIso: string): string {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startIso).getTime();
    function tick() {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function ScanStatus({ scan, onAbort, roundSummary }: ScanStatusProps) {
  const cfg = STATUS_CONFIG[scan.status];
  const elapsed = useElapsed(scan.createdAt);
  const progress =
    scan.nodesTotal > 0 ? Math.round((scan.nodesComplete / scan.nodesTotal) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-800 bg-gray-900 p-4">
      {/* Top row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
          <span className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</span>
          <span className="font-mono text-xs text-gray-600">{scan.id}</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Round */}
          <div className="flex items-center gap-1 font-mono text-xs text-gray-400">
            <RefreshCw className="h-3 w-3" />
            Round {scan.currentRound}
          </div>

          {/* Elapsed */}
          <div className="flex items-center gap-1 font-mono text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {elapsed}
          </div>

          {/* Abort */}
          {scan.status === "running" && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAbort}
              className="border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
            >
              <StopCircle className="mr-1 h-3 w-3" />
              Abort
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex justify-between font-mono text-[10px] text-gray-500">
          <span>
            {scan.nodesComplete} / {scan.nodesTotal} nodes
          </span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Round summary */}
      {roundSummary && (
        <p className="rounded bg-gray-950 px-3 py-2 font-mono text-xs leading-relaxed text-gray-400">
          <span className="mr-2 text-green-400">›</span>
          {roundSummary}
        </p>
      )}
    </div>
  );
}
