import { describe, expect, it } from "vitest";
import {
  nativeAuthArtifactValidationImplementation,
  nativeAuthFlowProbeImplementation,
  nativeAuthLoginProbeImplementation
} from "@/modules/ai-tools/native-tools/auth-flow-probe.js";

const parseContext = {
  request: {
    toolId: "native-auth-login-probe",
    tool: "Login Security Probe",
    executorType: "native-ts" as const,
    capabilities: ["auth", "login"],
    target: "example.com",
    layer: "L7" as const,
    riskTier: "active" as const,
    justification: "test",
    sandboxProfile: "active-recon" as const,
    privilegeProfile: "active-network" as const,
    parameters: {
      commandPreview: "native-auth-login-probe POST /login x15 bounded requests",
      toolInput: { targetUrl: "https://example.com", targetKind: "app-base" },
      actionBatch: { actions: [] }
    }
  },
  toolRun: {
    id: "tool-run-1",
    scanId: "scan-1",
    tacticId: "tactic-1",
    agentId: "agent-1",
    toolId: "native-auth-login-probe",
    tool: "Login Security Probe",
    executorType: "native-ts" as const,
    capabilities: ["auth", "login"],
    target: "example.com",
    status: "running" as const,
    riskTier: "active" as const,
    justification: "test",
    commandPreview: "native-auth-login-probe POST /login x15 bounded requests",
    dispatchMode: "local" as const,
    startedAt: "2026-04-30T00:00:00.000Z"
  },
  scanId: "scan-1",
  tacticId: "tactic-1"
};

