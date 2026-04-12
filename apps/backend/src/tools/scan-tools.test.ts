import http from "node:http";
import net from "node:net";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ScanScope } from "@synosec/contracts";

const mockCreateAuditEntry = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

vi.mock("../db/neo4j.js", () => ({
  createAuditEntry: mockCreateAuditEntry
}));

const { ScanToolRunner, isExecutionTargetAllowed, isTargetInScope, parseScanTarget } = await import("./scan-tools.js");

describe("scan tools", () => {
  let httpServer: http.Server;
  let tcpServer: net.Server;
  let httpPort = 0;
  let tcpPort = 0;

  beforeAll(async () => {
    httpServer = http.createServer((request, response) => {
      if (request.url === "/admin") {
        response.writeHead(302, { Location: "/login", Server: "synosec-test" });
        response.end();
        return;
      }

      response.writeHead(200, {
        Server: "synosec-test",
        "X-Powered-By": "vitest"
      });
      response.end("ok");
    });

    tcpServer = net.createServer((socket) => {
      socket.write("SSH-2.0-OpenSSH_9.0\r\n");
      socket.end();
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, "127.0.0.1", () => {
        httpPort = Number((httpServer.address() as net.AddressInfo).port);
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      tcpServer.listen(0, "127.0.0.1", () => {
        tcpPort = Number((tcpServer.address() as net.AddressInfo).port);
        resolve();
      });
    });
  });

  afterAll(async () => {
    await Promise.all([
      new Promise<void>((resolve, reject) => httpServer.close((error) => error ? reject(error) : resolve())),
      new Promise<void>((resolve, reject) => tcpServer.close((error) => error ? reject(error) : resolve()))
    ]);
  });

  it("parses target strings and validates scope", () => {
    expect(parseScanTarget("localhost:8888")).toEqual({
      host: "localhost",
      port: 8888,
      scheme: null
    });
    expect(parseScanTarget("https://example.com:8443")).toEqual({
      host: "example.com",
      port: 8443,
      scheme: "https"
    });

    const scope: ScanScope = {
      targets: ["localhost:8888"],
      exclusions: [],
      layers: ["L3", "L4", "L7"],
      maxDepth: 2,
      maxDurationMinutes: 5,
      rateLimitRps: 5,
      allowActiveExploits: false,
      graceEnabled: true,
      graceRoundInterval: 3,
      cyberRangeMode: "simulation" as const
    };

    expect(isTargetInScope("localhost", scope)).toBe(true);
    expect(isTargetInScope("10.0.0.5", scope)).toBe(false);
  });

  it("checks TCP ports and grabs banners", async () => {
    const tools = new ScanToolRunner({
      scanId: "scan-1",
      scope: {
        targets: [`127.0.0.1:${tcpPort}`],
        exclusions: [],
        layers: ["L3", "L4", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation" as const
      },
      actor: "test-agent",
      targetNodeId: "node-1"
    });

    const portCheck = await tools.checkTcpPort("127.0.0.1", tcpPort);
    const banner = await tools.grabTcpBanner("127.0.0.1", tcpPort);

    expect(portCheck.open).toBe(true);
    expect(banner.banner).toContain("SSH-2.0-OpenSSH_9.0");
  });

  it("fetches HTTP headers and paths for in-scope URLs", async () => {
    const tools = new ScanToolRunner({
      scanId: "scan-2",
      scope: {
        targets: [`127.0.0.1:${httpPort}`],
        exclusions: [],
        layers: ["L3", "L4", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation" as const
      },
      actor: "test-agent",
      targetNodeId: "node-2"
    });

    const headers = await tools.fetchHttpHeaders(`http://127.0.0.1:${httpPort}`);
    const admin = await tools.fetchHttpPath(`http://127.0.0.1:${httpPort}`, "/admin");

    expect(headers.statusCode).toBe(200);
    expect(headers.headers["server"]).toBe("synosec-test");
    expect(admin.statusCode).toBe(302);
  });

  it("rejects out-of-scope tool execution", async () => {
    const tools = new ScanToolRunner({
      scanId: "scan-3",
      scope: {
        targets: ["localhost:9999"],
        exclusions: [],
        layers: ["L3", "L4", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation" as const
      },
      actor: "test-agent",
      targetNodeId: "node-3"
    });

    await expect(tools.fetchHttpHeaders("http://example.com")).rejects.toThrow(/out of scope/i);
  });

  it("allows demo target aliases for execution without widening scope", () => {
    expect(
      isExecutionTargetAllowed("localhost:8888", {
        targets: ["synosec-target:8888"],
        exclusions: [],
        layers: ["L4", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation" as const
      })
    ).toBe(true);
    expect(
      isExecutionTargetAllowed("example.com:8888", {
        targets: ["synosec-target:8888"],
        exclusions: [],
        layers: ["L4", "L7"],
        maxDepth: 2,
        maxDurationMinutes: 5,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation" as const
      })
    ).toBe(false);
  });
});
