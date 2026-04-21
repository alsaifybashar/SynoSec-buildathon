export const localApplicationId = "5ecf4a8e-df5f-4945-a7e1-230ef43eac80";
export const targetRuntimeId = "6fd90dd7-6f27-47d0-ab24-6328bb2f3624";
export const anthropicProviderId = "88e995dc-c55d-4a74-b831-b64922f25858";
export const localProviderId = "6fb18f09-f230-49df-b0ab-4f1bcedd230c";
export const osiSingleAgentWorkflowId = "8b57f0e7-1dd7-4d6a-8db5-c4ff7be80a21";
export const seededSingleAgentScanId = "b6ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c";
export const seededSingleAgentTacticId = "54ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c";
export const seededSingleAgentVulnerabilityId = "64ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c";

export type SeededProviderKey = "anthropic" | "local";
export type SeededRoleKey = "orchestrator" | "qa-analyst" | "pen-tester" | "reporter";

function createBinaryMissingScript(binary: string, detail: string) {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'payload="$(cat)"',
    `tool_binary=${JSON.stringify(binary)}`,
    `detail=${JSON.stringify(detail)}`,
    'if ! command -v "$tool_binary" >/dev/null 2>&1; then',
    "  node -e '",
    '    const fs = require(\"node:fs\");',
    '    const payload = JSON.parse(fs.readFileSync(0, \"utf8\") || \"{}\");',
    '    const target = payload?.request?.target ?? \"unknown-target\";',
    '    const tool = payload?.request?.tool ?? \"tool\";',
    '    const binary = process.argv[1];',
    '    const detail = process.argv[2];',
    '    console.log(JSON.stringify({',
    '      output: `${tool} could not run because ${binary} is not installed. ${detail}`.trim(),',
    '      statusReason: `Missing required binary: ${binary}`',
    "    }));",
    `  ' \"$tool_binary\" \"$detail\" <<<\"$payload\"`,
    "  exit 127",
    "fi",
    "printf '%s' \"$payload\" >/dev/null",
    `printf '%s\\n' '{\"output\":\"${binary} is installed but this seeded placeholder has not been implemented yet.\",\"statusReason\":\"Unimplemented seeded bash tool\"}'`,
    "exit 64"
  ].join("\n");
}

function createHttpxReconScript() {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'payload="$(cat)"',
    'if ! command -v httpx >/dev/null 2>&1; then',
    `  printf '%s\\n' '{"output":"HTTP Recon could not run because httpx is not installed.","statusReason":"Missing required binary: httpx"}'`,
    "  exit 127",
    "fi",
    'if ! help_output="$(httpx --help 2>&1)"; then',
    `  printf '%s\\n' '{"output":"HTTP Recon could not inspect the installed httpx binary.","statusReason":"Failed to invoke httpx --help"}'`,
    "  exit 64",
    "fi",
    'if [[ "$help_output" != *"-tech-detect"* && "$help_output" != *"-td"* ]]; then',
    `  printf '%s\\n' '{"output":"HTTP Recon found an incompatible httpx binary on this machine.","statusReason":"Installed httpx binary is not the ProjectDiscovery recon tool"}'`,
    "  exit 64",
    "fi",
    'base_url="$(printf \'%s\' \"$payload\" | node -e \'let input=\"\";process.stdin.on(\"data\",(chunk)=>input+=chunk);process.stdin.on(\"end\",()=>{const parsed=JSON.parse(input||\"{}\");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl||`http://${parsed?.request?.target||\"\"}`));});\')"',
    'if ! output="$(httpx -silent -status-code -title -tech-detect -u "$base_url" 2>&1)"; then',
    '  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"',
    '  printf \'{"output":%s,"statusReason":"httpx probe failed"}\\n\' "$escaped_output"',
    "  exit 64",
    "fi",
    'summary="${output%%$\'\\n\'*}"',
    'if [ -z "$summary" ]; then',
    '  printf \'{"output":"HTTP Recon produced no output for %s.","statusReason":"httpx probe returned an empty result"}\\n\' "$base_url"',
    "  exit 64",
    "fi",
    'escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"',
    'escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"',
    'escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"',
    'printf \'{"output":%s,"observations":[{"key":"httpx:%s","title":"HTTP surface discovered","summary":%s,"severity":"info","confidence":0.72,"evidence":%s,"technique":"httpx reconnaissance"}],"commandPreview":"httpx -silent -status-code -title -tech-detect -u %s"}\\n\' "$escaped_output" "$base_url" "$escaped_summary" "$escaped_evidence" "$base_url"'
  ].join("\n");
}

function createCurlHeadersScript() {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'payload="$(cat)"',
    'if ! command -v curl >/dev/null 2>&1; then',
    `  printf '%s\\n' '{"output":"HTTP Headers could not run because curl is not installed.","statusReason":"Missing required binary: curl"}'`,
    "  exit 127",
    "fi",
    'base_url="$(printf \'%s\' \"$payload\" | node -e \'let input=\"\";process.stdin.on(\"data\",(chunk)=>input+=chunk);process.stdin.on(\"end\",()=>{const parsed=JSON.parse(input||\"{}\");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl||`http://${parsed?.request?.target||\"\"}`));});\')"',
    'if ! output="$(curl -sS -I -L "$base_url" 2>&1)"; then',
    '  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"',
    '  printf \'{"output":%s,"statusReason":"curl header fetch failed"}\\n\' "$escaped_output"',
    "  exit 64",
    "fi",
    'summary="Collected response headers for $base_url."',
    'escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"',
    'escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"',
    'escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"',
    'printf \'{"output":%s,"observations":[{"key":"headers:%s","title":"HTTP headers collected","summary":%s,"severity":"info","confidence":0.68,"evidence":%s,"technique":"curl header fetch"}],"commandPreview":"curl -sS -I -L %s"}\\n\' "$escaped_output" "$base_url" "$escaped_summary" "$escaped_evidence" "$base_url"'
  ].join("\n");
}

