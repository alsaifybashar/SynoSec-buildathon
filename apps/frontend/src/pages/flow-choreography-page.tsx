import { useMemo, useState } from "react";
import {
  ArrowRight,
  Clapperboard,
  Disc3,
  Dot,
  Flag,
  GitBranch,
  Infinity as InfinityIcon,
  ListChecks,
  MoveDiagonal,
  Orbit,
  Pause,
  Play,
  Plus,
  Repeat2,
  Sparkle,
  StepForward,
  Trash2,
  Undo2,
  Users,
  Waves,
  Workflow,
  Zap
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────────────────
// Model
// ────────────────────────────────────────────────────────────────────────────

type HandoffKind = "sync" | "bypass" | "rollback" | "async";

type EnsembleAgent = {
  id: string;
  name: string;
  role: string;
  subtitle: string;
  glyph: string;
  x: number;
  y: number;
  batons: string[];
};

type Handoff = {
  id: string;
  fromId: string;
  toId: string;
  trigger: string;
  baton: string;
  kind: HandoffKind;
  note: string;
  bow: number;
};

type ExitGate = {
  id: string;
  label: string;
  predicate: string;
  terminal: boolean;
};

type LoopConfig = {
  id: string;
  name: string;
  todoSource: string;
  cadence: string;
  iterationBudget: number;
  iterationsUsed: number;
  carryForward: string;
  exitGates: ExitGate[];
};

const stageWidth = 1040;
const stageHeight = 560;

const kindMeta: Record<HandoffKind, {
  label: string;
  hue: string;
  stroke: string;
  fill: string;
  ring: string;
  icon: typeof ArrowRight;
  dash: string;
}> = {
  sync: {
    label: "sync baton",
    hue: "primary",
    stroke: "hsl(var(--primary))",
    fill: "hsl(var(--primary))",
    ring: "ring-primary/40",
    icon: ArrowRight,
    dash: "0"
  },
  bypass: {
    label: "bypass",
    hue: "amber",
    stroke: "hsl(38 92% 52%)",
    fill: "hsl(38 92% 52%)",
    ring: "ring-amber-500/40",
    icon: MoveDiagonal,
    dash: "4 4"
  },
  rollback: {
    label: "rollback",
    hue: "rose",
    stroke: "hsl(var(--destructive))",
    fill: "hsl(var(--destructive))",
    ring: "ring-rose-500/40",
    icon: Undo2,
    dash: "2 3"
  },
  async: {
    label: "async",
    hue: "sky",
    stroke: "hsl(206 86% 56%)",
    fill: "hsl(206 86% 56%)",
    ring: "ring-sky-500/40",
    icon: Waves,
    dash: "6 2 1 2"
  }
};

const SEED_ENSEMBLE: EnsembleAgent[] = [
  {
    id: "scout",
    name: "Scout",
    role: "Intake",
    subtitle: "collects findings",
    glyph: "◈",
    x: 110,
    y: 300,
    batons: ["iterationInput", "assetContext"]
  },
  {
    id: "triage",
    name: "Triage",
    role: "Prioritize",
    subtitle: "weighs evidence",
    glyph: "⬡",
    x: 310,
    y: 140,
    batons: ["prioritization", "chosenAction"]
  },
  {
    id: "operator",
    name: "Operator",
    role: "Act",
    subtitle: "applies one bounded change",
    glyph: "⊛",
    x: 530,
    y: 290,
    batons: ["executionArtifacts", "mitigationChange"]
  },
  {
    id: "auditor",
    name: "Auditor",
    role: "Verify",
    subtitle: "confirms outcome",
    glyph: "⏣",
    x: 740,
    y: 140,
    batons: ["verification", "evidence"]
  },
  {
    id: "scribe",
    name: "Scribe",
    role: "Record",
    subtitle: "captures residual risk",
    glyph: "⌬",
    x: 530,
    y: 450,
    batons: ["iterationRecord", "residualRisk"]
  },
  {
    id: "herald",
    name: "Herald",
    role: "Handoff",
    subtitle: "emits the next step",
    glyph: "✦",
    x: 930,
    y: 300,
    batons: ["closureSummary", "handoffSummary"]
  }
];

const SEED_HANDOFFS: Handoff[] = [
  {
    id: "h-intake-triage",
    fromId: "scout",
    toId: "triage",
    trigger: "intake.findings.length ≥ 1",
    baton: "iterationInput",
    kind: "sync",
    note: "Scout fully hydrates the iteration envelope before handing off.",
    bow: -0.35
  },
  {
    id: "h-triage-operator",
    fromId: "triage",
    toId: "operator",
    trigger: "selectedAction.confirmed_risk",
    baton: "chosenAction + weights",
    kind: "sync",
    note: "One bounded action moves forward. Everything else waits.",
    bow: 0.28
  },
  {
    id: "h-triage-herald",
    fromId: "triage",
    toId: "herald",
    trigger: "selectedAction.follow_up_required",
    baton: "closureSummary",
    kind: "bypass",
    note: "When evidence is thin, Triage skips the rest of the stage and closes out early.",
    bow: -0.6
  },
  {
    id: "h-operator-auditor",
    fromId: "operator",
    toId: "auditor",
    trigger: "change.applied",
    baton: "executionArtifacts",
    kind: "sync",
    note: "Pass the diff and verification plan downstream.",
    bow: -0.35
  },
  {
    id: "h-auditor-operator",
    fromId: "auditor",
    toId: "operator",
    trigger: "verification.blocked ∨ partial",
    baton: "rollbackInstructions",
    kind: "rollback",
    note: "Auditor walks the Operator back when the change fails the safety contract.",
    bow: 0.42
  },
  {
    id: "h-auditor-scribe",
    fromId: "auditor",
    toId: "scribe",
    trigger: "verification.verified",
    baton: "evidence + residualRisk",
    kind: "sync",
    note: "Proof lands in the ledger.",
    bow: 0.45
  },
  {
    id: "h-scribe-herald",
    fromId: "scribe",
    toId: "herald",
    trigger: "always",
    baton: "iterationRecord",
    kind: "sync",
    note: "Every iteration closes with a recorded handoff — no silent endings.",
    bow: -0.25
  }
];

const SEED_LOOPS: LoopConfig[] = [
  {
    id: "loop-hardening",
    name: "Hardening Cadence",
    todoSource: "unresolved findings · severity ≥ high",
    cadence: "one bounded mitigation per pass",
    iterationBudget: 5,
    iterationsUsed: 2,
    carryForward: "outstandingIssues + residualRisk + priorDecisions",
    exitGates: [
      { id: "ex-empty", label: "queue drained", predicate: "carryForward.outstandingIssues.length === 0", terminal: true },
      { id: "ex-budget", label: "budget consumed", predicate: "iteration ≥ budget", terminal: true },
      { id: "ex-review", label: "human review requested", predicate: "residualRisk.needsHumanReview", terminal: true },
      { id: "ex-blocked", label: "blocked by evidence", predicate: "failure.reason == missing_evidence", terminal: false }
    ]
  },
  {
    id: "loop-triage-rehearse",
    name: "Triage Rehearsal",
    todoSource: "candidate actions · confidence < 0.75",
    cadence: "dry-run prioritization · no execution",
    iterationBudget: 3,
    iterationsUsed: 1,
    carryForward: "followUp + deferredCandidates",
    exitGates: [
      { id: "ex-confidence", label: "all confident", predicate: "candidates.every(c ⇒ c.confidence ≥ 0.85)", terminal: true },
      { id: "ex-passes", label: "three passes complete", predicate: "iteration ≥ budget", terminal: true }
    ]
  }
];

// ────────────────────────────────────────────────────────────────────────────
// Geometry
// ────────────────────────────────────────────────────────────────────────────

function curvePath(fromX: number, fromY: number, toX: number, toY: number, bow: number) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const offset = length * bow;
  const cx1 = fromX + dx * 0.3 + nx * offset;
  const cy1 = fromY + dy * 0.3 + ny * offset;
  const cx2 = fromX + dx * 0.7 + nx * offset;
  const cy2 = fromY + dy * 0.7 + ny * offset;
  return `M ${fromX} ${fromY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${toX} ${toY}`;
}

