import { describe, expect, it } from "vitest";
import {
  attachEvidenceReferences,
  enrichWorkflowFindingDetails,
  parseExecutionTarget,
  parseTarget,
  validateFindingEvidenceReferences,
  verifyFindingEvidence
} from "./workflow-execution.utils.js";

const fallbackTarget = {
  baseUrl: "http://localhost:8888/",
  host: "localhost",
  port: 8888
};

const mockResult = {
  toolId: "seed-nikto",
  toolName: "nikto",
  toolInput: {},
  toolRequest: {} as any,
  toolRun: { id: "tool-run-nikto-1" } as any,
  status: "completed" as const,
  observations: [],
  observationKeys: [],
  observationSummaries: [],
  outputPreview: "",
  fullOutput: "HTTP/1.1 200 OK\nServer: Apache\n[+] /admin/ found via nikto",
  commandPreview: "nikto http://localhost:8888/admin",
  usedToolId: "seed-nikto",
  usedToolName: "nikto",
  fallbackUsed: false,
  attempts: []
};

describe("verifyFindingEvidence", () => {
  it("accepts tool-grounded evidence as single_source", () => {
    const finding = attachEvidenceReferences({
      title: "Admin Panel Found",
      severity: "medium" as const,
      confidence: 0.7,
      type: "content_discovery" as const,
      target: { host: "localhost" },
      impact: "Exposure",
      recommendation: "Fix it",
      validationStatus: "unverified" as const,
      tags: [],
      evidence: [{
        sourceTool: "nikto",
        quote: "[+] /admin/ found via nikto"
      }]
    }, [mockResult]);

    const result = verifyFindingEvidence(finding, [mockResult]);
    expect(result.validationStatus).toBe("single_source");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("demotes grounded but weakly specific evidence to suspected", () => {
    const finding = attachEvidenceReferences({
      title: "Speculative Finding",
      severity: "low" as const,
      confidence: 0.5,
      type: "other" as const,
      target: { host: "localhost" },
      impact: "Unknown",
      recommendation: "Check it",
      validationStatus: "unverified" as const,
      tags: [],
      evidence: [{
        sourceTool: "nikto",
        quote: "Apache"
      }]
    }, [mockResult]);

    const result = verifyFindingEvidence(finding, [mockResult]);
    expect(result.validationStatus).toBe("suspected");
    expect(result.confidence).toBeLessThanOrEqual(0.74);
  });

  it("rejects evidence that is not grounded to a persisted tool result", () => {
    const finding = {
      title: "Ungrounded Bug",
      severity: "high" as const,
      confidence: 0.9,
      type: "other" as const,
      target: { host: "localhost" },
      impact: "Doom",
      recommendation: "Panic",
      validationStatus: "unverified" as const,
      tags: [],
      evidence: [{
        sourceTool: "nikto",
        toolRunRef: "missing-run",
        quote: "This feels like a security hole"
      }]
    };

    const result = verifyFindingEvidence(finding, [mockResult]);
    expect(result.validationStatus).toBe("rejected");
    expect(result.confidence).toBe(0.1);
  });

  it("rejects pure speculation even when it references a real tool run", () => {
    const finding = attachEvidenceReferences({
      title: "Imaginary Bug",
      severity: "high" as const,
      confidence: 0.9,
      type: "other" as const,
      target: { host: "localhost" },
      impact: "Doom",
      recommendation: "Panic",
      validationStatus: "unverified" as const,
      tags: [],
      evidence: [{
        sourceTool: "nikto",
        quote: "This feels like a security hole"
      }]
    }, [mockResult]);

    const result = verifyFindingEvidence(finding, [mockResult]);
    expect(result.validationStatus).toBe("rejected");
    expect(result.confidence).toBe(0.1);
  });
});

describe("validateFindingEvidenceReferences", () => {
  it("fills an unambiguous toolRunRef automatically", () => {
    const finding = attachEvidenceReferences({
      title: "Admin Panel Found",
      severity: "medium" as const,
      confidence: 0.7,
      type: "content_discovery" as const,
      target: { host: "localhost" },
      impact: "Exposure",
      recommendation: "Fix it",
      validationStatus: "unverified" as const,
      tags: [],
      evidence: [{
        sourceTool: "nikto",
        quote: "[+] /admin/ found via nikto"
      }]
    }, [{
      ...mockResult,
      toolRun: { id: "tool-run-1" } as any
    }]);

    expect(finding.evidence[0]?.toolRunRef).toBe("tool-run-1");
    expect(validateFindingEvidenceReferences(finding, [{
      ...mockResult,
      toolRun: { id: "tool-run-1" } as any
    }])).toBeNull();
  });
});

describe("enrichWorkflowFindingDetails", () => {
  it("captures an exact discovered path and manual reproduction steps", () => {
    const detail = enrichWorkflowFindingDetails({
      title: "Admin Panel Found",
      target: { host: "localhost", url: "http://localhost:8888/" },
      evidence: [{
        sourceTool: "nikto",
        quote: "[+] /admin/ found via nikto"
      }]
    }, [mockResult], fallbackTarget);

    expect(detail.target.path).toBe("/admin/");
    expect(detail.target.url).toBe("http://localhost:8888/admin/");
    expect(detail.reproduction?.steps).toContain("Request the exact URL: http://localhost:8888/admin/");
  });
});

describe("parseExecutionTarget", () => {
  it("inherits the configured port when the model sends a baseUrl without one", () => {
    const result = parseExecutionTarget({
      baseUrl: "http://localhost",
      target: "localhost"
    }, fallbackTarget);

    expect(result).toEqual({
      target: "localhost",
      port: 8888,
      url: "http://localhost/"
    });
  });

  it("inherits the configured port when the model sends a URL-shaped target without one", () => {
    const result = parseExecutionTarget({
      target: "http://localhost"
    }, fallbackTarget);

    expect(result).toEqual({
      target: "localhost",
      port: 8888,
      url: "http://localhost/"
    });
  });

  it("keeps an explicit port when the model provides one", () => {
    const result = parseExecutionTarget({
      baseUrl: "http://localhost:9999"
    }, fallbackTarget);

    expect(result).toEqual({
      target: "localhost",
      port: 9999,
      url: "http://localhost:9999/"
    });
  });

  it("preserves full path and query when the model provides a URL input", () => {
    const result = parseExecutionTarget({
      url: "http://localhost:9999/search?q=test"
    }, fallbackTarget);

    expect(result).toEqual({
      target: "localhost",
      port: 9999,
      url: "http://localhost:9999/search?q=test"
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
