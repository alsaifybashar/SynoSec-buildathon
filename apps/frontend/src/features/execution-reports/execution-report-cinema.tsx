import { useEffect, useMemo, useState } from "react";
import type { ExecutionReportDetail, ExecutionReportFinding, ExecutionReportToolActivity } from "@synosec/contracts";
import { cn } from "@/shared/lib/utils";

const SEVERITY_STROKE: Record<ExecutionReportFinding["severity"], string> = {
  info: "#64748b",
  low: "#2563eb",
  medium: "#ca8a04",
  high: "#ea580c",
  critical: "#dc2626"
};

type FindingSignal = {
  key: string;
  toolName: string;
  quote: string;
  toolRunRef?: string;
  observationRef?: string;
  artifactRef?: string;
  status?: ExecutionReportToolActivity["status"];
  command?: string;
  outputPreview?: string | null;
};

function buildFindingSignals(
  finding: ExecutionReportFinding,
  toolActivity: ExecutionReportToolActivity[]
) {
  const signals: FindingSignal[] = finding.evidence.map((evidence, index) => {
    const activity = evidence.toolRunRef
      ? toolActivity.find((item) => item.id === evidence.toolRunRef)
      : toolActivity.find((item) => item.toolName === evidence.sourceTool);

    return {
      key: `${finding.id}:evidence:${index}`,
      toolName: evidence.sourceTool,
      quote: evidence.quote,
      ...(evidence.toolRunRef ? { toolRunRef: evidence.toolRunRef } : {}),
      ...(evidence.observationRef ? { observationRef: evidence.observationRef } : {}),
      ...(evidence.artifactRef ? { artifactRef: evidence.artifactRef } : {}),
      ...(activity?.status ? { status: activity.status } : {}),
      ...(activity?.command ? { command: activity.command } : {}),
      ...(activity && "outputPreview" in activity ? { outputPreview: activity.outputPreview } : {})
    };
  });

  const seenToolNames = new Set(signals.map((signal) => signal.toolName));
  for (const toolId of finding.sourceToolIds) {
    if (seenToolNames.has(toolId)) {
      continue;
    }
    const activity = toolActivity.find((item) => item.toolName === toolId);
    signals.push({
      key: `${finding.id}:source-tool:${toolId}`,
      toolName: toolId,
      quote: "",
      ...(activity?.status ? { status: activity.status } : {}),
      ...(activity?.command ? { command: activity.command } : {}),
      ...(activity && "outputPreview" in activity ? { outputPreview: activity.outputPreview } : {})
    });
  }

  return signals;
}

function chainForFinding(report: ExecutionReportDetail, findingId: string) {
  return report.graph.nodes.find((node) => node.kind === "attack_chain" && node.findingIds.includes(findingId)) ?? null;
}

function attackVectorsForFinding(report: ExecutionReportDetail, findingId: string) {
  return report.attackPaths.vectors.filter((vector) => vector.findingIds.includes(findingId));
}

function preferredFindingId(report: ExecutionReportDetail) {
  const topFindingId = report.sourceSummary.topFindingIds.find((findingId) => report.findings.some((finding) => finding.id === findingId));
  return topFindingId ?? report.findings[0]?.id ?? null;
}

