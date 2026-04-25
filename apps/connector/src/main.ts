import { toolCapabilityTagSchema, toolPrivilegeProfileSchema, toolSandboxProfileSchema } from "@synosec/contracts";
import { SynoSecConnectorClient } from "./index.js";
import { loadConnectorEnv } from "./env.js";
import { detectInstalledBinaries } from "./installed-binaries.js";

function parseAllowedCapabilities(values: string[]): Array<ReturnType<typeof toolCapabilityTagSchema.parse>> {
  return values.map((value) => toolCapabilityTagSchema.parse(value));
}

function parseAllowedSandboxProfiles(values: string[]): Array<ReturnType<typeof toolSandboxProfileSchema.parse>> {
  return values.map((value) => toolSandboxProfileSchema.parse(value));
}

function parseAllowedPrivilegeProfiles(values: string[]): Array<ReturnType<typeof toolPrivilegeProfileSchema.parse>> {
  return values.map((value) => toolPrivilegeProfileSchema.parse(value));
}

async function main() {
  const env = loadConnectorEnv();
  const installedBinaries = detectInstalledBinaries();
  const client = new SynoSecConnectorClient({
    baseUrl: env.controlPlaneUrl,
    token: env.sharedToken,
    commandTimeoutMs: env.commandTimeoutMs,
    registration: {
      name: env.name,
      version: env.version,
      allowedCapabilities: parseAllowedCapabilities(env.allowedCapabilities),
      allowedSandboxProfiles: parseAllowedSandboxProfiles(env.allowedSandboxProfiles),
      allowedPrivilegeProfiles: parseAllowedPrivilegeProfiles(env.allowedPrivilegeProfiles),
      installedBinaries,
      runMode: env.runMode,
      concurrency: 1,
      capabilities: [
        {
          key: "hostname",
          value: env.hostname
        }
      ]
    }
  });

  await client.register();

  while (true) {
    await client.runOnce();
    await new Promise((resolve) => setTimeout(resolve, env.pollIntervalMs));
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
