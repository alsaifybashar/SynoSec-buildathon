import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiRoutes, type Target, type Workflow, type WorkflowLiveModelOutput, type WorkflowRun, type WorkflowRunStreamMessage, type WorkflowRunTranscriptResponse } from "@synosec/contracts";
import { fetchJson } from "@/shared/lib/api";
import { type RunStreamState, type TranscriptProjection } from "@/features/workflows/workflow-trace";

async function fetchLatestWorkflowRun(workflowId: string) {
  return fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflowId}/runs/latest`);
}

export function useWorkflowRunState({
  workflow,
  targets
}: {
  workflow: Workflow | null;
  targets: Target[];
}) {
  const [currentRun, setCurrentRun] = useState<WorkflowRun | null>(null);
  const [liveModelOutput, setLiveModelOutput] = useState<WorkflowLiveModelOutput | null>(null);
  const [runPending, setRunPending] = useState(false);
  const [, setRunStreamState] = useState<RunStreamState>("idle");
  const [persistedTranscript, setPersistedTranscript] = useState<TranscriptProjection | null>(null);
  const [latestRunError, setLatestRunError] = useState<string | null>(null);
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [selectedTargetAssetId, setSelectedTargetAssetId] = useState("");

  useEffect(() => {
    if (!workflow) {
      setSelectedTargetAssetId("");
      return;
    }

    const targetRecord = targets.find((item) => item.id === workflow.targetId);
    const targetAssets = targetRecord?.targetAssets ?? [];
    const defaultTarget = targetAssets.find((asset) => asset.isDefault) ?? targetAssets[0];
    setSelectedTargetAssetId((current) => (
      current && targetAssets.some((asset) => asset.id === current)
        ? current
        : defaultTarget?.id ?? ""
    ));
  }, [targets, workflow]);

  useEffect(() => {
    if (!workflow) {
      setCurrentRun(null);
      setLiveModelOutput(null);
      setLatestRunError(null);
      return;
    }

    let active = true;

    fetchLatestWorkflowRun(workflow.id)
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
        if (typeof error === "object" && error !== null && "status" in error && error.status === 404) {
          setLatestRunError(null);
          return;
        }

        const message = error instanceof Error ? error.message : "Unable to load the latest workflow run right now.";
        setLatestRunError(message);
        toast.error("Failed to load latest workflow run", {
          description: message
        });
      });

    return () => {
      active = false;
    };
  }, [workflow]);

  useEffect(() => {
    if (!currentRun || currentRun.status !== "running") {
      setRunStreamState("idle");
      setStreamError(null);
      setLiveModelOutput(null);
      return;
    }

    const eventSource = new EventSource(`${apiRoutes.workflowRuns}/${currentRun.id}/events`);
    setRunStreamState("connecting");

    eventSource.onopen = () => {
      setRunStreamState("connected");
      setStreamError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as WorkflowRunStreamMessage;
        setCurrentRun(payload.run);
        setLiveModelOutput(payload.liveModelOutput && !payload.liveModelOutput.final ? payload.liveModelOutput : null);
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

    return () => {
      eventSource.close();
    };
  }, [currentRun?.id, currentRun?.status]);

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

    const targetRecord = targets.find((item) => item.id === workflow.targetId);
    const targetAssets = targetRecord?.targetAssets ?? [];
    if (targetAssets.length === 0) {
      toast.error("No registered targets", {
        description: "This target needs at least one registered target asset before a workflow can run."
      });
      return;
    }

    setRunPending(true);
    setLatestRunError(null);
    setTranscriptError(null);
    setStreamError(null);
    try {
      const run = await fetchJson<WorkflowRun>(`${apiRoutes.workflows}/${workflow.id}/runs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedTargetAssetId ? { targetAssetId: selectedTargetAssetId } : {})
      });
      setCurrentRun(run);
      toast.success("Workflow run started");
    } catch (error) {
      toast.error("Failed to start workflow run", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setRunPending(false);
    }
  }

  return {
    currentRun,
    liveModelOutput,
    runPending,
    persistedTranscript,
    latestRunError,
    transcriptError,
    streamError,
    selectedTargetAssetId,
    setSelectedTargetAssetId,
    startRun
  };
}