function createServiceScanScript() {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'payload="$(cat)"',
    "SEED_PAYLOAD=\"$payload\" node <<'NODE'",
    'const fs = require("node:fs");',
    'const net = require("node:net");',
    "",
    'const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");',
    'const toolInput = payload?.request?.parameters?.toolInput ?? {};',
    'const target = String(toolInput.target || payload?.request?.target || "localhost");',
    'const baseUrl = typeof toolInput.baseUrl === "string" ? toolInput.baseUrl : `http://${target}`;',
    'let parsedUrl = null;',
    "try {",
    '  parsedUrl = new URL(baseUrl);',
    "} catch {}",
    'const requestedPort = Number(toolInput.port || parsedUrl?.port || 0);',
    'const candidatePorts = requestedPort > 0',
    '  ? [requestedPort]',
    '  : parsedUrl?.protocol === "https:"',
    '    ? [443]',
    '    : parsedUrl?.protocol === "http:"',
    '      ? [80]',
    '      : [];',
    'if (candidatePorts.length === 0) {',
    "  console.log(JSON.stringify({",
    '    output: `Service scan requires an explicit port or a URL with an http/https scheme. Received target=${target} baseUrl=${baseUrl}` ,',
    '    statusReason: "No explicit scan port could be derived"',
    "  }));",
    "  process.exit(64);",
    "}",
    "",
    "function probePort(host, port) {",
    "  return new Promise((resolve) => {",
    "    const socket = new net.Socket();",
    '    let banner = "";',
    "    let connected = false;",
    "    const done = (result) => {",
    "      if (!socket.destroyed) {",
    "        socket.destroy();",
    "      }",
    "      resolve(result);",
    "    };",
    '    socket.setTimeout(900);',
    '    socket.once("connect", () => {',
    "      connected = true;",
    '      socket.write(`HEAD / HTTP/1.0\\r\\nHost: ${host}\\r\\n\\r\\n`);',
    '      setTimeout(() => done({ port, open: true, banner: banner.trim() || null }), 150);',
    "    });",
    '    socket.on("data", (chunk) => {',
    '      if (banner.length < 512) {',
    "        banner += chunk.toString();",
    "      }",
    "    });",
    '    socket.once("timeout", () => done({ port, open: connected, banner: banner.trim() || null }));',
    '    socket.once("error", (error) => done({ port, open: false, banner: null, error: error.message }));',
    '    socket.once("close", () => {',
    "      if (!connected) {",
    "        return;",
    "      }",
    "      done({ port, open: true, banner: banner.trim() || null });",
    "    });",
    "    socket.connect(port, host);",
    "  });",
    "}",
    "",
    "(async () => {",
    '  const results = [];',
    "  for (const port of candidatePorts) {",
    "    results.push(await probePort(target, port));",
    "  }",
    '  const openPorts = results.filter((item) => item.open);',
    '  const observations = openPorts.map((item) => ({',
    '    key: `tcp:${target}:${item.port}`,',
    '    title: `Open TCP port ${item.port}`,',
    '    summary: `Confirmed TCP connectivity to ${target}:${item.port}.`,',
    '    severity: "info",',
    "    confidence: 0.84,",
    '    evidence: item.banner ? `Port ${item.port} responded with:\\n${item.banner}` : `TCP connection to ${target}:${item.port} succeeded.`,',
    '    technique: "lightweight TCP service probe",',
    "    port: item.port",
    "  }));",
    '  const summary = openPorts.length > 0',
    '    ? `Open ports on ${target}: ${openPorts.map((item) => item.port).join(", ")}.`',
    '    : `No tested TCP ports responded on ${target}.`; ',
    '  const outputLines = results.map((item) => item.open',
    '    ? `${target}:${item.port} open${item.banner ? ` banner=${JSON.stringify(item.banner.slice(0, 120))}` : ""}`',
    '    : `${target}:${item.port} closed${item.error ? ` error=${item.error}` : ""}`);',
    "  console.log(JSON.stringify({",
    '    output: outputLines.join("\\n"),',
    "    observations,",
    '    commandPreview: `seed-service-scan target=${target} ports=${candidatePorts.join(",")}`',
    "  }));",
    "})().catch((error) => {",
    "  console.log(JSON.stringify({",
    '    output: `Service scan failed: ${error.message}`,',
    '    statusReason: error.message',
    "  }));",
    "  process.exit(1);",
    "});",
    "NODE"
  ].join("\n");
}

