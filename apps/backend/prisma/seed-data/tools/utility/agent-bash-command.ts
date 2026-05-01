import { loadSeedToolScript } from "../load-script.js";

export const agentBashCommandTool = {
  id: "seed-agent-bash-command",
  name: "Agent Bash Command",
  description: "Execute an agent-authored shell command in a remote, sandboxed `bash -c` (non-login, non-interactive) shell. State is not persisted between calls — each invocation is a fresh process. Provide `command` and optional `cwd` (must be an absolute path, contained within the configured workspace if one is set), `timeout_ms` (clamped to 1000–120000ms, default 30000ms), `env` (merged onto an allowlisted base; keys matching LD_/DYLD_/SSH_/AWS_/GH_/TOKEN/PASSWORD/SECRET prefixes are rejected), and `stdin`. Returns `{output, stdout, stderr, exit_code, duration_ms, truncated, cwd_used, command_preview, statusReason?}`. `output` concatenates stdout+stderr for human reading; prefer `stdout`/`stderr`/`exit_code` for control flow. `truncated: true` indicates head/tail clipping was applied (256KB head + 64KB tail per stream).",
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
      output: { type: "string", description: "stdout and stderr concatenated for human reading." },
      stdout: { type: "string" },
      stderr: { type: "string" },
      exit_code: { type: "integer" },
      signal: { type: "string", description: "Set when the process was killed by a signal." },
      duration_ms: { type: "integer" },
      truncated: { type: "boolean", description: "True when stdout or stderr exceeded the per-stream cap and was clipped." },
      cwd_used: { type: "string" },
      command_preview: { type: "string" },
      statusReason: { type: "string", description: "Human-readable reason when exit_code != 0 or the command was killed/timed out." }
    },
    required: ["output", "stdout", "stderr", "exit_code", "duration_ms", "truncated"]
  },
  examples: [
    { command: "curl -sI https://example.com" },
    { command: "nmap -sV -Pn -p 80,443 example.com", timeout_ms: 60000 }
  ]
} as const;