describe("native auth probe implementations", () => {
  it("builds deterministic login probe actions with configurable sample counts", () => {
    const input = nativeAuthLoginProbeImplementation.parseInput({
      targetUrl: "https://example.com/app",
      targetKind: "app-base",
      knownUser: "admin",
      rateLimitAttemptCount: 4,
      oracleSampleCount: 2
    });

    const batch = nativeAuthLoginProbeImplementation.plan(input, {
      tool: nativeAuthLoginProbeImplementation.tool
    });

    expect(batch.actions).toHaveLength(11);
    expect(batch.actions[0]).toMatchObject({
      kind: "http_request",
      id: "rate-limit-1",
      url: "https://example.com/login",
      method: "POST"
    });
    expect(batch.actions[10]).toMatchObject({
      id: "weak-password-3"
    });
  });

  it("supports preflight cookie and csrf bindings for json login flows", () => {
    const input = nativeAuthLoginProbeImplementation.parseInput({
      targetUrl: "https://example.com/custom-login",
      targetKind: "login-endpoint",
      requestEncoding: "json",
      requestHeaders: { "x-client": "synosec" },
      preflightRequest: {
        path: "/auth/bootstrap",
        cookieNames: ["sessionid"]
      },
      csrf: {
        source: "body_regex",
        transport: "field",
        name: "csrf",
        pattern: "csrf=([a-z0-9-]+)"
      }
    });

    const batch = nativeAuthLoginProbeImplementation.plan(input, {
      tool: nativeAuthLoginProbeImplementation.tool
    });

    expect(batch.actions[0]).toMatchObject({
      id: "preflight-1",
      url: "https://example.com/auth/bootstrap",
      responseBindings: [
        expect.objectContaining({ name: "cookie.sessionid", source: "header" }),
        expect.objectContaining({ name: "csrf.token", source: "body_regex" })
      ]
    });
    expect(batch.actions[1]).toMatchObject({
      headers: {
        "x-client": "synosec",
        cookie: "sessionid={{cookie.sessionid}}"
      },
      jsonBody: expect.objectContaining({
        username: "synosec-nonexistent-user",
        csrf: "{{csrf.token}}"
      })
    });
  });

  it("builds repeated baseline validation batches", () => {
    const input = nativeAuthArtifactValidationImplementation.parseInput({
      targetUrl: "https://example.com",
      baselineRepeats: 3,
      artifactValidationTargets: [{
        path: "/session/refresh",
        method: "POST",
        requestEncoding: "json",
        body: { refreshToken: "artifact" }
      }]
    });

    const batch = nativeAuthArtifactValidationImplementation.plan(input, {
      tool: nativeAuthArtifactValidationImplementation.tool
    });

    expect(batch.actions.map((action) => action.id)).toEqual([
      "validation-baseline-1-1",
      "validation-baseline-1-2",
      "validation-baseline-1-3",
      "validation-artifact-1"
    ]);
    expect(batch.actions[3]).toMatchObject({
      jsonBody: { refreshToken: "artifact" }
    });
  });

  it("rejects malformed login probe schema combinations", () => {
    expect(() => nativeAuthLoginProbeImplementation.parseInput({
      targetUrl: "https://example.com",
      targetKind: "app-base",
      csrf: {
        source: "body_regex",
        transport: "field",
        name: "csrf",
        pattern: "csrf=([a-z0-9-]+)"
      }
    })).toThrow(/requires preflightRequest/i);
  });

  it("rejects GET artifact validation targets with a body", () => {
    expect(() => nativeAuthArtifactValidationImplementation.parseInput({
      targetUrl: "https://example.com",
      artifactValidationTargets: [{
        path: "/me",
        method: "GET",
        body: { token: "abc" }
      }]
    })).toThrow(/GET validation targets must not provide body data/i);
  });

  it("detects missing rate limits and weak-password acceptance from raw login probe action results", () => {
    const input = nativeAuthLoginProbeImplementation.parseInput({
      targetUrl: "https://example.com",
      targetKind: "app-base",
      knownUser: "admin"
    });

    const result = nativeAuthLoginProbeImplementation.parse([
      ...Array.from({ length: 6 }, (_, index) => ({
        kind: "http_request" as const,
        actionId: `rate-limit-${index + 1}`,
        ok: false,
        statusCode: 401,
        headers: {},
        body: "invalid credentials",
        durationMs: 20
      })),
      ...Array.from({ length: 3 }, (_, index) => ({
        kind: "http_request" as const,
        actionId: `known-user-${index + 1}`,
        ok: false,
        statusCode: 401,
        headers: {
          "set-cookie": "attempt=known"
        },
        body: "known user invalid password",
        durationMs: 300
      })),
      ...Array.from({ length: 3 }, (_, index) => ({
        kind: "http_request" as const,
        actionId: `unknown-user-${index + 1}`,
        ok: false,
        statusCode: 404,
        headers: {},
        body: "user does not exist",
        durationMs: 20
      })),
      {
        kind: "http_request" as const,
        actionId: "weak-password-1",
        ok: true,
        statusCode: 200,
        headers: {},
        body: "welcome authenticated user",
        durationMs: 10
      },
      ...Array.from({ length: 2 }, (_, index) => ({
        kind: "http_request" as const,
        actionId: `weak-password-${index + 2}`,
        ok: false,
        statusCode: 401,
        headers: {},
        body: "invalid credentials",
        durationMs: 10
      }))
    ], input, parseContext);

    expect(result.exitCode).toBe(0);
    expect(result.observations.map((observation) => observation.key)).toEqual([
      "auth-flow:https://example.com/login:rate-limit",
      "auth-flow:https://example.com/login:oracle",
      "auth-flow:https://example.com/login:weak-password"
    ]);
    expect(result.summary).toContain("accepted candidate password");
  });

  it("fails loudly when a required preflight binding is missing", () => {
    const input = nativeAuthLoginProbeImplementation.parseInput({
      targetUrl: "https://example.com",
      targetKind: "app-base",
      preflightRequest: {
        path: "/login",
        cookieNames: ["sessionid"]
      }
    });

    const result = nativeAuthLoginProbeImplementation.parse([{
      kind: "http_request",
      actionId: "preflight-1",
      ok: true,
      statusCode: 200,
      headers: {},
      body: "ok",
      durationMs: 5,
      networkError: "Required response binding cookie.sessionid was not resolved."
    }], input, parseContext);

    expect(result.exitCode).toBe(64);
    expect(result.statusReason).toContain("preflight");
  });

  it("uses repeated baselines to suppress unstable artifact false positives", () => {
    const input = nativeAuthArtifactValidationImplementation.parseInput({
      targetUrl: "https://example.com",
      baselineRepeats: 2,
      artifactValidationTargets: [{
        path: "/dashboard",
        method: "GET"
      }]
    });

    const result = nativeAuthArtifactValidationImplementation.parse([
      {
        kind: "http_request" as const,
        actionId: "validation-baseline-1-1",
        ok: true,
        statusCode: 200,
        headers: {},
        body: "public dashboard A",
        durationMs: 10
      },
      {
        kind: "http_request" as const,
        actionId: "validation-baseline-1-2",
        ok: true,
        statusCode: 200,
        headers: {},
        body: "public dashboard B",
        durationMs: 10
      },
      {
        kind: "http_request" as const,
        actionId: "validation-artifact-1",
        ok: true,
        statusCode: 200,
        headers: {},
        body: "public dashboard A",
        durationMs: 10
      }
    ], input, {
      ...parseContext,
      request: {
        ...parseContext.request,
        toolId: "native-auth-artifact-validation",
        tool: "Auth Artifact Validator"
      },
      toolRun: {
        ...parseContext.toolRun,
        toolId: "native-auth-artifact-validation",
        tool: "Auth Artifact Validator"
      }
    });

    expect(result.observations).toHaveLength(0);
    expect(result.summary).toContain("baseline behavior was unstable");
  });

  it("uses explicit success hints for artifact validation when configured", () => {
    const input = nativeAuthArtifactValidationImplementation.parseInput({
      targetUrl: "https://example.com",
      artifactValidationTargets: [{
        path: "/dashboard",
        method: "GET",
        headers: { cookie: "session=artifact" },
        successBodyStrings: ["Welcome back"],
        expectedEvidenceStrings: ["Welcome back"]
      }]
    });

    const result = nativeAuthArtifactValidationImplementation.parse([
      {
        kind: "http_request" as const,
        actionId: "validation-baseline-1-1",
        ok: true,
        statusCode: 200,
        headers: {},
        body: "public dashboard",
        durationMs: 10
      },
      {
        kind: "http_request" as const,
        actionId: "validation-baseline-1-2",
        ok: true,
        statusCode: 200,
        headers: {},
        body: "public dashboard",
        durationMs: 10
      },
      {
        kind: "http_request" as const,
        actionId: "validation-artifact-1",
        ok: true,
        statusCode: 200,
        headers: {},
        body: "Welcome back",
        durationMs: 10
      }
    ], input, {
      ...parseContext,
      request: {
        ...parseContext.request,
        toolId: "native-auth-artifact-validation",
        tool: "Auth Artifact Validator"
      },
      toolRun: {
        ...parseContext.toolRun,
        toolId: "native-auth-artifact-validation",
        tool: "Auth Artifact Validator"
      }
    });

    expect(result.observations).toHaveLength(1);
    expect(result.observations[0]?.confidence).toBe(0.93);
    expect(result.observations[0]?.summary).toContain("matched explicit artifact-acceptance success indicators");
  });

  it("keeps the deprecated wrapper delegating both modes", () => {
    const loginInput = nativeAuthFlowProbeImplementation.parseInput({
      mode: "login-probe",
      targetUrl: "https://example.com",
      targetKind: "app-base"
    });
    const artifactInput = nativeAuthFlowProbeImplementation.parseInput({
      mode: "artifact-validation",
      targetUrl: "https://example.com",
      artifactValidationTargets: [{
        path: "/session/refresh",
        method: "POST",
        body: { refreshToken: "artifact" }
      }]
    });

    const loginBatch = nativeAuthFlowProbeImplementation.plan(loginInput, {
      tool: nativeAuthFlowProbeImplementation.tool
    });
    const artifactBatch = nativeAuthFlowProbeImplementation.plan(artifactInput, {
      tool: nativeAuthFlowProbeImplementation.tool
    });

    expect(loginBatch.actions[0]).toMatchObject({
      id: "rate-limit-1",
      url: "https://example.com/login"
    });
    expect(artifactBatch.actions.map((action) => action.id)).toEqual([
      "validation-baseline-1-1",
      "validation-baseline-1-2",
      "validation-artifact-1"
    ]);
  });
});
