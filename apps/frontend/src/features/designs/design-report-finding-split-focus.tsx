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
 * split · focus
 * Right pane visualises the **attack chain** as a numbered vertical track.
 * Each step is a vulnerability node showing its role (entry / pivot / impact)
 * with pre/post relationship lines drawn between them.
 */

const ROLE_LABEL: Record<string, string> = {
  entry: "entry",
  pivot: "pivot",
  impact: "impact",
  related: "related"
};

function roleForFinding(
  finding: typeof mockReportDetail.findings[number],
  index: number,
  total: number
): string {
  const explicit = finding.relationshipExplanations?.chainRole;
  if (explicit) return explicit;
  if (index === 0) return "entry";
  if (index === total - 1) return "impact";
  return "pivot";
}

export function DesignReportFindingSplitFocus() {
  const report = mockReportDetail;
  const [selectedId, setSelectedId] = useState<string>(report.findings[0]?.id ?? "");
  const finding = report.findings.find((f) => f.id === selectedId) ?? report.findings[0]!;
  const evidence = useMemo(
    () => toolEvidenceForFinding(finding, report.toolActivity),
    [finding, report.toolActivity]
  );
  const chain = chainForFinding(report, finding.id);
  const stroke = SEVERITY_STROKE[finding.severity];

  const chainFindings = useMemo(() => {
    if (!chain || chain.kind !== "chain") return [];
    return chain.findingIds
      .map((id) => report.findings.find((f) => f.id === id))
      .filter((f): f is NonNullable<typeof f> => Boolean(f));
  }, [chain, report.findings]);

  function onSelect(id: string) {
    setSelectedId(id);
  }

  return (
    <DetailPage
      title={report.title}
      breadcrumbs={["Start", "Designs", "Finding · split focus"]}
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
          <div className="grid gap-0 overflow-hidden rounded-md border border-border/60 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2.4fr)]">
            {/* Findings list */}
            <ul className="divide-y divide-border/60 border-b border-border/60 bg-background/40 lg:border-b-0 lg:border-r">
              <li className="flex items-baseline justify-between px-3 py-2">
                <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                  Vulnerabilities · {report.findings.length}
                </span>
              </li>
              {report.findings.map((f) => {
                const isSel = f.id === finding.id;
                const fStroke = SEVERITY_STROKE[f.severity];
                const inChain = chain && "findingIds" in chain && chain.findingIds.includes(f.id);
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(f.id)}
                      className={`relative flex w-full items-center gap-2 px-3 py-2 text-left transition ${
                        isSel ? "bg-muted/50" : "hover:bg-muted/25"
                      }`}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-[3px]"
                        style={{ background: fStroke, opacity: isSel ? 1 : 0.45 }}
                      />
                      <span
                        className="w-12 shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.18em]"
                        style={{ color: fStroke }}
                      >
                        {f.severity}
                      </span>
                      <span className="flex-1 truncate text-[0.82rem] text-foreground">{f.title}</span>
                      {inChain ? (
                        <span className="font-mono text-[0.62rem] text-rose-500/85">⛓</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Attack chain track */}
            <div className="relative px-5 py-5">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-1"
                style={{ background: `linear-gradient(90deg, ${stroke}, transparent)` }}
              />
              {/* Chain header */}
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                  Attack chain
                </span>
                {chain && "title" in chain ? (
                  <span className="font-semibold text-foreground">{chain.title}</span>
                ) : (
                  <span className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
                    standalone vulnerability · no chain
                  </span>
                )}
                {chain && "severity" in chain && chain.severity ? (
                  <span
                    className="rounded-sm border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase tracking-[0.2em]"
                    style={{ color: SEVERITY_STROKE[chain.severity], borderColor: `${SEVERITY_STROKE[chain.severity]}55` }}
                  >
                    {chain.severity}
                  </span>
                ) : null}
              </div>
              {chain && "summary" in chain && chain.summary ? (
                <p className="mt-1 max-w-[80ch] text-sm leading-6 text-muted-foreground">{chain.summary}</p>
              ) : null}

              {/* Vertical chain track */}
              {chainFindings.length > 0 ? (
                <ol className="relative mt-5 space-y-3 pl-7">
                  <span
                    aria-hidden
                    className="absolute left-3 top-2 bottom-2 w-px"
                    style={{ background: `linear-gradient(180deg, ${stroke}80, ${stroke}20 60%, transparent)` }}
                  />
                  {chainFindings.map((cf, i) => {
                    const cfStroke = SEVERITY_STROKE[cf.severity];
                    const isSel = cf.id === finding.id;
                    const role = roleForFinding(cf, i, chainFindings.length);
                    const cfEvidence = toolEvidenceForFinding(cf, report.toolActivity);
                    return (
                      <li key={cf.id} className="relative">
                        <span
                          aria-hidden
                          className="absolute -left-[18px] top-2 grid h-5 w-5 place-items-center rounded-full border bg-background font-mono text-[0.6rem]"
                          style={{
                            borderColor: cfStroke,
                            color: cfStroke,
                            boxShadow: isSel ? `0 0 0 3px ${cfStroke}33` : undefined
                          }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelect(cf.id)}
                          className={`block w-full rounded-md border px-3 py-2.5 text-left transition ${
                            isSel
                              ? "border-foreground/30 bg-muted/30"
                              : "border-border/60 bg-background/40 hover:border-foreground/20 hover:bg-muted/20"
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <span
                              className="font-mono uppercase tracking-[0.2em]"
                              style={{ color: cfStroke }}
                            >
                              {cf.severity}
                            </span>
                            <span aria-hidden className="h-3 w-px bg-border" />
                            <span className="font-mono uppercase tracking-[0.18em] text-muted-foreground">
                              {ROLE_LABEL[role] ?? role}
                            </span>
                            <span aria-hidden className="h-3 w-px bg-border" />
                            <span className="font-mono text-muted-foreground">{cf.type}</span>
                            <span className="ml-auto font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground/80">
                              {cfEvidence.length} ev
                            </span>
                          </div>
                          <div className="mt-1 text-[0.88rem] leading-5 text-foreground">{cf.title}</div>
                          <div className="mt-0.5 truncate font-mono text-[0.66rem] text-muted-foreground">
                            {cf.targetLabel}
                          </div>
                        </button>
                        {/* Connector annotation */}
                        {i < chainFindings.length - 1 ? (
                          <div className="relative mt-2 ml-1 max-w-[60ch] text-xs leading-5 text-muted-foreground">
                            <span className="mr-1 font-mono uppercase tracking-[0.18em] text-muted-foreground/70">
                              ↓ enables
                            </span>
                            {cf.relationshipExplanations?.enables ?? "next stage in the chain"}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <div className="mt-4 rounded-md border border-dashed border-border/60 bg-background/30 px-4 py-6 text-center">
                  <div className="font-mono text-[0.66rem] uppercase tracking-[0.22em] text-muted-foreground">
                    no chain
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    This vulnerability stands on its own. No multi-step attack path was inferred.
                  </p>
                </div>
              )}

              {/* Selected vulnerability detail card */}
              <div className="mt-5 rounded-md border border-border/60 bg-background/40 px-4 py-3.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                    selected
                  </span>
                  <span
                    className="font-mono text-[0.62rem] uppercase tracking-[0.2em]"
                    style={{ color: stroke }}
                  >
                    {finding.severity}
                  </span>
                  <span className="text-sm font-semibold text-foreground">{finding.title}</span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{finding.summary}</p>
                {finding.recommendation ? (
                  <div className="mt-2 rounded border border-border/60 bg-muted/15 px-3 py-2">
                    <div className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">
                      remediation
                    </div>
                    <p className="mt-0.5 text-sm leading-6 text-foreground/95">{finding.recommendation}</p>
                  </div>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {evidence.map((ev) => (
                    <span
                      key={ev.toolName}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-2 py-0.5"
                    >
                      <span aria-hidden className="font-mono text-[0.62rem] text-muted-foreground">⚙</span>
                      <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-foreground">
                        {ev.toolName}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DetailFieldGroup>
    </DetailPage>
  );
}
