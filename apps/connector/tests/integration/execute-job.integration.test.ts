import { createServer } from "node:http";
import { once } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import { executeSandboxedConnectorJob } from "../../src/sandbox/execute-job.js";
import { buildConnectorExecutionJob } from "../fixtures/builders/connector-job.js";

const servers: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(servers.map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  })));
  servers.length = 0;
});

describe("executeSandboxedConnectorJob", () => {
  it("runs a structured connector script and normalizes observations", async () => {
    const result = await executeSandboxedConnectorJob(
      buildConnectorExecutionJob({
        request: {
          ...buildConnectorExecutionJob().request,
          parameters: {
            bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"hello\",\"observations\":[{\"key\":\"structured-echo\",\"title\":\"Structured echo\",\"summary\":\"Structured echo completed.\",\"severity\":\"info\",\"confidence\":0.5,\"evidence\":\"hello\",\"technique\":\"test\"}]}'",
            commandPreview: "structured-echo",
            toolInput: {}
          }
        }
      }),
      {
        allowedCapabilities: ["web-recon"],
        allowedSandboxProfiles: ["network-recon"],
        allowedPrivilegeProfiles: ["read-only-network"],
        installedBinaries: []
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.output).toBe("hello");
    expect(result.observations[0]).toMatchObject({
      toolRunId: "tool-run-1",
      tool: "Structured Echo",
      key: "structured-echo"
    });
  });

  it("executes native http_request batches and returns raw action results", async () => {
    const server = createServer((request, response) => {
      response.writeHead(200, {
        "content-type": "text/plain",
        "x-synosec-test": "ok"
      });
      response.end(`method=${request.method}`);
    });
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP address");
    }

    const result = await executeSandboxedConnectorJob(
      buildConnectorExecutionJob({
        toolRun: {
          ...buildConnectorExecutionJob().toolRun,
          tool: "Legacy Auth Probe",
          toolId: "native-auth-flow-probe",
          executorType: "native-ts"
        },
        request: {
          ...buildConnectorExecutionJob().request,
          tool: "Legacy Auth Probe",
          toolId: "native-auth-flow-probe",
          executorType: "native-ts",
          capabilities: ["auth", "login"],
          sandboxProfile: "active-recon",
          privilegeProfile: "active-network",
          parameters: {
            commandPreview: "native-auth-flow-probe POST /login x1 bounded requests",
            toolInput: { baseUrl: `http://127.0.0.1:${address.port}` },
            actionBatch: {
              actions: [{
                kind: "http_request",
                id: "rate-limit-1",
                url: `http://127.0.0.1:${address.port}/login`,
                method: "POST",
                headers: {},
                query: {},
                formBody: { username: "admin", password: "wrong-password-0" },
                timeoutMs: 2500,
                maxResponseBytes: 32768,
                followRedirects: true,
                captureBody: true,
                captureHeaders: true
              }]
            }
          }
        }
      }),
      {
        allowedCapabilities: ["auth", "login"],
        allowedSandboxProfiles: ["active-recon"],
        allowedPrivilegeProfiles: ["active-network"],
        installedBinaries: []
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.observations).toEqual([]);
    expect(result.actionResults).toEqual([
      expect.objectContaining({
        actionId: "rate-limit-1",
        statusCode: 200,
        body: "method=POST"
      })
    ]);
  });

  it("applies response bindings between native http_request actions", async () => {
    const server = createServer(async (request, response) => {
      if (request.url?.startsWith("/bootstrap")) {
        response.writeHead(200, {
          "content-type": "text/plain",
          "set-cookie": "sessionid=seeded-session; Path=/"
        });
        response.end("csrf=csrf-seed");
        return;
      }

      let body = "";
      for await (const chunk of request) {
        body += chunk.toString();
      }
      response.writeHead(200, { "content-type": "text/plain" });
      response.end(JSON.stringify({
        cookie: request.headers.cookie,
        body
      }));
    });
    servers.push(server);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected TCP address");
    }

    const result = await executeSandboxedConnectorJob(
      buildConnectorExecutionJob({
        toolRun: {
          ...buildConnectorExecutionJob().toolRun,
          tool: "Login Security Probe",
          toolId: "native-auth-login-probe",
          executorType: "native-ts"
        },
        request: {
          ...buildConnectorExecutionJob().request,
          tool: "Login Security Probe",
          toolId: "native-auth-login-probe",
          executorType: "native-ts",
          capabilities: ["auth", "login"],
          sandboxProfile: "active-recon",
          privilegeProfile: "active-network",
          parameters: {
            commandPreview: "native-auth-login-probe POST /login x2 bounded requests",
            toolInput: { targetUrl: `http://127.0.0.1:${address.port}` },
            actionBatch: {
              actions: [{
                kind: "http_request",
                id: "preflight-1",
                url: `http://127.0.0.1:${address.port}/bootstrap`,
                method: "GET",
                headers: {},
                query: {},
                timeoutMs: 2500,
                maxResponseBytes: 32768,
                followRedirects: true,
                captureBody: true,
                captureHeaders: true,
                delayMs: 0,
                responseBindings: [
                  {
                    name: "cookie.sessionid",
                    source: "header",
                    headerName: "set-cookie",
                    pattern: "sessionid=([^;]+)",
                    groupIndex: 1,
                    required: true
                  },
                  {
                    name: "csrf.token",
                    source: "body_regex",
                    pattern: "csrf=([a-z-]+)",
                    groupIndex: 1,
                    required: true
                  }
                ]
              }, {
                kind: "http_request",
                id: "login-1",
                url: `http://127.0.0.1:${address.port}/login`,
                method: "POST",
                headers: {
                  cookie: "sessionid={{cookie.sessionid}}"
                },
                query: {},
                jsonBody: {
                  username: "admin",
                  csrf: "{{csrf.token}}"
                },
                timeoutMs: 2500,
                maxResponseBytes: 32768,
                followRedirects: true,
                captureBody: true,
                captureHeaders: true,
                delayMs: 0,
                responseBindings: []
              }]
            }
          }
        }
      }),
      {
        allowedCapabilities: ["auth", "login"],
        allowedSandboxProfiles: ["active-recon"],
        allowedPrivilegeProfiles: ["active-network"],
        installedBinaries: []
      }
    );

    expect(result.exitCode).toBe(0);
    expect(result.actionResults[1]).toEqual(expect.objectContaining({
      actionId: "login-1",
      statusCode: 200
    }));
    expect(result.actionResults[1]?.kind === "http_request" ? result.actionResults[1].body : "").toContain("sessionid=seeded-session");
    expect(result.actionResults[1]?.kind === "http_request" ? result.actionResults[1].body : "").toContain("csrf-seed");
  });
});
