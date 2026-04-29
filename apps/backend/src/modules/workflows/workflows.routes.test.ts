import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import type { WorkflowRunEvaluationResponse } from "@synosec/contracts";
import { createErrorHandler } from "@/shared/http/error-handler.js";
import { registerWorkflowsRoutes } from "./workflows.routes.js";

const evaluationResponse: WorkflowRunEvaluationResponse = {
  status: "available",
  runId: "60000000-0000-0000-0000-000000000001",
  targetPack: "vulnerable-app",
  score: 84,
  label: "84 / 100",
  summary: "Matched most documented expectations.",
  subscores: [{ key: "run-status", label: "Run status", score: 20, maxScore: 20 }],
  explanation: ["Run completed successfully."],
  matchedExpectations: [{ key: "admin", label: "Admin path", met: true, evidence: ["/admin"] }],
  unmetExpectations: []
};

function createTestApp() {
  const app = express();
  app.use(express.json());

  const evaluateRun = vi.fn().mockResolvedValue(evaluationResponse);

  registerWorkflowsRoutes(
    app,
    {
      list: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      getLatestLaunchByWorkflowId: vi.fn(),
      getRunById: vi.fn()
    } as any,
    {
      startRun: vi.fn(),
      cancelRun: vi.fn(),
      stepRun: vi.fn()
    },
    {
      subscribe: vi.fn()
    } as any,
    {
      getFindings: vi.fn(),
      getCoverage: vi.fn(),
      getTranscript: vi.fn(),
      getReport: vi.fn()
    },
    {
      evaluateRun
    } as any
  );

  app.use(createErrorHandler());
  return { app, evaluateRun };
}

describe("registerWorkflowsRoutes", () => {
  it("returns workflow evaluation payloads from the dedicated route", async () => {
    const { app, evaluateRun } = createTestApp();

    const response = await request(app).get("/api/workflow-runs/60000000-0000-0000-0000-000000000001/evaluation");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: "available",
      targetPack: "vulnerable-app",
      score: 84,
      label: "84 / 100"
    });
    expect(evaluateRun).toHaveBeenCalledWith("60000000-0000-0000-0000-000000000001");
  });
});
