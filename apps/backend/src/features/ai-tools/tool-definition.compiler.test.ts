import { describe, expect, it } from "vitest";
import { compileToolRequestFromDefinition } from "./tool-definition.compiler.js";

describe("compileToolRequestFromDefinition", () => {
  it("overrides raw tool input target fields with the normalized execution target", () => {
    const request = compileToolRequestFromDefinition({
      id: "seed-service-scan",
      name: "Service Scan",
      executorType: "bash",
      bashSource: "#!/usr/bin/env bash\nprintf '%s\\n' '{\"output\":\"ok\"}'",
      capabilities: ["network-recon"],
      riskTier: "passive",
      sandboxProfile: "network-recon",
      privilegeProfile: "read-only-network",
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
      target: "localhost",
      port: 8888,
      baseUrl: "http://localhost:8888"
    });
  });
});
