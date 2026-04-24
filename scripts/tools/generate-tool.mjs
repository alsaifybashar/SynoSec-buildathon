import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '../../');

function generate(options) {
  const { name, binary, category, description, capabilities, riskTier, sandboxProfile, privilegeProfile, commandArgs } = options;
  const toolId = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const className = name.replace(/[^a-zA-Z0-9]/g, '');
  const variableName = className.charAt(0).toLowerCase() + className.slice(1) + 'Tool';

  const tsPath = path.join(rootDir, 'apps/backend/prisma/seed-data/tools', category, `${toolId}.ts`);
  const shPath = path.join(rootDir, 'scripts/tools', category, `${toolId}.sh`);

  // Ensure directories exist
  fs.mkdirSync(path.dirname(tsPath), { recursive: true });
  fs.mkdirSync(path.dirname(shPath), { recursive: true });

  const tsContent = `import { loadSeedToolScript } from "../load-script.js";

export const ${variableName} = {
  id: "seed-${toolId}",
  name: "${name}",
  description: "${description}",
  executorType: "bash" as const,
  get bashSource() {
    return loadSeedToolScript(import.meta.url, "scripts/tools/${category}/${toolId}.sh");
  },
  capabilities: ${JSON.stringify(capabilities)},
  binary: "${binary}",
  category: "${category}" as const,
  riskTier: "${riskTier || 'passive'}" as const,
  notes: "Wrapper around ${name} for seeded execution.",
  sandboxProfile: "${sandboxProfile || 'network-recon'}" as const,
  privilegeProfile: "${privilegeProfile || 'read-only-network'}" as const,
  timeoutMs: 180000,
  inputSchema: {
    type: "object",
    properties: {
      target: { type: "string" },
      baseUrl: { type: "string" }
    }
  },
  outputSchema: {
    type: "object",
    properties: {
      output: { type: "string" },
      observations: { type: "array" }
    },
    required: ["output"]
  }
} as const;
`;

  const shContent = `#!/usr/bin/env bash
set -euo pipefail

payload="$(cat)"

if ! command -v ${binary} >/dev/null 2>&1; then
  printf '%s\\n' '{"output":"${name} could not run because ${binary} is not installed.","statusReason":"Missing required binary: ${binary}"}'
  exit 127
fi

target="$(printf '%s' "$payload" | node -e 'let input="";process.stdin.on("data",(chunk)=>input+=chunk);process.stdin.on("end",()=>{const parsed=JSON.parse(input||"{}");const toolInput=parsed?.request?.parameters?.toolInput??{};process.stdout.write(String(toolInput.baseUrl || toolInput.target || parsed?.request?.target || "localhost"));});')"

if ! output="$(${binary} ${commandArgs} "$target" 2>&1)"; then
  escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
  printf '{"output":%s,"statusReason":"${name} failed","commandPreview":"${binary} ${commandArgs} %s"}\\n' "$escaped_output" "$target"
  exit 64
fi

summary="${name} completed assessment against $target."
escaped_output="$(node -p "JSON.stringify(process.argv[1])" "$output")"
escaped_summary="$(node -p "JSON.stringify(process.argv[1])" "$summary")"
escaped_evidence="$(node -p "JSON.stringify(process.argv[1])" "$output")"
printf '{"output":%s,"observations":[{"key":"${toolId}:%s","title":"${name} completed","summary":%s,"severity":"info","confidence":0.7,"evidence":%s,"technique":"${name} assessment"}],"commandPreview":"${binary} ${commandArgs} %s"}\\n' "$escaped_output" "$target" "$escaped_summary" "$escaped_evidence" "$target"
`;

  fs.writeFileSync(tsPath, tsContent);
  fs.writeFileSync(shPath, shContent);
  fs.chmodSync(shPath, 0o755);

  console.log(`Generated ${name}:`);
  console.log(`  TS: ${tsPath}`);
  console.log(`  SH: ${shPath}`);
}

const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  options[key] = value;
}

if (options.capabilities) options.capabilities = options.capabilities.split(',');

if (!options.name || !options.binary || !options.category) {
  console.error('Usage: node generate-tool.mjs --name "Tool Name" --binary "binary" --category "category" [--description "desc"] [--capabilities "cap1,cap2"] [--commandArgs "-v"]');
  process.exit(1);
}

generate(options);