function createVulnerabilityAuditScript() {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'payload="$(cat)"',
    "SEED_PAYLOAD=\"$payload\" node <<'NODE'",
    'const http = require("node:http");',
    'const https = require("node:https");',
    "",
    'const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");',
    'const toolInput = payload?.request?.parameters?.toolInput ?? {};',
    'const baseUrl = String(toolInput.baseUrl || `http://${toolInput.target || payload?.request?.target || "localhost"}`);',
    "",
    "function request(targetUrl, options = {}) {",
    "  return new Promise((resolve) => {",
    "    const url = new URL(targetUrl);",
    '    const transport = url.protocol === "https:" ? https : http;',
    "    const req = transport.request(url, { method: options.method || 'GET', headers: options.headers || {}, timeout: 2000 }, (res) => {",
    '      let body = "";',
    '      res.setEncoding("utf8");',
    '      res.on("data", (chunk) => { if (body.length < 16384) { body += chunk; } });',
    '      res.on("end", () => resolve({ url: url.toString(), statusCode: res.statusCode ?? 0, headers: res.headers, body }));',
    "    });",
    '    req.on("timeout", () => req.destroy(new Error("request timed out")));',
    '    req.on("error", (error) => resolve({ url: url.toString(), statusCode: 0, headers: {}, body: error.message, error: error.message }));',
    '    if (options.body) { req.write(options.body); }',
    "    req.end();",
    "  });",
    "}",
    "",
    "(async () => {",
    '  const findings = [];',
    '  const root = await request(baseUrl);',
    '  if (root.statusCode === 0) {',
    "    console.log(JSON.stringify({",
    '      output: `Vulnerability audit could not reach ${baseUrl}: ${root.body}`,',
    '      statusReason: "Target was unreachable during vulnerability audit"',
    "    }));",
    "    process.exit(64);",
    "  }",
    '  const admin = await request(new URL("/admin", baseUrl).toString());',
    '  const users = await request(new URL("/api/users", baseUrl).toString());',
    '  const files = await request(new URL("/files", baseUrl).toString());',
    '  if (admin.statusCode === 200 && /No authentication required|Administrator Control Panel/i.test(admin.body)) {',
    '    findings.push({',
    '      key: "audit:/admin",',
    '      title: "Unauthenticated admin panel exposed",',
    '      summary: "/admin was reachable without authentication and exposed administrative content.",',
    '      severity: "high",',
    '      confidence: 0.96,',
    '      evidence: `URL: ${admin.url}\\nStatus: ${admin.statusCode}\\nSnippet: ${admin.body.slice(0, 240)}`,',
    '      technique: "seeded vulnerability audit"',
    "    });",
    "  }",
    '  if (users.statusCode === 200 && /passwordHash|ssn|creditCard/i.test(users.body)) {',
    '    findings.push({',
    '      key: "audit:/api/users",',
    '      title: "Sensitive user data exposed without authentication",',
    '      summary: "/api/users returned sensitive records including credential or PII fields.",',
    '      severity: "high",',
    '      confidence: 0.95,',
    '      evidence: `URL: ${users.url}\\nStatus: ${users.statusCode}\\nSnippet: ${users.body.slice(0, 240)}`,',
    '      technique: "seeded vulnerability audit"',
    "    });",
    "  }",
    '  if (files.statusCode === 200 && /Index of \\/files|id_rsa|\\.env/i.test(files.body)) {',
    '    findings.push({',
    '      key: "audit:/files",',
    '      title: "Directory listing exposes sensitive filenames",',
    '      summary: "/files returned an index containing backup or secret-bearing filenames.",',
    '      severity: "medium",',
    '      confidence: 0.9,',
    '      evidence: `URL: ${files.url}\\nStatus: ${files.statusCode}\\nSnippet: ${files.body.slice(0, 240)}`,',
    '      technique: "seeded vulnerability audit"',
    "    });",
    "  }",
    '  const headerNames = Object.keys(root.headers).map((header) => header.toLowerCase());',
    '  const missing = ["content-security-policy", "x-frame-options", "x-content-type-options"].filter((header) => !headerNames.includes(header));',
    '  if (missing.length > 0) {',
    '    findings.push({',
    '      key: "audit:headers",',
    '      title: "Security headers are missing from the application response",',
    '      summary: `The root response was missing: ${missing.join(", ")}.`,',
    '      severity: "medium",',
    '      confidence: 0.87,',
    '      evidence: `URL: ${root.url}\\nStatus: ${root.statusCode}\\nMissing: ${missing.join(", ")}`,',
    '      technique: "seeded vulnerability audit"',
    "    });",
    "  }",
    '  const output = findings.length > 0',
    '    ? findings.map((finding) => `${finding.severity.toUpperCase()} ${finding.title}`).join("\\n")',
    '    : `No seeded vulnerability signals were confirmed at ${baseUrl}.`;',
    "  console.log(JSON.stringify({",
    "    output,",
    '    observations: findings,',
    '    commandPreview: `seed-vuln-audit baseUrl=${baseUrl}`',
    "  }));",
    "})().catch((error) => {",
    "  console.log(JSON.stringify({",
    '    output: `Vulnerability audit failed: ${error.message}`,',
    '    statusReason: error.message',
    "  }));",
    "  process.exit(1);",
    "});",
    "NODE"
  ].join("\n");
}

