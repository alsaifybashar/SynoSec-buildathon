#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"
export SYNOSEC_FAMILY_PAYLOAD="$payload"
export SYNOSEC_FAMILY_NAME="__FAMILY_NAME__"
export SYNOSEC_PRIMARY_NAME="__PRIMARY_NAME__"
export SYNOSEC_PRIMARY_SOURCE_B64="__PRIMARY_SOURCE_B64__"
export SYNOSEC_FALLBACK_NAME="__FALLBACK_NAME__"
export SYNOSEC_FALLBACK_SOURCE_B64="__FALLBACK_SOURCE_B64__"

node <<'NODE'
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const payload = process.env.SYNOSEC_FAMILY_PAYLOAD || "";
const familyName = process.env.SYNOSEC_FAMILY_NAME || "Family Tool";
const primaryName = process.env.SYNOSEC_PRIMARY_NAME || "primary";
const fallbackName = process.env.SYNOSEC_FALLBACK_NAME || "fallback";
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "synosec-family-tool-"));

function materializeScript(label, sourceB64) {
  const scriptPath = path.join(tempDir, `${label.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "tool"}.sh`);
  fs.writeFileSync(scriptPath, Buffer.from(sourceB64, "base64").toString("utf8"), "utf8");
  fs.chmodSync(scriptPath, 0o700);
  return scriptPath;
}

function runTool(label, sourceB64) {
  const scriptPath = materializeScript(label, sourceB64);
  const result = spawnSync("bash", [scriptPath], {
    input: payload,
    encoding: "utf8"
  });
  return {
    label,
    status: typeof result.status === "number" ? result.status : 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    signal: result.signal || null,
    error: result.error ? String(result.error.message || result.error) : null
  };
}

function parseEnvelope(run) {
  const trimmedStdout = run.stdout.trim();
  if (trimmedStdout.length === 0) {
    return {
      ok: false,
      reason: `${run.label} produced no structured output.`
    };
  }

  try {
    const parsed = JSON.parse(trimmedStdout);
    if (!parsed || typeof parsed.output !== "string") {
      return {
        ok: false,
        reason: `${run.label} returned an incomplete structured result.`
      };
    }

    return {
      ok: true,
      parsed
    };
  } catch (error) {
    return {
      ok: false,
      reason: `${run.label} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

function formatFailure(run, parseResult) {
  return [
    `${run.label} failed.`,
    `exitCode=${run.status}`,
    ...(run.signal ? [`signal=${run.signal}`] : []),
    ...(run.error ? [`error=${run.error}`] : []),
    `stdout:`,
    run.stdout.trim() || "<empty>",
    `stderr:`,
    run.stderr.trim() || "<empty>",
    ...(parseResult.ok ? [] : [`parseError=${parseResult.reason}`])
  ].join("\n");
}

function finalizeSuccess(run, parseResult, usedFallback) {
  if (!parseResult.ok) {
    return null;
  }

  const envelope = parseResult.parsed;
  if (!usedFallback) {
    return envelope;
  }

  return {
    ...envelope,
    output: `${familyName} used fallback ${run.label}.\n${envelope.output}`,
    commandPreview: typeof envelope.commandPreview === "string" && envelope.commandPreview.trim().length > 0
      ? `${familyName} -> ${envelope.commandPreview}`
      : `${familyName} -> ${run.label}`
  };
}

try {
  const primaryRun = runTool(primaryName, process.env.SYNOSEC_PRIMARY_SOURCE_B64 || "");
  const primaryParsed = parseEnvelope(primaryRun);
  if (primaryRun.status === 0 && primaryParsed.ok) {
    process.stdout.write(`${JSON.stringify(finalizeSuccess(primaryRun, primaryParsed, false))}\n`);
    process.exit(0);
  }

  const fallbackRun = runTool(fallbackName, process.env.SYNOSEC_FALLBACK_SOURCE_B64 || "");
  const fallbackParsed = parseEnvelope(fallbackRun);
  if (fallbackRun.status === 0 && fallbackParsed.ok) {
    process.stdout.write(`${JSON.stringify(finalizeSuccess(fallbackRun, fallbackParsed, true))}\n`);
    process.exit(0);
  }

  process.stdout.write(`${JSON.stringify({
    output: [
      `${familyName} failed after trying ${primaryName} and ${fallbackName}.`,
      "",
      formatFailure(primaryRun, primaryParsed),
      "",
      formatFailure(fallbackRun, fallbackParsed)
    ].join("\n"),
    statusReason: `${familyName} failed after primary and fallback tool attempts.`
  })}\n`);
  process.exit(1);
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
NODE
