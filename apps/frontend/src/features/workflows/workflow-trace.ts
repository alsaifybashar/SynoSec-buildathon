export {
  buildWorkflowTranscript,
  getToolLookup,
  getWorkflowAllowedToolIds,
  type WorkflowFindingsRailItem as FindingsRailItem,
  type WorkflowLiveModelOutput as LiveModelOutput,
  type WorkflowTranscriptAssistantTurnDetail as AssistantTurnDetail,
  type WorkflowTranscriptProjection as TranscriptProjection
} from "@synosec/contracts";

export type RunAction = "starting" | null;
export type RunStreamState = "idle" | "connecting" | "connected" | "disconnected";

export function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not started";
  }

  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