function createSqlInjectionCheckScript() {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'payload="$(cat)"',
    "SEED_PAYLOAD=\"$payload\" node <<'NODE'",
    'const http = require("node:http");',
    'const https = require("node:https");',
    "",
    'const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");',
    'const toolInput = payload?.request?.parameters?.toolInput ?? {};',
    'const baseUrl = String(toolInput.baseUrl || `http://${toolInput.target || payload?.request?.target || "localhost"}`);',
    'const loginUrl = new URL("/login", baseUrl).toString();',
    'const body = "username=%27%20OR%20%271%27%3D%271&password=test";',
    "",
    "function submit(targetUrl, requestBody) {",
    "  return new Promise((resolve) => {",
    "    const url = new URL(targetUrl);",
    '    const transport = url.protocol === "https:" ? https : http;',
    "    const req = transport.request(url, {",
    "      method: 'POST',",
    "      timeout: 2000,",
    "      headers: {",
    "        'content-type': 'application/x-www-form-urlencoded',",
    "        'content-length': Buffer.byteLength(requestBody)",
    "      }",
    "    }, (res) => {",
    '      let responseBody = "";',
    '      res.setEncoding("utf8");',
    '      res.on("data", (chunk) => { if (responseBody.length < 16384) { responseBody += chunk; } });',
    '      res.on("end", () => resolve({ url: url.toString(), statusCode: res.statusCode ?? 0, body: responseBody }));',
    "    });",
    '    req.on("timeout", () => req.destroy(new Error("request timed out")));',
    '    req.on("error", (error) => resolve({ url: url.toString(), statusCode: 0, body: error.message, error: error.message }));',
    "    req.write(requestBody);",
    "    req.end();",
    "  });",
    "}",
    "",
    "(async () => {",
    '  const result = await submit(loginUrl, body);',
    '  if (result.statusCode === 0) {',
    "    console.log(JSON.stringify({",
    '      output: `SQL injection check could not reach ${loginUrl}: ${result.body}`,',
    '      statusReason: "Login endpoint was unreachable during SQL injection check"',
    "    }));",
    "    process.exit(64);",
    "  }",
    '  const indicators = [/Authentication bypassed via SQL injection/i, /\"success\"\\s*:\\s*true/i, /SELECT \\* FROM users/i, /\"user\"\\s*:\\s*\\{/i];',
    '  const matched = indicators.filter((indicator) => indicator.test(result.body));',
    '  const observations = matched.length > 0 ? [{',
    '    key: "sqli:/login",',
    '    title: "Login endpoint appears injectable with a classic quote payload",',
    '    summary: "/login accepted a quote-based payload and returned an authentication bypass signal.",',
    '    severity: "high",',
    '    confidence: 0.97,',
    "    evidence: `URL: ${result.url}\\nStatus: ${result.statusCode}\\nPayload: username=' OR '1'='1\\nSnippet: ${result.body.slice(0, 320)}`,",
    '    technique: "seeded SQL injection check"',
    '  }] : [];',
    '  const output = observations.length > 0',
    '    ? `HIGH ${observations[0].title}`',
    '    : `No SQL injection bypass signal was confirmed at ${loginUrl}. Status=${result.statusCode}.`;',
    "  console.log(JSON.stringify({",
    "    output,",
    "    observations,",
    '    commandPreview: `seed-sql-injection-check url=${loginUrl}`',
    "  }));",
    "})().catch((error) => {",
    "  console.log(JSON.stringify({",
    '    output: `SQL injection check failed: ${error.message}`,',
    '    statusReason: error.message',
    "  }));",
    "  process.exit(1);",
    "});",
    "NODE"
  ].join("\n");
}

function createContentDiscoveryScript() {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'payload="$(cat)"',
    "SEED_PAYLOAD=\"$payload\" node <<'NODE'",
    'const fs = require("node:fs");',
    'const http = require("node:http");',
    'const https = require("node:https");',
    "",
    'const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");',
    'const toolInput = payload?.request?.parameters?.toolInput ?? {};',
    'const baseUrl = String(toolInput.baseUrl || `http://${toolInput.target || payload?.request?.target || "localhost"}`);',
    'const paths = ["/", "/admin", "/login", "/api/users", "/files", "/search", "/robots.txt", "/sitemap.xml", "/.env", "/.git/config"];',
    "",
    "function requestPath(base, path) {",
    "  return new Promise((resolve) => {",
    "    const target = new URL(path, base);",
    '    const transport = target.protocol === "https:" ? https : http;',
    "    const req = transport.request(target, { method: 'GET', timeout: 1500 }, (res) => {",
    '      let body = "";',
    '      res.setEncoding("utf8");',
    '      res.on("data", (chunk) => { if (body.length < 1024) { body += chunk; } });',
    '      res.on("end", () => resolve({',
    '        path: target.pathname,',
    "        url: target.toString(),",
    "        statusCode: res.statusCode ?? 0,",
    '        location: res.headers.location ?? null,',
    '        snippet: body.slice(0, 240)',
    "      }));",
    "    });",
    '    req.on("timeout", () => req.destroy(new Error("request timed out")));',
    '    req.on("error", (error) => resolve({ path: new URL(path, base).pathname, url: new URL(path, base).toString(), statusCode: 0, location: null, snippet: error.message }));',
    "    req.end();",
    "  });",
    "}",
    "",
    "(async () => {",
    '  const results = [];',
    "  for (const path of paths) {",
    "    results.push(await requestPath(baseUrl, path));",
    "  }",
    '  const discoveries = results.filter((item) => item.statusCode > 0 && item.statusCode < 400);',
    '  const observations = discoveries.map((item) => ({',
    '    key: `content:${item.path}`,',
    '    title: `Discovered content at ${item.path}`,',
    '    summary: `Path ${item.path} returned HTTP ${item.statusCode}.`,',
    '    severity: item.path === "/admin" || item.path === "/api/users" ? "medium" : "info",',
    '    confidence: item.path === "/" ? 0.72 : 0.8,',
    '    evidence: `URL: ${item.url}\\nStatus: ${item.statusCode}${item.location ? `\\nLocation: ${item.location}` : ""}${item.snippet ? `\\nSnippet: ${item.snippet}` : ""}`,',
    '    technique: "seeded content discovery" ',
    "  }));",
    '  const summary = discoveries.length > 0',
    '    ? `Discovered ${discoveries.length} reachable path(s): ${discoveries.map((item) => item.path).join(", ")}.`',
    '    : `No candidate paths returned a positive response from ${baseUrl}.`;',
    '  const output = results.map((item) => `${item.statusCode || "ERR"} ${item.path}${item.location ? ` -> ${item.location}` : ""}`).join("\\n");',
    "  console.log(JSON.stringify({",
    "    output,",
    "    observations,",
    '    commandPreview: `seed-content-discovery baseUrl=${baseUrl}`',
    "  }));",
    "})().catch((error) => {",
    "  console.log(JSON.stringify({",
    '    output: `Content discovery failed: ${error.message}`,',
    '    statusReason: error.message',
    "  }));",
    "  process.exit(1);",
    "});",
    "NODE"
  ].join("\n");
}

