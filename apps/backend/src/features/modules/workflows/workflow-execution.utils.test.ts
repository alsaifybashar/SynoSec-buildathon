import { describe, expect, it } from "vitest";
import { parseExecutionTarget, parseTarget } from "./workflow-execution.utils.js";

const fallbackTarget = {
  baseUrl: "http://localhost:8888/",
  host: "localhost",
  port: 8888
};

describe("parseExecutionTarget", () => {
  it("inherits the configured port when the model sends a baseUrl without one", () => {
    const result = parseExecutionTarget({
      baseUrl: "http://localhost",
      target: "localhost"
    }, fallbackTarget);

    expect(result).toEqual({
      target: "localhost",
      port: 8888
    });
  });

  it("inherits the configured port when the model sends a URL-shaped target without one", () => {
    const result = parseExecutionTarget({
      target: "http://localhost"
    }, fallbackTarget);

    expect(result).toEqual({
      target: "localhost",
      port: 8888
    });
  });

  it("keeps an explicit port when the model provides one", () => {
    const result = parseExecutionTarget({
      baseUrl: "http://localhost:9999"
    }, fallbackTarget);

    expect(result).toEqual({
      target: "localhost",
      port: 9999
    });
  });

  it("resolves path-only targets against the configured workflow target", () => {
    const result = parseExecutionTarget({
      target: "/admin"
    }, fallbackTarget);

    expect(result).toEqual({
      target: "localhost",
      port: 8888,
      path: "/admin"
    });
  });
});

describe("parseTarget", () => {
  it("rejects missing application base URLs instead of using demo defaults", () => {
    expect(() => parseTarget(null)).toThrow(expect.objectContaining({
      status: 400,
      code: "WORKFLOW_TARGET_MISSING"
    }));
  });

  it("rejects malformed application base URLs instead of using demo defaults", () => {
    expect(() => parseTarget("http//scanner.test")).toThrow(expect.objectContaining({
      status: 400,
      code: "WORKFLOW_TARGET_INVALID"
    }));
  });

  it("parses a configured application base URL", () => {
    expect(parseTarget("https://scanner.test:8443/path")).toEqual({
      baseUrl: "https://scanner.test:8443/path",
      host: "scanner.test",
      port: 8443
    });
  });
});
