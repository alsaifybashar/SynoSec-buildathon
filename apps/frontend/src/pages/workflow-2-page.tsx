import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertOctagon,
  Ampersand,
  Ban,
  BookLock,
  BrainCog,
  ChevronRight,
  CircleStop,
  Cpu,
  FileWarning,
  FlaskConical,
  Gauge,
  GitBranch,
  Layers,
  LucideIcon,
  Orbit,
  Paperclip,
  Pencil,
  Play,
  Plus,
  Quote,
  RefreshCcw,
  Save,
  ScrollText,
  Shield,
  ShieldAlert,
  Sliders,
  Sparkles,
  Stamp,
  Tags,
  Target,
  Terminal,
  Waypoints,
  Workflow,
  Wrench,
  X
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// shared visual motifs (mirrors the Flow Studio vocabulary so this feels
// native, but the page composition below is deliberately chat-first)
// ---------------------------------------------------------------------------

function CornerMarks({ className }: { className?: string }) {
  return (
    <>
      <span aria-hidden className={cn("pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-foreground/25", className)} />
      <span aria-hidden className={cn("pointer-events-none absolute right-0 top-0 h-3 w-3 border-r border-t border-foreground/25", className)} />
      <span aria-hidden className={cn("pointer-events-none absolute bottom-0 left-0 h-3 w-3 border-b border-l border-foreground/25", className)} />
      <span aria-hidden className={cn("pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-foreground/25", className)} />
    </>
  );
}

function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[0.6rem] font-semibold uppercase tracking-[0.32em] text-muted-foreground/80", className)}>
      {children}
    </p>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[3px] border border-border bg-background px-1.5 py-0.5 font-mono text-[0.625rem] font-semibold text-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]">
      {children}
    </kbd>
  );
}

function Bracket({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono", className)}>
      <span aria-hidden className="text-muted-foreground/70">[</span>
      {children}
      <span aria-hidden className="text-muted-foreground/70">]</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// mock data — single-agent transcript, culminating in an evidence dossier
// ---------------------------------------------------------------------------

type ThinkingEntry = {
  kind: "thinking";
  id: string;
  title: string;
  body: string;
  durationSec: number;
};

type ToolCallEntry = {
  kind: "tool_call";
  id: string;
  tool: string;
  label: string;
  args: Array<[string, string]>;
};

type ToolResultEntry = {
  kind: "tool_result";
  id: string;
  tool: string;
  status: "ok" | "partial" | "flagged";
  summary: string;
  snippets: string[];
  durationMs: number;
};

type SystemCardEntry = {
  kind: "system_card";
  id: string;
  severity: "info" | "caution" | "critical";
  heading: string;
  body: string;
  origin: string;
  icon: LucideIcon;
};

type Finding = {
  id: string;
  code: string;
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  title: string;
  rationale: string;
  evidence: string;
  confidence: number;
};

type DossierEntry = {
  kind: "dossier";
  id: string;
  title: string;
  subject: string;
  signedAt: string;
  confidence: number;
  findings: Finding[];
  chain: string[];
  artifacts: string[];
};

type TranscriptEntry = ThinkingEntry | ToolCallEntry | ToolResultEntry | SystemCardEntry | DossierEntry;

const baseTranscript: TranscriptEntry[] = [
  {
    kind: "thinking",
    id: "t1",
    title: "establishing baseline",
    durationSec: 3,
    body:
      "Charter directs a zero-knowledge reconnaissance sweep on acme-staging.internal. " +
      "Before any active probe I want an inventory — DNS, passive sources, any cached HTTP fingerprints — " +
      "so I can triangulate the attack surface without tripping scope lines."
  },
  {
    kind: "tool_call",
    id: "c1",
    tool: "recon.surface_sweep",
    label: "passive host & service enumeration",
    args: [
      ["target", "acme-staging.internal"],
      ["passive", "true"],
      ["timeout_ms", "6000"]
    ]
  },
  {
    kind: "tool_result",
    id: "r1",
    tool: "recon.surface_sweep",
    status: "ok",
    durationMs: 1842,
    summary: "14 hosts · 3 exposed services · 1 anomaly flagged",
    snippets: [
      "api.acme-staging.internal → 10.42.7.3:443 (nginx/1.24)",
      "admin.acme-staging.internal → 10.42.7.8:443 (nginx/1.24, HSTS absent)",
      "/api/v2/internal → 401 without WWW-Authenticate header (anomaly)"
    ]
  },
  {
    kind: "thinking",
    id: "t2",
    title: "narrowing the focus",
    durationSec: 2,
    body:
      "The /api/v2/internal endpoint returning 401 but omitting WWW-Authenticate is atypical — " +
      "it suggests a custom auth middleware that may leak timing signals. " +
      "Before I chase that thread, TLS and security headers on the edge are cheaper evidence and likely shapers of the final risk picture."
  },
  {
    kind: "system_card",
    id: "s1",
    severity: "caution",
    heading: "Scope Boundary Reinforced",
    body:
      "customer.acme.com and *.customer.acme.com are strictly out of scope for this inquiry. " +
      "Do not resolve, probe, or reference customer-owned hostnames in the dossier.",
    origin: "guardrail · charter.section_2",
    icon: Ban
  },
  {
    kind: "tool_call",
    id: "c2",
    tool: "tls.inspect",
    label: "edge TLS posture & header policy",
    args: [
      ["target", "api.acme-staging.internal:443"],
      ["deep", "true"]
    ]
  },
  {
    kind: "tool_result",
    id: "r2",
    tool: "tls.inspect",
    status: "flagged",
    durationMs: 2217,
    summary: "TLS 1.2 served · HSTS absent · legacy cipher suite accepted",
    snippets: [
      "negotiated: TLSv1.2 · TLS_RSA_WITH_AES_128_CBC_SHA",
      "security headers missing: Strict-Transport-Security, X-Content-Type-Options",
      "certificate chain valid (issuer: internal-ca-02)"
    ]
  },
  {
    kind: "system_card",
    id: "s2",
    severity: "info",
    heading: "Evidence Policy · tls_weakness",
    body:
      "Findings typed as tls_weakness require a raw cipher-trace attachment before the dossier is sealed. " +
      "Queue a capture probe before concluding.",
    origin: "policy · evidence-v1.7",
    icon: BookLock
  },
  {
    kind: "tool_call",
    id: "c3",
    tool: "tls.capture_probe",
    label: "raw cipher trace (downgrade proof)",
    args: [
      ["target", "api.acme-staging.internal:443"],
      ["force_cipher", "TLS_RSA_WITH_AES_128_CBC_SHA"],
      ["record_pcap", "true"]
    ]
  },
  {
    kind: "tool_result",
    id: "r3",
    tool: "tls.capture_probe",
    status: "ok",
    durationMs: 1354,
    summary: "cipher accepted · 482-byte pcap captured · attached to artifact bundle",
    snippets: [
      "server_hello.cipher_suite = 0x002F (TLS_RSA_WITH_AES_128_CBC_SHA)",
      "session_resumption = false · client_random entropy ok",
      "pcap sha256 = 8f2a…b41e · 482 B"
    ]
  },
  {
    kind: "thinking",
    id: "t3",
    title: "consolidating the picture",
    durationSec: 4,
    body:
      "Three candidate findings form a coherent story: (a) downgraded TLS accepts a legacy cipher suite — " +
      "fundable as tls_weakness; (b) HSTS and X-Content-Type-Options absent — missing_security_header; " +
      "(c) the /api/v2/internal WWW-Authenticate omission is a softer service_exposure tell. " +
      "Evidence is sufficient to seal a dossier; confidence is high on (a), moderate on (b), low on (c)."
  },
  {
    kind: "dossier",
    id: "d1",
    title: "Edge Posture · acme-staging.internal",
    subject: "edge api · TLS & header policy review",
    signedAt: "20:42:11Z",
    confidence: 0.89,
    findings: [
      {
        id: "f1",
        code: "F-001",
        severity: "high",
        type: "tls_weakness",
        title: "Legacy cipher suite accepted on edge API",
        rationale:
          "Server accepts TLS_RSA_WITH_AES_128_CBC_SHA on api.acme-staging.internal:443. RSA key-exchange removes forward secrecy; CBC mode with SHA-1 is deprecated. MITM feasibility rises materially.",
        evidence: "pcap://edge-api/2026-04-21T20:40:57Z · cipher 0x002F accepted",
        confidence: 0.94
      },
      {
        id: "f2",
        code: "F-002",
        severity: "medium",
        type: "missing_security_header",
        title: "HSTS and X-Content-Type-Options absent",
        rationale:
          "Neither Strict-Transport-Security nor X-Content-Type-Options headers are served on any inspected endpoint. Combined with the TLS downgrade posture above, this compounds MITM risk for repeat visitors.",
        evidence: "http_response://api.acme-staging.internal/ · header-set captured",
        confidence: 0.88
      },
      {
        id: "f3",
        code: "F-003",
        severity: "low",
        type: "service_exposure",
        title: "/api/v2/internal omits WWW-Authenticate",
        rationale:
          "401 responses lack the challenge header, suggesting custom middleware. Soft signal — worth revisiting in a deeper scan but does not warrant escalation on its own.",
        evidence: "http_response://api.acme-staging.internal/api/v2/internal",
        confidence: 0.61
      }
    ],
    chain: [
      "Baseline inventory via passive recon → surfaced edge API & anomalous internal endpoint",
      "TLS posture inspection → downgraded cipher accepted + missing HSTS",
      "Forced cipher capture → downgrade proven with pcap",
      "Findings graded against finding-policy taxonomy · typed-core-v1"
    ],
    artifacts: [
      "pcap://edge-api/cipher-downgrade-sha256-8f2a…b41e.pcap",
      "http_response://api.acme-staging.internal/header-snapshot.json",
      "recon://surface-sweep/acme-staging-inventory.yaml"
    ]
  }
];

// quick lookup so we can style tool_result entries by their tool kind
const toolIcon: Record<string, LucideIcon> = {
  "recon.surface_sweep": Target,
  "tls.inspect": Shield,
  "tls.capture_probe": FlaskConical
};

// ---------------------------------------------------------------------------
// small atomic pieces
// ---------------------------------------------------------------------------

function SeverityPip({ severity }: { severity: Finding["severity"] }) {
  const tone =
    severity === "critical"
      ? "bg-rose-600 text-rose-50 ring-rose-500/40"
      : severity === "high"
        ? "bg-rose-500/90 text-rose-50 ring-rose-500/30"
        : severity === "medium"
          ? "bg-amber-500/90 text-amber-950 ring-amber-500/30"
          : "bg-sky-500/80 text-sky-50 ring-sky-500/30";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.2em] ring-1", tone)}>
      <span aria-hidden className="h-1 w-1 rounded-full bg-current" />
      {severity}
    </span>
  );
}