function createWebCrawlScript() {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'payload="$(cat)"',
    "SEED_PAYLOAD=\"$payload\" node <<'NODE'",
    'const fs = require("node:fs");',
    'const http = require("node:http");',
    'const https = require("node:https");',
    "",
    'const payload = JSON.parse(process.env.SEED_PAYLOAD || "{}");',
    'const toolInput = payload?.request?.parameters?.toolInput ?? {};',
    'const startUrl = String(toolInput.baseUrl || `http://${toolInput.target || payload?.request?.target || "localhost"}`);',
    'const maxPages = 8;',
    'const start = new URL(startUrl);',
    'const origin = start.origin;',
    "",
    "function fetchPage(url) {",
    "  return new Promise((resolve) => {",
    "    const target = new URL(url);",
    '    const transport = target.protocol === "https:" ? https : http;',
    "    const req = transport.request(target, { method: 'GET', timeout: 1500 }, (res) => {",
    '      let body = "";',
    '      res.setEncoding("utf8");',
    '      res.on("data", (chunk) => { if (body.length < 16384) { body += chunk; } });',
    '      res.on("end", () => resolve({',
    "        url: target.toString(),",
    '        statusCode: res.statusCode ?? 0,',
    '        contentType: String(res.headers["content-type"] || ""),',
    "        body",
    "      }));",
    "    });",
    '    req.on("timeout", () => req.destroy(new Error("request timed out")));',
    '    req.on("error", (error) => resolve({ url: target.toString(), statusCode: 0, contentType: "", body: error.message }));',
    "    req.end();",
    "  });",
    "}",
    "",
    "function extractLinks(baseUrl, html) {",
    "  const hrefRegex = /href\\s*=\\s*[\"']([^\"'#]+)[\"']/gi;",
    '  const links = new Set();',
    '  for (const match of html.matchAll(hrefRegex)) {',
    '    const href = match[1];',
    '    try {',
    '      const absolute = new URL(href, baseUrl);',
    '      if (absolute.origin === origin) {',
    '        links.add(absolute.toString());',
    "      }",
    "    } catch {}",
    "  }",
    "  return Array.from(links);",
    "}",
    "",
    "(async () => {",
    '  const queue = [start.toString()];',
    '  const visited = new Set();',
    '  const pages = [];',
    "  while (queue.length > 0 && pages.length < maxPages) {",
    "    const url = queue.shift();",
    "    if (!url || visited.has(url)) {",
    "      continue;",
    "    }",
    "    visited.add(url);",
    "    const page = await fetchPage(url);",
    "    pages.push(page);",
    '    if (page.statusCode >= 200 && page.statusCode < 400 && page.contentType.includes("text/html")) {',
    "      for (const link of extractLinks(url, page.body)) {",
    "        if (!visited.has(link) && queue.length + pages.length < maxPages * 2) {",
    "          queue.push(link);",
    "        }",
    "      }",
    "    }",
    "  }",
    '  const discovered = pages.filter((page) => page.statusCode > 0).map((page) => {',
    '    const url = new URL(page.url);',
    '    return { path: `${url.pathname}${url.search}`, statusCode: page.statusCode, url: page.url };',
    "  });",
    '  const observations = discovered.map((page) => ({',
    '    key: `crawl:${page.path || "/"}`,',
    '    title: `Crawled ${page.path || "/"}`,',
    '    summary: `${page.path || "/"} responded with HTTP ${page.statusCode}.`,',
    '    severity: "info",',
    "    confidence: 0.78,",
    '    evidence: `URL: ${page.url}\\nStatus: ${page.statusCode}`,',
    '    technique: "seeded web crawl"',
    "  }));",
    '  const output = discovered.length > 0',
    '    ? discovered.map((page) => `${page.statusCode} ${page.path || "/"}`).join("\\n")',
    '    : `No crawlable pages returned a response from ${startUrl}.`;',
    "  console.log(JSON.stringify({",
    "    output,",
    "    observations,",
    '    commandPreview: `seed-web-crawl startUrl=${startUrl}`',
    "  }));",
    "})().catch((error) => {",
    "  console.log(JSON.stringify({",
    '    output: `Web crawl failed: ${error.message}`,',
    '    statusReason: error.message',
    "  }));",
    "  process.exit(1);",
    "});",
    "NODE"
  ].join("\n");
}

