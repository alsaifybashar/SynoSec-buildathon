#!/usr/bin/env node
// Agent Bash Command tool — runs an agent-authored shell command in a non-login
// bash, with cwd containment, env allowlist, output truncation, and a structured
// JSON envelope back to the broker. The .sh extension is preserved for the
// seed-loader; the kernel honours the shebang above.

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ENV_ALLOWLIST = new Set([
  "PATH", "HOME", "LANG", "LC_ALL", "LC_CTYPE", "TERM", "TZ",
  "SHELL", "USER", "LOGNAME"
]);
const ENV_FORBIDDEN_PREFIXES = [
  "LD_", "DYLD_", "BASH_FUNC", "BASH_ENV", "PROMPT_COMMAND",
  "SSH_", "AWS_", "GH_", "GITHUB_", "TOKEN", "PASSWORD", "SECRET"
];
const TIMEOUT_FLOOR_MS = 1000;
const TIMEOUT_CEILING_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 30_000;
const HEAD_BYTES = 256 * 1024;
const TAIL_BYTES = 64 * 1024;

function emit(envelope, exitCode) {
  const payload = `${JSON.stringify(envelope)}\n`;
  process.stdout.write(payload, () => process.exit(exitCode));
}

function fail(statusReason) {
  emit({
    output: "",
    stdout: "",
    stderr: "",
    exit_code: 1,
    duration_ms: 0,
    truncated: false,
    statusReason
  }, 1);
}

function buildEnv(agentEnv) {
  const env = Object.create(null);
  for (const key of Object.keys(process.env)) {
    if (ENV_ALLOWLIST.has(key) || key.startsWith("SYNOSEC_")) {
      env[key] = process.env[key];
    }
  }
  if (agentEnv == null) return env;
  if (typeof agentEnv !== "object" || Array.isArray(agentEnv)) {
    throw new Error("toolInput.env must be an object with string values.");
  }
  for (const [key, value] of Object.entries(agentEnv)) {
    if (typeof value !== "string") {
      throw new Error("toolInput.env values must be strings.");
    }
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`toolInput.env contains invalid key: ${key}`);
    }
    if (ENV_FORBIDDEN_PREFIXES.some((p) => key.toUpperCase().startsWith(p))) {
      throw new Error(`toolInput.env key '${key}' is on the denylist.`);
    }
    env[key] = value;
  }
  return env;
}

function resolveCwd(requested) {
  const workspace = process.env.SYNOSEC_TOOL_WORKSPACE;
  if (!requested) return workspace || undefined;
  if (typeof requested !== "string" || requested.trim().length === 0) {
    throw new Error("toolInput.cwd must be a non-empty string when provided.");
  }
  if (!path.isAbsolute(requested)) {
    throw new Error("toolInput.cwd must be an absolute path.");
  }
  const resolved = path.resolve(requested);
  if (workspace) {
    const root = path.resolve(workspace);
    const rel = path.relative(root, resolved);
    if (rel.startsWith("..") || path.isAbsolute(rel)) {
      throw new Error(`toolInput.cwd '${resolved}' escapes workspace '${root}'.`);
    }
  }
  return resolved;
}

class CappedStream {
  constructor() {
    this.head = [];
    this.headBytes = 0;
    this.tail = [];
    this.tailBytes = 0;
    this.dropped = 0;
    this.total = 0;
  }
  push(chunk) {
    this.total += chunk.length;
    if (this.headBytes < HEAD_BYTES) {
      const room = HEAD_BYTES - this.headBytes;
      const slice = chunk.length <= room ? chunk : chunk.subarray(0, room);
      this.head.push(slice);
      this.headBytes += slice.length;
      if (slice.length === chunk.length) return;
      chunk = chunk.subarray(slice.length);
    }
    this.tail.push(chunk);
    this.tailBytes += chunk.length;
    while (this.tailBytes - chunk.length > TAIL_BYTES && this.tail.length > 1) {
      const dropChunk = this.tail.shift();
      this.tailBytes -= dropChunk.length;
      this.dropped += dropChunk.length;
    }
    while (this.tailBytes > TAIL_BYTES && this.tail.length > 0) {
      const overflow = this.tailBytes - TAIL_BYTES;
      const front = this.tail[0];
      if (front.length <= overflow) {
        this.tail.shift();
        this.tailBytes -= front.length;
        this.dropped += front.length;
      } else {
        this.tail[0] = front.subarray(overflow);
        this.tailBytes -= overflow;
        this.dropped += overflow;
      }
    }
  }
  serialize() {
    if (this.dropped === 0) {
      return { text: Buffer.concat([...this.head, ...this.tail]).toString("utf8"), truncated: false };
    }
    const marker = Buffer.from(`\n…[${this.dropped} bytes truncated]…\n`, "utf8");
    return {
      text: Buffer.concat([...this.head, marker, ...this.tail]).toString("utf8"),
      truncated: true
    };
  }
}

