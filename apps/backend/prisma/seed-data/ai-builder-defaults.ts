export const localApplicationId = "5ecf4a8e-df5f-4945-a7e1-230ef43eac80";
export const targetRuntimeId = "6fd90dd7-6f27-47d0-ab24-6328bb2f3624";
export const anthropicProviderId = "88e995dc-c55d-4a74-b831-b64922f25858";
export const localProviderId = "6fb18f09-f230-49df-b0ab-4f1bcedd230c";
export const localWorkflowId = "2a3761a0-c424-4634-83ad-5145fbd2697c";

export type SeededProviderKey = "anthropic" | "local";
export type SeededRoleKey = "orchestrator" | "qa-analyst" | "pen-tester" | "reporter";

export function getSeededProviderDefinitions(env: NodeJS.ProcessEnv = process.env) {
  return [
    {
      id: anthropicProviderId,
      key: "anthropic" as const,
      name: "Anthropic",
      kind: "anthropic" as const,
      description: "Default hosted Anthropic provider for production-grade agent workflows.",
      baseUrl: null,
      model: env["CLAUDE_MODEL"] ?? "claude-sonnet-4-6",
      apiKey: env["ANTHROPIC_API_KEY"] ?? null
    },
    {
      id: localProviderId,
      key: "local" as const,
      name: "Local",
      kind: "local" as const,
      description: "Local model endpoint seeded from repo defaults for offline or lab execution.",
      baseUrl: env["LLM_LOCAL_BASE_URL"] ?? "http://127.0.0.1:11434",
      model: env["LLM_LOCAL_MODEL"] ?? "qwen3:1.7b",
      apiKey: null
    }
  ] as const;
}