function createBashProbeScript() {
  return [
    "#!/usr/bin/env bash",
    "set -euo pipefail",
    'payload="$(cat)"',
    'target="$(printf \'%s\' \"$payload\" | node -e \'let input=\"\";process.stdin.on(\"data\",(chunk)=>input+=chunk);process.stdin.on(\"end\",()=>{const parsed=JSON.parse(input||\"{}\");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.target||parsed?.request?.target||\"unknown-target\"));});\')"',
    'base_url="$(printf \'%s\' \"$payload\" | node -e \'let input=\"\";process.stdin.on(\"data\",(chunk)=>input+=chunk);process.stdin.on(\"end\",()=>{const parsed=JSON.parse(input||\"{}\");const toolInput=parsed?.request?.parameters?.toolInput??{};const target=String(toolInput.target||parsed?.request?.target||\"unknown-target\");process.stdout.write(String(toolInput.baseUrl||`http://${target}`));});\')"',
    'now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"',
    'output="Bash probe recorded target=$target baseUrl=$base_url at $now."',
    'summary="Captured deterministic probe metadata for $target."',
    'evidence="target=$target\nbaseUrl=$base_url\ntimestamp=$now"',
    'escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"',
    'escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"',
    'escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$evidence")"',
    'printf \'{"output":%s,"observations":[{"key":"bash-probe:%s","title":"Bash probe completed","summary":%s,"severity":"info","confidence":0.99,"evidence":%s,"technique":"local bash probe"}],"commandPreview":"bash-probe %s"}\\n\' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$base_url"'
  ].join("\n");
}

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
    executorType: "bash" as const,
    bashSource: createHttpxReconScript(),
    capabilities: ["web-recon", "passive"],
    binary: "httpx",
    category: "web" as const,
    riskTier: "passive" as const,
    notes: "Starter reconnaissance tool for orchestrator, QA, and pen-test flows.",
    sandboxProfile: "network-recon" as const,
    privilegeProfile: "read-only-network" as const,
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
    }
  },
  {
    id: "seed-http-headers",
    name: "HTTP Headers",
    description: "Fetch final HTTP response headers for a target URL using curl.",
    executorType: "bash" as const,
    bashSource: createCurlHeadersScript(),
    capabilities: ["web-recon", "passive"],
    binary: "curl",
    category: "web" as const,
    riskTier: "passive" as const,
    notes: "Fast header collection tool that works well in demo environments.",
    sandboxProfile: "network-recon" as const,
    privilegeProfile: "read-only-network" as const,
    timeoutMs: 30000,
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
    }
  },
  {
    id: "seed-bash-probe",
    name: "Bash Probe",
    description: "Run a deterministic local bash probe that confirms input wiring and structured JSON output.",
    executorType: "bash" as const,
    bashSource: createBashProbeScript(),
    capabilities: ["passive"],
    binary: "bash",
    category: "utility" as const,
    riskTier: "passive" as const,
    notes: "Useful for smoke tests and demo verification of the bash tool path.",
    sandboxProfile: "read-only-parser" as const,
    privilegeProfile: "read-only-network" as const,
    timeoutMs: 10000,
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
    }
  },
  {
    id: "seed-web-crawl",
    name: "Web Crawl",
    description: "Crawl discovered web targets to expand reachable content and endpoints.",
    executorType: "bash" as const,
    bashSource: createWebCrawlScript(),
    capabilities: ["web-recon", "content-discovery", "passive"],
    binary: "node",
    category: "content" as const,
    riskTier: "passive" as const,
    notes: "Useful for orchestrator planning and pen-test discovery.",
    sandboxProfile: "network-recon" as const,
    privilegeProfile: "read-only-network" as const,
    timeoutMs: 180000,
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" },
        baseUrl: { type: "string" }
      },
      required: ["target", "baseUrl"]
    },
    outputSchema: {
      type: "object",
      properties: {
        output: { type: "string" }
      },
      required: ["output"]
    }
  },
  {
    id: "seed-service-scan",
    name: "Service Scan",
    description: "Enumerate exposed ports and identify reachable network services.",
    executorType: "bash" as const,
    bashSource: createServiceScanScript(),
    capabilities: ["network-recon", "passive"],
    binary: "node",
    category: "network" as const,
    riskTier: "passive" as const,
    notes: "Primary network discovery tool for orchestrator and pen-tester roles.",
    sandboxProfile: "network-recon" as const,
    privilegeProfile: "read-only-network" as const,
    timeoutMs: 180000,
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" },
        port: { type: "number" }
      },
      required: ["target"]
    },
    outputSchema: {
      type: "object",
      properties: {
        output: { type: "string" }
      }
    }
  },
  {
    id: "seed-content-discovery",
    name: "Content Discovery",
    description: "Brute-force common content paths to expand the application attack surface.",
    executorType: "bash" as const,
    bashSource: createContentDiscoveryScript(),
    capabilities: ["content-discovery", "active-recon"],
    binary: "node",
    category: "content" as const,
    riskTier: "active" as const,
    notes: "Assigned to orchestrator and pen-tester roles for path discovery.",
    sandboxProfile: "active-recon" as const,
    privilegeProfile: "active-network" as const,
    timeoutMs: 30000,
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" },
        baseUrl: { type: "string" }
      },
      required: ["target", "baseUrl"]
    },
    outputSchema: {
      type: "object",
      properties: {
        output: { type: "string" }
      }
    }
  },
  {
    id: "seed-vuln-audit",
    name: "Vulnerability Audit",
    description: "Run known issue checks against a target and summarize likely findings.",
    executorType: "bash" as const,
    bashSource: createVulnerabilityAuditScript(),
    capabilities: ["vulnerability-audit", "active-recon"],
    binary: "node",
    category: "web" as const,
    riskTier: "active" as const,
    notes: "Shared between QA and pen-test roles for controlled active validation.",
    sandboxProfile: "active-recon" as const,
    privilegeProfile: "active-network" as const,
    timeoutMs: 45000,
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" },
        baseUrl: { type: "string" }
      },
      required: ["target", "baseUrl"]
    },
    outputSchema: {
      type: "object",
      properties: {
        output: { type: "string" }
      }
    }
  },
  {
    id: "seed-sql-injection-check",
    name: "SQL Injection Check",
    description: "Perform controlled database injection validation against approved targets.",
    executorType: "bash" as const,
    bashSource: createSqlInjectionCheckScript(),
    capabilities: ["database-security", "controlled-exploit"],
    binary: "node",
    category: "web" as const,
    riskTier: "controlled-exploit" as const,
    notes: "Restricted pen-test tool for controlled exploit validation.",
    sandboxProfile: "controlled-exploit-lab" as const,
    privilegeProfile: "controlled-exploit" as const,
    timeoutMs: 45000,
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string" },
        baseUrl: { type: "string" }
      },
      required: ["target", "baseUrl"]
    },
    outputSchema: {
      type: "object",
      properties: {
        output: { type: "string" }
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
      "You are the orchestration lead for SynoSec. Build a disciplined plan from the current target state, choose the next highest-value evidence action, stay inside approved scope, and use only the approved tools. Keep the run prompt-driven: select the OSI layer you believe the action supports, explain that choice clearly, and prefer target/baseUrl/layer tool inputs over vague url-only shapes. Canonical OSI mapping: L1 Physical, L2 Data Link, L3 Network, L4 Transport, L5 Session, L6 Presentation, L7 Application. Prefer evidence gathering before escalation, keep a concise running rationale, and stop when additional actions do not materially improve confidence or coverage.",
    toolIds: ["seed-http-recon", "seed-http-headers", "seed-bash-probe", "seed-web-crawl", "seed-service-scan", "seed-content-discovery"] as const
  },
  {
    key: "qa-analyst" as const,
    name: "QA Analyst",
    description: "Validates evidence quality, cross-checks findings, and identifies confidence gaps.",
    systemPrompt:
      "You are the QA analyst for SynoSec. Review evidence for consistency, verify that findings are supported, call out uncertainty, and recommend the smallest follow-up needed to confirm or reject a claim. Prefer reproducibility, precise language, and conservative confidence scoring over speculation.",
    toolIds: ["seed-http-recon", "seed-http-headers", "seed-bash-probe", "seed-vuln-audit"] as const
  },
  {
    key: "pen-tester" as const,
    name: "Pen-Tester",
    description: "Performs controlled offensive validation against approved targets and evidence paths.",
    systemPrompt:
      "You are the pen-tester for SynoSec. Use approved active techniques to validate exploitable conditions, prioritize realistic attack paths, and preserve a clean evidence trail. Stay inside scope, prefer the least invasive validation that proves impact, and clearly separate confirmed exploitation from hypothesis.",
    toolIds: [
      "seed-http-recon",
      "seed-http-headers",
      "seed-bash-probe",
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
    toolIds: ["seed-http-recon", "seed-http-headers", "seed-bash-probe"] as const
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
      id: osiSingleAgentWorkflowId,
      name: "OSI Single-Agent",
      status: "active" as const,
      description: "Seeded single-agent workflow that runs one prompt-driven OSI security pass with the single-agent security runner, approved tools, verifier challenges, and evidence-backed reporting.",
      applicationId: localApplicationId,
      runtimeId: targetRuntimeId,
      stages: [
        {
          id: "6e54b520-366c-4acb-9e36-a6cfe1c07fd3",
          label: "OSI Security Pass",
          agentId: seededAgentId("local", "orchestrator"),
          objective: "Run one evidence-backed, prompt-driven single-agent security pass across the configured OSI layers using the approved tools, record explicit layer reasoning, and submit a structured closeout.",
          allowedToolIds: [
            ...getSeededRoleDefinition("orchestrator")?.toolIds ?? [],
            "seed-vuln-audit"
          ],
          requiredEvidenceTypes: [],
          findingPolicy: {
            taxonomy: "typed-core-v1",
            allowedTypes: [
              "service_exposure",
              "content_discovery",
              "missing_security_header",
              "tls_weakness",
              "injection_signal",
              "auth_weakness",
              "sensitive_data_exposure",
              "misconfiguration",
              "other"
            ]
          },
          completionRule: {
            requireStageResult: true,
            requireToolCall: false,
            allowEmptyResult: true,
            minFindings: 0
          },
          resultSchemaVersion: 1,
          handoffSchema: null
        }
      ]
    }
  ] as const;
}

