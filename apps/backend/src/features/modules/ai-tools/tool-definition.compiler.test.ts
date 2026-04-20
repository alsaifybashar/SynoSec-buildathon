import { describe, expect, it } from "vitest";
import type { AiTool } from "@synosec/contracts";
import { compileToolRequestFromDefinition } from "./tool-definition.compiler.js";

const sandboxedTool: AiTool = {
  id: "tool-1",
  name: "HTTP Recon",
  status: "active",
  source: "custom",
  description: "DB-backed recon tool",
  binary: "curl",
  scriptPath: "scripts/tools/http-recon.sh",
  capabilities: ["web-recon"],
  category: "utility",
  riskTier: "passive",
  notes: null,
  executionMode: "sandboxed",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  defaultArgs: ["-I", "{baseUrl}"],
  timeoutMs: 15000,
  inputSchema: { type: "object", properties: { target: { type: "string" } } },
  outputSchema: { type: "object", properties: { headers: { type: "string" } } },
  createdAt: "2026-04-21T12:00:00.000Z",
  updatedAt: "2026-04-21T12:00:00.000Z"
};

describe("tool definition compiler", () => {
  it("compiles a db-backed tool into a sandboxed tool request", () => {
    const result = compileToolRequestFromDefinition(sandboxedTool, {
      target: "example.com",
      layer: "L7",
      justification: "Probe the target from the saved tool definition."
    });

    expect(result).toMatchObject({
      toolId: "tool-1",
      tool: "HTTP Recon",
      scriptPath: "scripts/tools/http-recon.sh",
      capabilities: ["web-recon"],
      target: "example.com",
      sandboxProfile: "network-recon",
      privilegeProfile: "read-only-network"
    });
    expect(result.parameters["scriptPath"]).toBe("scripts/tools/http-recon.sh");
    expect(result.parameters["scriptArgs"]).toEqual(["-I", "http://example.com"]);
    expect(result.parameters["timeoutMs"]).toBe(15000);
  });

  it("rejects tools that are missing sandbox execution policy", () => {
    expect(() =>
      compileToolRequestFromDefinition(
        {
          ...sandboxedTool,
          executionMode: "catalog",
          sandboxProfile: null,
          privilegeProfile: null
        },
        {
          target: "example.com",
          layer: "L7",
          justification: "Probe the target from the saved tool definition."
        }
      )
    ).toThrow(/sandboxed/i);
  });
});
