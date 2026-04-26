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
 * split · canvas vectors · radial
 * The exploit is a gravity well at the centre. Recon tools orbit on the left
 * arc; signals coalesce inward; the kill chain trails right. Selection and
 * inspection live side-by-side with the graph so picking a tool always lands
 * its detail in view.
 */

function RadialGraph({
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
  const w = 760;
  const h = 460;
  const cx = 410;
  const cy = h / 2;
  const radiusTool = 240;
  const radiusSignal = 138;

  const n = Math.max(evidence.length, 1);
  const arcStart = Math.PI * 0.7;
  const arcEnd = Math.PI * 1.3;
  const angles = evidence.map((_, i) =>
    n === 1 ? Math.PI : arcStart + ((arcEnd - arcStart) * i) / (n - 1)
  );

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="block w-full"
      role="img"
      aria-label="Radial attack graph: tools orbit the exploit, kill chain trails right"
    >
      <defs>
        <radialGradient id="radial-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.45" />
          <stop offset="55%" stopColor={stroke} stopOpacity="0.08" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="radial-chain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.85" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {[110, 160, 210, 252].map((r) => (
        <circle
          key={r}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.05}
          strokeDasharray="2 6"
        />
      ))}
      <circle cx={cx} cy={cy} r={92} fill="url(#radial-core)" />

      <text
        x={cx - 270}
        y={cy + 4}
        textAnchor="end"
        fontFamily="ui-monospace, monospace"
        fontSize={9}
        letterSpacing="3"
        fill="currentColor"
        opacity={0.45}
      >
        RECON
      </text>
      <text
        x={cx + 275}
        y={cy + 4}
        textAnchor="start"
        fontFamily="ui-monospace, monospace"
        fontSize={9}
        letterSpacing="3"
        fill="currentColor"
        opacity={0.45}
      >
        KILL CHAIN
      </text>

      {evidence.map((ev, i) => {
        const a = angles[i] ?? Math.PI;
        const tx = cx + Math.cos(a) * radiusTool;
        const ty = cy + Math.sin(a) * radiusTool;
        const sx = cx + Math.cos(a) * radiusSignal;
        const sy = cy + Math.sin(a) * radiusSignal;
        const isSel = selectedTool === ev.toolName;
        const isHov = hoverTool === ev.toolName;
        const focused = isSel || isHov;
        const opacity = selectedTool ? (isSel ? 0.95 : 0.12) : isHov ? 0.85 : 0.5;
        return (
          <g key={`flow-${i}`}>
            <path
              d={`M ${tx} ${ty} Q ${(tx + sx) / 2 - 14} ${(ty + sy) / 2}, ${sx} ${sy}`}
              fill="none"
              stroke={stroke}
              strokeWidth={focused ? 1.8 : 0.9}
              strokeOpacity={opacity}
            />
            <path
              d={`M ${sx} ${sy} Q ${(sx + cx) / 2} ${(sy + cy) / 2 - 8}, ${cx - 44} ${cy + (sy - cy) * 0.18}`}
              fill="none"
              stroke={stroke}
              strokeWidth={focused ? 1.8 : 0.9}
              strokeOpacity={opacity}
            />
          </g>
        );
      })}

      {chainTitle ? (
        <g>
          <path
            d={`M ${cx + 46} ${cy} L ${cx + 256} ${cy}`}
            stroke="url(#radial-chain)"
            strokeWidth={2}
            fill="none"
          />
          {[0.35, 0.55, 0.75].map((t) => (
            <circle key={t} cx={cx + 46 + 210 * t} cy={cy} r={1.6} fill={stroke} opacity={1 - t * 0.7} />
          ))}
        </g>
      ) : null}

      {evidence.map((ev, i) => {
        const a = angles[i] ?? Math.PI;
        const tx = cx + Math.cos(a) * radiusTool;
        const ty = cy + Math.sin(a) * radiusTool;
        const sx = cx + Math.cos(a) * radiusSignal;
        const sy = cy + Math.sin(a) * radiusSignal;
        const isSel = selectedTool === ev.toolName;
        const isHov = hoverTool === ev.toolName;
        const focused = isSel || isHov;
        const labelAnchor = Math.cos(a) < -0.1 ? "end" : Math.cos(a) > 0.1 ? "start" : "middle";
        const labelDx = Math.cos(a) < -0.1 ? -16 : Math.cos(a) > 0.1 ? 16 : 0;
        const trimmedQuote = ev.quote
          ? ev.quote.length > 24
            ? `${ev.quote.slice(0, 23)}…`
            : ev.quote
          : "no signal";

        return (
          <g
            key={`node-${ev.toolName}-${i}`}
            className="cursor-pointer"
            onClick={() => onSelectTool(isSel ? null : ev.toolName)}
            onMouseEnter={() => onHoverTool(ev.toolName)}
            onMouseLeave={() => onHoverTool(null)}
          >
            {/* invisible hit target so the whole row is clickable */}
            <path
              d={`M ${tx} ${ty} L ${sx} ${sy}`}
              stroke="transparent"
              strokeWidth={36}
              fill="none"
            />

            {isSel ? (
              <circle
                cx={tx}
                cy={ty}
                r={20}
                fill="none"
                stroke={stroke}
                strokeOpacity={0.25}
                strokeWidth={6}
              />
            ) : null}
            <circle
              cx={tx}
              cy={ty}
              r={focused ? 14 : 11}
              fill="var(--background)"
              stroke={focused ? stroke : "currentColor"}
              strokeOpacity={isSel ? 1 : isHov ? 0.85 : 0.5}
              strokeWidth={focused ? 1.8 : 1}
            />
            <text
              x={tx}
              y={ty + 3.5}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize={11}
              fill="currentColor"
              opacity={0.85}
            >
              ⚙
            </text>
            <text
              x={tx + labelDx}
              y={ty + 4}
              textAnchor={labelAnchor}
              fontFamily="ui-monospace, monospace"
              fontSize={10}
              fill={focused ? stroke : "currentColor"}
              opacity={focused ? 1 : 0.7}
              letterSpacing="1.5"
            >
              {ev.toolName.length > 22 ? `${ev.toolName.slice(0, 21)}…` : ev.toolName}
            </text>

            <g transform={`translate(${sx}, ${sy})`}>
              <rect
                x={-72}
                y={-11}
                width={144}
                height={22}
                rx={11}
                fill="var(--background)"
                stroke={focused ? stroke : "currentColor"}
                strokeOpacity={isSel ? 0.9 : isHov ? 0.6 : 0.28}
                strokeWidth={focused ? 1.3 : 1}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fontFamily="ui-monospace, monospace"
                fontSize={9}
                fill="currentColor"
                opacity={focused ? 0.95 : 0.7}
              >
                {trimmedQuote}
              </text>
            </g>
          </g>
        );
      })}

      <g>
        <circle
          cx={cx}
          cy={cy}
          r={42}
          fill="var(--background)"
          stroke={stroke}
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={8}
          fill={stroke}
          letterSpacing="3"
        >
          {finding.severity.toUpperCase()}
        </text>
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={10}
          fill="currentColor"
          opacity={0.95}
        >
          {finding.type}
        </text>
        <text
          x={cx}
          y={cy + 18}
          textAnchor="middle"
          fontFamily="ui-monospace, monospace"
          fontSize={8}
          fill="currentColor"
          opacity={0.55}
        >
          {finding.targetLabel.length > 20 ? `${finding.targetLabel.slice(0, 19)}…` : finding.targetLabel}
        </text>
      </g>

      {chainTitle ? (
        <g transform={`translate(${cx + 280}, ${cy})`}>
          <rect
            x={-74}
            y={-22}
            width={148}
            height={44}
            rx={6}
            fill="var(--background)"
            stroke={stroke}
            strokeOpacity={0.7}
            strokeDasharray="3 3"
          />
          <text
            x={0}
            y={-5}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={8}
            fill={stroke}
            letterSpacing="3"
          >
            ⛓ KILL CHAIN
          </text>
          <text
            x={0}
            y={11}
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
            fontSize={9}
            fill="currentColor"
            opacity={0.9}
          >
            {chainTitle.length > 20 ? `${chainTitle.slice(0, 19)}…` : chainTitle}
          </text>
        </g>
      ) : null}
    </svg>
  );
}

