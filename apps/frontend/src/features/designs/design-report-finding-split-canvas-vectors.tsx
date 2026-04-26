import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import { DetailFieldGroup, DetailPage } from "@/shared/components/detail-page";
import { mockReportDetail } from "@/features/designs/report-mock-detail";
import {
  MARKDOWN_COMPONENTS_COMPACT,
  MetaInline,
  ReportPageActions,
  SEVERITY_STROKE,
  chainForFinding,
  toolEvidenceForFinding
} from "@/features/designs/finding-shared";

/**
 * split · canvas vectors
 * Attack angles run across the top as a chip strip; the full-width attack
 * path lives below — RECON → SIGNAL → EXPLOIT → KILL CHAIN — so the angle
 * stays anchored above the path it produces.
 */

function AttackAngleChip({
  finding,
  index,
  selected,
  hasChain,
  evidenceCount,
  onSelect
}: {
  finding: typeof mockReportDetail.findings[number];
  index: number;
  selected: boolean;
  hasChain: boolean;
  evidenceCount: number;
  onSelect: () => void;
}) {
  const stroke = SEVERITY_STROKE[finding.severity];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group relative shrink-0 overflow-hidden rounded-md border px-3 py-2.5 text-left transition ${
        selected
          ? "border-foreground/40 bg-background/80 shadow-sm"
          : "border-border/60 bg-background/30 hover:border-foreground/20 hover:bg-background/55"
      }`}
      style={{ minWidth: "240px", maxWidth: "300px" }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-[3px]"
        style={{ background: stroke, opacity: selected ? 1 : 0.55 }}
      />
      <div className="flex items-center gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground/80">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span aria-hidden className="h-3 w-px bg-border" />
        <span
          className="font-mono text-[0.6rem] uppercase tracking-[0.22em]"
          style={{ color: stroke }}
        >
          {finding.severity}
        </span>
        {hasChain ? (
          <span className="ml-auto font-mono text-[0.62rem] text-rose-500/85">⛓</span>
        ) : null}
      </div>
      <div className="mt-1.5 line-clamp-2 text-[0.84rem] leading-5 text-foreground">
        {finding.title}
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className="truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          {finding.type}
        </span>
        <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/80">
          {evidenceCount} sig · {Math.round((finding.confidence ?? 0) * 100)}%
        </span>
      </div>
    </button>
  );
}

function AttackPathFlow({
  finding,
  evidence,
  chainTitle,
  selectedTool,
  onSelectTool
}: {
  finding: typeof mockReportDetail.findings[number];
  evidence: ReturnType<typeof toolEvidenceForFinding>;
  chainTitle: string | null;
  selectedTool: string | null;
  onSelectTool: (tool: string | null) => void;
}) {
  const stroke = SEVERITY_STROKE[finding.severity];
  const w = 980;
  const laneX = { tool: 90, evidence: 360, finding: 660, chain: 900 };
  const rowH = 60;
  const topPad = 44;
  const rows = Math.max(evidence.length, 1);
  const h = topPad + rows * rowH + 32;
  const findingY = topPad + ((rows - 1) * rowH) / 2;

  const lanes: Array<{ x: number; label: string; sub: string }> = [
    { x: laneX.tool, label: "recon", sub: "tooling" },
    { x: laneX.evidence, label: "signal", sub: "captured evidence" },
    { x: laneX.finding, label: "exploit", sub: "attack angle" },
    { x: laneX.chain, label: "kill chain", sub: "downstream impact" }
  ];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="block w-full"
      role="img"
      aria-label="Attack path: recon → signal → exploit → kill chain"
    >
      <defs>
        <linearGradient id="vectors-flow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity="0" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Lane headers */}
      {lanes.map((l) => (
        <g key={l.label}>
          <text
            x={l.x}
            y={16}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={9}
            fill="currentColor"
            opacity={0.7}
            letterSpacing="2.5"
          >
            {l.label.toUpperCase()}
          </text>
          <text
            x={l.x}
            y={28}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={8}
            fill="currentColor"
            opacity={0.4}
            letterSpacing="1.5"
          >
            {l.sub}
          </text>
          <line
            x1={l.x}
            y1={34}
            x2={l.x}
            y2={h - 8}
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeDasharray="2 4"
          />
        </g>
      ))}

      {/* Recon → Signal and Signal → Exploit curves */}
      {evidence.map((ev, i) => {
        const y = topPad + i * rowH;
        const isSel = selectedTool === ev.toolName;
        const opacity = selectedTool ? (isSel ? 0.95 : 0.16) : 0.55;
        return (
          <g key={`flow-${ev.toolName}-${i}`}>
            <path
              d={`M ${laneX.tool + 18} ${y} C ${laneX.tool + 110} ${y}, ${laneX.evidence - 130} ${y}, ${laneX.evidence - 50} ${y}`}
              fill="none"
              stroke={stroke}
              strokeWidth={isSel ? 1.8 : 1}
              strokeOpacity={opacity}
            />
            <path
              d={`M ${laneX.evidence + 50} ${y} C ${laneX.evidence + 150} ${y}, ${laneX.finding - 150} ${findingY}, ${laneX.finding - 36} ${findingY}`}
              fill="none"
              stroke={stroke}
              strokeWidth={isSel ? 1.8 : 1}
              strokeOpacity={opacity}
            />
          </g>
        );
      })}

      {/* Exploit → Kill chain */}
      {chainTitle ? (
        <path
          d={`M ${laneX.finding + 64} ${findingY} C ${laneX.finding + 140} ${findingY}, ${laneX.chain - 110} ${findingY}, ${laneX.chain - 26} ${findingY}`}
          fill="none"
          stroke="url(#vectors-flow)"
          strokeWidth={1.8}
        />
      ) : null}

      {/* Recon + Signal rows */}
      {evidence.map((ev, i) => {
        const y = topPad + i * rowH;
        const isSel = selectedTool === ev.toolName;
        return (
          <g
            key={`row-${ev.toolName}-${i}`}
            className="cursor-pointer"
            onClick={() => onSelectTool(isSel ? null : ev.toolName)}
          >
            {/* Recon node */}
            <circle
              cx={laneX.tool}
              cy={y}
              r={isSel ? 12 : 10}
              fill="var(--background)"
              stroke="currentColor"
              strokeOpacity={isSel ? 0.9 : 0.5}
              strokeWidth={isSel ? 1.6 : 1}
            />
            <text
              x={laneX.tool}
              y={y + 3}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={9}
              fill="currentColor"
              opacity={0.85}
            >
              ⚙
            </text>
            <text
              x={laneX.tool}
              y={y + 26}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={9}
              fill="currentColor"
              opacity={isSel ? 0.95 : 0.7}
            >
              {ev.toolName.length > 22 ? `${ev.toolName.slice(0, 21)}…` : ev.toolName}
            </text>

            {/* Signal chip */}
            <rect
              x={laneX.evidence - 110}
              y={y - 14}
              width={220}
              height={28}
              rx={5}
              fill="var(--background)"
              stroke={isSel ? stroke : "currentColor"}
              strokeOpacity={isSel ? 0.9 : 0.3}
              strokeWidth={isSel ? 1.4 : 1}
            />
            <text
              x={laneX.evidence}
              y={y + 4}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={9}
              fill="currentColor"
              opacity={isSel ? 0.95 : 0.78}
            >
              {ev.quote
                ? ev.quote.length > 30
                  ? `${ev.quote.slice(0, 29)}…`
                  : ev.quote
                : "no signal captured"}
            </text>
          </g>
        );
      })}

      {/* Exploit node */}
      <g>
        <rect
          x={laneX.finding - 64}
          y={findingY - 26}
          width={128}
          height={52}
          rx={6}
          fill="var(--background)"
          stroke={stroke}
          strokeWidth={1.8}
        />
        <text
          x={laneX.finding}
          y={findingY - 8}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={8}
          fill={stroke}
          letterSpacing="2.5"
        >
          {finding.severity.toUpperCase()} · EXPLOIT
        </text>
        <text
          x={laneX.finding}
          y={findingY + 8}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={9}
          fill="currentColor"
          opacity={0.9}
        >
          {finding.type}
        </text>
        <text
          x={laneX.finding}
          y={findingY + 20}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={8}
          fill="currentColor"
          opacity={0.55}
        >
          {finding.targetLabel.length > 22 ? `${finding.targetLabel.slice(0, 21)}…` : finding.targetLabel}
        </text>
      </g>

      {/* Kill chain node */}
      {chainTitle ? (
        <g>
          <rect
            x={laneX.chain - 60}
            y={findingY - 22}
            width={120}
            height={44}
            rx={6}
            fill="none"
            stroke={stroke}
            strokeOpacity={0.75}
            strokeDasharray="3 3"
          />
          <text
            x={laneX.chain}
            y={findingY - 5}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={8}
            fill={stroke}
            letterSpacing="2.5"
          >
            ⛓ KILL CHAIN
          </text>
          <text
            x={laneX.chain}
            y={findingY + 10}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={9}
            fill="currentColor"
            opacity={0.85}
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
        >
          standalone
        </text>
      )}
    </svg>
  );
}

export function DesignReportFindingSplitCanvasVectors() {
  const report = mockReportDetail;
  const [selectedId, setSelectedId] = useState<string>(report.findings[0]?.id ?? "");
  const [activeTool, setActiveTool] = useState<string | null>(null);
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
      breadcrumbs={["Start", "Designs", "Finding · split canvas vectors"]}
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
        <div className="col-span-full space-y-3">
          <MetaInline report={report} />
          <article className="max-w-[72ch]">
            <ReactMarkdown components={MARKDOWN_COMPONENTS_COMPACT}>{report.executiveSummary}</ReactMarkdown>
          </article>
        </div>
      </DetailFieldGroup>

      <DetailFieldGroup className="bg-card/70">
        <div className="col-span-full space-y-3">
          {/* Attack angles · top strip */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                Attack angles
              </span>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                · {report.findings.length} exploit{report.findings.length === 1 ? "" : "s"}
              </span>
            </div>
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/70">
              {String(angleIndex + 1).padStart(2, "0")} / {String(report.findings.length).padStart(2, "0")} selected
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {report.findings.map((f, i) => {
              const ev = toolEvidenceForFinding(f, report.toolActivity);
              return (
                <AttackAngleChip
                  key={f.id}
                  finding={f}
                  index={i}
                  selected={f.id === finding.id}
                  hasChain={!!chainForFinding(report, f.id)}
                  evidenceCount={ev.length}
                  onSelect={() => onSelect(f.id)}
                />
              );
            })}
          </div>

          {/* Selected angle path */}
          <div className="relative overflow-hidden rounded-md border border-border/60 bg-background/40">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-1"
              style={{ background: `linear-gradient(90deg, ${stroke}, transparent)` }}
            />
            <div className="flex flex-wrap items-center gap-2 px-5 pt-4 text-xs text-muted-foreground">
              <span className="font-mono uppercase tracking-[0.18em]" style={{ color: stroke }}>
                {finding.severity} exploit
              </span>
              <span aria-hidden className="h-3 w-px bg-border" />
              <span className="font-mono uppercase tracking-[0.18em]">{finding.type}</span>
              <span aria-hidden className="h-3 w-px bg-border" />
              <span className="font-mono">{finding.targetLabel}</span>
              {chain ? (
                <span className="ml-auto inline-flex items-center gap-1 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-rose-500/85">
                  ⛓ {"title" in chain ? chain.title : "kill chain"}
                </span>
              ) : null}
            </div>
            <h3 className="mt-2 px-5 text-xl font-semibold leading-tight tracking-tight text-foreground">
              {finding.title}
            </h3>
            <p className="mt-1 max-w-[88ch] px-5 text-sm leading-6 text-muted-foreground">{finding.summary}</p>

            <div className="mt-3 flex items-baseline justify-between px-5">
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                Attack path
              </span>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                tap a ⚙ to inspect that recon stage
              </span>
            </div>
            <div className="mx-3 mt-1 mb-3 rounded-md border border-border/60 bg-background/60 px-2 py-3">
              <AttackPathFlow
                finding={finding}
                evidence={evidence}
                chainTitle={chain && "title" in chain ? chain.title : null}
                selectedTool={activeTool}
                onSelectTool={setActiveTool}
              />
            </div>

            <div className="grid gap-3 px-5 pb-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              {finding.recommendation ? (
                <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2.5">
                  <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                    counter
                  </div>
                  <p className="mt-1 text-sm leading-6 text-foreground/95">{finding.recommendation}</p>
                </div>
              ) : null}
              <div className="rounded-md border border-border/60 bg-background/60 px-3 py-2.5">
                <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {tool ? `recon · ${tool.toolName}` : "recon inspector"}
                </div>
                {tool ? (
                  <div className="mt-1 space-y-1">
                    {tool.command ? (
                      <pre className="overflow-x-auto font-mono text-[0.72rem] leading-5 text-foreground">$ {tool.command}</pre>
                    ) : null}
                    {tool.quote ? (
                      <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-[0.7rem] leading-5 text-muted-foreground">{tool.quote}</pre>
                    ) : null}
                    {tool.outputPreview ? (
                      <pre className="max-h-32 overflow-auto font-mono text-[0.7rem] leading-5 text-muted-foreground">{tool.outputPreview}</pre>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Pick a ⚙ on the path to read the recon command, captured signal, and output preview.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </DetailFieldGroup>
    </DetailPage>
  );
}
