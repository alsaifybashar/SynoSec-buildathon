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
 * split · canvas
 * Right pane visualises the attack path as four horizontal lanes:
 *   TOOLS → EVIDENCE → VULNERABILITY → CHAIN
 * Bezier curves trace how the selected finding came to be.
 */

function FindingListItem({
  finding,
  selected,
  hasChain,
  onSelect
}: {
  finding: typeof mockReportDetail.findings[number];
  selected: boolean;
  hasChain: boolean;
  onSelect: () => void;
}) {
  const stroke = SEVERITY_STROKE[finding.severity];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex w-full items-start gap-2 px-3 py-2.5 text-left transition ${
        selected ? "bg-muted/50" : "hover:bg-muted/25"
      }`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: stroke, opacity: selected ? 1 : 0.45 }}
      />
      <span className="flex-1">
        <span className="flex items-center gap-2">
          <span
            className="font-mono text-[0.6rem] uppercase tracking-[0.22em]"
            style={{ color: stroke }}
          >
            {finding.severity}
          </span>
          {hasChain ? (
            <span className="font-mono text-[0.62rem] text-rose-500/85">⛓</span>
          ) : null}
          <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/80">
            {Math.round(finding.confidence * 100)}%
          </span>
        </span>
        <span className="mt-1 line-clamp-2 block text-[0.82rem] leading-5 text-foreground">
          {finding.title}
        </span>
        <span className="mt-1 block truncate font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          {finding.type}
        </span>
      </span>
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
  const w = 720;
  const laneX = { tool: 70, evidence: 270, finding: 470, chain: 660 };
  const rowH = 56;
  const topPad = 36;
  const rows = Math.max(evidence.length, 1);
  const h = topPad + rows * rowH + 24;
  const findingY = topPad + ((rows - 1) * rowH) / 2;

  const lanes: Array<{ x: number; label: string }> = [
    { x: laneX.tool, label: "tools" },
    { x: laneX.evidence, label: "evidence" },
    { x: laneX.finding, label: "vulnerability" },
    { x: laneX.chain, label: "chain" }
  ];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="block w-full"
      role="img"
      aria-label="Attack path: tools to evidence to vulnerability to chain"
    >
      <defs>
        <linearGradient id="canvas-flow" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.0" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Lane headers */}
      {lanes.map((l) => (
        <g key={l.label}>
          <text
            x={l.x}
            y={18}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={8}
            fill="currentColor"
            opacity={0.55}
            letterSpacing="2"
          >
            {l.label.toUpperCase()}
          </text>
          <line
            x1={l.x}
            y1={24}
            x2={l.x}
            y2={h - 8}
            stroke="currentColor"
            strokeOpacity={0.06}
            strokeDasharray="2 4"
          />
        </g>
      ))}

      {/* Tool → Evidence and Evidence → Finding curves */}
      {evidence.map((ev, i) => {
        const y = topPad + i * rowH + rowH / 2 - rowH / 2 + 18;
        const isSel = selectedTool === ev.toolName;
        const opacity = selectedTool ? (isSel ? 0.95 : 0.18) : 0.55;
        return (
          <g key={`flow-${ev.toolName}-${i}`}>
            <path
              d={`M ${laneX.tool + 16} ${y} C ${laneX.tool + 90} ${y}, ${laneX.evidence - 90} ${y}, ${laneX.evidence - 32} ${y}`}
              fill="none"
              stroke={stroke}
              strokeWidth={isSel ? 1.6 : 1}
              strokeOpacity={opacity}
            />
            <path
              d={`M ${laneX.evidence + 32} ${y} C ${laneX.evidence + 110} ${y}, ${laneX.finding - 110} ${findingY}, ${laneX.finding - 30} ${findingY}`}
              fill="none"
              stroke={stroke}
              strokeWidth={isSel ? 1.6 : 1}
              strokeOpacity={opacity}
            />
          </g>
        );
      })}

      {/* Finding → Chain */}
      {chainTitle ? (
        <path
          d={`M ${laneX.finding + 56} ${findingY} C ${laneX.finding + 120} ${findingY}, ${laneX.chain - 80} ${findingY}, ${laneX.chain - 18} ${findingY}`}
          fill="none"
          stroke="url(#canvas-flow)"
          strokeWidth={1.6}
        />
      ) : null}

      {/* Tools + Evidence rows */}
      {evidence.map((ev, i) => {
        const y = topPad + i * rowH + rowH / 2 - rowH / 2 + 18;
        const isSel = selectedTool === ev.toolName;
        return (
          <g
            key={`row-${ev.toolName}-${i}`}
            className="cursor-pointer"
            onClick={() => onSelectTool(isSel ? null : ev.toolName)}
          >
            {/* Tool node */}
            <circle
              cx={laneX.tool}
              cy={y}
              r={isSel ? 11 : 9}
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
              fontSize={8}
              fill="currentColor"
              opacity={0.85}
            >
              ⚙
            </text>
            <text
              x={laneX.tool}
              y={y + 24}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={9}
              fill="currentColor"
              opacity={isSel ? 0.95 : 0.7}
            >
              {ev.toolName.length > 18 ? `${ev.toolName.slice(0, 17)}…` : ev.toolName}
            </text>

            {/* Evidence chip */}
            <rect
              x={laneX.evidence - 70}
              y={y - 12}
              width={140}
              height={24}
              rx={4}
              fill="var(--background)"
              stroke={isSel ? stroke : "currentColor"}
              strokeOpacity={isSel ? 0.9 : 0.3}
              strokeWidth={isSel ? 1.4 : 1}
            />
            <text
              x={laneX.evidence}
              y={y + 3}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={9}
              fill="currentColor"
              opacity={isSel ? 0.95 : 0.75}
            >
              {ev.quote
                ? ev.quote.length > 18
                  ? `${ev.quote.slice(0, 17)}…`
                  : ev.quote
                : "no quote"}
            </text>
          </g>
        );
      })}

      {/* Finding node */}
      <g>
        <rect
          x={laneX.finding - 56}
          y={findingY - 22}
          width={112}
          height={44}
          rx={6}
          fill="var(--background)"
          stroke={stroke}
          strokeWidth={1.6}
        />
        <text
          x={laneX.finding}
          y={findingY - 6}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={8}
          fill={stroke}
          letterSpacing="2"
        >
          {finding.severity.toUpperCase()}
        </text>
        <text
          x={laneX.finding}
          y={findingY + 11}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={9}
          fill="currentColor"
          opacity={0.9}
        >
          VULNERABILITY
        </text>
      </g>

      {/* Chain node */}
      {chainTitle ? (
        <g>
          <rect
            x={laneX.chain - 18}
            y={findingY - 16}
            width={56}
            height={32}
            rx={4}
            fill="none"
            stroke={stroke}
            strokeOpacity={0.7}
            strokeDasharray="3 3"
          />
          <text
            x={laneX.chain + 10}
            y={findingY + 4}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={9}
            fill={stroke}
            opacity={0.9}
          >
            ⛓ chain
          </text>
        </g>
      ) : (
        <text
          x={laneX.chain + 10}
          y={findingY + 4}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={9}
          fill="currentColor"
          opacity={0.35}
        >
          —
        </text>
      )}
    </svg>
  );
}

export function DesignReportFindingSplitCanvas() {
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

  function onSelect(id: string) {
    setSelectedId(id);
    setActiveTool(null);
  }

  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Designs", "Finding · split canvas"]}
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
        <div className="col-span-full">
          <div className="grid gap-0 overflow-hidden rounded-md border border-border/60 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2.6fr)]">
            {/* Findings list */}
            <ul className="divide-y divide-border/60 border-b border-border/60 bg-background/40 lg:border-b-0 lg:border-r">
              <li className="flex items-baseline justify-between px-3 py-2">
                <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                  Vulnerabilities · {report.findings.length}
                </span>
              </li>
              {report.findings.map((f) => (
                <li key={f.id}>
                  <FindingListItem
                    finding={f}
                    selected={f.id === finding.id}
                    hasChain={!!chainForFinding(report, f.id)}
                    onSelect={() => onSelect(f.id)}
                  />
                </li>
              ))}
            </ul>

            {/* Detail with attack-path flow */}
            <div className="relative px-5 py-5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, ${stroke}, transparent)` }}
              />
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono uppercase tracking-[0.18em]" style={{ color: stroke }}>
                  {finding.severity}
                </span>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span>{finding.type}</span>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span className="font-mono">{finding.targetLabel}</span>
                {chain ? (
                  <span className="ml-auto inline-flex items-center gap-1 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-rose-500/85">
                    ⛓ {chain.title}
                  </span>
                ) : null}
              </div>
              <h3 className="mt-2 text-lg font-semibold leading-tight tracking-tight text-foreground">
                {finding.title}
              </h3>
              <p className="mt-2 max-w-[80ch] text-sm leading-6 text-muted-foreground">{finding.summary}</p>

              <div className="mt-4">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                    Attack path
                  </span>
                  <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                    click ⚙ to inspect
                  </span>
                </div>
                <div className="rounded-md border border-border/60 bg-background/40 px-2 py-3">
                  <AttackPathFlow
                    finding={finding}
                    evidence={evidence}
                    chainTitle={chain?.title ?? null}
                    selectedTool={activeTool}
                    onSelectTool={setActiveTool}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                {finding.recommendation ? (
                  <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2.5">
                    <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                      remediation
                    </div>
                    <p className="mt-1 text-sm leading-6 text-foreground/95">{finding.recommendation}</p>
                  </div>
                ) : null}
                <div className="rounded-md border border-border/60 bg-background/40 px-3 py-2.5">
                  <div className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                    {tool ? `tool · ${tool.toolName}` : "tool inspector"}
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
                      Pick a ⚙ on the path to read its command, quoted match, and output preview.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailFieldGroup>
    </DetailPage>
  );
}