function Chip({
  children,
  active,
  onClick,
  icon: Icon
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.6875rem] uppercase tracking-[0.14em] transition-colors",
        active
          ? "border-primary/60 bg-primary/10 text-foreground"
          : "border-border/80 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground"
      )}
    >
      {Icon ? <Icon className={cn("h-3 w-3", active ? "text-primary" : "text-muted-foreground/80")} /> : (
        <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-primary" : "bg-muted-foreground/40")} />
      )}
      {children}
    </button>
  );
}

function Meter({ label, value, max = 1, suffix }: { label: string; value: number; max?: number; suffix?: string }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <SectionLabel>{label}</SectionLabel>
        <span className="font-mono text-[0.6875rem] tabular-nums text-foreground">
          {typeof suffix === "string" ? suffix : value.toFixed(2)}
        </span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted">
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/70 via-primary to-primary/90"
          style={{ width: `${pct}%` }}
        />
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-full bg-[repeating-linear-gradient(90deg,transparent_0_11px,hsl(var(--border)/0.35)_11px_12px)]"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// run button — the headline interactive element
// ---------------------------------------------------------------------------

function RunGlyph({ running, onClick }: { running: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={running ? "Abort run" : "Start run"}
      className={cn(
        "group inline-flex h-12 items-center gap-3 rounded-full border px-5 font-mono text-[0.8125rem] font-semibold uppercase tracking-[0.2em] transition-all",
        running
          ? "border-rose-500/50 bg-rose-500/10 text-rose-600 hover:bg-rose-500/15 dark:text-rose-300"
          : "border-primary/70 bg-primary text-primary-foreground shadow-[0_0_0_6px_hsl(var(--primary)/0.08)] hover:shadow-[0_0_0_10px_hsl(var(--primary)/0.14)]"
      )}
    >
      {running ? (
        <CircleStop className="h-4 w-4" />
      ) : (
        <Play className="h-4 w-4 translate-x-[1px]" />
      )}
      <span>{running ? "Abort" : "Run"}</span>
      <span
        aria-hidden
        className={cn(
          "ml-0.5 h-3.5 w-px",
          running ? "bg-rose-500/40" : "bg-primary-foreground/40"
        )}
      />
      <span
        className={cn(
          "font-mono text-[0.625rem] tracking-[0.22em]",
          running ? "text-rose-600/80 dark:text-rose-300/80" : "text-primary-foreground/80"
        )}
      >
        {running ? "streaming" : "single pass"}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// transcript entry renderers
// ---------------------------------------------------------------------------

function TimelineSpine({ tone = "idle", live = false }: { tone?: "idle" | "active" | "done" | "warn"; live?: boolean }) {
  const dotTone =
    tone === "active"
      ? "bg-primary ring-primary/30"
      : tone === "done"
        ? "bg-emerald-500 ring-emerald-500/30"
        : tone === "warn"
          ? "bg-amber-500 ring-amber-500/30"
          : "bg-muted-foreground/40 ring-muted-foreground/20";
  return (
    <div className="relative flex w-10 shrink-0 justify-center">
      <span aria-hidden className="absolute inset-y-0 w-px bg-gradient-to-b from-border via-border/70 to-border/10" />
      <span
        aria-hidden
        className={cn("relative mt-3 h-2.5 w-2.5 rounded-full ring-4", dotTone)}
      >
        {live ? (
          <span aria-hidden className="absolute -inset-1 animate-ping rounded-full bg-current opacity-50" />
        ) : null}
      </span>
    </div>
  );
}

function ThinkingCell({ entry, live }: { entry: ThinkingEntry; live: boolean }) {
  return (
    <article className="flex gap-3">
      <TimelineSpine tone={live ? "active" : "done"} live={live} />
      <div className="flex-1 space-y-2 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.26em] text-foreground">
            <BrainCog className="h-3.5 w-3.5 text-primary" />
            reasoning
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">{entry.title}</span>
          <span className="ml-auto font-mono text-[0.625rem] tabular-nums text-muted-foreground/70">
            {entry.durationSec.toString().padStart(2, "0")}s ·
            <span className="ml-1 text-primary/90">think</span>
          </span>
        </div>
        <div className="relative rounded-xl border border-dashed border-border/60 bg-background/40 px-4 py-3">
          <span aria-hidden className="absolute -left-[3px] top-3 h-6 w-0.5 rounded-full bg-primary/70" />
          <p className="text-[0.875rem] leading-7 text-foreground/90">
            {entry.body}
          </p>
          {live ? (
            <span aria-hidden className="ml-1 inline-block h-[1em] w-[0.5ch] translate-y-[3px] animate-pulse bg-primary" />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ToolCallCell({ entry }: { entry: ToolCallEntry }) {
  const Icon = toolIcon[entry.tool] ?? Wrench;
  return (
    <article className="flex gap-3">
      <TimelineSpine tone="done" />
      <div className="flex-1 space-y-2 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.26em] text-foreground">
            <Terminal className="h-3.5 w-3.5 text-primary" />
            tool call
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className="font-mono text-[0.6875rem] text-muted-foreground">{entry.label}</span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border/80 bg-gradient-to-b from-muted/60 to-muted/20">
          <div className="flex items-center justify-between border-b border-border/60 bg-background/40 px-3 py-1.5">
            <div className="inline-flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-primary" />
              <span className="font-mono text-[0.75rem] font-semibold text-foreground">{entry.tool}</span>
              <span className="text-muted-foreground/70">(</span>
            </div>
            <Bracket className="text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
              <span>invoke</span>
            </Bracket>
          </div>

          <pre className="px-4 py-3 font-mono text-[0.75rem] leading-6 text-foreground">
{entry.args.map(([key, value], idx) => (
  <span key={key}>
    <span className="text-primary">{key}</span>
    <span className="text-muted-foreground/80">{" = "}</span>
    <span className="text-foreground">{value.startsWith("{") || value === "true" || value === "false" || !Number.isNaN(Number(value)) ? value : `"${value}"`}</span>
    {idx < entry.args.length - 1 ? <span className="text-muted-foreground/60">,</span> : null}
    {"\n"}
  </span>
))}
          </pre>
          <div className="flex items-center justify-between border-t border-border/60 bg-background/30 px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="text-muted-foreground/70">)</span>
            <span>awaiting trace</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ToolResultCell({ entry }: { entry: ToolResultEntry }) {
  const Icon = toolIcon[entry.tool] ?? Wrench;
  const statusTone =
    entry.status === "flagged"
      ? "text-amber-600 dark:text-amber-300"
      : entry.status === "partial"
        ? "text-sky-600 dark:text-sky-300"
        : "text-emerald-600 dark:text-emerald-300";
  const statusLabel =
    entry.status === "flagged" ? "returned · flagged" : entry.status === "partial" ? "returned · partial" : "returned · ok";

  return (
    <article className="flex gap-3">
      <TimelineSpine tone={entry.status === "flagged" ? "warn" : "done"} />
      <div className="flex-1 space-y-2 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.26em]", statusTone)}>
            <Icon className="h-3.5 w-3.5" />
            {statusLabel}
          </span>
          <span className="text-muted-foreground/60">·</span>
          <span className="font-mono text-[0.6875rem] text-muted-foreground">{entry.tool}</span>
          <span className="ml-auto font-mono text-[0.625rem] tabular-nums text-muted-foreground/70">
            {entry.durationMs}ms
          </span>
        </div>

        <div className="rounded-xl border border-border/80 bg-card/80 px-4 py-3">
          <p className="text-[0.8125rem] font-medium leading-6 text-foreground">{entry.summary}</p>
          <ul className="mt-2 space-y-1.5 border-l border-border/60 pl-3">
            {entry.snippets.map((snippet, idx) => (
              <li key={`${entry.id}-${idx}`} className="flex items-start gap-2 font-mono text-[0.75rem] leading-6 text-muted-foreground">
                <span aria-hidden className="mt-[0.5rem] h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                <span className="text-foreground/85">{snippet}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </article>
  );
}

function SystemCardCell({ entry }: { entry: SystemCardEntry }) {
  const palette =
    entry.severity === "critical"
      ? {
          border: "border-rose-500/60",
          bg: "bg-rose-500/10",
          accent: "text-rose-600 dark:text-rose-300",
          ribbon: "bg-rose-500",
          label: "system · critical"
        }
      : entry.severity === "caution"
        ? {
            border: "border-amber-500/60",
            bg: "bg-amber-500/10",
            accent: "text-amber-700 dark:text-amber-300",
            ribbon: "bg-amber-500",
            label: "system · caution"
          }
        : {
            border: "border-primary/60",
            bg: "bg-primary/10",
            accent: "text-primary",
            ribbon: "bg-primary",
            label: "system · note"
          };
  const Icon = entry.icon;
  return (
    <article className="flex gap-3">
      <TimelineSpine tone={entry.severity === "info" ? "active" : "warn"} />
      <div className="flex-1 pb-6">
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border-2 border-dashed px-5 py-4 shadow-[0_10px_36px_-20px_hsl(var(--foreground)/0.22)]",
            palette.border,
            palette.bg
          )}
        >
          <span aria-hidden className={cn("absolute left-0 top-0 h-full w-1", palette.ribbon)} />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-60 [background-image:repeating-linear-gradient(135deg,hsl(var(--foreground)/0.035)_0_2px,transparent_2px_8px)]"
          />
          <div className="relative flex items-start gap-4">
            <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-foreground/10 bg-background/70", palette.accent)}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Bracket className={cn("text-[0.6rem] font-semibold uppercase tracking-[0.32em]", palette.accent)}>
                  <span>inject</span>
                </Bracket>
                <span className={cn("font-mono text-[0.6rem] uppercase tracking-[0.28em]", palette.accent)}>
                  {palette.label}
                </span>
                <span className="ml-auto font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground/80">
                  {entry.origin}
                </span>
              </div>
              <h3 className="font-mono text-[0.9375rem] font-semibold tracking-tight text-foreground">
                {entry.heading}
              </h3>
              <p className="text-[0.8125rem] leading-6 text-foreground/80">
                {entry.body}
              </p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

function DossierCell({ entry }: { entry: DossierEntry }) {
  return (
    <article className="flex gap-3">
      <TimelineSpine tone="done" />
      <div className="flex-1 pb-4">
        <div className="relative overflow-hidden rounded-2xl border border-foreground/25 bg-gradient-to-br from-background via-card to-background shadow-[0_24px_80px_-40px_hsl(var(--foreground)/0.55)]">
          <CornerMarks className="!border-foreground/40" />

          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(circle at top right, hsl(var(--primary)/0.12), transparent 55%), linear-gradient(hsl(var(--border)/0.35) 1px, transparent 1px)",
              backgroundSize: "100% 100%, 22px 22px"
            }}
          />

          <div className="relative p-6 md:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-border/60 pb-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-muted-foreground">
                  <Stamp className="h-3 w-3 text-primary" />
                  evidence dossier · sealed
                </div>
                <h2 className="mt-2 font-mono text-[1.5rem] font-semibold tracking-tight text-foreground">
                  {entry.title}
                </h2>
                <p className="mt-1 text-[0.8125rem] text-muted-foreground">
                  {entry.subject}
                </p>
              </div>

              <div className="flex flex-col items-end gap-2 text-right font-mono text-[0.625rem] uppercase tracking-[0.24em] text-muted-foreground">
                <Bracket className="text-foreground">
                  <span className="text-primary">dossier</span>
                  <span className="mx-1 text-muted-foreground/60">·</span>
                  <span>{entry.id.toUpperCase()}</span>
                </Bracket>
                <span>signed · {entry.signedAt}</span>
                <span className="flex items-center gap-1.5 tabular-nums text-foreground">
                  <Gauge className="h-3 w-3" />
                  confidence {entry.confidence.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)]">
              <div className="space-y-3">
                <SectionLabel>Findings</SectionLabel>
                <ol className="space-y-3">
                  {entry.findings.map((finding, idx) => (
                    <li
                      key={finding.id}
                      className="group relative overflow-hidden rounded-xl border border-border/80 bg-background/70 p-4"
                    >
                      <span
                        aria-hidden
                        className="absolute left-0 top-0 h-full w-0.5 bg-gradient-to-b from-primary/70 to-primary/10"
                      />
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[0.6875rem] tabular-nums text-muted-foreground">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                            {finding.code}
                          </span>
                          <SeverityPip severity={finding.severity} />
                        </div>
                        <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                          {finding.type}
                        </span>
                      </div>
                      <p className="mt-2 text-[0.9375rem] font-semibold leading-6 text-foreground">
                        {finding.title}
                      </p>
                      <p className="mt-1.5 text-[0.8125rem] leading-6 text-muted-foreground">
                        {finding.rationale}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border/70 pt-3">
                        <Quote className="h-3 w-3 text-primary" />
                        <span className="font-mono text-[0.6875rem] text-foreground/85">{finding.evidence}</span>
                        <span className="ml-auto font-mono text-[0.625rem] tabular-nums text-muted-foreground">
                          conf {finding.confidence.toFixed(2)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-5">
                <div>
                  <SectionLabel className="mb-2">Chain of reasoning</SectionLabel>
                  <ol className="space-y-2">
                    {entry.chain.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border bg-background font-mono text-[0.625rem] tabular-nums text-foreground">
                          {idx + 1}
                        </span>
                        <p className="text-[0.8125rem] leading-6 text-foreground/85">{step}</p>
                      </li>
                    ))}
                  </ol>
                </div>

                <div>
                  <SectionLabel className="mb-2">Attached artifacts</SectionLabel>
                  <ul className="space-y-1.5">
                    {entry.artifacts.map((artifact) => (
                      <li
                        key={artifact}
                        className="flex items-center gap-2 rounded-md border border-dashed border-border/70 bg-background/50 px-2.5 py-1.5 font-mono text-[0.75rem] text-foreground/85"
                      >
                        <Paperclip className="h-3 w-3 text-primary" />
                        <span className="truncate">{artifact}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <SectionLabel className="!text-primary/90">Verdict</SectionLabel>
                  </div>
                  <p className="mt-1.5 text-[0.8125rem] leading-6 text-foreground/90">
                    Edge posture warrants immediate remediation of cipher-suite negotiation and header policy.
                    Downgrade proof is reproducible; customer-facing plane not evaluated (out of scope).
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border/60 pt-5">
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5">
                  <ScrollText className="h-3.5 w-3.5" />
                  Export · PDF
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 gap-1.5">
                  <GitBranch className="h-3.5 w-3.5" />
                  File to Workflows
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5">
                  <RefreshCcw className="h-3.5 w-3.5" />
                  Re-run with feedback
                </Button>
              </div>
              <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">
                sha256 · d4a7…91cf · tamper-evident
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// right-pane composer
// ---------------------------------------------------------------------------

type AllowedTool = { id: string; label: string; icon: LucideIcon; active: boolean };
type AttachedCtx = { id: string; label: string; size: string };

const initialTools: AllowedTool[] = [
  { id: "recon.surface_sweep", label: "recon · surface", icon: Target, active: true },
  { id: "tls.inspect", label: "tls · inspect", icon: Shield, active: true },
  { id: "tls.capture_probe", label: "tls · capture", icon: FlaskConical, active: true },
  { id: "http.probe", label: "http · probe", icon: Terminal, active: false },
  { id: "dns.passive", label: "dns · passive", icon: Orbit, active: false }
];

const initialContext: AttachedCtx[] = [
  { id: "charter", label: "inquiry-charter.md", size: "1.4 kB" },
  { id: "scope", label: "engagement-scope.yaml", size: "812 B" },
  { id: "taxonomy", label: "typed-core-v1.json", size: "6.1 kB" }
];

const defaultSystemInstructions =
  `You are a security analyst operating in single-pass, chat-style inquiry mode.

Objective:
  Perform a zero-knowledge edge posture review of \`acme-staging.internal\`.
  Surface TLS, header, and auth anomalies with reproducible evidence.

Constraints:
  · Strictly in scope: *.acme-staging.internal
  · Out of scope: *.customer.acme.com (any reference = hard failure)
  · Every finding must carry a typed classification + captured evidence.

Output contract:
  Conclude with an evidence dossier using the typed-core-v1 taxonomy.
  Severity scale: low · medium · high · critical.
  Include raw pcap attachments for any tls_weakness finding.
`;

function PromptComposer({
  instructions,
  onInstructionsChange,
  running,
  agent,
  onAgentChange,
  application,
  onApplicationChange,
  model,
  onModelChange,
  tools,
  onToggleTool,
  contexts,
  onInjectCard
}: {
  instructions: string;
  onInstructionsChange: (next: string) => void;
  running: boolean;
  agent: string;
  onAgentChange: (next: string) => void;
  application: string;
  onApplicationChange: (next: string) => void;
  model: string;
  onModelChange: (next: string) => void;
  tools: AllowedTool[];
  onToggleTool: (id: string) => void;
  contexts: AttachedCtx[];
  onInjectCard: () => void;
}) {
  return (
    <aside className="relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-5 backdrop-blur 2xl:max-h-[calc(100vh-10rem)]">
      <CornerMarks />
      <header className="flex items-start justify-between">
        <div>
          <SectionLabel>Directive</SectionLabel>
          <p className="mt-1 text-sm font-medium text-foreground">System Instructions</p>
          <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground/80">
            the prompt · the charter · the guardrails
          </p>
        </div>
        <Bracket className="text-[0.625rem] uppercase tracking-[0.24em] text-muted-foreground">
          <span>prompt</span>
        </Bracket>
      </header>

      <div className="flex flex-col gap-3 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
        {/* glue: agent + application + model ---------------------------- */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <SectionLabel className="mb-1.5">Agent</SectionLabel>
            <Select value={agent} onValueChange={onAgentChange}>
              <SelectTrigger className="h-9 text-[0.75rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recon-specialist">Recon Specialist</SelectItem>
                <SelectItem value="tls-auditor">TLS Auditor</SelectItem>
                <SelectItem value="triage-analyst">Triage Analyst</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <SectionLabel className="mb-1.5">Model</SectionLabel>
            <Select value={model} onValueChange={onModelChange}>
              <SelectTrigger className="h-9 text-[0.75rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="claude-opus-4-7">claude · opus 4.7</SelectItem>
                <SelectItem value="claude-sonnet-4-6">claude · sonnet 4.6</SelectItem>
                <SelectItem value="claude-haiku-4-5">claude · haiku 4.5</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <SectionLabel className="mb-1.5">Target application</SectionLabel>
          <Select value={application} onValueChange={onApplicationChange}>
            <SelectTrigger className="h-9 text-[0.75rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acme-staging">acme-staging.internal</SelectItem>
              <SelectItem value="acme-prod-shadow">acme-prod-shadow</SelectItem>
              <SelectItem value="internal-control">internal-control-plane</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* instructions textarea --------------------------------------- */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <SectionLabel>Instructions</SectionLabel>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
              {instructions.length} ch · editable
            </span>
          </div>
          <div className="relative overflow-hidden rounded-xl border border-border/80 bg-background/70">
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
              <Workflow className="h-3 w-3 text-primary" />
              inquiry-charter · rev 04
              <span className="ml-auto inline-flex items-center gap-1 text-foreground/70">
                <span className={cn("h-1.5 w-1.5 rounded-full", running ? "animate-pulse bg-rose-500" : "bg-primary")} />
                {running ? "locked · running" : "editable"}
              </span>
            </div>
            <Textarea
              value={instructions}
              onChange={(event) => onInstructionsChange(event.target.value)}
              readOnly={running}
              rows={11}
              className="min-h-[14rem] resize-y border-0 bg-transparent px-3 py-2 font-mono text-[0.75rem] leading-6 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>
        </div>

        {/* tools ------------------------------------------------------- */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <SectionLabel>Tools granted</SectionLabel>
            <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
              {tools.filter((tool) => tool.active).length}/{tools.length}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tools.map((tool) => (
              <Chip key={tool.id} active={tool.active} icon={tool.icon} onClick={() => onToggleTool(tool.id)}>
                {tool.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* attached context -------------------------------------------- */}
        <div>
          <SectionLabel className="mb-1.5">Attached context</SectionLabel>
          <ul className="space-y-1.5">
            {contexts.map((ctx) => (
              <li
                key={ctx.id}
                className="flex items-center gap-2 rounded-md border border-border/80 bg-background/60 px-2.5 py-1.5 font-mono text-[0.75rem] text-foreground/85"
              >
                <Paperclip className="h-3 w-3 text-primary" />
                <span className="truncate">{ctx.label}</span>
                <span className="ml-auto text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">{ctx.size}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* inject control ---------------------------------------------- */}
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-[0.8125rem] font-medium text-foreground">
                Inject system card
              </p>
              <p className="text-[0.75rem] leading-5 text-muted-foreground">
                Drop a guardrail, evidence requirement, or escalation note directly into the live transcript.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onInjectCard}
                className="h-8 gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Inject card
              </Button>
            </div>
          </div>
        </div>

        {/* knobs ------------------------------------------------------- */}
        <div className="space-y-3 rounded-xl border border-border/80 bg-background/55 p-3.5">
          <Meter label="Reasoning depth" value={0.72} suffix="deep" />
          <Meter label="Tool autonomy" value={0.58} suffix="medium" />
          <Meter label="Evidence bar" value={0.9} suffix="strict" />
        </div>
      </div>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// main page
// ---------------------------------------------------------------------------

export function Workflow2Page() {
  const [instructions, setInstructions] = useState(defaultSystemInstructions);
  const [agent, setAgent] = useState("recon-specialist");
  const [application, setApplication] = useState("acme-staging");
  const [model, setModel] = useState("claude-opus-4-7");
  const [tools, setTools] = useState(initialTools);
  const [contexts] = useState(initialContext);
  const [workflowName, setWorkflowName] = useState("inquiry · console");
  const [workflowSummary, setWorkflowSummary] = useState("zero-knowledge edge posture review of acme-staging.internal");
  const [tags, setTags] = useState<string[]>(["recon", "tls", "edge-posture", "typed-core-v1"]);
  const [editOpen, setEditOpen] = useState(false);

  const [running, setRunning] = useState(false);
  const [visibleCount, setVisibleCount] = useState(baseTranscript.length);
  const [extraCards, setExtraCards] = useState<SystemCardEntry[]>([]);
  const streamTimer = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const liveTranscript = useMemo<TranscriptEntry[]>(() => {
    // interleave injected cards after the last visible entry so they feel
    // like live system notes the user dropped into the stream
    const base = baseTranscript.slice(0, visibleCount);
    if (extraCards.length === 0) return base;
    // put injected cards just before the dossier (if present)
    const dossierIdx = base.findIndex((entry) => entry.kind === "dossier");
    if (dossierIdx === -1) return [...base, ...extraCards];
    return [...base.slice(0, dossierIdx), ...extraCards, ...base.slice(dossierIdx)];
  }, [visibleCount, extraCards]);

  const lastEntry = liveTranscript[liveTranscript.length - 1] ?? null;
  const hasDossier = liveTranscript.some((entry) => entry.kind === "dossier");
  const inflightEntry = running ? lastEntry : null;

  useEffect(() => {
    if (!running) {
      if (streamTimer.current !== null) window.clearTimeout(streamTimer.current);
      return;
    }
    if (visibleCount >= baseTranscript.length) {
      // stream exhausted — settle into idle
      setRunning(false);
      return;
    }
    streamTimer.current = window.setTimeout(() => {
      setVisibleCount((current) => Math.min(current + 1, baseTranscript.length));
    }, 780);
    return () => {
      if (streamTimer.current !== null) window.clearTimeout(streamTimer.current);
    };
  }, [running, visibleCount]);

  useEffect(() => {
    if (scrollRef.current && running) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleCount, extraCards.length, running]);

  const toggleRun = useCallback(() => {
    setRunning((current) => {
      if (current) {
        if (streamTimer.current !== null) window.clearTimeout(streamTimer.current);
        return false;
      }
      // starting: if we've already shown everything, reset to a fresh pass
      if (visibleCount >= baseTranscript.length) {
        setVisibleCount(1);
        setExtraCards([]);
      }
      return true;
    });
  }, [visibleCount]);

  const resetRun = useCallback(() => {
    if (streamTimer.current !== null) window.clearTimeout(streamTimer.current);
    setRunning(false);
    setVisibleCount(0);
    setExtraCards([]);
  }, []);

  const toggleTool = useCallback((id: string) => {
    setTools((current) => current.map((tool) => (tool.id === id ? { ...tool, active: !tool.active } : tool)));
  }, []);

  const injectCard = useCallback(() => {
    const id = `inj-${Date.now()}`;
    const templates: Array<Omit<SystemCardEntry, "id" | "kind">> = [
      {
        severity: "caution",
        heading: "Rate-limit ceiling lowered",
        body: "Investigator has reduced the permitted probe rate for this target. Throttle probe_probe calls to ≤2 rps.",
        origin: "operator · inline",
        icon: FileWarning
      },
      {
        severity: "critical",
        heading: "Escalate: suspected credential exposure",
        body: "A snippet of a long-lived API token was spotted in the last tool result. Stop probing, redact, and flag for rotation.",
        origin: "operator · inline",
        icon: AlertOctagon
      },
      {
        severity: "info",
        heading: "Additional tool granted · dns.passive",
        body: "Operator has granted dns.passive for the remainder of this inquiry. Use it sparingly.",
        origin: "operator · inline",
        icon: Ampersand
      }
    ];
    const pick = templates[extraCards.length % templates.length] as Omit<SystemCardEntry, "id" | "kind">;
    setExtraCards((current) => [...current, { ...pick, id, kind: "system_card" }]);
  }, [extraCards.length]);

  const visibleStats = useMemo(() => {
    const stats = { think: 0, tool: 0, system: 0 };
    for (const entry of liveTranscript) {
      if (entry.kind === "thinking") stats.think += 1;
      else if (entry.kind === "tool_call" || entry.kind === "tool_result") stats.tool += 1;
      else if (entry.kind === "system_card") stats.system += 1;
    }
    return stats;
  }, [liveTranscript]);

  return (
    <div className="relative min-h-screen">
      {/* backdrop — subtle grid with radial spot, distinct from Flow Studio */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--border)/0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at 30% 10%, black 30%, transparent 75%)"
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 h-56"
        style={{ background: "radial-gradient(ellipse 60% 100% at 25% 0%, hsl(var(--primary)/0.1), transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1700px] flex-col gap-5 px-4 pb-14 pt-5 md:gap-6 md:px-5 2xl:px-8">
        {/* ===== header ===== */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.32em] text-muted-foreground">
            <span>Designs</span>
            <ChevronRight aria-hidden className="h-3 w-3 text-muted-foreground/60" />
            <span className="text-foreground/80">Workflow · 02</span>
            <span aria-hidden className="mx-1 hidden h-px w-8 bg-border md:block" />
            <span className="hidden font-sans text-[0.6875rem] italic tracking-normal text-muted-foreground/70 md:inline">
              single-agent · chat transcript · evidence-first
            </span>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="relative min-w-0">
              <span aria-hidden className="absolute -left-3 top-1 h-12 w-0.5 bg-gradient-to-b from-primary/80 to-transparent" />
              <h1 className="font-mono text-[2.25rem] font-semibold leading-none tracking-[-0.02em] text-foreground lg:text-[2.5rem] 2xl:text-[2.75rem]">
                {workflowName.split(" · ").map((part, index, arr) => (
                  <span key={`${part}-${index}`}>
                    {part}
                    {index < arr.length - 1 ? <span className="text-primary"> · </span> : null}
                  </span>
                ))}
              </h1>
              <p className="mt-3 max-w-xl text-[0.875rem] leading-6 text-muted-foreground">
                {workflowSummary}
              </p>
              {tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/60 px-2 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      <span aria-hidden className="h-1 w-1 rounded-full bg-primary/70" />
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="hidden items-center gap-3 border-l border-border/70 pl-3 2xl:flex">
                <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                  <Kbd>⏎</Kbd> run
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                  <Kbd>⎋</Kbd> abort
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                  <Kbd>⌘I</Kbd> inject
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(true)}
                className="h-11 gap-2 rounded-full px-4"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
              <Button type="button" variant="outline" onClick={resetRun} className="h-11 gap-2 rounded-full px-4">
                <RefreshCcw className="h-4 w-4" />
                Reset
              </Button>
              <RunGlyph running={running} onClick={toggleRun} />
            </div>
          </div>

          {/* telemetry strip --------------------------------------------- */}
          <div className="relative overflow-hidden rounded-xl border border-border/80 bg-card/70 px-4 py-3 backdrop-blur">
            <CornerMarks />
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <StatCell icon={Waypoints} label="mode" value="single-agent" accent />
              <StatCell icon={Cpu} label="model" value={model} />
              <StatCell icon={Layers} label="target" value={`${application}.internal`} />
              <StatCell icon={BrainCog} label="thinks" value={String(visibleStats.think).padStart(2, "0")} />
              <StatCell icon={Terminal} label="tool ops" value={String(visibleStats.tool).padStart(2, "0")} />
              <StatCell icon={ShieldAlert} label="system cards" value={String(visibleStats.system).padStart(2, "0")} />
              <span className="ml-auto inline-flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.26em]">
                <span className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  running ? "animate-pulse bg-primary" : hasDossier ? "bg-emerald-500" : "bg-muted-foreground/50"
                )} />
                <span className={cn(
                  running ? "text-primary" : hasDossier ? "text-emerald-600 dark:text-emerald-300" : "text-muted-foreground"
                )}>
                  {running ? "streaming" : hasDossier ? "sealed" : "idle"}
                </span>
              </span>
            </div>
          </div>
        </header>

        {/* ===== main canvas ===== */}
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          {/* transcript column */}
          <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 backdrop-blur">
            <CornerMarks />

            <div className="flex items-center justify-between gap-3 border-b border-border/70 bg-background/40 px-5 py-3">
              <div>
                <SectionLabel>Transcript</SectionLabel>
                <p className="text-sm font-medium text-foreground">Reasoning · tools · evidence</p>
              </div>
              <div className="flex items-center gap-2 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                <span>
                  <span className="tabular-nums text-foreground">{liveTranscript.length.toString().padStart(2, "0")}</span>
                  <span className="mx-1 text-muted-foreground/60">/</span>
                  <span className="tabular-nums">{(baseTranscript.length + extraCards.length).toString().padStart(2, "0")}</span>
                  <span className="ml-1">entries</span>
                </span>
                <span aria-hidden className="mx-1 h-3 w-px bg-border" />
                <span>{running ? "stream · open" : "stream · closed"}</span>
              </div>
            </div>

            <div
              ref={scrollRef}
              className="relative max-h-none overflow-y-auto px-5 py-5 [scrollbar-width:thin] 2xl:max-h-[calc(100vh-13rem)]"
            >
              {liveTranscript.length === 0 ? (
                <EmptyTranscript onRun={toggleRun} />
              ) : (
                <div className="space-y-0">
                  {liveTranscript.map((entry, idx) => {
                    const isLast = idx === liveTranscript.length - 1;
                    const isInflight = running && isLast && entry.kind !== "dossier";
                    return (
                      <div
                        key={entry.id}
                        style={{
                          animation: idx === liveTranscript.length - 1 && running
                            ? "wf2-enter 280ms ease-out"
                            : undefined
                        }}
                      >
                        {entry.kind === "thinking" ? (
                          <ThinkingCell entry={entry} live={isInflight} />
                        ) : entry.kind === "tool_call" ? (
                          <ToolCallCell entry={entry} />
                        ) : entry.kind === "tool_result" ? (
                          <ToolResultCell entry={entry} />
                        ) : entry.kind === "system_card" ? (
                          <SystemCardCell entry={entry} />
                        ) : (
                          <DossierCell entry={entry} />
                        )}
                      </div>
                    );
                  })}

                  {/* tail cursor while streaming */}
                  {running && inflightEntry && inflightEntry.kind !== "dossier" ? (
                    <div className="flex gap-3 pt-1">
                      <div className="relative flex w-10 shrink-0 justify-center">
                        <span aria-hidden className="h-4 w-px bg-gradient-to-b from-border to-transparent" />
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[0.6875rem] uppercase tracking-[0.22em] text-muted-foreground">
                        <span aria-hidden className="inline-block h-3 w-2 animate-pulse bg-primary/80" />
                        generating next step…
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          {/* composer column */}
          <PromptComposer
            instructions={instructions}
            onInstructionsChange={setInstructions}
            running={running}
            agent={agent}
            onAgentChange={setAgent}
            application={application}
            onApplicationChange={setApplication}
            model={model}
            onModelChange={setModel}
            tools={tools}
            onToggleTool={toggleTool}
            contexts={contexts}
            onInjectCard={injectCard}
          />
        </div>
      </div>

      <style>{`
        @keyframes wf2-enter {
          from { transform: translateY(6px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes wf2-modal-enter {
          from { transform: translateY(12px) scale(0.98); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes wf2-backdrop-enter {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {editOpen ? (
        <EditWorkflowModal
          name={workflowName}
          summary={workflowSummary}
          tags={tags}
          agent={agent}
          model={model}
          application={application}
          instructions={instructions}
          tools={tools}
          onClose={() => setEditOpen(false)}
          onSave={(next) => {
            setWorkflowName(next.name);
            setWorkflowSummary(next.summary);
            setTags(next.tags);
            setAgent(next.agent);
            setModel(next.model);
            setApplication(next.application);
            setInstructions(next.instructions);
            setTools(next.tools);
            setEditOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function StatCell({
  icon: Icon,
  label,
  value,
  accent
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={cn("h-3.5 w-3.5", accent ? "text-primary" : "text-muted-foreground")} />
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.26em] text-muted-foreground">{label}</span>
        <span className={cn("font-mono text-[0.75rem] tabular-nums", accent ? "text-foreground" : "text-foreground/85")}>
          {value}
        </span>
      </div>
    </div>
  );
}

function EmptyTranscript({ onRun }: { onRun: () => void }) {
  return (
    <div className="flex min-h-[28rem] flex-col items-center justify-center gap-5 text-center">
      <div className="relative">
        <span
          aria-hidden
          className="absolute -inset-5 rounded-full bg-primary/10 blur-xl"
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background">
          <BrainCog className="h-7 w-7 text-primary" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="font-mono text-xl font-semibold tracking-tight text-foreground">
          transcript<span className="text-primary">·</span>empty
        </h2>
        <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
          The thread is quiet. Tighten the directive on the right, then run — reasoning and tool traces will cascade here, ending in a sealed dossier.
        </p>
      </div>
      <Button type="button" onClick={onRun} className="gap-2 rounded-full px-5">
        <Play className="h-4 w-4" />
        Start run
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// edit workflow modal — richer/larger surface than the side composer.
// focuses on workflow-level metadata (name/summary/tags) plus the prompt
// config, with save/cancel semantics that rollback on cancel.
// ---------------------------------------------------------------------------

type EditDraft = {
  name: string;
  summary: string;
  tags: string[];
  agent: string;
  model: string;
  application: string;
  instructions: string;
  tools: AllowedTool[];
};

function EditWorkflowModal({
  name,
  summary,
  tags,
  agent,
  model,
  application,
  instructions,
  tools,
  onClose,
  onSave
}: {
  name: string;
  summary: string;
  tags: string[];
  agent: string;
  model: string;
  application: string;
  instructions: string;
  tools: AllowedTool[];
  onClose: () => void;
  onSave: (draft: EditDraft) => void;
}) {
  const [draft, setDraft] = useState<EditDraft>({
    name,
    summary,
    tags,
    agent,
    model,
    application,
    instructions,
    tools
  });
  const [tagInput, setTagInput] = useState("");
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  function patch<K extends keyof EditDraft>(key: K, value: EditDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addTag() {
    const next = tagInput.trim().toLowerCase();
    if (!next) return;
    if (draft.tags.includes(next)) {
      setTagInput("");
      return;
    }
    patch("tags", [...draft.tags, next]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    patch("tags", draft.tags.filter((existing) => existing !== tag));
  }

  function toggleTool(id: string) {
    patch(
      "tools",
      draft.tools.map((tool) => (tool.id === id ? { ...tool, active: !tool.active } : tool))
    );
  }

  const dirty =
    draft.name !== name ||
    draft.summary !== summary ||
    draft.tags.join("|") !== tags.join("|") ||
    draft.agent !== agent ||
    draft.model !== model ||
    draft.application !== application ||
    draft.instructions !== instructions ||
    draft.tools.map((tool) => `${tool.id}:${tool.active}`).join("|") !==
      tools.map((tool) => `${tool.id}:${tool.active}`).join("|");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wf2-edit-title"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10 sm:py-16"
      style={{ animation: "wf2-backdrop-enter 160ms ease-out" }}
    >
      <button
        type="button"
        aria-label="Close edit dialog"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 bg-foreground/40 backdrop-blur-sm"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_32px_120px_-40px_hsl(var(--foreground)/0.55)] outline-none"
        style={{ animation: "wf2-modal-enter 220ms ease-out" }}
      >
        <CornerMarks className="!border-foreground/30" />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32"
          style={{
            background: "radial-gradient(ellipse at 25% 0%, hsl(var(--primary)/0.12), transparent 70%)"
          }}
        />

        {/* header */}
        <header className="relative flex items-start justify-between gap-4 border-b border-border/70 px-7 py-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.32em] text-muted-foreground">
              <Workflow className="h-3 w-3 text-primary" />
              workflow · settings
              <Bracket className="text-muted-foreground">
                <span className="text-foreground">WF · 02</span>
              </Bracket>
            </div>
            <h2
              id="wf2-edit-title"
              className="font-mono text-[1.5rem] font-semibold leading-tight tracking-tight text-foreground"
            >
              Revise the charter
            </h2>
            <p className="text-[0.8125rem] text-muted-foreground">
              Adjust identity, engagement, and the directive. Changes apply on save.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background/70 text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* body */}
        <div className="grid max-h-[calc(100vh-14rem)] gap-6 overflow-y-auto px-7 py-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] [scrollbar-width:thin]">
          {/* left column — identity / engagement / output */}
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Stamp className="h-3.5 w-3.5 text-primary" />
                <SectionLabel>Identity</SectionLabel>
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                  Workflow name
                </label>
                <Input
                  value={draft.name}
                  onChange={(event) => patch("name", event.target.value)}
                  placeholder="eg. inquiry · console"
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                  Summary
                </label>
                <Textarea
                  rows={2}
                  value={draft.summary}
                  onChange={(event) => patch("summary", event.target.value)}
                  placeholder="one-liner shown under the title"
                  className="min-h-[3.5rem] text-[0.8125rem]"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                  <Tags className="h-3 w-3" />
                  Tags
                </label>
                <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background/60 px-2 py-1.5">
                  {draft.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-foreground"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        aria-label={`Remove ${tag}`}
                        className="text-muted-foreground transition hover:text-destructive"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(event) => setTagInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === ",") {
                        event.preventDefault();
                        addTag();
                      } else if (event.key === "Backspace" && tagInput === "" && draft.tags.length > 0) {
                        const last = draft.tags[draft.tags.length - 1];
                        if (last) removeTag(last);
                      }
                    }}
                    placeholder={draft.tags.length === 0 ? "add tags…" : ""}
                    className="min-w-[6rem] flex-1 border-0 bg-transparent px-1 py-0.5 font-mono text-[0.75rem] outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-3.5 w-3.5 text-primary" />
                <SectionLabel>Engagement</SectionLabel>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                    Target application
                  </label>
                  <Select value={draft.application} onValueChange={(value) => patch("application", value)}>
                    <SelectTrigger className="h-9 text-[0.75rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acme-staging">acme-staging.internal</SelectItem>
                      <SelectItem value="acme-prod-shadow">acme-prod-shadow</SelectItem>
                      <SelectItem value="internal-control">internal-control-plane</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                    Agent
                  </label>
                  <Select value={draft.agent} onValueChange={(value) => patch("agent", value)}>
                    <SelectTrigger className="h-9 text-[0.75rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="recon-specialist">Recon Specialist</SelectItem>
                      <SelectItem value="tls-auditor">TLS Auditor</SelectItem>
                      <SelectItem value="triage-analyst">Triage Analyst</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                    Model
                  </label>
                  <Select value={draft.model} onValueChange={(value) => patch("model", value)}>
                    <SelectTrigger className="h-9 text-[0.75rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="claude-opus-4-7">claude · opus 4.7</SelectItem>
                      <SelectItem value="claude-sonnet-4-6">claude · sonnet 4.6</SelectItem>
                      <SelectItem value="claude-haiku-4-5">claude · haiku 4.5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1.5 block font-mono text-[0.625rem] uppercase tracking-[0.28em] text-muted-foreground">
                    Visibility
                  </label>
                  <Select defaultValue="team">
                    <SelectTrigger className="h-9 text-[0.75rem]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private · me only</SelectItem>
                      <SelectItem value="team">Team · squad-sec</SelectItem>
                      <SelectItem value="org">Org · read-only share</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <ScrollText className="h-3.5 w-3.5 text-primary" />
                <SectionLabel>Output contract</SectionLabel>
              </div>
              <div className="rounded-xl border border-border/80 bg-background/60 p-3">
                <div className="grid grid-cols-2 gap-3 text-[0.75rem]">
                  <div>
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                      Taxonomy
                    </p>
                    <p className="mt-0.5 font-mono text-foreground">typed-core-v1</p>
                  </div>
                  <div>
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                      Severity ladder
                    </p>
                    <p className="mt-0.5 font-mono text-foreground">low · med · high · crit</p>
                  </div>
                  <div>
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                      Retention
                    </p>
                    <p className="mt-0.5 font-mono text-foreground">30 days</p>
                  </div>
                  <div>
                    <p className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                      Evidence
                    </p>
                    <p className="mt-0.5 font-mono text-foreground">raw pcap required</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* right column — prompt / tools / limits */}
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCog className="h-3.5 w-3.5 text-primary" />
                  <SectionLabel>System instructions</SectionLabel>
                </div>
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {draft.instructions.length} ch
                </span>
              </div>
              <div className="overflow-hidden rounded-xl border border-border/80 bg-background/70">
                <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-1.5 font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                  <Workflow className="h-3 w-3 text-primary" />
                  inquiry-charter · draft
                </div>
                <Textarea
                  value={draft.instructions}
                  onChange={(event) => patch("instructions", event.target.value)}
                  rows={14}
                  className="min-h-[18rem] resize-y border-0 bg-transparent px-3 py-2 font-mono text-[0.75rem] leading-6 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench className="h-3.5 w-3.5 text-primary" />
                  <SectionLabel>Tools granted</SectionLabel>
                </div>
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
                  {draft.tools.filter((tool) => tool.active).length}/{draft.tools.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {draft.tools.map((tool) => (
                  <Chip key={tool.id} active={tool.active} icon={tool.icon} onClick={() => toggleTool(tool.id)}>
                    {tool.label}
                  </Chip>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5 text-primary" />
                <SectionLabel>Limits</SectionLabel>
              </div>
              <div className="grid gap-3 rounded-xl border border-border/80 bg-background/55 p-4">
                <Meter label="Reasoning depth" value={0.72} suffix="deep" />
                <Meter label="Tool autonomy" value={0.58} suffix="medium" />
                <Meter label="Evidence bar" value={0.9} suffix="strict" />
              </div>
            </section>

            <section className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-300">
                  <AlertOctagon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="text-[0.8125rem] font-semibold text-foreground">Danger zone</p>
                  <p className="text-[0.75rem] leading-5 text-muted-foreground">
                    Archiving hides this workflow from run surfaces. Deletion is permanent — prior dossiers remain in the archive bucket.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" size="sm" variant="outline" className="h-8">
                      Archive
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* footer */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-background/40 px-7 py-4">
          <div className="font-mono text-[0.625rem] uppercase tracking-[0.22em] text-muted-foreground">
            {dirty ? (
              <span className="inline-flex items-center gap-1.5 text-foreground">
                <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                unsaved changes
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
                no changes
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onClose} className="h-9">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => onSave(draft)}
              disabled={!dirty}
              className="h-9 gap-2"
            >
              <Save className="h-4 w-4" />
              Save changes
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