export function DesignReportFindingSplitCanvasVectorsRadial() {
  const report = mockReportDetail;
  const [selectedId, setSelectedId] = useState<string>(report.findings[0]?.id ?? "");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [hoverTool, setHoverTool] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
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
      breadcrumbs={["Start", "Designs", "Finding · canvas vectors radial"]}
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
        <div className="col-span-full space-y-2">
          <MetaInline report={report} />
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            className="inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground transition hover:text-foreground"
          >
            <span aria-hidden>{summaryOpen ? "▾" : "▸"}</span>
            executive summary
          </button>
          {summaryOpen ? (
            <article className="max-w-[72ch]">
              <ReactMarkdown components={MARKDOWN_COMPONENTS_COMPACT}>{report.executiveSummary}</ReactMarkdown>
            </article>
          ) : null}
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
                const ev = toolEvidenceForFinding(f, report.toolActivity);
                const hasChain = !!chainForFinding(report, f.id);
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
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground/80">
                      {ev.length}sig{hasChain ? " · ⛓" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
            <span className="ml-auto shrink-0 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground/70">
              {String(angleIndex + 1).padStart(2, "0")} / {String(report.findings.length).padStart(2, "0")}
            </span>
          </div>

          {/* graph + inspector — side-by-side, both first-class */}
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(280px,1fr)]">
            <div className="relative overflow-hidden rounded-md border border-border/60 bg-background/40">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, ${stroke}, transparent)` }}
              />
              <div className="flex flex-wrap items-center gap-2 px-4 pt-3 text-xs text-muted-foreground">
                <span className="font-mono uppercase tracking-[0.18em]" style={{ color: stroke }}>
                  {finding.severity}
                </span>
                <span aria-hidden className="h-3 w-px bg-border" />
                <span className="font-mono uppercase tracking-[0.18em]">{finding.type}</span>
                <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                  tap a ⚙ to inspect
                </span>
              </div>
              <h3 className="mt-1 px-4 text-base font-semibold leading-tight tracking-tight text-foreground">
                {finding.title}
              </h3>
              <div className="px-2 pb-2 pt-1">
                <RadialGraph
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

            {/* inspector column */}
            <div className="flex flex-col gap-3">
              {/* tool list — clearly clickable */}
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
                  {evidence.map((ev) => {
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
                        >
                          <span
                            aria-hidden
                            className="mt-1 h-2 w-2 shrink-0 rounded-full"
                            style={{
                              background: isSel ? stroke : "transparent",
                              border: `1px solid ${isSel ? stroke : "currentColor"}`,
                              opacity: isSel ? 1 : 0.55
                            }}
                          />
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

              {/* recon detail */}
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
                    Click a recon stage in the orbit (or in the list above) to read the command, captured signal, and output preview.
                  </p>
                )}
              </div>

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
