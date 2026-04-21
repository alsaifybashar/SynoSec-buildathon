import { describe, expect, it } from "vitest";
import { parseExecutionTarget } from "./workflow-execution.utils.js";

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
