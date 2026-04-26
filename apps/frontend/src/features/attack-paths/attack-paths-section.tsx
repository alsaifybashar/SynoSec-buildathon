import { useEffect, useMemo, useState } from "react";
import type { AttackPathSummary } from "@synosec/contracts";
import { cn } from "@/shared/lib/utils";

const severityTone: Record<AttackPathSummary["paths"][number]["pathSeverity"], string> = {
  info: "border-slate-500/30 bg-slate-500/10 text-slate-700",
  low: "border-sky-500/30 bg-sky-500/10 text-sky-700",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-700",
  critical: "border-rose-600/30 bg-rose-600/10 text-rose-700"
};

const statusTone: Record<AttackPathSummary["paths"][number]["status"], string> = {
  confirmed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  qualified: "border-amber-500/30 bg-amber-500/10 text-amber-700",
  blocked: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700"
};

function labelForFinding(findingId: string, findingLookup: Map<string, string>) {
  return findingLookup.get(findingId) ?? findingId;
}

export function AttackPathsSection({
  attackPaths,
  findingTitles,
  title = "Attack Paths",
  summary,
  emptyMessage,
  onSelectFinding
}: {
  attackPaths: AttackPathSummary;
  findingTitles?: Map<string, string>;
  title?: string;
  summary?: string | null;
  emptyMessage: string;
  onSelectFinding?: (id: string) => void;
}) {
  const [selectedPathId, setSelectedPathId] = useState<string | null>(attackPaths.paths[0]?.id ?? null);
  useEffect(() => {
    setSelectedPathId(attackPaths.paths[0]?.id ?? null);
  }, [attackPaths.paths]);

  const pathLookup = useMemo(() => new Map(attackPaths.paths.map((path) => [path.id, path])), [attackPaths.paths]);
  const vectorLookup = useMemo(() => new Map(attackPaths.vectors.map((vector) => [vector.id, vector])), [attackPaths.vectors]);
  const venueLookup = useMemo(() => new Map(attackPaths.venues.map((venue) => [venue.id, venue])), [attackPaths.venues]);
  const selectedPath = selectedPathId ? pathLookup.get(selectedPathId) ?? attackPaths.paths[0] ?? null : attackPaths.paths[0] ?? null;
  const findingLookup = findingTitles ?? new Map<string, string>();

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-foreground/90">
            {summary ?? "Derived attack routes group supporting findings into the paths that matter operationally."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border/70 px-2 py-1">{attackPaths.paths.length} paths</span>
          <span className="rounded-full border border-border/70 px-2 py-1">{attackPaths.vectors.length} vectors</span>
          <span className="rounded-full border border-border/70 px-2 py-1">{attackPaths.venues.length} venues</span>
        </div>
      </div>

      {attackPaths.paths.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-background/40 px-4 py-8 text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(18rem,24rem)_minmax(0,1fr)]">
          <div className="space-y-3">
            {attackPaths.paths.map((path, index) => (
              <button
                key={path.id}
                type="button"
                onClick={() => setSelectedPathId(path.id)}
                className={cn(
                  "w-full rounded-xl border px-4 py-4 text-left transition",
                  selectedPath?.id === path.id
                    ? "border-foreground/20 bg-background/70 shadow-sm"
                    : "border-border bg-background/40 hover:border-foreground/10 hover:bg-background/55"
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]", severityTone[path.pathSeverity])}>
                    {path.pathSeverity}
                  </span>
                  <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]", statusTone[path.status])}>
                    {path.status}
                  </span>
                </div>
                <p className="mt-3 text-base font-semibold leading-tight text-foreground">{path.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{path.summary}</p>
                <p className="mt-3 text-[0.72rem] uppercase tracking-[0.16em] text-muted-foreground">
                  Reaches {path.reachedAssetOrOutcome}
                </p>
              </button>
            ))}
          </div>

          {selectedPath ? (
            <div className="space-y-5 rounded-xl border border-border bg-background/45 px-5 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]", severityTone[selectedPath.pathSeverity])}>
                  {selectedPath.pathSeverity}
                </span>
                <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em]", statusTone[selectedPath.status])}>
                  {selectedPath.status}
                </span>
                <span className="rounded-full border border-border/70 px-2 py-0.5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
                  {selectedPath.pathConfidence} confidence
                </span>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground">{selectedPath.title}</h3>
                <p className="mt-2 text-sm leading-6 text-foreground/90">{selectedPath.summary}</p>
                <p className="mt-3 text-sm text-muted-foreground">Reached asset or outcome: {selectedPath.reachedAssetOrOutcome}</p>
              </div>

              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Ordered findings</p>
                <div className="mt-3 space-y-2">
                  {selectedPath.findingIds.map((findingId, index) => (
                    <div key={`${selectedPath.id}:${findingId}`} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                      <span className="mt-0.5 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectFinding?.(findingId)}
                        className={cn(
                          "text-left text-sm leading-6",
                          onSelectFinding ? "underline-offset-2 hover:underline" : ""
                        )}
                      >
                        {labelForFinding(findingId, findingLookup)}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Venues</p>
                  <div className="mt-3 space-y-2">
                    {selectedPath.venueIds.map((venueId) => {
                      const venue = venueLookup.get(venueId);
                      return venue ? (
                        <div key={venue.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                          <p className="text-sm font-medium text-foreground">{venue.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{venue.summary}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Vectors</p>
                  <div className="mt-3 space-y-2">
                    {selectedPath.vectorIds.map((vectorId) => {
                      const vector = vectorLookup.get(vectorId);
                      return vector ? (
                        <div key={vector.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                          <p className="text-sm font-medium text-foreground">{vector.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{vector.impact}</p>
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">Link status</p>
                <div className="mt-3 space-y-2">
                  {selectedPath.pathLinks.map((link) => (
                    <div key={link.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border/70 px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                          {link.kind.replaceAll("_", " ")}
                        </span>
                        <span className={cn("rounded-full border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.16em]", statusTone[link.status])}>
                          {link.status}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-foreground/90">{link.summary}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-[0.72rem] text-muted-foreground">
                {selectedPath.supportingFindingIds.length > 0 ? <span>Supporting: {selectedPath.supportingFindingIds.length}</span> : null}
                {selectedPath.suspectedFindingIds.length > 0 ? <span>Suspected: {selectedPath.suspectedFindingIds.length}</span> : null}
                {selectedPath.blockedFindingIds.length > 0 ? <span>Blocked: {selectedPath.blockedFindingIds.length}</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