function clampTimeout(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_TIMEOUT_MS;
  return Math.max(TIMEOUT_FLOOR_MS, Math.min(TIMEOUT_CEILING_MS, Math.floor(value)));
}

function combine(stdoutText, stderrText) {
  if (stderrText.trim().length === 0) return stdoutText.trimEnd();
  const sep = stdoutText.endsWith("\n") || stdoutText.length === 0 ? "" : "\n";
  return `${stdoutText}${sep}${stderrText}`.trimEnd();
}

let raw;
try {
  raw = fs.readFileSync(0, "utf8");
} catch (error) {
  fail(`Failed to read tool request: ${error instanceof Error ? error.message : String(error)}`);
}

let parsed;
try {
  parsed = JSON.parse(raw || "{}");
} catch (error) {
  fail(`Tool request was not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
}

const toolInput = parsed?.request?.parameters?.toolInput ?? {};
const command = typeof toolInput.command === "string" ? toolInput.command.trim() : "";
if (!command) {
  fail("toolInput.command is required and must be a non-empty string.");
}

let cwd;
let env;
try {
  cwd = resolveCwd(toolInput.cwd);
  env = buildEnv(toolInput.env);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

const timeoutMs = clampTimeout(toolInput.timeout_ms);
const stdinText = typeof toolInput.stdin === "string" ? toolInput.stdin : "";
const commandPreview = command.length > 240 ? `${command.slice(0, 237)}...` : command;

const startedAt = process.hrtime.bigint();
const child = spawn("bash", ["-c", command], {
  ...(cwd ? { cwd } : {}),
  env,
  stdio: ["pipe", "pipe", "pipe"],
  detached: true
});

const outBuf = new CappedStream();
const errBuf = new CappedStream();
let timedOut = false;
let killedSignal = null;

const timer = setTimeout(() => {
  timedOut = true;
  try { process.kill(-child.pid, "SIGTERM"); } catch { /* already gone */ }
  setTimeout(() => {
    try { process.kill(-child.pid, "SIGKILL"); } catch { /* already gone */ }
  }, 1000).unref();
}, timeoutMs);

child.stdout.on("data", (chunk) => outBuf.push(chunk));
child.stderr.on("data", (chunk) => errBuf.push(chunk));
child.stdin.on("error", (error) => {
  if (error && error.code === "EPIPE") return;
});

if (stdinText.length > 0) {
  child.stdin.end(stdinText);
} else {
  child.stdin.end();
}

child.on("error", (error) => {
  clearTimeout(timer);
  fail(`Failed to spawn bash: ${error.message}`);
});

child.on("close", (code, signal) => {
  clearTimeout(timer);
  killedSignal = signal;
  const stdout = outBuf.serialize();
  const stderr = errBuf.serialize();
  const durationMs = Number((process.hrtime.bigint() - startedAt) / 1_000_000n);
  const exitCode = code ?? (timedOut ? 124 : 1);
  const truncated = stdout.truncated || stderr.truncated;

  let statusReason;
  if (timedOut) {
    statusReason = `Command timed out after ${timeoutMs}ms.`;
  } else if (signal) {
    statusReason = `Command terminated by signal ${signal}.`;
  } else if (exitCode !== 0) {
    statusReason = `Command exited with code ${exitCode}.`;
  }

  emit({
    output: combine(stdout.text, stderr.text),
    stdout: stdout.text,
    stderr: stderr.text,
    exit_code: exitCode,
    ...(killedSignal ? { signal: killedSignal } : {}),
    duration_ms: durationMs,
    truncated,
    cwd_used: cwd ?? process.cwd(),
    command_preview: commandPreview,
    ...(statusReason ? { statusReason } : {})
  }, exitCode);
});
