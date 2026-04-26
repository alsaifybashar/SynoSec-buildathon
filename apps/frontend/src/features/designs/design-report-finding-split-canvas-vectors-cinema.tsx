import { useMemo, useState } from "react";
import { DetailFieldGroup, DetailPage } from "@/shared/components/detail-page";
import { mockReportDetail } from "@/features/designs/report-mock-detail";
import {
  MetaInline,
  ReportPageActions,
  SEVERITY_STROKE,
  chainForFinding,
  toolEvidenceForFinding
} from "@/features/designs/finding-shared";

/**
 * split · canvas vectors · cinema
 * A compact, focused attack-path graph paired with a permanent inspector.
 * The graph still leads visually (severity wash, animated stroke trace,
 * dramatic exploit core) but selection drives a docked inspector instead of
 * floating overlays — every click lands a detail somewhere obvious.
 */

function CinemaGraph({
  finding,
  evidence,
  chainTitle,
  selectedTool,
  hoverTool,
  onSelectTool,
  onHoverTool
}: {
  finding: typeof mockReportDetail.findings[number];
  evidence: ReturnType<typeof toolEvidenceForFinding>;
  chainTitle: string | null;
  selectedTool: string | null;
  hoverTool: string | null;
  onSelectTool: (tool: string | null) => void;
  onHoverTool: (tool: string | null) => void;
}) {
  const stroke = SEVERITY_STROKE[finding.severity];
  const w = 880;
  const h = 460;
  const laneX = { tool: 100, evidence: 330, finding: 600, chain: 800 };
  const findingY = h / 2;
  const n = Math.max(evidence.length, 1);
  const rowH = Math.min(78, (h - 110) / n);
  const topPad = (h - rowH * n) / 2 + rowH / 2;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="block w-full"
      role="img"
      aria-label="Cinematic attack path: recon → signal → exploit → kill chain"
    >
      <defs>
        <linearGradient id="cinema-flow-tool" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.0" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="cinema-flow-chain" x1="0" y1="0" x2="1" y2="0">
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

      <rect x="0" y="0" width={w} height={h} fill="url(#cinema-grid)" />
      <circle cx={laneX.finding} cy={findingY} r={170} fill="url(#cinema-core)" className="cinema-core-pulse" />

      {[
        { x: laneX.tool, label: "RECON" },
        { x: laneX.evidence, label: "SIGNAL" },
        { x: laneX.finding, label: "EXPLOIT" },
        { x: laneX.chain, label: "KILL CHAIN" }
      ].map((l) => (
        <g key={l.label}>
          <line
            x1={l.x}
            y1={36}
            x2={l.x}
            y2={h - 32}
            stroke="currentColor"
            strokeOpacity={0.07}
            strokeDasharray="2 6"
          />
          <text
            x={l.x}
            y={22}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={9}
            letterSpacing="3.2"
            fill="currentColor"
            opacity={0.65}
          >
            {l.label}
          </text>
        </g>
      ))}

      {evidence.map((ev, i) => {
        const y = topPad + i * rowH;
        const isSel = selectedTool === ev.toolName;
        const isHov = hoverTool === ev.toolName;
        const focused = isSel || isHov;
        const opacity = selectedTool ? (isSel ? 1 : 0.1) : isHov ? 0.85 : 0.5;
        const strokeW = focused ? 2 : 1.1;
        return (
          <g key={`flow-${i}`}>
            <path
              d={`M ${laneX.tool + 22} ${y} C ${laneX.tool + 110} ${y}, ${laneX.evidence - 140} ${y}, ${laneX.evidence - 70} ${y}`}
              fill="none"
              stroke="url(#cinema-flow-tool)"
              strokeWidth={strokeW}
              strokeOpacity={opacity}
              strokeDasharray="320"
              className="cinema-trace"
              style={{ animationDelay: `${i * 80}ms` }}
            />
            <path
              d={`M ${laneX.evidence + 70} ${y} C ${laneX.evidence + 160} ${y}, ${laneX.finding - 170} ${findingY}, ${laneX.finding - 44} ${findingY}`}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeW}
              strokeOpacity={opacity}
              strokeDasharray="320"
              className="cinema-trace"
              style={{ animationDelay: `${i * 80 + 200}ms` }}
            />
          </g>
        );
      })}

      {chainTitle ? (
        <path
          d={`M ${laneX.finding + 76} ${findingY} C ${laneX.finding + 150} ${findingY}, ${laneX.chain - 110} ${findingY}, ${laneX.chain - 30} ${findingY}`}
          fill="none"
          stroke="url(#cinema-flow-chain)"
          strokeWidth={2.2}
          strokeDasharray="320"
          className="cinema-trace"
          style={{ animationDelay: "420ms" }}
        />
      ) : null}

      {evidence.map((ev, i) => {
        const y = topPad + i * rowH;
        const isSel = selectedTool === ev.toolName;
        const isHov = hoverTool === ev.toolName;
        const focused = isSel || isHov;
        const trimmedQuote = ev.quote
          ? ev.quote.length > 30
            ? `${ev.quote.slice(0, 29)}…`
            : ev.quote
          : "no signal captured";
        const trimmedTool = ev.toolName.length > 20 ? `${ev.toolName.slice(0, 19)}…` : ev.toolName;
        return (
          <g
            key={`row-${ev.toolName}-${i}`}
            className="cursor-pointer"
            onClick={() => onSelectTool(isSel ? null : ev.toolName)}
            onMouseEnter={() => onHoverTool(ev.toolName)}
            onMouseLeave={() => onHoverTool(null)}
          >
            {/* full-row hit target */}
            <rect
              x={laneX.tool - 30}
              y={y - rowH / 2 + 4}
              width={laneX.evidence + 150 - laneX.tool + 30}
              height={rowH - 8}
              fill="transparent"
            />

            {isSel ? (
              <circle
                cx={laneX.tool}
                cy={y}
                r={20}
                fill="none"
                stroke={stroke}
                strokeOpacity={0.22}
                strokeWidth={6}
              />
            ) : null}
            <circle
              cx={laneX.tool}
              cy={y}
              r={focused ? 15 : 12}
              fill="var(--background)"
              stroke={focused ? stroke : "currentColor"}
              strokeOpacity={isSel ? 1 : isHov ? 0.85 : 0.55}
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
              {trimmedTool}
            </text>

            <rect
              x={laneX.evidence - 130}
              y={y - 16}
              width={260}
              height={32}
              rx={6}
              fill="var(--background)"
              stroke={focused ? stroke : "currentColor"}
              strokeOpacity={isSel ? 0.9 : isHov ? 0.6 : 0.3}
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
              SIG ◦ {String(i + 1).padStart(2, "0")}
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
              {trimmedQuote}
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
          {finding.severity.toUpperCase()} · EXPLOIT
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
          {finding.type}
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
          {finding.targetLabel.length > 22 ? `${finding.targetLabel.slice(0, 21)}…` : finding.targetLabel}
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
            x={laneX.chain - 70}
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
            x={laneX.chain}
            y={findingY - 6}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={8}
            fill={stroke}
            letterSpacing="3"
          >
            ⛓ KILL CHAIN
          </text>
          <text
            x={laneX.chain}
            y={findingY + 12}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={10}
            fill="currentColor"
            opacity={0.9}
          >
            {chainTitle.length > 18 ? `${chainTitle.slice(0, 17)}…` : chainTitle}
          </text>
        </g>
      ) : (
        <text
          x={laneX.chain}
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

export function DesignReportFindingSplitCanvasVectorsCinema() {
  const report = mockReportDetail;
  const [selectedId, setSelectedId] = useState<string>(report.findings[0]?.id ?? "");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [hoverTool, setHoverTool] = useState<string | null>(null);
  const finding = report.findings.find((f) => f.id === selectedId) ?? report.findings[0]!;
  const evidence = useMemo(
    () => toolEvidenceForFinding(finding, report.toolActivity),
    [finding, report.toolActivity]
  );
  const chain = chainForFinding(report, finding.id);
  const tool = evidence.find((t) => t.toolName === activeTool) ?? null;
  const stroke = SEVERITY_STROKE[finding.severity];
  const angleIndex = report.findings.findIndex((f) => f.id === finding.id);

  function onSelect(id: string) {
    setSelectedId(id);
    setActiveTool(null);
  }

  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Designs", "Finding · canvas vectors cinema"]}
      subtitle={report.executionId}
      timestamp={new Date(report.updatedAt).toLocaleString()}
      isDirty={false}
      onBack={() => undefined}
      onSave={() => undefined}
      onDismiss={() => undefined}
      onExportJson={() => undefined}
      actions={<ReportPageActions />}
    >
      <DetailFieldGroup className="bg-card/70">
        <div className="col-span-full">
          <MetaInline report={report} />
        </div>
      </DetailFieldGroup>

      <DetailFieldGroup className="bg-card/70">
        <div className="col-span-full space-y-3">
          {/* angle ribbon */}
          <div className="flex items-center gap-2 overflow-x-auto rounded-md border border-border/60 bg-background/55 px-3 py-2">
            <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground/80">
              angles
            </span>
            <span aria-hidden className="h-3 w-px shrink-0 bg-border" />
            <div className="flex min-w-0 items-center gap-1.5">
              {report.findings.map((f, i) => {
                const sel = f.id === finding.id;
                const fStroke = SEVERITY_STROKE[f.severity];
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => onSelect(f.id)}
                    className={`group inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-left transition ${
                      sel
                        ? "border-foreground/40 bg-background/85"
                        : "border-border/50 bg-background/30 hover:border-foreground/20"
                    }`}
                  >
                    <span
                      aria-hidden
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: fStroke, opacity: sel ? 1 : 0.7 }}
                    />
                    <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="max-w-[18ch] truncate text-[0.74rem] text-foreground">{f.title}</span>
                  </button>
                );
              })}
            </div>
            <span className="ml-auto shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground/70">
              {String(angleIndex + 1).padStart(2, "0")} / {String(report.findings.length).padStart(2, "0")}
            </span>
          </div>

          {/* graph + dock */}
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
            <div
              key={finding.id}
              className="relative isolate overflow-hidden rounded-md border border-border/60 bg-background/30"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, ${stroke}, transparent)` }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(40% 60% at 65% 50%, ${stroke}1A, transparent 70%)`
                }}
              />
              <div className="relative flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-2">
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: stroke, boxShadow: `0 0 8px ${stroke}` }}
                />
                <span
                  className="font-mono text-[0.62rem] uppercase tracking-[0.24em]"
                  style={{ color: stroke }}
                >
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
                  evidence={evidence}
                  chainTitle={chain && "title" in chain ? chain.title : null}
                  selectedTool={activeTool}
                  hoverTool={hoverTool}
                  onSelectTool={setActiveTool}
                  onHoverTool={setHoverTool}
                />
              </div>
            </div>

            {/* dock */}
            <div className="flex flex-col gap-3">
              <div className="rounded-md border border-border/60 bg-background/55">
                <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                    recon stages
                  </span>
                  <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                    {evidence.length} signal{evidence.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="divide-y divide-border/40">
                  {evidence.map((ev, i) => {
                    const isSel = activeTool === ev.toolName;
                    return (
                      <li key={ev.toolName}>
                        <button
                          type="button"
                          onClick={() => setActiveTool(isSel ? null : ev.toolName)}
                          onMouseEnter={() => setHoverTool(ev.toolName)}
                          onMouseLeave={() => setHoverTool(null)}
                          className={`flex w-full items-start gap-2 px-3 py-2 text-left transition ${
                            isSel ? "bg-background/80" : "hover:bg-background/55"
                          }`}
                          style={isSel ? { boxShadow: `inset 2px 0 0 ${stroke}` } : undefined}
                        >
                          <span className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-mono text-[0.74rem] text-foreground">
                              {ev.toolName}
                            </span>
                            <span className="block truncate text-[0.7rem] text-muted-foreground">
                              {ev.quote || "no signal captured"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="rounded-md border border-border/60 bg-background/70 px-3 py-2.5">
                <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                  <span aria-hidden>⚙</span>
                  {tool ? `recon · ${tool.toolName}` : "recon inspector"}
                </div>
                {tool ? (
                  <div className="mt-1.5 space-y-1">
                    {tool.command ? (
                      <pre className="overflow-x-auto font-mono text-[0.7rem] leading-5 text-foreground">$ {tool.command}</pre>
                    ) : null}
                    {tool.quote ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[0.68rem] leading-5 text-muted-foreground">{tool.quote}</pre>
                    ) : null}
                    {tool.outputPreview ? (
                      <pre className="max-h-32 overflow-auto font-mono text-[0.68rem] leading-5 text-muted-foreground">{tool.outputPreview}</pre>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1 text-[0.72rem] leading-5 text-muted-foreground">
                    Click a recon stage on the path (or in the list) to read the command, captured signal, and output preview.
                  </p>
                )}
              </div>

              {chain ? (
                <div className="rounded-md border border-border/60 bg-background/55 px-3 py-2.5">
                  <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-rose-500/85">
                    ⛓ kill chain
                  </div>
                  <p className="mt-1 text-[0.78rem] leading-5 text-foreground/95">
                    {"title" in chain ? chain.title : "Linked downstream impact"}
                  </p>
                </div>
              ) : null}

              {finding.recommendation ? (
                <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2.5">
                  <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                    counter
                  </div>
                  <p className="mt-1 text-sm leading-6 text-foreground/95">{finding.recommendation}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </DetailFieldGroup>
    </DetailPage>
  );
}