function midPoint(fromX: number, fromY: number, toX: number, toY: number, bow: number) {
  const dx = toX - fromX;
  const dy = toY - fromY;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / length;
  const ny = dx / length;
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  // Position label roughly at the apex of the quadratic approximation of the bezier
  const labelX = midX + nx * length * bow * 0.75;
  const labelY = midY + ny * length * bow * 0.75;
  return { x: labelX, y: labelY };
}

function edgePoint(agent: EnsembleAgent, targetX: number, targetY: number, radius = 44) {
  const dx = targetX - agent.x;
  const dy = targetY - agent.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    x: agent.x + (dx / distance) * radius,
    y: agent.y + (dy / distance) * radius
  };
}

function createLocalId(prefix = "id") {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return `${prefix}-${globalThis.crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ────────────────────────────────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────────────────────────────────

export function FlowChoreographyPage() {
  const [ensemble, setEnsemble] = useState<EnsembleAgent[]>(SEED_ENSEMBLE);
  const [handoffs, setHandoffs] = useState<Handoff[]>(SEED_HANDOFFS);
  const [loops, setLoops] = useState<LoopConfig[]>(SEED_LOOPS);
  const [selectedHandoffId, setSelectedHandoffId] = useState<string>(SEED_HANDOFFS[0]!.id);
  const [focusedAgentId, setFocusedAgentId] = useState<string | null>(null);
  const [activeLoopId, setActiveLoopId] = useState<string>(SEED_LOOPS[0]!.id);
  const [rehearsalStep, setRehearsalStep] = useState<number>(0);
  const [rehearsalPlaying, setRehearsalPlaying] = useState(false);

  const agentLookup = useMemo(() => Object.fromEntries(ensemble.map((agent) => [agent.id, agent])), [ensemble]);
  const selectedHandoff = useMemo(
    () => handoffs.find((handoff) => handoff.id === selectedHandoffId) ?? null,
    [handoffs, selectedHandoffId]
  );
  const activeLoop = useMemo(
    () => loops.find((loop) => loop.id === activeLoopId) ?? loops[0],
    [loops, activeLoopId]
  );

  const rehearsalSequence = useMemo(() => {
    // Build a deterministic walkthrough of the handoffs as they fire in a nominal iteration.
    return [
      { key: "boot", label: "queue primed", agentId: ensemble[0]?.id ?? null, handoffId: null },
      ...handoffs.map((handoff) => ({
        key: handoff.id,
        label: `${agentLookup[handoff.fromId]?.name ?? "?"} → ${agentLookup[handoff.toId]?.name ?? "?"}`,
        agentId: handoff.toId,
        handoffId: handoff.id
      })),
      { key: "loopback", label: "loop decision", agentId: null, handoffId: null }
    ];
  }, [handoffs, agentLookup, ensemble]);

  const rehearsalFrame = rehearsalSequence[rehearsalStep] ?? rehearsalSequence[0]!;

  function updateHandoff(id: string, patch: Partial<Handoff>) {
    setHandoffs((current) => current.map((handoff) => (handoff.id === id ? { ...handoff, ...patch } : handoff)));
  }

  function removeHandoff(id: string) {
    setHandoffs((current) => {
      const next = current.filter((handoff) => handoff.id !== id);
      if (selectedHandoffId === id && next[0]) setSelectedHandoffId(next[0].id);
      return next;
    });
  }

  function addHandoff() {
    if (ensemble.length < 2) return;
    const from = ensemble[0]!;
    const to = ensemble[1]!;
    const newHandoff: Handoff = {
      id: createLocalId("h"),
      fromId: from.id,
      toId: to.id,
      trigger: "true",
      baton: "payload",
      kind: "sync",
      note: "New handoff — describe the condition and the baton it carries.",
      bow: 0.3
    };
    setHandoffs((current) => [...current, newHandoff]);
    setSelectedHandoffId(newHandoff.id);
  }

  function updateLoop(id: string, patch: Partial<LoopConfig>) {
    setLoops((current) => current.map((loop) => (loop.id === id ? { ...loop, ...patch } : loop)));
  }

  function addExitGate(loopId: string) {
    setLoops((current) =>
      current.map((loop) =>
        loop.id === loopId
          ? {
              ...loop,
              exitGates: [
                ...loop.exitGates,
                {
                  id: createLocalId("ex"),
                  label: "new gate",
                  predicate: "condition",
                  terminal: true
                }
              ]
            }
          : loop
      )
    );
  }

  function updateExitGate(loopId: string, gateId: string, patch: Partial<ExitGate>) {
    setLoops((current) =>
      current.map((loop) =>
        loop.id === loopId
          ? { ...loop, exitGates: loop.exitGates.map((gate) => (gate.id === gateId ? { ...gate, ...patch } : gate)) }
          : loop
      )
    );
  }

  function removeExitGate(loopId: string, gateId: string) {
    setLoops((current) =>
      current.map((loop) =>
        loop.id === loopId ? { ...loop, exitGates: loop.exitGates.filter((gate) => gate.id !== gateId) } : loop
      )
    );
  }

  function stepRehearsal(delta: 1 | -1) {
    setRehearsalStep((current) => {
      const next = current + delta;
      if (next < 0) return 0;
      if (next >= rehearsalSequence.length) return rehearsalSequence.length - 1;
      return next;
    });
  }

  function toggleRehearsal() {
    setRehearsalPlaying((current) => !current);
  }

  // involved handoffs for focus highlight
  const focusedHandoffIds = useMemo(() => {
    if (!focusedAgentId) return new Set<string>();
    return new Set(
      handoffs.filter((h) => h.fromId === focusedAgentId || h.toId === focusedAgentId).map((h) => h.id)
    );
  }, [focusedAgentId, handoffs]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Stippled parchment background — distinct from flow-studio's grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, hsl(var(--border)/0.9) 1px, transparent 0)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at 30% 15%, black 30%, transparent 80%)"
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(38 95% 58% / 0.08), transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-64 h-96 w-96 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.1), transparent 70%)" }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-8 px-4 pb-16 pt-8 md:gap-10 md:px-6 2xl:px-10">
        <Masthead
          ensembleCount={ensemble.length}
          handoffCount={handoffs.length}
          loopBudget={activeLoop?.iterationBudget ?? 0}
          iterationsUsed={activeLoop?.iterationsUsed ?? 0}
        />

        <EnsembleRoster
          agents={ensemble}
          focusedId={focusedAgentId}
          onFocus={(id) => setFocusedAgentId((current) => (current === id ? null : id))}
          onRename={(id, name) =>
            setEnsemble((current) => current.map((agent) => (agent.id === id ? { ...agent, name } : agent)))
          }
          onUpdateRole={(id, role) =>
            setEnsemble((current) => current.map((agent) => (agent.id === id ? { ...agent, role } : agent)))
          }
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] 2xl:gap-8">
          <HandoffTheatre
            ensemble={ensemble}
            handoffs={handoffs}
            selectedHandoffId={selectedHandoffId}
            onSelectHandoff={setSelectedHandoffId}
            focusedAgentId={focusedAgentId}
            focusedHandoffIds={focusedHandoffIds}
            rehearsalHandoffId={rehearsalFrame.handoffId}
            onAddHandoff={addHandoff}
            onFocusAgent={(id) => setFocusedAgentId((current) => (current === id ? null : id))}
          />

          <HandoffInspector
            handoff={selectedHandoff}
            ensemble={ensemble}
            onUpdate={(patch) => selectedHandoff && updateHandoff(selectedHandoff.id, patch)}
            onRemove={() => selectedHandoff && removeHandoff(selectedHandoff.id)}
          />
        </div>

        <LoopOrbits
          loops={loops}
          activeLoopId={activeLoopId}
          onSelectLoop={setActiveLoopId}
          onUpdateLoop={updateLoop}
          onAddExitGate={addExitGate}
          onUpdateExitGate={updateExitGate}
          onRemoveExitGate={removeExitGate}
        />

        <RehearsalRibbon
          sequence={rehearsalSequence}
          step={rehearsalStep}
          playing={rehearsalPlaying}
          onStep={stepRehearsal}
          onToggle={toggleRehearsal}
          ensemble={ensemble}
          handoffs={handoffs}
        />
      </div>

      <style>{`
        @keyframes choreography-travel {
          from { stroke-dashoffset: 120; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes choreography-pulse {
          0%, 100% { transform: scale(1); opacity: 0.9; }
          50% { transform: scale(1.08); opacity: 1; }
        }
        @keyframes choreography-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Masthead — director's slate
// ────────────────────────────────────────────────────────────────────────────

function Masthead({
  ensembleCount,
  handoffCount,
  loopBudget,
  iterationsUsed
}: {
  ensembleCount: number;
  handoffCount: number;
  loopBudget: number;
  iterationsUsed: number;
}) {
  return (
    <header className="relative">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3 font-mono text-[0.625rem] uppercase tracking-[0.38em] text-muted-foreground">
            <Clapperboard aria-hidden className="h-3.5 w-3.5 text-primary" />
            <span>Stage · Act I</span>
            <span aria-hidden className="h-px w-10 bg-border" />
            <span className="italic tracking-[0.22em] text-muted-foreground/70">a composition for agents &amp; loops</span>
          </div>

          <div className="relative">
            <span aria-hidden className="absolute -left-1 -top-2 font-mono text-[0.7rem] italic text-primary/70">scene·01</span>
            <h1 className="font-mono text-[2.5rem] font-bold leading-[0.95] tracking-[-0.03em] text-foreground md:text-[3.25rem] 2xl:text-[3.75rem]">
              <span className="italic text-muted-foreground/70">the</span>{" "}
              <span>choreography</span>
              <span aria-hidden className="text-primary">.</span>
            </h1>
            <p className="mt-3 max-w-xl text-[0.875rem] leading-6 text-muted-foreground">
              Script the handoffs between your agents, close the loop over a shifting todo queue, and rehearse the whole
              performance before you press go.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-stretch gap-4">
          <SignatureTile label="ensemble" value={ensembleCount} hint="agents on stage" icon={Users} />
          <SignatureTile label="handoffs" value={handoffCount} hint="batons choreographed" icon={GitBranch} />
          <SignatureTile
            label="loop"
            value={loopBudget}
            hint={`${iterationsUsed}/${loopBudget} spent`}
            icon={Orbit}
            tone="amber"
          />
        </div>
      </div>

      <div aria-hidden className="mt-6 flex items-center gap-2">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.4em] text-muted-foreground/70">staves ·· ·· ·· ··</span>
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>
    </header>
  );
}

function SignatureTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary"
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Users;
  tone?: "primary" | "amber";
}) {
  const accent = tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-primary";
  const ring = tone === "amber" ? "ring-amber-500/25" : "ring-primary/20";
  return (
    <div
      className={cn(
        "relative flex min-w-[10rem] flex-col justify-between rounded-[4px] border border-border/70 bg-card/70 px-4 py-3 ring-1 backdrop-blur",
        ring
      )}
    >
      <div className="flex items-center justify-between font-mono text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">
        <span>{label}</span>
        <Icon aria-hidden className={cn("h-3.5 w-3.5", accent)} />
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className={cn("font-mono text-[2.5rem] italic font-bold leading-none tabular-nums tracking-tight", accent)}>
          {String(value).padStart(2, "0")}
        </span>
        <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">{hint}</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Ensemble roster
// ────────────────────────────────────────────────────────────────────────────

function EnsembleRoster({
  agents,
  focusedId,
  onFocus,
  onRename,
  onUpdateRole
}: {
  agents: EnsembleAgent[];
  focusedId: string | null;
  onFocus: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onUpdateRole: (id: string, role: string) => void;
}) {
  return (
    <section className="relative rounded-2xl border border-border/70 bg-card/60 p-5 backdrop-blur md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-muted-foreground">Act I · Cast</p>
          <h2 className="mt-1 flex items-baseline gap-3 font-mono text-[1.125rem] font-semibold tracking-tight text-foreground">
            <Users aria-hidden className="h-4 w-4 text-primary" />
            The Ensemble
            <span className="font-mono text-[0.65rem] italic tracking-[0.18em] text-muted-foreground/80">
              — characters on today&apos;s stage
            </span>
          </h2>
        </div>

        <p className="max-w-md text-[0.75rem] italic leading-5 text-muted-foreground">
          Each agent enters with a role and leaves with a baton. Click a portrait to spotlight the lines it draws.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {agents.map((agent) => {
          const isFocused = focusedId === agent.id;
          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => onFocus(agent.id)}
              className={cn(
                "group relative overflow-hidden rounded-[4px] border px-3 py-3 text-left transition-all",
                isFocused
                  ? "border-primary/60 bg-primary/5 shadow-[0_0_0_2px_hsl(var(--primary)/0.12)]"
                  : focusedId
                    ? "border-border/60 bg-background/30 opacity-60 hover:opacity-100"
                    : "border-border/80 bg-background/60 hover:border-primary/40 hover:bg-background"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] border bg-gradient-to-br from-background to-muted font-mono text-xl",
                    isFocused ? "border-primary/60 text-primary" : "border-border text-foreground"
                  )}
                >
                  <span aria-hidden>{agent.glyph}</span>
                  {isFocused ? (
                    <span aria-hidden className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <input
                    value={agent.name}
                    onChange={(event) => onRename(agent.id, event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    className="w-full bg-transparent font-mono text-[0.875rem] font-semibold tracking-tight text-foreground focus:outline-none"
                  />
                  <input
                    value={agent.role}
                    onChange={(event) => onUpdateRole(agent.id, event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    className="w-full bg-transparent font-mono text-[0.625rem] uppercase tracking-[0.24em] text-primary focus:outline-none"
                  />
                  <p className="text-[0.6875rem] italic text-muted-foreground">{agent.subtitle}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {agent.batons.map((baton) => (
                  <span
                    key={`${agent.id}-${baton}`}
                    className="inline-flex items-center gap-1 rounded-full border border-border/80 bg-background/80 px-1.5 py-0.5 font-mono text-[0.575rem] uppercase tracking-[0.14em] text-muted-foreground"
                  >
                    <Sparkle aria-hidden className="h-2 w-2 text-primary/70" />
                    {baton}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Handoff Theatre — the central stage
// ────────────────────────────────────────────────────────────────────────────

function HandoffTheatre({
  ensemble,
  handoffs,
  selectedHandoffId,
  onSelectHandoff,
  focusedAgentId,
  focusedHandoffIds,
  rehearsalHandoffId,
  onAddHandoff,
  onFocusAgent
}: {
  ensemble: EnsembleAgent[];
  handoffs: Handoff[];
  selectedHandoffId: string;
  onSelectHandoff: (id: string) => void;
  focusedAgentId: string | null;
  focusedHandoffIds: Set<string>;
  rehearsalHandoffId: string | null;
  onAddHandoff: () => void;
  onFocusAgent: (id: string) => void;
}) {
  const agentLookup = useMemo(() => Object.fromEntries(ensemble.map((a) => [a.id, a])), [ensemble]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card/80 via-card/70 to-card/60 p-4 backdrop-blur md:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-muted-foreground">Act II · Theatre</p>
          <h2 className="mt-1 flex items-baseline gap-3 font-mono text-[1.125rem] font-semibold tracking-tight text-foreground">
            <Workflow aria-hidden className="h-4 w-4 text-primary" />
            Handoff Score
            <span className="font-mono text-[0.65rem] italic tracking-[0.18em] text-muted-foreground/80">
              — batons move here
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <LegendDot kind="sync" />
          <LegendDot kind="bypass" />
          <LegendDot kind="rollback" />
          <LegendDot kind="async" />
          <Button type="button" variant="outline" size="sm" onClick={onAddHandoff} className="ml-2 h-8 gap-1.5 px-2.5">
            <Plus className="h-3.5 w-3.5" />
            Handoff
          </Button>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${stageWidth} ${stageHeight}`}
          className="block h-auto w-full"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Handoff diagram"
        >
          <defs>
            {(["sync", "bypass", "rollback", "async"] as HandoffKind[]).map((kind) => (
              <marker
                key={`arrow-${kind}`}
                id={`chor-arrow-${kind}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={kindMeta[kind].fill} />
              </marker>
            ))}
          </defs>

          {/* stave lines — subtle horizontal guides */}
          {[140, 300, 450].map((y) => (
            <line
              key={`stave-${y}`}
              x1={60}
              x2={stageWidth - 60}
              y1={y}
              y2={y}
              stroke="hsl(var(--border))"
              strokeOpacity={0.4}
              strokeDasharray="1 4"
            />
          ))}

          {/* handoff curves */}
          {handoffs.map((handoff) => {
            const from = agentLookup[handoff.fromId];
            const to = agentLookup[handoff.toId];
            if (!from || !to) return null;
            const start = edgePoint(from, to.x, to.y, 42);
            const end = edgePoint(to, from.x, from.y, 42);
            const meta = kindMeta[handoff.kind];
            const isSelected = handoff.id === selectedHandoffId;
            const isRehearsing = handoff.id === rehearsalHandoffId;
            const isDim =
              (focusedAgentId !== null && !focusedHandoffIds.has(handoff.id)) ||
              (!isSelected && focusedAgentId === null && !isRehearsing);
            const path = curvePath(start.x, start.y, end.x, end.y, handoff.bow);
            const strokeWidth = isSelected || isRehearsing ? 2.2 : 1.5;

            return (
              <g key={handoff.id} className="cursor-pointer" onClick={() => onSelectHandoff(handoff.id)}>
                {/* glow for selected/rehearsal */}
                {isSelected || isRehearsing ? (
                  <path
                    d={path}
                    fill="none"
                    stroke={meta.stroke}
                    strokeOpacity={0.2}
                    strokeWidth={9}
                    strokeLinecap="round"
                  />
                ) : null}
                <path
                  d={path}
                  fill="none"
                  stroke={meta.stroke}
                  strokeOpacity={isDim ? 0.22 : 0.9}
                  strokeWidth={strokeWidth}
                  strokeDasharray={meta.dash}
                  strokeLinecap="round"
                  markerEnd={`url(#chor-arrow-${handoff.kind})`}
                  style={
                    isRehearsing
                      ? { animation: "choreography-travel 1.4s linear infinite" }
                      : undefined
                  }
                />
              </g>
            );
          })}

          {/* handoff labels (pills) */}
          {handoffs.map((handoff) => {
            const from = agentLookup[handoff.fromId];
            const to = agentLookup[handoff.toId];
            if (!from || !to) return null;
            const mid = midPoint(from.x, from.y, to.x, to.y, handoff.bow);
            const isSelected = handoff.id === selectedHandoffId;
            const isDim = focusedAgentId !== null && !focusedHandoffIds.has(handoff.id);
            if (isDim && !isSelected) return null;
            const text = handoff.baton;
            const width = Math.max(76, text.length * 6.6 + 18);
            return (
              <g
                key={`${handoff.id}-label`}
                transform={`translate(${mid.x - width / 2}, ${mid.y - 11})`}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectHandoff(handoff.id);
                }}
                className="cursor-pointer"
              >
                <rect
                  x={0}
                  y={0}
                  rx={10}
                  ry={10}
                  width={width}
                  height={22}
                  fill="hsl(var(--card))"
                  stroke={isSelected ? kindMeta[handoff.kind].stroke : "hsl(var(--border))"}
                  strokeWidth={isSelected ? 1.5 : 1}
                />
                <text
                  x={width / 2}
                  y={14}
                  textAnchor="middle"
                  className="font-mono"
                  fill="hsl(var(--foreground))"
                  style={{ fontSize: "10px", letterSpacing: "0.03em" }}
                >
                  {text}
                </text>
              </g>
            );
          })}

          {/* agent nodes */}
          {ensemble.map((agent) => {
            const isFocused = focusedAgentId === agent.id;
            const isDim = focusedAgentId !== null && !isFocused;
            return (
              <g
                key={agent.id}
                transform={`translate(${agent.x}, ${agent.y})`}
                className="cursor-pointer"
                onClick={(event) => {
                  event.stopPropagation();
                  onFocusAgent(agent.id);
                }}
                opacity={isDim ? 0.45 : 1}
              >
                {/* halo */}
                {isFocused ? (
                  <circle r={50} fill="hsl(var(--primary))" fillOpacity={0.1} />
                ) : null}
                <circle
                  r={38}
                  fill="hsl(var(--card))"
                  stroke={isFocused ? "hsl(var(--primary))" : "hsl(var(--border))"}
                  strokeWidth={isFocused ? 2 : 1.25}
                />
                <circle r={32} fill="none" stroke="hsl(var(--border))" strokeOpacity={0.6} strokeDasharray="2 3" />
                <text
                  x={0}
                  y={6}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  style={{ fontSize: "22px", fontFamily: "JetBrains Mono, monospace" }}
                >
                  {agent.glyph}
                </text>
                <text
                  x={0}
                  y={58}
                  textAnchor="middle"
                  fill="hsl(var(--foreground))"
                  style={{ fontSize: "12px", fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}
                >
                  {agent.name}
                </text>
                <text
                  x={0}
                  y={74}
                  textAnchor="middle"
                  fill="hsl(var(--muted-foreground))"
                  style={{ fontSize: "9px", fontFamily: "JetBrains Mono, monospace", letterSpacing: "0.15em", textTransform: "uppercase" }}
                >
                  {agent.role}
                </text>
              </g>
            );
          })}
        </svg>

        {/* corner flourish */}
        <span
          aria-hidden
          className="pointer-events-none absolute left-3 top-3 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground/60"
        >
          ⎯⎯ stage · left
        </span>
        <span
          aria-hidden
          className="pointer-events-none absolute right-3 top-3 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground/60"
        >
          stage · right ⎯⎯
        </span>
      </div>
    </section>
  );
}

function LegendDot({ kind }: { kind: HandoffKind }) {
  const meta = kindMeta[kind];
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground">
      <span
        aria-hidden
        className="inline-block h-1.5 w-4"
        style={{
          borderTop: `2px ${kind === "rollback" || kind === "async" ? "dashed" : kind === "bypass" ? "dashed" : "solid"} ${meta.stroke}`
        }}
      />
      {meta.label}
    </span>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Handoff Inspector
// ────────────────────────────────────────────────────────────────────────────

function HandoffInspector({
  handoff,
  ensemble,
  onUpdate,
  onRemove
}: {
  handoff: Handoff | null;
  ensemble: EnsembleAgent[];
  onUpdate: (patch: Partial<Handoff>) => void;
  onRemove: () => void;
}) {
  if (!handoff) {
    return (
      <aside className="relative flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/70 bg-card/40 p-6 text-center">
        <GitBranch aria-hidden className="h-6 w-6 text-muted-foreground/50" />
        <p className="font-mono text-[0.6875rem] uppercase tracking-[0.24em] text-muted-foreground">no handoff selected</p>
        <p className="max-w-[18ch] text-[0.75rem] leading-5 text-muted-foreground/70">
          click a curve on the stage to conduct it
        </p>
      </aside>
    );
  }

  const meta = kindMeta[handoff.kind];
  const from = ensemble.find((a) => a.id === handoff.fromId);
  const to = ensemble.find((a) => a.id === handoff.toId);

  return (
    <aside className="relative flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/70 p-5 backdrop-blur md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-muted-foreground">Inspect</p>
          <h3 className="mt-1 flex items-baseline gap-2 font-mono text-base font-semibold tracking-tight text-foreground">
            Handoff
            <span className="font-mono text-[0.7rem] italic text-muted-foreground/70">· {meta.label}</span>
          </h3>
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] border border-border text-muted-foreground transition hover:border-destructive hover:text-destructive"
          aria-label="Remove handoff"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* from → to */}
      <div className="rounded-[4px] border border-border/70 bg-background/70 p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <AgentChip agent={from} align="start" />
          <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
          <AgentChip agent={to} align="end" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block font-mono text-[0.575rem] uppercase tracking-[0.22em] text-muted-foreground">
              from
            </label>
            <Select value={handoff.fromId} onValueChange={(value) => onUpdate({ fromId: value })}>
              <SelectTrigger className="h-8 text-[0.75rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ensemble.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1 block font-mono text-[0.575rem] uppercase tracking-[0.22em] text-muted-foreground">
              to
            </label>
            <Select value={handoff.toId} onValueChange={(value) => onUpdate({ toId: value })}>
              <SelectTrigger className="h-8 text-[0.75rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ensemble.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
          Trigger · when this fires
        </label>
        <Input
          value={handoff.trigger}
          onChange={(event) => onUpdate({ trigger: event.target.value })}
          className="font-mono text-[0.75rem]"
        />
      </div>

      <div>
        <label className="mb-1.5 block font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
          Baton · payload passed
        </label>
        <Input
          value={handoff.baton}
          onChange={(event) => onUpdate({ baton: event.target.value })}
          className="font-mono text-[0.75rem]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1.5 block font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
            Kind
          </label>
          <Select value={handoff.kind} onValueChange={(value) => onUpdate({ kind: value as HandoffKind })}>
            <SelectTrigger className="h-8 text-[0.75rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(kindMeta) as HandoffKind[]).map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {kindMeta[kind].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="mb-1.5 block font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
            Arc bow
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={-0.8}
              max={0.8}
              step={0.05}
              value={handoff.bow}
              onChange={(event) => onUpdate({ bow: Number(event.target.value) })}
              className="h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
            />
            <span className="font-mono text-[0.65rem] tabular-nums text-muted-foreground">
              {handoff.bow >= 0 ? "+" : ""}
              {handoff.bow.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
          Director&apos;s note
        </label>
        <Textarea
          rows={3}
          value={handoff.note}
          onChange={(event) => onUpdate({ note: event.target.value })}
          className="font-mono text-[0.75rem]"
        />
      </div>
    </aside>
  );
}

function AgentChip({ agent, align }: { agent: EnsembleAgent | undefined; align: "start" | "end" }) {
  if (!agent) {
    return <span className="font-mono text-[0.7rem] italic text-muted-foreground">—</span>;
  }
  return (
    <div
      className={cn(
        "flex items-center gap-2 min-w-0",
        align === "end" ? "justify-end" : "justify-start"
      )}
    >
      {align === "start" ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-border bg-background font-mono text-sm">
          {agent.glyph}
        </span>
      ) : null}
      <div className={cn("min-w-0", align === "end" ? "text-right" : "text-left")}>
        <p className="truncate font-mono text-[0.8125rem] font-semibold text-foreground">{agent.name}</p>
        <p className="truncate font-mono text-[0.575rem] uppercase tracking-[0.2em] text-muted-foreground">{agent.role}</p>
      </div>
      {align === "end" ? (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-border bg-background font-mono text-sm">
          {agent.glyph}
        </span>
      ) : null}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Loop Orbits
// ────────────────────────────────────────────────────────────────────────────

function LoopOrbits({
  loops,
  activeLoopId,
  onSelectLoop,
  onUpdateLoop,
  onAddExitGate,
  onUpdateExitGate,
  onRemoveExitGate
}: {
  loops: LoopConfig[];
  activeLoopId: string;
  onSelectLoop: (id: string) => void;
  onUpdateLoop: (id: string, patch: Partial<LoopConfig>) => void;
  onAddExitGate: (loopId: string) => void;
  onUpdateExitGate: (loopId: string, gateId: string, patch: Partial<ExitGate>) => void;
  onRemoveExitGate: (loopId: string, gateId: string) => void;
}) {
  const activeLoop = loops.find((l) => l.id === activeLoopId) ?? loops[0];
  if (!activeLoop) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/70 p-5 backdrop-blur md:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-muted-foreground">Act III · Orbits</p>
          <h2 className="mt-1 flex items-baseline gap-3 font-mono text-[1.125rem] font-semibold tracking-tight text-foreground">
            <Orbit aria-hidden className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            Todo Loops
            <span className="font-mono text-[0.65rem] italic tracking-[0.18em] text-muted-foreground/80">
              — the queue that breathes
            </span>
          </h2>
        </div>

        <div className="flex flex-wrap gap-2">
          {loops.map((loop) => {
            const isActive = loop.id === activeLoopId;
            return (
              <button
                key={loop.id}
                type="button"
                onClick={() => onSelectLoop(loop.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-[3px] border px-3 py-1.5 text-left transition",
                  isActive
                    ? "border-amber-500/60 bg-amber-500/10 text-foreground"
                    : "border-border/70 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                <Repeat2 className={cn("h-3.5 w-3.5", isActive ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
                <span className="font-mono text-[0.75rem] font-medium">{loop.name}</span>
                <span className="font-mono text-[0.625rem] uppercase tracking-[0.2em] text-muted-foreground">
                  {loop.iterationsUsed}/{loop.iterationBudget}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <LoopOrbitRing loop={activeLoop} onUpdateLoop={onUpdateLoop} />

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <LoopField
              label="Todo source"
              hint="where items enter the queue"
              icon={ListChecks}
              value={activeLoop.todoSource}
              onChange={(value) => onUpdateLoop(activeLoop.id, { todoSource: value })}
            />
            <LoopField
              label="Cadence"
              hint="what happens each pass"
              icon={Disc3}
              value={activeLoop.cadence}
              onChange={(value) => onUpdateLoop(activeLoop.id, { cadence: value })}
            />
            <LoopField
              label="Carry-forward"
              hint="what the next iteration inherits"
              icon={InfinityIcon}
              value={activeLoop.carryForward}
              onChange={(value) => onUpdateLoop(activeLoop.id, { carryForward: value })}
              colSpan
            />
          </div>

          <div className="rounded-[4px] border border-border/70 bg-background/70 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">Exit gates</p>
                <p className="mt-0.5 text-[0.75rem] italic text-muted-foreground">
                  Each gate is a predicate that ends — or pauses — the loop.
                </p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={() => onAddExitGate(activeLoop.id)} className="h-8 gap-1.5 px-2.5">
                <Plus className="h-3.5 w-3.5" />
                Gate
              </Button>
            </div>

            <ul className="space-y-2">
              {activeLoop.exitGates.map((gate, index) => (
                <li
                  key={gate.id}
                  className="group relative rounded-[3px] border border-border/70 bg-card/60 p-3"
                >
                  <div className="grid gap-2 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.6fr)_auto]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[0.6rem] italic text-muted-foreground/70">gate·{String(index + 1).padStart(2, "0")}</span>
                      <Flag className={cn("h-3.5 w-3.5", gate.terminal ? "text-rose-500" : "text-amber-500")} aria-hidden />
                    </div>
                    <Input
                      value={gate.label}
                      onChange={(event) => onUpdateExitGate(activeLoop.id, gate.id, { label: event.target.value })}
                      placeholder="gate name"
                      className="h-8 font-mono text-[0.75rem]"
                    />
                    <Input
                      value={gate.predicate}
                      onChange={(event) => onUpdateExitGate(activeLoop.id, gate.id, { predicate: event.target.value })}
                      placeholder="predicate"
                      className="h-8 font-mono text-[0.75rem]"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateExitGate(activeLoop.id, gate.id, { terminal: !gate.terminal })
                        }
                        className={cn(
                          "inline-flex h-8 items-center gap-1 rounded-[2px] border px-2 font-mono text-[0.625rem] uppercase tracking-[0.18em] transition",
                          gate.terminal
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        )}
                      >
                        {gate.terminal ? "terminal" : "pause"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveExitGate(activeLoop.id, gate.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-[2px] border border-border text-muted-foreground transition hover:border-destructive hover:text-destructive"
                        aria-label="Remove gate"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function LoopField({
  label,
  hint,
  value,
  onChange,
  icon: Icon,
  colSpan = false
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (value: string) => void;
  icon: typeof ListChecks;
  colSpan?: boolean;
}) {
  return (
    <label className={cn("block rounded-[4px] border border-border/70 bg-background/60 p-3", colSpan && "md:col-span-2")}>
      <span className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
        <Icon className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden />
        {label}
      </span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 h-8 border-0 bg-transparent px-0 font-mono text-[0.8125rem] shadow-none focus-visible:ring-0"
      />
      <span className="text-[0.65rem] italic text-muted-foreground/80">{hint}</span>
    </label>
  );
}

function LoopOrbitRing({
  loop,
  onUpdateLoop
}: {
  loop: LoopConfig;
  onUpdateLoop: (id: string, patch: Partial<LoopConfig>) => void;
}) {
  const size = 280;
  const cx = size / 2;
  const cy = size / 2;
  const ringRadius = 104;
  const tickOuter = ringRadius + 6;
  const tickInner = ringRadius - 10;

  const budget = Math.max(1, loop.iterationBudget);
  const used = Math.min(loop.iterationsUsed, budget);

  function setBudget(next: number) {
    if (next < 1) next = 1;
    if (next > 24) next = 24;
    onUpdateLoop(loop.id, {
      iterationBudget: next,
      iterationsUsed: Math.min(loop.iterationsUsed, next)
    });
  }

  function setUsed(next: number) {
    if (next < 0) next = 0;
    if (next > budget) next = budget;
    onUpdateLoop(loop.id, { iterationsUsed: next });
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="block"
          role="img"
          aria-label="Loop orbit"
        >
          {/* outer dotted frame */}
          <circle cx={cx} cy={cy} r={ringRadius + 26} fill="none" stroke="hsl(var(--border))" strokeDasharray="1 4" strokeOpacity={0.6} />

          {/* main ring */}
          <circle cx={cx} cy={cy} r={ringRadius} fill="none" stroke="hsl(var(--border))" strokeWidth={1.5} />

          {/* iteration arc */}
          <circle
            cx={cx}
            cy={cy}
            r={ringRadius}
            fill="none"
            stroke="hsl(38 92% 52%)"
            strokeWidth={3}
            strokeDasharray={`${(used / budget) * 2 * Math.PI * ringRadius} ${2 * Math.PI * ringRadius}`}
            strokeDashoffset={-Math.PI * ringRadius / 2 - 1.5}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />

          {/* tick marks — one per iteration budget unit */}
          {Array.from({ length: budget }, (_, i) => {
            const angle = (i / budget) * 2 * Math.PI - Math.PI / 2;
            const x1 = cx + Math.cos(angle) * tickInner;
            const y1 = cy + Math.sin(angle) * tickInner;
            const x2 = cx + Math.cos(angle) * tickOuter;
            const y2 = cy + Math.sin(angle) * tickOuter;
            const past = i < used;
            return (
              <line
                key={`tick-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={past ? "hsl(38 92% 52%)" : "hsl(var(--border))"}
                strokeWidth={1.5}
              />
            );
          })}

          {/* center marker - a small compass */}
          <circle cx={cx} cy={cy} r={5} fill="hsl(var(--foreground))" />

          {/* orbit agent satellite (decorative) */}
          <g transform={`translate(${cx} ${cy})`} style={{ animation: "choreography-orbit 14s linear infinite", transformOrigin: `${cx}px ${cy}px` }}>
            <circle cx={ringRadius} cy={0} r={4} fill="hsl(38 92% 52%)" />
          </g>
        </svg>

        {/* giant numerals overlayed */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-muted-foreground">iteration</span>
          <div className="flex items-baseline gap-1 font-mono text-[3.25rem] italic font-bold leading-none tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
            {String(used).padStart(2, "0")}
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground">{String(budget).padStart(2, "0")}</span>
          </div>
          <span className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground">of budget</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <OrbitStepper label="used" value={used} onDecrement={() => setUsed(used - 1)} onIncrement={() => setUsed(used + 1)} />
        <OrbitStepper label="budget" value={budget} onDecrement={() => setBudget(budget - 1)} onIncrement={() => setBudget(budget + 1)} />
      </div>
    </div>
  );
}

function OrbitStepper({
  label,
  value,
  onDecrement,
  onIncrement
}: {
  label: string;
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="font-mono text-[0.6rem] uppercase tracking-[0.28em] text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1 rounded-[3px] border border-border bg-background/70 px-1">
        <button
          type="button"
          onClick={onDecrement}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] text-muted-foreground transition hover:text-foreground"
          aria-label={`Decrease ${label}`}
        >
          <span className="font-mono text-sm">−</span>
        </button>
        <span className="min-w-[2.5ch] text-center font-mono text-[0.8125rem] font-semibold tabular-nums text-foreground">
          {String(value).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={onIncrement}
          className="inline-flex h-7 w-7 items-center justify-center rounded-[2px] text-muted-foreground transition hover:text-foreground"
          aria-label={`Increase ${label}`}
        >
          <span className="font-mono text-sm">+</span>
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Rehearsal Ribbon
// ────────────────────────────────────────────────────────────────────────────

type RehearsalFrame = {
  key: string;
  label: string;
  agentId: string | null;
  handoffId: string | null;
};

function RehearsalRibbon({
  sequence,
  step,
  playing,
  onStep,
  onToggle,
  ensemble,
  handoffs
}: {
  sequence: RehearsalFrame[];
  step: number;
  playing: boolean;
  onStep: (delta: 1 | -1) => void;
  onToggle: () => void;
  ensemble: EnsembleAgent[];
  handoffs: Handoff[];
}) {
  const agentLookup = useMemo(() => Object.fromEntries(ensemble.map((a) => [a.id, a])), [ensemble]);
  const handoffLookup = useMemo(() => Object.fromEntries(handoffs.map((h) => [h.id, h])), [handoffs]);
  const frame = sequence[step] ?? sequence[0];
  const activeHandoff = frame?.handoffId ? handoffLookup[frame.handoffId] : undefined;
  const activeAgent = frame?.agentId ? agentLookup[frame.agentId] : undefined;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-b from-card/80 to-card/60 p-4 backdrop-blur md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-muted-foreground">Rehearsal</p>
          <h2 className="mt-1 flex items-baseline gap-3 font-mono text-[1.125rem] font-semibold tracking-tight text-foreground">
            <Zap aria-hidden className="h-4 w-4 text-primary" />
            Dry-run ribbon
            <span className="font-mono text-[0.65rem] italic tracking-[0.18em] text-muted-foreground/80">
              — walk through one iteration
            </span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onStep(-1)} className="h-8 px-2.5">
            <StepForward className="h-3.5 w-3.5 rotate-180" />
          </Button>
          <Button type="button" variant={playing ? "default" : "outline"} size="sm" onClick={onToggle} className="h-8 gap-1.5 px-2.5">
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "rehearsing" : "rehearse"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onStep(1)} className="h-8 px-2.5">
            <StepForward className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-5 relative">
        <div className="flex items-stretch gap-0 overflow-x-auto pb-2">
          {sequence.map((item, index) => {
            const isActive = index === step;
            const isPast = index < step;
            const agent = item.agentId ? agentLookup[item.agentId] : undefined;
            const handoff = item.handoffId ? handoffLookup[item.handoffId] : undefined;
            const meta = handoff ? kindMeta[handoff.kind] : null;
            return (
              <div key={item.key} className="flex shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => {
                    const delta = index > step ? 1 : -1;
                    for (let i = 0; i < Math.abs(index - step); i++) {
                      onStep(delta as 1 | -1);
                    }
                  }}
                  className={cn(
                    "group relative flex min-w-[8rem] flex-col gap-1.5 rounded-[4px] border px-3 py-2.5 text-left transition",
                    isActive
                      ? "border-primary/60 bg-primary/8 shadow-[0_0_0_2px_hsl(var(--primary)/0.1)]"
                      : isPast
                        ? "border-border/70 bg-background/50 text-muted-foreground"
                        : "border-border/70 bg-background/60 hover:border-primary/40"
                  )}
                >
                  <span className="font-mono text-[0.575rem] uppercase tracking-[0.28em] text-muted-foreground">
                    beat · {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[0.75rem] font-semibold text-foreground">{item.label}</span>
                  {agent ? (
                    <span className="inline-flex items-center gap-1 font-mono text-[0.65rem] italic text-muted-foreground">
                      <Dot className="h-3 w-3" />
                      enters {agent.name}
                    </span>
                  ) : handoff ? (
                    <span
                      className={cn("inline-flex items-center gap-1 font-mono text-[0.65rem] italic")}
                      style={meta ? { color: meta.stroke } : undefined}
                    >
                      <ArrowRight className="h-3 w-3" />
                      {handoff.baton}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-[0.65rem] italic text-muted-foreground">
                      <Orbit className="h-3 w-3" />
                      loop decision
                    </span>
                  )}
                </button>
                {index < sequence.length - 1 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "h-px w-3 self-center",
                      index < step ? "bg-primary/60" : "bg-border"
                    )}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* active frame detail */}
      <div className="mt-4 grid gap-3 rounded-[4px] border border-border/70 bg-background/70 p-4 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex items-center gap-3">
          {activeAgent ? (
            <span className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-primary/60 bg-primary/5 font-mono text-lg text-primary">
              {activeAgent.glyph}
            </span>
          ) : activeHandoff ? (
            <span
              className="flex h-10 w-10 items-center justify-center rounded-[3px] border font-mono"
              style={{ borderColor: kindMeta[activeHandoff.kind].stroke, color: kindMeta[activeHandoff.kind].stroke }}
            >
              <ArrowRight className="h-4 w-4" />
            </span>
          ) : (
            <span className="flex h-10 w-10 items-center justify-center rounded-[3px] border border-amber-500/60 bg-amber-500/10 font-mono text-amber-600 dark:text-amber-400">
              <Orbit className="h-4 w-4" />
            </span>
          )}
          <div>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">Now playing</p>
            <p className="font-mono text-[0.875rem] font-semibold text-foreground">{frame?.label ?? "—"}</p>
          </div>
        </div>
        <p className="text-[0.8125rem] leading-6 text-muted-foreground">
          {activeAgent ? (
            <>
              <span className="font-semibold text-foreground">{activeAgent.name}</span> takes the stage — carrying{" "}
              <span className="font-mono text-primary">{activeAgent.batons[0] ?? "payload"}</span>. Watch the arcs brighten
              around it.
            </>
          ) : activeHandoff ? (
            <>
              A <span className="font-semibold text-foreground">{kindMeta[activeHandoff.kind].label}</span> fires when{" "}
              <span className="font-mono text-foreground">{activeHandoff.trigger}</span>. The baton{" "}
              <span className="font-mono text-primary">{activeHandoff.baton}</span> moves from{" "}
              <span className="font-semibold text-foreground">
                {agentLookup[activeHandoff.fromId]?.name ?? "?"}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {agentLookup[activeHandoff.toId]?.name ?? "?"}
              </span>
              .
            </>
          ) : (
            <>
              The loop checks its exit gates. If a terminal predicate is true, the performance ends. Otherwise it returns
              to the top of the score and replays — with carry-forward context in hand.
            </>
          )}
        </p>
      </div>
    </section>
  );
}