export const seededToolDefinitions = [
  {
    id: "seed-http-recon",
    name: "HTTP Recon",
    description: "Probe targets, collect headers, status codes, titles, and initial fingerprints.",
    scriptPath: "scripts/tools/http-recon.sh",
    capabilities: ["web-recon", "passive"],
    binary: "httpx",
    category: "web" as const,
    riskTier: "passive" as const,
    notes: "Starter reconnaissance tool for orchestrator, QA, and pen-test flows.",
    executionMode: "sandboxed" as const,
    sandboxProfile: "network-recon" as const,
    privilegeProfile: "read-only-network" as const,
    defaultArgs: ["-silent", "-status-code", "-title", "-tech-detect", "-u", "{baseUrl}"] as const,
    timeoutMs: 120000,
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" }
      },
      required: ["target"]
    },
    outputSchema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        observations: { type: "array", items: { type: "string" } }
      },
      required: ["summary"]
    }
  },
  {
    id: "seed-web-crawl",
    name: "Web Crawl",
    description: "Crawl discovered web targets to expand reachable content and endpoints.",
    scriptPath: "scripts/tools/web-crawl.sh",
    capabilities: ["web-recon", "content-discovery", "passive"],
    binary: "katana",
    category: "content" as const,
    riskTier: "passive" as const,
    notes: "Useful for orchestrator planning and pen-test discovery.",
    executionMode: "sandboxed" as const,
    sandboxProfile: "network-recon" as const,
    privilegeProfile: "read-only-network" as const,
    defaultArgs: ["-u", "{baseUrl}", "-silent"] as const,
    timeoutMs: 180000,
    inputSchema: {
      type: "object",
      properties: {
        startUrl: { type: "string" }
      },
      required: ["startUrl"]
    },
    outputSchema: {
      type: "object",
      properties: {
        urls: { type: "array", items: { type: "string" } }
      },
      required: ["urls"]
    }
  },
  {
    id: "seed-service-scan",
    name: "Service Scan",
    description: "Enumerate exposed ports and identify reachable network services.",
    scriptPath: "scripts/tools/service-scan.sh",
    capabilities: ["network-recon", "passive"],
    binary: "nmap",
    category: "network" as const,
    riskTier: "passive" as const,
    notes: "Primary network discovery tool for orchestrator and pen-tester roles.",
    executionMode: "sandboxed" as const,
    sandboxProfile: "network-recon" as const,
    privilegeProfile: "read-only-network" as const,
    defaultArgs: ["-Pn", "-p", "8888", "--host-timeout", "5s", "--max-retries", "1", "{target}"] as const,
    timeoutMs: 180000,
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" }
      },
      required: ["target"]
    },
    outputSchema: {
      type: "object",
      properties: {
        ports: { type: "array", items: { type: "number" } },
        services: { type: "array", items: { type: "string" } }
      }
    }
  },
  {
    id: "seed-content-discovery",
    name: "Content Discovery",
    description: "Brute-force common content paths to expand the application attack surface.",
    scriptPath: "scripts/tools/content-discovery.sh",
    capabilities: ["content-discovery", "active-recon"],
    binary: "ffuf",
    category: "content" as const,
    riskTier: "active" as const,
    notes: "Assigned to orchestrator and pen-tester roles for path discovery.",
    executionMode: "sandboxed" as const,
    sandboxProfile: "active-recon" as const,
    privilegeProfile: "active-network" as const,
    defaultArgs: ["-u", "{baseUrl}/FUZZ", "-w", "/usr/share/dirb/wordlists/common.txt"] as const,
    timeoutMs: 30000,
    inputSchema: {
      type: "object",
      properties: {
        baseUrl: { type: "string" }
      },
      required: ["baseUrl"]
    },
    outputSchema: {
      type: "object",
      properties: {
        paths: { type: "array", items: { type: "string" } }
      }
    }
  },
  {
    id: "seed-vuln-audit",
    name: "Vulnerability Audit",
    description: "Run known issue checks against a target and summarize likely findings.",
    scriptPath: "scripts/tools/vulnerability-audit.sh",
    capabilities: ["vulnerability-audit", "active-recon"],
    binary: "nuclei",
    category: "web" as const,
    riskTier: "active" as const,
    notes: "Shared between QA and pen-test roles for controlled active validation.",
    executionMode: "sandboxed" as const,
    sandboxProfile: "active-recon" as const,
    privilegeProfile: "active-network" as const,
    defaultArgs: ["-u", "{baseUrl}", "-severity", "medium,high,critical"] as const,
    timeoutMs: 45000,
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" }
      },
      required: ["target"]
    },
    outputSchema: {
      type: "object",
      properties: {
        findings: { type: "array", items: { type: "string" } }
      }
    }
  },
  {
    id: "seed-sql-injection-check",
    name: "SQL Injection Check",
    description: "Perform controlled database injection validation against approved targets.",
    scriptPath: "scripts/tools/sql-injection-check.sh",
    capabilities: ["database-security", "controlled-exploit"],
    binary: "sqlmap",
    category: "web" as const,
    riskTier: "controlled-exploit" as const,
    notes: "Restricted pen-test tool for controlled exploit validation.",
    executionMode: "sandboxed" as const,
    sandboxProfile: "controlled-exploit-lab" as const,
    privilegeProfile: "controlled-exploit" as const,
    defaultArgs: ["-u", "{baseUrl}/", "--batch"] as const,
    timeoutMs: 45000,
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" }
      },
      required: ["target"]
    },
    outputSchema: {
      type: "object",
      properties: {
        result: { type: "string" },
        evidence: { type: "string" }
      }
    }
  },
  {
    id: "seed-evidence-review",
    name: "Evidence Review",
    description: "Review gathered evidence, normalize observations, and mark confidence gaps.",
    scriptPath: null,
    capabilities: [],
    binary: null,
    category: "utility" as const,
    riskTier: "passive" as const,
    notes: "Used by QA and reporter roles to assess quality and consistency.",
    executionMode: "catalog" as const,
    sandboxProfile: null,
    privilegeProfile: null,
    defaultArgs: [] as const,
    timeoutMs: null,
    inputSchema: {
      type: "object",
      properties: {
        findings: { type: "array" }
      }
    },
    outputSchema: {
      type: "object",
      properties: {
        review: { type: "string" },
        followUps: { type: "array", items: { type: "string" } }
      }
    }
  },
  {
    id: "seed-report-writer",
    name: "Report Writer",
    description: "Transform findings and evidence into an executive and technical report structure.",
    scriptPath: null,
    capabilities: [],
    binary: null,
    category: "utility" as const,
    riskTier: "passive" as const,
    notes: "Primary reporting helper for the reporter role.",
    executionMode: "catalog" as const,
    sandboxProfile: null,
    privilegeProfile: null,
    defaultArgs: [] as const,
    timeoutMs: null,
    inputSchema: {
      type: "object",
      properties: {
        findings: { type: "array" },
        audience: { type: "string" }
      }
    },
    outputSchema: {
      type: "object",
      properties: {
        executiveSummary: { type: "string" },
        reportSections: { type: "array", items: { type: "string" } }
      }
    }
  }
] as const;

