import { loadSeedToolScript } from "../load-script.js";

export const agentBashCommandTool = {
  id: "seed-agent-bash-command",
  name: "Agent Bash Command",
  description: "Execute agent-authored bash source supplied through structured tool input. Use this for bounded project execution when the workflow intentionally allows a single raw bash surface. The command may invoke installed binaries available in the execution environment. Provide `command` and optional execution metadata such as `cwd`, `timeout_ms`, `env`, or `stdin`. Returns structured output with failure context and does not infer success when the command fails.",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/utility/agent-bash-command.sh");
  },
  capabilities: ["agent-bash-command"],
  binary: "bash",
  category: "utility" as const,
  riskTier: "active" as const,
  notes: "Proof-of-concept seeded tool for agent-authored bash execution through structured arguments.",
  sandboxProfile: "active-recon" as const,
  privilegeProfile: "active-network" as const,
  timeoutMs: 120000,
  inputSchema: {
    type: "object",
    properties: {
      command: { type: "string" },
      cwd: { type: "string" },
      timeout_ms: { type: "number" },
      env: {
        type: "object",
        additionalProperties: { type: "string" }
      },
      stdin: { type: "string" }
    },
    required: ["command"]
  },
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" },
      statusReason: { type: "string" }
    },
    required: ["output"]
  }
} as const;