function trimmedValue(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function CinemaGraph({
  finding,
  signals,
  chainTitle,
  activeSignalKey,
  hoverSignalKey,
  onSelectSignal,
  onHoverSignal
}: {
  finding: ExecutionReportFinding;
  signals: FindingSignal[];
  chainTitle: string | null;
  activeSignalKey: string | null;
  hoverSignalKey: string | null;
  onSelectSignal: (signalKey: string | null) => void;
  onHoverSignal: (signalKey: string | null) => void;
}) {
  const stroke = SEVERITY_STROKE[finding.severity];
  const width = 880;
  const height = 460;
  const laneX = { tool: 100, evidence: 330, finding: 600, attackChain: 800 };
  const findingY = height / 2;
  const rowCount = Math.max(signals.length, 1);
  const rowHeight = Math.min(78, (height - 110) / rowCount);
  const topPad = (height - rowHeight * rowCount) / 2 + rowHeight / 2;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block w-full"
      role="img"
      aria-label="Cinematic finding support map: tools to evidence to reported finding"
    >
      <defs>
        <linearGradient id="cinema-flow-tool" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.0" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="cinema-flow-attack-chain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.85" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.0" />
        </linearGradient>
        <radialGradient id="cinema-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.5" />
          <stop offset="60%" stopColor={stroke} stopOpacity="0.06" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </radialGradient>
        <pattern id="cinema-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M 32 0 L 0 0 0 32" fill="none" stroke="currentColor" strokeOpacity="0.04" strokeWidth="1" />
        </pattern>
        <style>{`
          @keyframes cinema-trace {
            from { stroke-dashoffset: 320; }
            to { stroke-dashoffset: 0; }
          }
          @keyframes cinema-pulse {
            0%, 100% { opacity: 0.22; }
            50% { opacity: 0.5; }
          }
          .cinema-trace { animation: cinema-trace 1.2s ease-out both; }
          .cinema-core-pulse { animation: cinema-pulse 3.2s ease-in-out infinite; }
        `}</style>
      </defs>

      <rect x="0" y="0" width={width} height={height} fill="url(#cinema-grid)" />
      <circle cx={laneX.finding} cy={findingY} r={170} fill="url(#cinema-core)" className="cinema-core-pulse" />

      {[
        { x: laneX.tool, label: "TOOLS" },
        { x: laneX.evidence, label: "EVIDENCE" },
        { x: laneX.finding, label: "MODEL REPORT" },
        { x: laneX.attackChain, label: "ATTACK CHAIN" }
      ].map((lane) => (
        <g key={lane.label}>
          <line
            x1={lane.x}
            y1={36}
            x2={lane.x}
            y2={height - 32}
            stroke="currentColor"
            strokeOpacity={0.07}
            strokeDasharray="2 6"
          />
          <text
            x={lane.x}
            y={22}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={9}
            letterSpacing="3.2"
            fill="currentColor"
            opacity={0.65}
          >
            {lane.label}
          </text>
        </g>
      ))}

      {signals.map((signal, index) => {
        const y = topPad + index * rowHeight;
        const isSelected = activeSignalKey === signal.key;
        const isHovered = hoverSignalKey === signal.key;
        const focused = isSelected || isHovered;
        const opacity = activeSignalKey ? (isSelected ? 1 : 0.1) : isHovered ? 0.85 : 0.5;
        const strokeWidth = focused ? 2 : 1.1;
        return (
          <g key={`flow-${signal.key}`}>
            <path
              d={`M ${laneX.tool + 22} ${y} C ${laneX.tool + 110} ${y}, ${laneX.evidence - 140} ${y}, ${laneX.evidence - 70} ${y}`}
              fill="none"
              stroke="url(#cinema-flow-tool)"
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              strokeDasharray="320"
              className="cinema-trace"
              style={{ animationDelay: `${index * 80}ms` }}
            />
            <path
              d={`M ${laneX.evidence + 70} ${y} C ${laneX.evidence + 160} ${y}, ${laneX.finding - 170} ${findingY}, ${laneX.finding - 44} ${findingY}`}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeOpacity={opacity}
              strokeDasharray="320"
              className="cinema-trace"
              style={{ animationDelay: `${index * 80 + 200}ms` }}
            />
          </g>
        );
      })}

      {chainTitle ? (
        <path
          d={`M ${laneX.finding + 76} ${findingY} C ${laneX.finding + 150} ${findingY}, ${laneX.attackChain - 110} ${findingY}, ${laneX.attackChain - 30} ${findingY}`}
          fill="none"
          stroke="url(#cinema-flow-attack-chain)"
          strokeWidth={2.2}
          strokeDasharray="320"
          className="cinema-trace"
          style={{ animationDelay: "420ms" }}
        />
      ) : null}

      {signals.map((signal, index) => {
        const y = topPad + index * rowHeight;
        const isSelected = activeSignalKey === signal.key;
        const isHovered = hoverSignalKey === signal.key;
        const focused = isSelected || isHovered;
        const quote = signal.quote || "no signal captured";
        return (
          <g
            key={signal.key}
            className="cursor-pointer"
            onClick={() => onSelectSignal(isSelected ? null : signal.key)}
            onMouseEnter={() => onHoverSignal(signal.key)}
            onMouseLeave={() => onHoverSignal(null)}
          >
            <rect
              x={laneX.tool - 30}
              y={y - rowHeight / 2 + 4}
              width={laneX.evidence + 150 - laneX.tool + 30}
              height={rowHeight - 8}
              fill="transparent"
            />
            {isSelected ? (
              <circle cx={laneX.tool} cy={y} r={20} fill="none" stroke={stroke} strokeOpacity={0.22} strokeWidth={6} />
            ) : null}
            <circle
              cx={laneX.tool}
              cy={y}
              r={focused ? 15 : 12}
              fill="var(--background)"
              stroke={focused ? stroke : "currentColor"}
              strokeOpacity={isSelected ? 1 : isHovered ? 0.85 : 0.55}
              strokeWidth={focused ? 1.8 : 1.1}
            />
            <text
              x={laneX.tool}
              y={y + 4}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={12}
              fill="currentColor"
              opacity={0.9}
            >
              ⚙
            </text>
            <text
              x={laneX.tool}
              y={y + 30}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={10}
              fill={focused ? stroke : "currentColor"}
              opacity={focused ? 1 : 0.72}
              letterSpacing="1.2"
            >
              {trimmedValue(signal.toolName, 20)}
            </text>

            <rect
              x={laneX.evidence - 130}
              y={y - 16}
              width={260}
              height={32}
              rx={6}
              fill="var(--background)"
              stroke={focused ? stroke : "currentColor"}
              strokeOpacity={isSelected ? 0.9 : isHovered ? 0.6 : 0.3}
              strokeWidth={focused ? 1.4 : 1}
            />
            <text
              x={laneX.evidence - 122}
              y={y - 4}
              fontFamily="ui-monospace, monospace"
              fontSize={8}
              fill="currentColor"
              opacity={0.5}
              letterSpacing="2"
            >
              SIG ◦ {String(index + 1).padStart(2, "0")}
            </text>
            <text
              x={laneX.evidence}
              y={y + 10}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={10}
              fill="currentColor"
              opacity={focused ? 0.95 : 0.78}
            >
              {trimmedValue(quote, 30)}
            </text>
          </g>
        );
      })}

      <g>
        <rect
          x={laneX.finding - 70}
          y={findingY - 40}
          width={140}
          height={80}
          rx={8}
          fill="var(--background)"
          stroke={stroke}
          strokeWidth={2}
        />
        <text
          x={laneX.finding}
          y={findingY - 18}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={8}
          fill={stroke}
          letterSpacing="3.2"
        >
          {finding.severity.toUpperCase()} · MODEL REPORT
        </text>
        <text
          x={laneX.finding}
          y={findingY + 2}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={11}
          fill="currentColor"
          opacity={0.95}
        >
          {trimmedValue(finding.type, 18)}
        </text>
        <text
          x={laneX.finding}
          y={findingY + 18}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={9}
          fill="currentColor"
          opacity={0.6}
        >
          {trimmedValue(finding.targetLabel, 22)}
        </text>
        <text
          x={laneX.finding}
          y={findingY + 32}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={8}
          fill="currentColor"
          opacity={0.45}
          letterSpacing="2"
        >
          {Math.round((finding.confidence ?? 0) * 100)}% CONFIDENCE
        </text>
      </g>

      {chainTitle ? (
        <g>
          <rect
            x={laneX.attackChain - 70}
            y={findingY - 25}
            width={140}
            height={50}
            rx={6}
            fill="none"
            stroke={stroke}
            strokeOpacity={0.75}
            strokeDasharray="3 3"
          />
          <text
            x={laneX.attackChain}
            y={findingY - 6}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={8}
            fill={stroke}
            letterSpacing="3"
          >
            ⛓ ATTACK CHAIN
          </text>
          <text
            x={laneX.attackChain}
            y={findingY + 12}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={10}
            fill="currentColor"
            opacity={0.9}
          >
            {trimmedValue(chainTitle, 18)}
          </text>
        </g>
      ) : (
        <text
          x={laneX.attackChain}
          y={findingY + 4}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={9}
          fill="currentColor"
          opacity={0.35}
          letterSpacing="2"
        >
          STANDALONE
        </text>
      )}
    </svg>
  );
}