export function getSeededSingleAgentScanDefinition() {
  return {
    workflowId: osiSingleAgentWorkflowId,
    id: seededSingleAgentScanId,
    mode: "single-agent" as const,
    applicationId: localApplicationId,
    runtimeId: targetRuntimeId,
    agentId: seededAgentId("local", "orchestrator"),
    scan: {
      id: seededSingleAgentScanId,
      scope: {
        targets: ["localhost:8888"],
        exclusions: [],
        layers: ["L1", "L4", "L7"] as const,
        maxDepth: 3,
        maxDurationMinutes: 10,
        rateLimitRps: 5,
        allowActiveExploits: false,
        graceEnabled: true,
        graceRoundInterval: 3,
        cyberRangeMode: "simulation" as const
      },
      status: "complete" as const,
      currentRound: 3,
      tacticsTotal: 8,
      tacticsComplete: 3,
      createdAt: "2026-04-21T12:00:00.000Z",
      completedAt: "2026-04-21T12:03:00.000Z"
    },
    llm: {
      provider: "local" as const,
      model: process.env["LLM_LOCAL_MODEL"] ?? "qwen3:1.7b",
      baseUrl: process.env["LLM_LOCAL_BASE_URL"] ?? "http://127.0.0.1:11434",
      apiPath: "/api/chat"
    },
    stopReason: "submitted_completion",
    summary: {
      summary: "Seeded single-agent scan completed with one structured application-layer finding and explicit coverage gaps for unsupported layers.",
      residualRisk: "L1 remains not covered in the local demo and transport validation is only partial.",
      recommendedNextStep: "Run a fresh single-agent scan to gather live evidence from the current target state."
    },
    tactic: {
      id: seededSingleAgentTacticId,
      scanId: seededSingleAgentScanId,
      target: "localhost",
      layer: "L7" as const,
      service: "http",
      port: 8888,
      riskScore: 0.82,
      status: "complete" as const,
      parentTacticId: null,
      depth: 0,
      createdAt: "2026-04-21T12:00:00.000Z"
    },
    vulnerability: {
      id: seededSingleAgentVulnerabilityId,
      scanId: seededSingleAgentScanId,
      agentId: seededAgentId("local", "orchestrator"),
      primaryLayer: "L7" as const,
      relatedLayers: ["L6"] as const,
      category: "auth_weakness",
      title: "Weak session token handling",
      description: "The seeded demo response indicates session handling that is not rotated aggressively after privilege-sensitive transitions.",
      impact: "A compromised session could remain useful longer than intended.",
      recommendation: "Rotate session tokens on login and privilege change, and shorten token lifetime for sensitive flows.",
      severity: "medium" as const,
      confidence: 0.82,
      validationStatus: "single_source" as const,
      target: {
        host: "localhost",
        port: 8888,
        url: "http://localhost:8888/login",
        path: "/login",
        service: "http"
      },
      evidence: [
        {
          sourceTool: "seed-http-headers",
          quote: "Session cookie behavior indicates the token is long-lived in the seeded demo path.",
          artifactRef: "seed-artifact:http-headers",
          toolRunRef: "seed-tool-run:http-headers"
        }
      ],
      technique: "seeded HTTP session analysis",
      reproduction: {
        commandPreview: "curl -sS -I http://localhost:8888/login",
        steps: [
          "Request the login endpoint headers.",
          "Inspect session cookie properties and issuance behavior."
        ]
      },
      tags: ["seeded", "session", "application"],
      createdAt: "2026-04-21T12:01:00.000Z"
    },
    layerCoverage: [
      {
        scanId: seededSingleAgentScanId,
        layer: "L1" as const,
        coverageStatus: "not_covered" as const,
        confidenceSummary: "No physical-layer evidence path exists in the local seeded demo.",
        toolRefs: [],
        evidenceRefs: [],
        vulnerabilityIds: [],
        gaps: ["No L1 tool path is implemented for the local demo."],
        updatedAt: "2026-04-21T12:02:00.000Z"
      },
      {
        scanId: seededSingleAgentScanId,
        layer: "L4" as const,
        coverageStatus: "partially_covered" as const,
        confidenceSummary: "The seeded scan confirms the HTTP service port is reachable but does not perform deep transport validation.",
        toolRefs: ["seed-service-scan"],
        evidenceRefs: ["seed-artifact:service-scan"],
        vulnerabilityIds: [],
        gaps: ["Only a lightweight service probe was recorded."],
        updatedAt: "2026-04-21T12:02:30.000Z"
      },
      {
        scanId: seededSingleAgentScanId,
        layer: "L7" as const,
        coverageStatus: "covered" as const,
        confidenceSummary: "The seeded scan collected application-layer evidence and persisted one structured vulnerability.",
        toolRefs: ["seed-http-recon", "seed-http-headers"],
        evidenceRefs: ["seed-artifact:http-recon", "seed-artifact:http-headers"],
        vulnerabilityIds: [seededSingleAgentVulnerabilityId],
        gaps: [],
        updatedAt: "2026-04-21T12:03:00.000Z"
      }
    ],
    auditEntries: [
      {
        id: "74ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c",
        scanId: seededSingleAgentScanId,
        timestamp: "2026-04-21T12:00:00.000Z",
        actor: "single-agent-scan",
        action: "single-agent-scan-started",
        targetTacticId: seededSingleAgentTacticId,
        scopeValid: true,
        details: {
          applicationId: localApplicationId,
          runtimeId: targetRuntimeId,
          agentId: seededAgentId("local", "orchestrator"),
          target: "http://localhost:8888",
          layers: ["L1", "L4", "L7"]
        }
      },
      {
        id: "84ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c",
        scanId: seededSingleAgentScanId,
        timestamp: "2026-04-21T12:01:00.000Z",
        actor: "single-agent-scan",
        action: "single-agent-vulnerability-reported",
        targetTacticId: seededSingleAgentTacticId,
        scopeValid: true,
        details: {
          vulnerabilityId: seededSingleAgentVulnerabilityId,
          title: "Weak session token handling",
          severity: "medium",
          primaryLayer: "L7"
        }
      },
      {
        id: "94ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c",
        scanId: seededSingleAgentScanId,
        timestamp: "2026-04-21T12:03:00.000Z",
        actor: "single-agent-scan",
        action: "single-agent-scan-completed",
        targetTacticId: seededSingleAgentTacticId,
        scopeValid: true,
        details: {
          stopReason: "submitted_completion",
          vulnerabilityCount: 1,
          coverageLayers: ["L1", "L4", "L7"]
        }
      }
    ]
  } as const;
}