export const seededRoleDefinitions = [
  {
    key: "orchestrator" as const,
    name: "Orchestrator",
    description: "Coordinates scans, chooses the next useful step, and delegates the right tool path.",
    systemPrompt:
      "You are the orchestration lead for SynoSec. Build a disciplined plan from the current target state, choose the next highest-value action, stay inside approved scope, and delegate only the minimum necessary tools. Prefer evidence gathering before escalation, keep a concise running rationale, and stop when additional actions do not materially improve confidence or coverage.",
    toolIds: ["seed-http-recon", "seed-web-crawl", "seed-service-scan", "seed-content-discovery"] as const
  },
  {
    key: "qa-analyst" as const,
    name: "QA Analyst",
    description: "Validates evidence quality, cross-checks findings, and identifies confidence gaps.",
    systemPrompt:
      "You are the QA analyst for SynoSec. Review evidence for consistency, verify that findings are supported, call out uncertainty, and recommend the smallest follow-up needed to confirm or reject a claim. Prefer reproducibility, precise language, and conservative confidence scoring over speculation.",
    toolIds: ["seed-http-recon", "seed-vuln-audit", "seed-evidence-review"] as const
  },
  {
    key: "pen-tester" as const,
    name: "Pen-Tester",
    description: "Performs controlled offensive validation against approved targets and evidence paths.",
    systemPrompt:
      "You are the pen-tester for SynoSec. Use approved active techniques to validate exploitable conditions, prioritize realistic attack paths, and preserve a clean evidence trail. Stay inside scope, prefer the least invasive validation that proves impact, and clearly separate confirmed exploitation from hypothesis.",
    toolIds: [
      "seed-http-recon",
      "seed-web-crawl",
      "seed-service-scan",
      "seed-content-discovery",
      "seed-vuln-audit",
      "seed-sql-injection-check"
    ] as const
  },
  {
    key: "reporter" as const,
    name: "Reporter",
    description: "Builds clear security reports for both executive and technical audiences.",
    systemPrompt:
      "You are the reporting specialist for SynoSec. Convert findings and evidence into a crisp report with accurate severity framing, clear remediation guidance, and separate executive and technical narratives. Do not introduce unsupported claims. Focus on clarity, prioritization, and traceability back to evidence.",
    toolIds: ["seed-evidence-review", "seed-report-writer"] as const
  }
] as const;

export const seededAgentIds = {
  "anthropic:orchestrator": "34e69347-4446-4c54-b8b0-b3962f701f0e",
  "anthropic:qa-analyst": "751d2c0b-85f1-4f7a-8ac6-2c05d0ce0f56",
  "anthropic:pen-tester": "f1f99dd4-c2a7-47e8-946e-6a880f09001f",
  "anthropic:reporter": "897204f6-2e08-4775-aae8-f233d4ec8154",
  "local:orchestrator": "fa1a0bfa-6b02-4948-8e1c-155f6b9a4ae7",
  "local:qa-analyst": "fcfe30d4-9473-4e74-8836-d824ff777c88",
  "local:pen-tester": "36f56ea0-e8ce-48ca-bda8-c33ed49e67b2",
  "local:reporter": "72ea29f0-f780-4402-bfe4-574604830749"
} as const;

export function seededAgentId(providerKey: SeededProviderKey, roleKey: SeededRoleKey) {
  return seededAgentIds[`${providerKey}:${roleKey}` as const];
}

export function getSeededRoleDefinition(roleKey: SeededRoleKey) {
  return seededRoleDefinitions.find((role) => role.key === roleKey);
}

export function getSeededWorkflowDefinitions() {
  return [
    {
      id: localWorkflowId,
      name: "Local Vulnerable App Walkthrough",
      status: "active" as const,
      description: "Minimal staged workflow for the local vulnerable target using the seeded local agents.",
      applicationId: localApplicationId,
      runtimeId: targetRuntimeId,
      stages: [
        {
          id: "ca089560-77ef-4b36-97f0-1d4d83cd3e2e",
          label: "Initial Recon",
          agentId: seededAgentId("local", "orchestrator")
        },
        {
          id: "5ffef73d-5598-4970-855a-56017db24232",
          label: "Evidence Review",
          agentId: seededAgentId("local", "qa-analyst")
        },
        {
          id: "17861b68-90df-4966-b497-0236f04882cf",
          label: "Controlled Validation",
          agentId: seededAgentId("local", "pen-tester")
        },
        {
          id: "0f2a1756-966a-4447-9bd4-a751f9ff8dc1",
          label: "Reporting Pass",
          agentId: seededAgentId("local", "reporter")
        }
      ]
    }
  ] as const;
}
