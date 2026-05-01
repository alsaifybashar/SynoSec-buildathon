import { spawnSync } from "node:child_process";
import { mkdtemp, rm, chmod, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const wrapperPath = path.resolve(here, "../../../../../../scripts/tools/utility/agent-bash-command.sh");

interface RunOptions {
  toolInput: Record<string, unknown>;
  workspace?: string;
  extraEnv?: Record<string, string>;
}

interface Envelope {
  output: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  duration_ms: number;
  truncated: boolean;
  cwd_used?: string;
  command_preview?: string;
  signal?: string;
  statusReason?: string;
}

function runWrapper(opts: RunOptions): { envelope: Envelope; raw: string; status: number; stderr: string } {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? tmpdir()
  };
  if (opts.workspace) env["SYNOSEC_TOOL_WORKSPACE"] = opts.workspace;
  if (opts.extraEnv) Object.assign(env, opts.extraEnv);

  const requestPayload = {
    request: { parameters: { toolInput: opts.toolInput } }
  };

  const proc = spawnSync(wrapperPath, [], {
    input: JSON.stringify(requestPayload),
    env,
    encoding: "utf8"
  });

  const raw = proc.stdout ?? "";
  let envelope: Envelope;
  try {
    envelope = JSON.parse(raw.trim().split("\n").pop() ?? "{}") as Envelope;
  } catch (error) {
    throw new Error(`Wrapper produced non-JSON output:\n${raw}\n${proc.stderr ?? ""}\n${(error as Error).message}`);
  }
  return { envelope, raw, status: proc.status ?? -1, stderr: proc.stderr ?? "" };
}

beforeAll(async () => {
  await chmod(wrapperPath, 0o755);
});

describe("agent-bash-command wrapper", () => {
  it("runs a simple command and returns the structured envelope", () => {
    const { envelope } = runWrapper({ toolInput: { command: "printf hi" } });
    expect(envelope.exit_code).toBe(0);
    expect(envelope.stdout.trim()).toBe("hi");
    expect(envelope.truncated).toBe(false);
    expect(typeof envelope.duration_ms).toBe("number");
    expect(envelope.command_preview).toBe("printf hi");
  });

  it("uses bash -c (non-login) — login-only rc files do not get sourced", () => {
    // shopt -q login_shell exits 0 only inside a login shell; we expect 1.
    const { envelope } = runWrapper({
      toolInput: { command: "shopt -q login_shell && echo LOGIN || echo NOT_LOGIN" }
    });
    expect(envelope.exit_code).toBe(0);
    expect(envelope.stdout.trim()).toBe("NOT_LOGIN");
  });

  it("rejects toolInput.cwd outside the configured workspace", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "synosec-bash-ws-"));
    try {
      const { envelope } = runWrapper({
        workspace,
        toolInput: { command: "pwd", cwd: "/etc" }
      });
      expect(envelope.exit_code).toBe(1);
      expect(envelope.statusReason ?? "").toMatch(/escapes workspace/);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it("accepts a cwd inside the configured workspace", async () => {
    const workspace = await mkdtemp(path.join(tmpdir(), "synosec-bash-ws-"));
    try {
      const { envelope } = runWrapper({
        workspace,
        toolInput: { command: "pwd", cwd: workspace }
      });
      expect(envelope.exit_code).toBe(0);
      expect(envelope.stdout.trim()).toBe(workspace);
    } finally {
      await rm(workspace, { recursive: true, force: true });
    }
  });

  it("strips non-allowlisted parent env vars from the child process", () => {
    const { envelope } = runWrapper({
      extraEnv: { AWS_SECRET_ACCESS_KEY: "leak-me-pls", LD_PRELOAD: "/tmp/evil.so" },
      toolInput: { command: "printf '%s|%s' \"${AWS_SECRET_ACCESS_KEY-}\" \"${LD_PRELOAD-}\"" }
    });
    expect(envelope.exit_code).toBe(0);
    expect(envelope.stdout).toBe("|");
  });

  it("rejects agent-supplied env keys on the denylist", () => {
    const { envelope } = runWrapper({
      toolInput: { command: "true", env: { LD_PRELOAD: "/tmp/whatever.so" } }
    });
    expect(envelope.exit_code).toBe(1);
    expect(envelope.statusReason ?? "").toMatch(/denylist/);
  });

  it("forwards SYNOSEC_-prefixed parent env to the child", () => {
    const { envelope } = runWrapper({
      extraEnv: { SYNOSEC_SCAN_ID: "scan-xyz" },
      toolInput: { command: "printf '%s' \"$SYNOSEC_SCAN_ID\"" }
    });
    expect(envelope.exit_code).toBe(0);
    expect(envelope.stdout).toBe("scan-xyz");
  });

  it("times out long-running commands and reports exit_code 124", () => {
    const { envelope } = runWrapper({
      toolInput: { command: "sleep 5", timeout_ms: 1000 }
    });
    expect([124, 137, 143]).toContain(envelope.exit_code);
    expect(envelope.statusReason ?? "").toMatch(/timed out|signal/i);
    expect(envelope.duration_ms).toBeLessThan(3000);
  });

  it("truncates stdout that exceeds the cap and sets truncated=true", () => {
    // Emit ~512KB of zeros; head=256KB + tail=64KB → ~192KB dropped.
    const { envelope } = runWrapper({
      toolInput: { command: "head -c 524288 /dev/zero | tr '\\0' 'a'", timeout_ms: 10000 }
    });
    expect(envelope.exit_code).toBe(0);
    expect(envelope.truncated).toBe(true);
    expect(envelope.stdout.length).toBeLessThan(524288);
    expect(envelope.stdout).toMatch(/bytes truncated/);
  });

  it("rejects a missing command field", () => {
    const { envelope } = runWrapper({ toolInput: {} as Record<string, unknown> });
    expect(envelope.exit_code).toBe(1);
    expect(envelope.statusReason ?? "").toMatch(/command is required/);
  });
});
