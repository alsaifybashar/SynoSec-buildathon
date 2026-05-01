import { describe, expect, it } from "vitest";
import { compileToolRequestFromDefinition } from "@/modules/ai-tools/tool-definition.compiler.js";

describe("compileToolRequestFromDefinition", () => {
  it("preserves explicit URL inputs while still injecting the normalized execution target metadata", () => {
    const request = compileToolRequestFromDefinition({
      id: "seed-service-scan",
      name: "Service Scan",
      executorType: "bash",
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
      capabilities: ["network-recon"],
      riskTier: "passive",
      timeoutMs: 30000
    }, {
      target: "localhost",
      port: 8888,
      layer: "L4",
      justification: "test",
      toolInput: {
        target: "http://localhost:8888/"
      }
    });

    expect(request.parameters["toolInput"]).toMatchObject({
      target: "http://localhost:8888/",
      port: 8888,
      baseUrl: "http://localhost:8888/"
    });
  });

  it("uses explicit url input as the compiled baseUrl when baseUrl is absent", () => {
    const request = compileToolRequestFromDefinition({
      id: "seed-dalfox",
      name: "Dalfox",
      executorType: "bash",
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
      capabilities: ["xss"],
      riskTier: "active",
      timeoutMs: 30000
    }, {
      target: "localhost",
      port: 8888,
      layer: "L7",
      justification: "test",
      toolInput: {
        url: "http://localhost:8888/search?q=1"
      }
    });

    expect(request.parameters["toolInput"]).toMatchObject({
      target: "localhost",
      port: 8888,
      url: "http://localhost:8888/search?q=1",
      baseUrl: "http://localhost:8888/search?q=1"
    });
  });

  it("allows tool input timeout override via timeout_ms", () => {
    const request = compileToolRequestFromDefinition({
      id: "seed-agent-bash-command",
      name: "Agent Bash Command",
      executorType: "bash",
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
      capabilities: ["agent-bash-command"],
      riskTier: "active",
      timeoutMs: 30000
    }, {
      target: "localhost",
      layer: "L7",
      justification: "test",
      toolInput: {
        command: "echo hello",
        timeout_ms: 120000
      }
    });

    expect(request.parameters["timeoutMs"]).toBe(120000);
  });

  it("keeps default tool timeout when timeout override is absent", () => {
    const request = compileToolRequestFromDefinition({
      id: "seed-agent-bash-command",
      name: "Agent Bash Command",
      executorType: "bash",
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
      capabilities: ["agent-bash-command"],
      riskTier: "active",
      timeoutMs: 8000
    }, {
      target: "localhost",
      layer: "L7",
      justification: "test",
      toolInput: {
        command: "echo hello"
      }
    });

    expect(request.parameters["timeoutMs"]).toBe(8000);
  });

  it("accepts numeric string timeout_ms overrides", () => {
    const request = compileToolRequestFromDefinition({
      id: "seed-agent-bash-command",
      name: "Agent Bash Command",
      executorType: "bash",
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
      capabilities: ["agent-bash-command"],
      riskTier: "active",
      timeoutMs: 8000
    }, {
      target: "localhost",
      layer: "L7",
      justification: "test",
      toolInput: {
        command: "echo hello",
        timeout_ms: "9000"
      }
    });

    expect(request.parameters["timeoutMs"]).toBe(9000);
  });

  it("rejects malformed timeout_ms overrides with explicit validation feedback", () => {
    expect(() => compileToolRequestFromDefinition({
      id: "seed-agent-bash-command",
      name: "Agent Bash Command",
      executorType: "bash",
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
      capabilities: ["agent-bash-command"],
      riskTier: "active",
      timeoutMs: 8000
    }, {
      target: "localhost",
      layer: "L7",
      justification: "test",
      toolInput: {
        command: "echo hello",
        timeout_ms: "not-a-number"
      }
    })).toThrow("Invalid tool input timeout_ms: expected a finite number or numeric string.");
  });
});
