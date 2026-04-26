#!/usr/bin/env bash
set -euo pipefail

node -e '
  const { spawnSync } = require("node:child_process");

  function printResult(result) {
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }

  function fail(statusReason, output = "") {
    printResult({ output, statusReason });
    process.exit(1);
  }

  try {
    const raw = require("node:fs").readFileSync(0, "utf8");
    const parsed = JSON.parse(raw || "{}");
    const toolInput = parsed?.request?.parameters?.toolInput ?? {};

    const command = typeof toolInput.command === "string" ? toolInput.command.trim() : "";
    if (!command) {
      fail("toolInput.command is required and must be a non-empty string.");
    }

    const cwd = typeof toolInput.cwd === "string" && toolInput.cwd.trim().length > 0
      ? toolInput.cwd.trim()
      : undefined;
    const stdin = typeof toolInput.stdin === "string" ? toolInput.stdin : "";

    const envInput = toolInput.env;
    const safeEnv = { ...process.env };
    if (envInput != null) {
      if (typeof envInput !== "object" || Array.isArray(envInput)) {
        fail("toolInput.env must be an object with string values.");
      }

      for (const [key, value] of Object.entries(envInput)) {
        if (typeof value !== "string") {
          fail("toolInput.env values must be strings.");
        }
        safeEnv[key] = value;
      }
    }

    const execution = spawnSync("bash", ["-lc", command], {
      ...(cwd ? { cwd } : {}),
      env: safeEnv,
      input: stdin,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024
    });

    const stdout = execution.stdout ?? "";
    const stderr = execution.stderr ?? "";
    const output = stderr.trim().length > 0
      ? `${stdout}${stdout.endsWith("\n") ? "" : "\n"}${stderr}`
      : stdout;

    const response = {
      output: output.trimEnd(),
      ...(execution.error
        ? { statusReason: execution.error.message }
        : execution.status && execution.status !== 0
          ? { statusReason: `Command exited with code ${execution.status}.` }
          : {})
    };

    printResult(response);
    process.exit(execution.status ?? 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`Failed to execute command: ${message}`);
  }
'
