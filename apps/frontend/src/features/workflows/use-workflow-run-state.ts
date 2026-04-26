import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  apiRoutes,
  type Target,
  type Workflow,
  type WorkflowLaunch,
  type WorkflowLiveModelOutput,
  type WorkflowRun,
  type WorkflowRunStreamMessage,
  type WorkflowRunTranscriptResponse
} from "@synosec/contracts";
import { fetchJson } from "@/shared/lib/api";
import { type RunStreamState, type TranscriptProjection } from "@/features/workflows/workflow-trace";

async function fetchLatestWorkflowLaunch(workflowId: string) {
  return fetchJson<WorkflowLaunch | WorkflowRun>(`${apiRoutes.workflows}/${workflowId}/launches/latest`);
}

async function fetchWorkflowRun(runId: string) {
  return fetchJson<WorkflowRun>(`${apiRoutes.workflowRuns}/${runId}`);
}

async function fetchLegacyLatestWorkflowRun(workflowId: string) {
  return fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflowId}/runs/latest`);
}

function normalizeWorkflowLaunch(
  payload: WorkflowLaunch | WorkflowRun,
  selectedTargetId: string | null,
  targets: Target[]
): WorkflowLaunch {
  if ("runs" in payload && Array.isArray(payload.runs)) {
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

function updateLaunchWithRun(current: WorkflowLaunch | null, run: WorkflowRun): WorkflowLaunch | null {
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
            ? (run.events.at(-1)?.summary ?? run.events.at(-1)?.detail ?? "Workflow run failed.")
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
  const [, setRunStreamState] = useState<RunStreamState>("idle");
  const [persistedTranscript, setPersistedTranscript] = useState<TranscriptProjection | null>(null);
  const [latestRunError, setLatestRunError] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const launchRuns = Array.isArray(currentLaunch?.runs) ? currentLaunch.runs : [];

  const selectedLaunchRun = useMemo(
    () => launchRuns.find((entry) => entry.targetId === selectedTargetId) ?? null,
    [launchRuns, selectedTargetId]
  );

  useEffect(() => {
    if (!workflow) {
      setCurrentLaunch(null);
      setCurrentRun(null);
      setLiveModelOutput(null);
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
    const runningRunIds = launchRuns
      .filter((entry) => entry.status === "running")
      .map((entry) => entry.runId);

    if (runningRunIds.length === 0) {
      setRunStreamState("idle");
      setStreamError(null);
      setLiveModelOutput(null);
      return;
    }

    const eventSources = runningRunIds.map((runId) => new EventSource(`${apiRoutes.workflowRuns}/${runId}/events`));
    setRunStreamState("connecting");

    for (const eventSource of eventSources) {
      eventSource.onopen = () => {
        setRunStreamState("connected");
        setStreamError(null);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as WorkflowRunStreamMessage;
          setCurrentLaunch((current) => updateLaunchWithRun(current, payload.run));
          setCurrentRun((current) => current?.id === payload.run.id ? payload.run : current);
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
        setStreamError("Live workflow stream disconnected. Reload the page or start a fresh run if updates stop.");
      };
    }

    return () => {
      for (const eventSource of eventSources) {
        eventSource.close();
      }
    };
  }, [launchRuns, selectedLaunchRun?.runId]);

  useEffect(() => {
    if (!currentRun) {
      setLiveModelOutput(null);
      setPersistedTranscript(null);
      setTranscriptError(null);
      return;
    }

    setLiveModelOutput((existing) => (
      currentRun.status === "running" && existing?.runId === currentRun.id
        ? existing
        : null
    ));
  }, [currentRun?.id, currentRun?.status]);

  useEffect(() => {
    if (!currentRun || currentRun.status === "running") {
      setPersistedTranscript(null);
      setTranscriptError(null);
      return;
    }

    let active = true;
    void fetchJson<WorkflowRunTranscriptResponse>(`${apiRoutes.workflowRuns}/${currentRun.id}/transcript`)
      .then((payload) => {
        if (active) {
          setPersistedTranscript(payload.transcript);
          setTranscriptError(null);
        }
      })
      .catch((error) => {
        if (active) {
          setPersistedTranscript(null);
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

  async function startRun() {
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

    setRunPending(true);
    setLatestRunError(null);
    setTranscriptError(null);
    setStreamError(null);
    try {
      const launchPayload = await fetchJson<WorkflowLaunch | WorkflowRun>(`${apiRoutes.workflows}/${workflow.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
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

  return {
    currentLaunch,
    currentRun,
    liveModelOutput,
    runPending,
    persistedTranscript,
    latestRunError,
    transcriptError,
    streamError,
    startRun
  };
}
