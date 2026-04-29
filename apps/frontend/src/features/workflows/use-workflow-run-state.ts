import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  type AttackPathSummary,
  apiRoutes,
  type Target,
  type Workflow,
  type WorkflowRunEvaluationResponse,
  type WorkflowLaunch,
  type WorkflowLiveModelOutput,
  type WorkflowRun,
  type WorkflowRunStreamState,
  type WorkflowRunStreamMessage,
  type WorkflowRunTranscriptResponse
} from "@synosec/contracts";
import { fetchJson } from "@/shared/lib/api";
import { type RunStreamState, type TranscriptProjection } from "@/features/workflows/workflow-trace";

const ACTIVE_WORKFLOW_RUN_STATUSES = new Set<WorkflowRun["status"]>(["pending", "running"]);
const ACTIVE_RUN_POLL_INTERVAL_MS = 3000;
export type WorkflowPreRunEvidenceMode = "inherit" | "enabled" | "disabled";

async function fetchLatestWorkflowLaunch(workflowId: string) {
  return fetchJson<WorkflowLaunch | WorkflowRun>(`${apiRoutes.workflows}/${workflowId}/launches/latest`);
}

async function fetchWorkflowRun(runId: string) {
  return fetchJson<WorkflowRun>(`${apiRoutes.workflowRuns}/${runId}`);
}

