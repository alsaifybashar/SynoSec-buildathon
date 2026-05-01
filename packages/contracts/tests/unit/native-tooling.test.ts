import { describe, expect, it } from "vitest";
import {
  evaluateConnectorToolSupport,
  toolRequestSchema
} from "../../src/index.js";

describe("native tool contracts", () => {
  it("accepts native tool requests with connector action batches", () => {
    const result = toolRequestSchema.safeParse({
      toolId: "native-auth-login-probe",
      tool: "Login Security Probe",
      executorType: "native-ts",
      capabilities: ["auth", "login"],
      target: "example.com",
      layer: "L7",
      riskTier: "active",
      justification: "Probe the login flow.",
      sandboxProfile: "active-recon",
      privilegeProfile: "active-network",
      parameters: {
        commandPreview: "native-auth-login-probe POST /login x12 bounded requests",
        toolInput: {
          targetUrl: "https://example.com",
          targetKind: "app-base",
          requestEncoding: "json",
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
        },
        actionBatch: {
          actions: [{
            kind: "http_request",
            id: "preflight-1",
            url: "https://example.com/auth/bootstrap",
            method: "GET",
            headers: {},
            query: {},
            timeoutMs: 2500,
            maxResponseBytes: 32768,
            followRedirects: true,
            captureBody: true,
            captureHeaders: true,
            delayMs: 0,
            responseBindings: [{
              name: "cookie.sessionid",
              source: "header",
              headerName: "set-cookie",
              pattern: "sessionid=([^;]+)",
              groupIndex: 1,
              required: true
            }]
          }, {
            kind: "http_request",
            id: "rate-limit-1",
            url: "https://example.com/login",
            method: "POST",
            headers: { cookie: "sessionid={{cookie.sessionid}}" },
            query: {},
            jsonBody: {
              username: "admin",
              password: "wrong-password-0",
              csrf: "{{csrf.token}}"
            },
            timeoutMs: 2500,
            maxResponseBytes: 32768,
            followRedirects: true,
            captureBody: true,
            captureHeaders: true,
            delayMs: 100,
            responseBindings: []
          }]
        }
      }
    });

    expect(result.success).toBe(true);
  });

  it("evaluates native connector support by action kind instead of bash source", () => {
    const supported = evaluateConnectorToolSupport({
      toolId: "native-auth-login-probe",
      tool: "Login Security Probe",
      executorType: "native-ts",
      capabilities: ["auth", "login"],
      sandboxProfile: "active-recon",
      privilegeProfile: "active-network",
      parameters: {
        commandPreview: "native-auth-login-probe POST /login x12 bounded requests",
        toolInput: { targetUrl: "https://example.com", targetKind: "app-base" },
        actionBatch: {
          actions: [{
            kind: "http_request",
            id: "rate-limit-1",
            url: "https://example.com/login",
            method: "POST",
            headers: {},
            query: {},
            formBody: {
              username: "admin",
              password: "wrong-password-0"
            },
            timeoutMs: 2500,
            maxResponseBytes: 32768,
            followRedirects: true,
            captureBody: true,
            captureHeaders: true
          }]
        }
      }
    }, {
      allowedCapabilities: ["auth", "login"],
      allowedSandboxProfiles: ["active-recon"],
      allowedPrivilegeProfiles: ["active-network"],
      installedBinaries: []
    });

    expect(supported.supported).toBe(true);
    expect(supported.requiredBinaries).toEqual([]);
  });
});