function VectorPill({ label, value }: { label: string; value: string }) {
  if (!value.trim()) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground/80">{label}</span>
      <span className="rounded-full border border-border/60 px-2 py-1 font-mono text-[0.62rem] text-muted-foreground">
        {value}
      </span>
    </div>
  );
}

export function ExecutionReportCinema({
  report,
  onJumpToToolActivity
}: {
  report: ExecutionReportDetail;
  onJumpToToolActivity: (toolRunRef: string) => void;
}) {
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(() => preferredFindingId(report));
  const [activeSignalKey, setActiveSignalKey] = useState<string | null>(null);
  const [hoverSignalKey, setHoverSignalKey] = useState<string | null>(null);

  useEffect(() => {
    setSelectedFindingId(preferredFindingId(report));
    setActiveSignalKey(null);
    setHoverSignalKey(null);
  }, [report]);

  const finding = report.findings.find((item) => item.id === selectedFindingId) ?? report.findings[0] ?? null;
  const signals = useMemo(
    () => (finding ? buildFindingSignals(finding, report.toolActivity) : []),
    [finding, report.toolActivity]
  );
  const chain = finding ? chainForFinding(report, finding.id) : null;
  const vectors = finding ? attackVectorsForFinding(report, finding.id) : [];
  const activeSignal = signals.find((signal) => signal.key === activeSignalKey) ?? null;

  useEffect(() => {
    setActiveSignalKey(null);
    setHoverSignalKey(null);
  }, [finding?.id]);

  if (!finding) {
    return (
      <section className="rounded-xl border border-border/60 bg-card/70 p-5">
        <div className="space-y-2">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Model-reported findings</p>
          <p className="text-sm leading-6 text-foreground/90">
            Workflow findings are the authoritative report output. This report did not persist any model-reported findings to support with evidence or relationship mapping.
          </p>
        </div>
      </section>
    );
  }

  const stroke = SEVERITY_STROKE[finding.severity];
  const currentIndex = report.findings.findIndex((item) => item.id === finding.id);

  return (
    <section className="rounded-xl border border-border/60 bg-card/70 p-3 sm:p-4">
      <div className="space-y-4">
        <div className="rounded-lg border border-border/50 bg-background/45 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.64rem] uppercase tracking-[0.24em]" style={{ color: stroke }}>
              Model-reported findings
            </span>
            <span className="rounded-full border border-border/60 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
              authoritative
            </span>
            <span className="rounded-full border border-border/60 px-2 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
              evidence-backed
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-foreground/90">
            The workflow model reported these findings. The cinema map below shows the supporting evidence, tool trace, and attack-chain context used to back each reported finding.
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto rounded-md border border-border/60 bg-background/55 px-3 py-2">
          <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground/80">
            findings
          </span>
          <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
          <div className="flex min-w-0 items-center gap-1.5">
            {report.findings.map((item, index) => {
              const selected = item.id === finding.id;
              const severityStroke = SEVERITY_STROKE[item.severity];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedFindingId(item.id)}
                  className={cn(
                    "group inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-left transition",
                    selected
                      ? "border-foreground/40 bg-background/85"
                      : "border-border/50 bg-background/30 hover:border-foreground/20"
                  )}
                >
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: severityStroke, opacity: selected ? 1 : 0.7 }}
                  />
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="max-w-[18ch] truncate text-[0.74rem] text-foreground">{item.title}</span>
                </button>
              );
            })}
          </div>
          <span className="ml-auto shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground/70">
            {String(currentIndex + 1).padStart(2, "0")} / {String(report.findings.length).padStart(2, "0")}
          </span>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(300px,1fr)]">
          <div className="relative isolate overflow-hidden rounded-md border border-border/60 bg-background/30">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1"
              style={{ background: `linear-gradient(90deg, ${stroke}, transparent)` }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{ background: `radial-gradient(40% 60% at 65% 50%, ${stroke}1A, transparent 70%)` }}
            />
            <div className="relative flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-2">
              <span
                aria-hidden
                className="h-2 w-2 rounded-full"
                style={{ background: stroke, boxShadow: `0 0 8px ${stroke}` }}
              />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.24em]" style={{ color: stroke }}>
                {finding.severity}
              </span>
              <span aria-hidden className="h-3 w-px bg-border" />
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                {finding.type}
              </span>
              <span aria-hidden className="h-3 w-px bg-border" />
              <span className="truncate text-[0.78rem] text-foreground">{finding.title}</span>
              <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                {Math.round((finding.confidence ?? 0) * 100)}% conf
              </span>
            </div>
            <div className="relative px-2 pb-2 pt-2">
              <CinemaGraph
                finding={finding}
                signals={signals}
                chainTitle={chain?.title ?? null}
                activeSignalKey={activeSignalKey}
                hoverSignalKey={hoverSignalKey}
                onSelectSignal={setActiveSignalKey}
                onHoverSignal={setHoverSignalKey}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="rounded-md border border-border/60 bg-background/55">
              <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
                <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                  supporting evidence
                </span>
                <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                  {signals.length} signal{signals.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="divide-y divide-border/40">
                {signals.map((signal, index) => {
                  const isSelected = activeSignalKey === signal.key;
                  return (
                    <li key={signal.key}>
                      <button
                        type="button"
                        onClick={() => setActiveSignalKey(isSelected ? null : signal.key)}
                        onMouseEnter={() => setHoverSignalKey(signal.key)}
                        onMouseLeave={() => setHoverSignalKey(null)}
                        className={cn(
                          "flex w-full items-start gap-2 px-3 py-2 text-left transition",
                          isSelected ? "bg-background/80" : "hover:bg-background/55"
                        )}
                        style={isSelected ? { boxShadow: `inset 2px 0 0 ${stroke}` } : undefined}
                      >
                        <span className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-mono text-[0.74rem] text-foreground">
                            {signal.toolName}
                          </span>
                          <span className="block truncate text-[0.7rem] text-muted-foreground">
                            {signal.quote || "no signal captured"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {signals.length === 0 ? (
                  <li className="px-3 py-4 text-sm text-muted-foreground">
                    No persisted evidence rows were attached to this reported finding.
                  </li>
                ) : null}
              </ul>
            </div>

            <div className="rounded-md border border-border/60 bg-background/70 px-3 py-2.5">
              <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                <span aria-hidden>⚙</span>
                {activeSignal ? `tool trace · ${activeSignal.toolName}` : "finding inspector"}
              </div>
              {activeSignal ? (
                <div className="mt-2 space-y-2">
                  <div className="flex flex-wrap gap-2 text-[0.7rem] text-muted-foreground">
                    <span className="rounded-full border border-border/60 px-2 py-1">{activeSignal.toolName}</span>
                    {activeSignal.status ? <span className="rounded-full border border-border/60 px-2 py-1">{activeSignal.status}</span> : null}
                    {activeSignal.toolRunRef ? (
                      <button
                        type="button"
                        className="rounded-full border border-border/60 px-2 py-1 transition hover:border-foreground/40 hover:text-foreground"
                        onClick={() => onJumpToToolActivity(activeSignal.toolRunRef as string)}
                      >
                        tool:{activeSignal.toolRunRef}
                      </button>
                    ) : null}
                    {activeSignal.observationRef ? <span className="rounded-full border border-border/60 px-2 py-1">obs:{activeSignal.observationRef}</span> : null}
                    {activeSignal.artifactRef ? <span className="rounded-full border border-border/60 px-2 py-1">artifact:{activeSignal.artifactRef}</span> : null}
                  </div>
                  {activeSignal.command ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[0.7rem] leading-5 text-foreground">$ {activeSignal.command}</pre>
                  ) : null}
                  {activeSignal.quote ? (
                    <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[0.68rem] leading-5 text-muted-foreground">{activeSignal.quote}</pre>
                  ) : null}
                  {activeSignal.outputPreview ? (
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[0.68rem] leading-5 text-muted-foreground">{activeSignal.outputPreview}</pre>
                  ) : null}
                </div>
              ) : (
                <div className="mt-2 space-y-2">
                  <p className="text-[0.72rem] leading-5 text-muted-foreground">
                    This finding was reported by the workflow model. Select a supporting evidence row to inspect the command, quoted signal, and persisted trace references behind that report.
                  </p>
                  {finding.explanationSummary ? (
                    <p className="text-sm leading-6 text-foreground/90">{finding.explanationSummary}</p>
                  ) : null}
                </div>
              )}
            </div>

            <div className="rounded-md border border-border/60 bg-background/55 px-3 py-2.5">
              <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                reported finding
              </div>
              <p className="mt-1 text-[0.82rem] font-medium text-foreground">{finding.summary}</p>
              {finding.confidenceReason ? (
                <p className="mt-2 text-[0.75rem] leading-5 text-muted-foreground">{finding.confidenceReason}</p>
              ) : null}
              {vectors.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {vectors.slice(0, 3).map((vector) => (
                    <VectorPill key={vector.id} label={vector.kind.replaceAll("_", " ")} value={vector.label} />
                  ))}
                </div>
              ) : null}
            </div>

            {chain ? (
              <div className="rounded-md border border-border/60 bg-background/55 px-3 py-2.5">
                <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-rose-500/85">
                  ⛓ attack chain support
                </div>
                <p className="mt-1 text-[0.78rem] leading-5 text-foreground/95">{chain.title}</p>
                <p className="mt-1 text-[0.74rem] leading-5 text-muted-foreground">{chain.summary}</p>
              </div>
            ) : null}

            {finding.recommendation ? (
              <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2.5">
                <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                  recommendation
                </div>
                <p className="mt-1 text-sm leading-6 text-foreground/95">{finding.recommendation}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