async function fetchLegacyLatestWorkflowRun(workflowId: string) {
  return fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflowId}/runs/latest`);
}

function isWorkflowRun(payload: WorkflowLaunch | WorkflowRun): payload is WorkflowRun {
  return "targetId" in payload && "workflowLaunchId" in payload;
}

function normalizeWorkflowLaunch(
  payload: WorkflowLaunch | WorkflowRun,
  selectedTargetId: string | null,
  targets: Target[]
): WorkflowLaunch {
  if (!isWorkflowRun(payload)) {
    return payload;
  }

  const fallbackTargetId = payload.targetId
    ?? selectedTargetId
    ?? targets.find((target) => Boolean(target.baseUrl?.trim()))?.id
    ?? targets[0]?.id
    ?? "00000000-0000-0000-0000-000000000000";

  return {
    id: payload.workflowLaunchId,
    workflowId: payload.workflowId,
    status: payload.status === "running" ? "running" : payload.status === "completed" ? "completed" : "failed",
    startedAt: payload.startedAt,
    completedAt: payload.completedAt,
    runs: [{
      targetId: fallbackTargetId,
      runId: payload.id,
      status: payload.status,
      startedAt: payload.startedAt,
      completedAt: payload.completedAt,
      errorMessage: null
    }]
  };
}

type LaunchRunUpdate = Pick<WorkflowRun, "id" | "workflowLaunchId" | "status" | "completedAt"> & {
  latestEventSummary?: string | null;
};

function toLaunchRunUpdate(run: WorkflowRun | WorkflowRunStreamState, latestEventSummary?: string | null): LaunchRunUpdate {
  return {
    id: run.id,
    workflowLaunchId: run.workflowLaunchId,
    status: run.status,
    completedAt: run.completedAt,
    ...(latestEventSummary === undefined ? {} : { latestEventSummary })
  };
}

function appendRunEvent(current: WorkflowRun | null, run: WorkflowRunStreamState, event: WorkflowRun["events"][number]): WorkflowRun | null {
  if (!current || current.id !== run.id) {
    return current;
  }

  const events = current.events.some((existing) => existing.id === event.id)
    ? current.events
    : [...current.events, event];

  return {
    ...current,
    status: run.status,
    currentStepIndex: run.currentStepIndex,
    completedAt: run.completedAt,
    preRunEvidenceEnabled: run.preRunEvidenceEnabled,
    preRunEvidenceOverride: run.preRunEvidenceOverride,
    tokenUsage: run.tokenUsage,
    events
  };
}

function isActiveWorkflowRunStatus(status: WorkflowRun["status"] | null | undefined) {
  return typeof status === "string" && ACTIVE_WORKFLOW_RUN_STATUSES.has(status);
}

function updateLaunchWithRun(current: WorkflowLaunch | null, run: LaunchRunUpdate): WorkflowLaunch | null {
  if (!current || current.id !== run.workflowLaunchId) {
    return current;
  }

  const runs = current.runs.map((entry) => (
    entry.runId === run.id
      ? {
          ...entry,
          status: run.status,
          completedAt: run.completedAt,
          errorMessage: run.status === "failed"
            ? (run.latestEventSummary ?? "Workflow run failed.")
            : null
        }
      : entry
  ));

  const statuses = runs.map((entry) => entry.status);
  const status = statuses.some((value) => value === "running" || value === "pending")
    ? "running"
    : statuses.length === 0
      ? "pending"
      : statuses.every((value) => value === "completed")
        ? "completed"
        : statuses.every((value) => value === "failed")
          ? "failed"
          : "partial";

  return {
    ...current,
    status,
    completedAt: status === "running" || status === "pending" ? null : new Date().toISOString(),
    runs
  };
}

export function useWorkflowRunState({
  workflow,
  targets,
  selectedTargetId
}: {
  workflow: Workflow | null;
  targets: Target[];
  selectedTargetId: string | null;
}) {
  const [currentLaunch, setCurrentLaunch] = useState<WorkflowLaunch | null>(null);
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null);
  const [liveModelOutput, setLiveModelOutput] = useState<WorkflowLiveModelOutput | null>(null);
  const [runPending, setRunPending] = useState(false);
  const [cancelPending, setCancelPending] = useState(false);
  const [, setRunStreamState] = useState<RunStreamState>("idle");
  const [persistedTranscript, setPersistedTranscript] = useState<TranscriptProjection | null>(null);
  const [persistedAttackPaths, setPersistedAttackPaths] = useState<AttackPathSummary | null>(null);
  const [workflowEvaluation, setWorkflowEvaluation] = useState<WorkflowRunEvaluationResponse | null>(null);
  const [latestRunError, setLatestRunError] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const launchRuns = Array.isArray(currentLaunch?.runs) ? currentLaunch.runs : [];
  const runningRunIdsKey = useMemo(
    () => launchRuns
      .filter((entry) => isActiveWorkflowRunStatus(entry.status))
      .map((entry) => entry.runId)
      .sort()
      .join(","),
    [launchRuns]
  );
  const runningRunIds = useMemo(
    () => (runningRunIdsKey ? runningRunIdsKey.split(",") : []),
    [runningRunIdsKey]
  );

  const selectedLaunchRun = useMemo(
    () => launchRuns.find((entry) => entry.targetId === selectedTargetId) ?? null,
    [launchRuns, selectedTargetId]
  );

  useEffect(() => {
    if (!workflow) {
      setCurrentLaunch(null);
      setCurrentRun(null);
      setLiveModelOutput(null);
      setPersistedAttackPaths(null);
      setWorkflowEvaluation(null);
      setLatestRunError(null);
      return;
    }

    let active = true;

    fetchLatestWorkflowLaunch(workflow.id)
      .then((launch) => {
        if (active) {
          setCurrentLaunch(normalizeWorkflowLaunch(launch, selectedTargetId, targets));
          setLatestRunError(null);
        }
      })
      .catch(async (error) => {
        if (!active) {
          return;
        }

        if (typeof error === "object" && error !== null && "status" in error && error.status === 404) {
          try {
            const legacyRun = await fetchLegacyLatestWorkflowRun(workflow.id);
            if (active) {
              setCurrentLaunch(normalizeWorkflowLaunch(legacyRun, selectedTargetId, targets));
              setLatestRunError(null);
            }
            return;
          } catch {
            setCurrentLaunch(null);
            setCurrentRun(null);
            setLatestRunError(null);
            return;
          }
        }

        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load the latest workflow launch right now.";
        setLatestRunError(message);
        toast.error("Failed to load latest workflow launch", {
          description: message
        });
      });

    return () => {
      active = false;
    };
  }, [selectedTargetId, targets, workflow]);

  useEffect(() => {
    if (!selectedLaunchRun?.runId) {
      setCurrentRun(null);
      setLiveModelOutput(null);
      setPersistedTranscript(null);
      setPersistedAttackPaths(null);
      setWorkflowEvaluation(null);
      setTranscriptError(null);
      return;
    }

    let active = true;
    void fetchWorkflowRun(selectedLaunchRun.runId)
      .then((run) => {
        if (active) {
          setCurrentRun(run);
          setLatestRunError(null);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setCurrentRun(null);
        const message = error instanceof Error ? error.message : "Unable to load the selected workflow run right now.";
        setLatestRunError(message);
        toast.error("Failed to load workflow run", {
          description: message
        });
      });

    return () => {
      active = false;
    };
  }, [selectedLaunchRun?.runId]);

  useEffect(() => {
    if (!currentRun) {
      setWorkflowEvaluation(null);
      return;
    }

    let active = true;
    void fetchJson<WorkflowRunEvaluationResponse>(`${apiRoutes.workflowRuns}/${currentRun.id}/evaluation`)
      .then((evaluation) => {
        if (active) {
          setWorkflowEvaluation(evaluation);
        }
      })
      .catch(() => {
        if (active) {
          setWorkflowEvaluation(null);
        }
      });

    return () => {
      active = false;
    };
  }, [currentRun?.id, currentRun?.status, currentRun?.events.length]);

  useEffect(() => {
    if (!selectedLaunchRun?.runId || !isActiveWorkflowRunStatus(selectedLaunchRun.status)) {
      return;
    }

    let active = true;
    const refreshRun = () => {
      void fetchWorkflowRun(selectedLaunchRun.runId)
        .then((run) => {
          if (!active) {
            return;
          }

          const latestEvent = run.events.at(-1);
          setCurrentRun(run);
          setCurrentLaunch((current) => updateLaunchWithRun(
            current,
            toLaunchRunUpdate(run, latestEvent?.summary ?? latestEvent?.detail ?? null)
          ));
          if (!isActiveWorkflowRunStatus(run.status)) {
            setStreamError(null);
          }
        })
        .catch((error) => {
          if (!active) {
            return;
          }

          setLatestRunError(error instanceof Error ? error.message : "Unable to refresh the workflow run right now.");
        });
    };

    refreshRun();
    const interval = window.setInterval(refreshRun, ACTIVE_RUN_POLL_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedLaunchRun?.runId, selectedLaunchRun?.status]);

  useEffect(() => {
    if (runningRunIds.length === 0) {
      setRunStreamState("idle");
      setStreamError(null);
      setLiveModelOutput(null);
      return;
    }

    const streamEntries = runningRunIds.map((runId) => ({
      runId,
      eventSource: new EventSource(`${apiRoutes.workflowRuns}/${runId}/events`)
    }));
    setRunStreamState("connecting");

    for (const { runId, eventSource } of streamEntries) {
      eventSource.onopen = () => {
        setRunStreamState("connected");
        setStreamError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as WorkflowRunStreamMessage;
          if (payload.type === "snapshot") {
            const latestEvent = payload.run.events.at(-1);
            setCurrentLaunch((current) => updateLaunchWithRun(
              current,
              toLaunchRunUpdate(payload.run, latestEvent?.summary ?? latestEvent?.detail ?? null)
            ));
            setCurrentRun((current) => current?.id === payload.run.id ? payload.run : current);
          } else {
            setCurrentLaunch((current) => updateLaunchWithRun(
              current,
              toLaunchRunUpdate(payload.run, payload.event.summary ?? payload.event.detail ?? null)
            ));
            setCurrentRun((current) => appendRunEvent(current, payload.run, payload.event));
          }
          setLiveModelOutput((current) => (
            payload.liveModelOutput && !payload.liveModelOutput.final && selectedLaunchRun?.runId === payload.run.id
              ? payload.liveModelOutput
              : current
          ));
          setStreamError(null);
        } catch {
          setRunStreamState("disconnected");
          setStreamError("Received an invalid workflow stream event.");
        }
      };

      eventSource.onerror = () => {
        setRunStreamState("disconnected");
        void fetchWorkflowRun(runId)
          .then((run) => {
            const latestEvent = run.events.at(-1);
            setCurrentLaunch((current) => updateLaunchWithRun(
              current,
              toLaunchRunUpdate(run, latestEvent?.summary ?? latestEvent?.detail ?? null)
            ));
            setCurrentRun((current) => current?.id === run.id ? run : current);
            if (isActiveWorkflowRunStatus(run.status)) {
              setStreamError("Live updates disconnected. Polling will keep the workflow history up to date.");
              return;
            }

            setStreamError(null);
          })
          .catch(() => {
            setStreamError("Live updates disconnected. Polling will keep the workflow history up to date.");
          });
      };
    }

    return () => {
      for (const { eventSource } of streamEntries) {
        eventSource.close();
      }
    };
  }, [runningRunIdsKey, selectedLaunchRun?.runId]);

  useEffect(() => {
    if (!currentRun) {
      setLiveModelOutput(null);
      setPersistedTranscript(null);
      setPersistedAttackPaths(null);
      setTranscriptError(null);
      return;
    }

    setLiveModelOutput((existing) => (
      isActiveWorkflowRunStatus(currentRun.status) && existing?.runId === currentRun.id
        ? existing
        : null
    ));
  }, [currentRun?.id, currentRun?.status]);

  useEffect(() => {
    if (!currentRun || isActiveWorkflowRunStatus(currentRun.status)) {
      setPersistedTranscript(null);
      setPersistedAttackPaths(null);
      setTranscriptError(null);
      return;
    }

    let active = true;
    void fetchJson<WorkflowRunTranscriptResponse>(`${apiRoutes.workflowRuns}/${currentRun.id}/transcript`)
      .then((payload) => {
        if (active) {
          setPersistedTranscript(payload.transcript);
          setPersistedAttackPaths(payload.attackPaths);
          setTranscriptError(null);
        }
      })
      .catch((error) => {
        if (active) {
          setPersistedTranscript(null);
          setPersistedAttackPaths(null);
          const message = error instanceof Error ? error.message : "Unable to load the finalized workflow transcript right now.";
          setTranscriptError(message);
          toast.error("Failed to load workflow transcript", {
            description: message
          });
        }
      });

    return () => {
      active = false;
    };
  }, [currentRun?.id, currentRun?.status]);

  async function startRun(preRunEvidenceMode: WorkflowPreRunEvidenceMode = "inherit") {
    if (!workflow) {
      return;
    }

    const runnableTargets = targets.filter((item) => Boolean(item.baseUrl?.trim()));
    if (runnableTargets.length === 0) {
      toast.error("No runnable targets", {
        description: "At least one target with a base URL is required before this workflow can run."
      });
      return;
    }

    const targetId = selectedTargetId
      ?? runnableTargets[0]?.id
      ?? null;
    if (!targetId) {
      toast.error("No runnable target selected", {
        description: "Select a target before starting this workflow."
      });
      return;
    }

    setRunPending(true);
    setLatestRunError(null);
    setTranscriptError(null);
    setStreamError(null);
    try {
      const launchPayload = await fetchJson<WorkflowLaunch | WorkflowRun>(`${apiRoutes.workflows}/${workflow.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId,
          ...(preRunEvidenceMode === "inherit"
            ? {}
            : { preRunEvidenceEnabled: preRunEvidenceMode === "enabled" })
        })
      });
      setCurrentLaunch(normalizeWorkflowLaunch(launchPayload, selectedTargetId, targets));
      toast.success("Workflow launch started");
    } catch (error) {
      toast.error("Failed to start workflow launch", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setRunPending(false);
    }
  }

  async function cancelRun() {
    if (!currentRun || currentRun.status !== "running") {
      return;
    }

    setCancelPending(true);
    setLatestRunError(null);
    try {
      const run = await fetchJson<WorkflowRun>(`${apiRoutes.workflowRuns}/${currentRun.id}/cancel`, {
        method: "POST"
      });
      const latestEvent = run.events.at(-1);
      setCurrentRun(run);
      setCurrentLaunch((current) => updateLaunchWithRun(
        current,
        toLaunchRunUpdate(run, latestEvent?.summary ?? latestEvent?.detail ?? null)
      ));
      setLiveModelOutput(null);
      toast.success("Workflow run canceled");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to cancel the workflow run.";
      setLatestRunError(message);
      toast.error("Failed to cancel workflow run", {
        description: message
      });
    } finally {
      setCancelPending(false);
    }
  }

  return {
    currentLaunch,
    currentRun,
    liveModelOutput,
    runPending,
    cancelPending,
    persistedTranscript,
    persistedAttackPaths,
    workflowEvaluation,
    latestRunError,
    transcriptError,
    streamError,
    startRun,
    cancelRun
  };
}
