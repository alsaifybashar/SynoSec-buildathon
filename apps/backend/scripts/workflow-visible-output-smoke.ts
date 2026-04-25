import { config as loadEnv } from "dotenv";
import { createAnthropic } from "@ai-sdk/anthropic";
import { stepCountIs, streamText, tool } from "ai";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const scriptDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(scriptDir, "../.env") });
loadEnv({ path: resolve(scriptDir, "../../../.env"), override: false });

const apiKey = process.env["ANTHROPIC_API_KEY"]?.trim();
if (!apiKey) {
  throw new Error("ANTHROPIC_API_KEY is required for apps/backend/scripts/workflow-visible-output-smoke.ts");
}

const modelName = process.env["CLAUDE_MODEL"]?.trim() || "claude-sonnet-4-6";
const anthropic = createAnthropic({ apiKey });

type CapturedPart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | { type: "tool-call"; toolName: string; input: unknown }
  | { type: "tool-result"; toolName: string; output: unknown }
  | { type: "finish"; finishReason: string };

const capturedParts: CapturedPart[] = [];

const result = streamText({
  model: anthropic(modelName),
  system: [
    "You are validating a workflow UI stream.",
    "Call log_progress before any evidence tool call, and again after any meaningful result.",
    "Keep each log_progress message short, operator-visible, and action-oriented.",
    "Do not expose private chain-of-thought. Provide concise action-oriented progress notes only."
  ].join("\n\n"),
  prompt: [
    "Target URL: https://example.com",
    "Call log_progress first with one short sentence explaining the next check.",
    "Then call the probe_target tool exactly once.",
    "After probe_target returns, call log_progress once more with one short conclusion.",
    "Use baseUrl https://example.com and a short reason.",
    "After the second log_progress call, stop without calling any other tools."
  ].join("\n"),
  tools: {
    log_progress: tool({
      description: "Persist one short operator-visible progress update for the workflow transcript. Use this before tool calls and after meaningful results.",
      inputSchema: z.object({
        message: z.string().min(1).max(400)
      }),
      execute: async (input) => ({
        accepted: true,
        message: input.message
      })
    }),
    probe_target: tool({
      description: "Fake target probe used to verify that visible text and tool calls both stream through the provider.",
      inputSchema: z.object({
        baseUrl: z.string().url(),
        reason: z.string().min(1)
      }),
      execute: async (input) => ({
        ok: true,
        baseUrl: input.baseUrl,
        summary: "Probe succeeded with mock evidence."
      })
    })
  },
  stopWhen: stepCountIs(4)
});

for await (const rawPart of result.fullStream) {
  const part = rawPart as {
    type: string;
    text?: string;
    toolName?: string;
    input?: unknown;
    output?: unknown;
    finishReason?: string;
  };

  if (part.type === "text" && typeof part.text === "string") {
    capturedParts.push({ type: "text", text: part.text });
    continue;
  }

  if (part.type === "reasoning" && typeof part.text === "string") {
    capturedParts.push({ type: "reasoning", text: part.text });
    continue;
  }

  if (part.type === "tool-call" && typeof part.toolName === "string") {
    capturedParts.push({ type: "tool-call", toolName: part.toolName, input: part.input });
    continue;
  }

  if (part.type === "tool-result" && typeof part.toolName === "string") {
    capturedParts.push({ type: "tool-result", toolName: part.toolName, output: part.output });
    continue;
  }

  if (part.type === "finish") {
    capturedParts.push({
      type: "finish",
      finishReason: typeof part.finishReason === "string" ? part.finishReason : "unknown"
    });
  }
}

const firstToolCallIndex = capturedParts.findIndex((part) => part.type === "tool-call");
const firstProgressCallIndex = capturedParts.findIndex((part) => part.type === "tool-call" && part.toolName === "log_progress");
const firstProbeCallIndex = capturedParts.findIndex((part) => part.type === "tool-call" && part.toolName === "probe_target");
const progressMessages = capturedParts
  .filter((part): part is Extract<CapturedPart, { type: "tool-call" }> => part.type === "tool-call" && part.toolName === "log_progress")
  .map((part) => {
    if (!part.input || typeof part.input !== "object" || Array.isArray(part.input)) {
      return null;
    }

    const message = (part.input as Record<string, unknown>)["message"];
    return typeof message === "string" ? message : null;
  })
  .filter((message): message is string => Boolean(message));

if (firstToolCallIndex === -1) {
  throw new Error(`Provider returned no tool-call part. Captured parts: ${JSON.stringify(capturedParts, null, 2)}`);
}

if (firstProgressCallIndex === -1) {
  throw new Error(`Provider returned no log_progress call. Captured parts: ${JSON.stringify(capturedParts, null, 2)}`);
}

if (firstProbeCallIndex === -1) {
  throw new Error(`Provider returned no probe_target call. Captured parts: ${JSON.stringify(capturedParts, null, 2)}`);
}

if (firstProgressCallIndex > firstProbeCallIndex) {
  throw new Error(`First log_progress call arrived after the probe_target call. Captured parts: ${JSON.stringify(capturedParts, null, 2)}`);
}

console.log(JSON.stringify({
  provider: "anthropic",
  model: modelName,
  firstProgressCallIndex,
  firstProbeCallIndex,
  firstToolCallIndex,
  progressMessages,
  capturedParts
}, null, 2));
