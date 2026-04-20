#!/usr/bin/env bash
set -euo pipefail

tool_binary="${1:?tool binary required}"
shift || true

payload="$(cat)"
mapfile -t script_args < <(
  printf '%s' "$payload" | node -e '
    let input = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => { input += chunk; });
    process.stdin.on("end", () => {
      const parsed = JSON.parse(input || "{}");
      const args = parsed?.request?.parameters?.scriptArgs;
      if (Array.isArray(args)) {
        for (const value of args) {
          process.stdout.write(String(value) + "\n");
        }
      }
    });
  '
)

exec "$tool_binary" "${script_args[@]}"
