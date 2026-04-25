import { createSeededFamilyTool } from "./create-family-tool.js";
import { httpHeadersTool } from "../web/http-headers.js";
import { httpReconTool } from "../web/http-recon.js";

export const familyHttpSurfaceTool = createSeededFamilyTool({
  id: "seed-family-http-surface",
  name: "HTTP Surface",
  description: "Use this first for a reachable web target when you need a safe HTTP fingerprint. Provide `baseUrl`. It probes the live HTTP surface, collects status/title/headers/fingerprint signals, and returns quick reconnaissance evidence without broad crawling or brute-force discovery.",
  capabilities: ["semantic-family", "http-surface", "passive"],
  binary: "httpx",
  category: "web",
  riskTier: "passive",
  notes: "Semantic family wrapper over HTTP recon with HTTP headers as the ordered fallback path.",
  sandboxProfile: "network-recon",
  privilegeProfile: "read-only-network",
  timeoutMs: 120000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    },
    required: ["baseUrl"]
  },
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" },
      observations: { type: "array" }
    },
    required: ["output"]
  },
  primary: {
    name: httpReconTool.name,
    bashSource: httpReconTool.bashSource
  },
  fallback: {
    name: httpHeadersTool.name,
    bashSource: httpHeadersTool.bashSource
  }
});
