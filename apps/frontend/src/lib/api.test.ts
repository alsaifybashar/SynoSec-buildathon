import { describe, expect, it, vi, afterEach } from "vitest";
import { ApiError, fetchJson } from "@/lib/api";

describe("fetchJson", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses resource-aware defaults for not found responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));

    await expect(fetchJson("/api/ai-tools/tool-1")).rejects.toMatchObject({
      name: "ApiError",
      message: "AI tool not found.",
      status: 404
    });
  });

  it("maps known backend codes to standardized AI tool errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "AI_TOOL_EXECUTION_CONFIG_MISSING",
      message: "Error: legacy row blew up\n    at mapToolExecutionFields (/tmp/file.ts:10:3)",
      userFriendlyMessage: "This AI tool is missing required execution settings."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })));

    await expect(fetchJson("/api/ai-tools")).rejects.toMatchObject({
      name: "ApiError",
      message: "This AI tool is missing required execution settings.",
      status: 500,
      code: "AI_TOOL_EXECUTION_CONFIG_MISSING"
    });
  });

  it("falls back when the backend does not set a user-friendly message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "VALIDATION_ERROR",
      message: "Name is required."
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    })));

    await expect(fetchJson("/api/ai-tools", { method: "POST" })).rejects.toMatchObject({
      name: "ApiError",
      message: "Unable to create AI tool. Check the submitted data and try again.",
      status: 400,
      code: "VALIDATION_ERROR"
    });
  });

  it("ignores unexpected backend messages when there is no known frontend mapping", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "REQUEST_ERROR",
      message: "TypeError: Cannot read properties of undefined (reading stack)"
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })));

    await expect(fetchJson("/api/ai-tools/tool-1/run", { method: "POST" })).rejects.toMatchObject({
      name: "ApiError",
      message: "Unable to run AI tool right now.",
      status: 500,
      code: "REQUEST_ERROR"
    });
  });

  it("uses the backend user-friendly message when it is explicitly provided", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "AI_TOOL_INPUT_MISSING",
      message: "Missing required tool input: baseUrl.",
      userFriendlyMessage: "Required AI tool input is missing."
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" }
    })));

    await expect(fetchJson("/api/ai-tools/tool-1/run", { method: "POST" })).rejects.toMatchObject({
      name: "ApiError",
      message: "Required AI tool input is missing.",
      status: 400,
      code: "AI_TOOL_INPUT_MISSING"
    });
  });

  it("falls back to generic action messages when the response is not JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>boom</html>", {
      status: 500,
      headers: { "Content-Type": "text/html" }
    })));

    await expect(fetchJson("/api/workflows/workflow-1/runs", { method: "POST" })).rejects.toMatchObject({
      name: "ApiError",
      message: "Unable to start workflow run right now.",
      status: 500
    });
  });

  it("surfaces safe backend messages for workflow step failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "INTERNAL_ERROR",
      message: "Workflow stage provider not found."
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    })));

    await expect(fetchJson("/api/workflow-runs/run-1/step", { method: "POST" })).rejects.toMatchObject({
      name: "ApiError",
      message: "Workflow stage provider not found.",
      status: 500,
      code: "INTERNAL_ERROR"
    });
  });
});
