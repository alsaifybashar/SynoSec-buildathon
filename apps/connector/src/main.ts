import { toolCapabilityTagSchema, toolPrivilegeProfileSchema, toolSandboxProfileSchema } from "@synosec/contracts";
import { SynoSecConnectorClient } from "./index.js";
import { loadConnectorEnv } from "./env.js";
import { detectInstalledBinaries } from "./installed-binaries.js";

const MAX_REGISTER_RETRY_DELAY_MS = 10_000;

function parseAllowedCapabilities(values: string[]): Array<ReturnType<typeof toolCapabilityTagSchema.parse>> {
  return values.map((value) => toolCapabilityTagSchema.parse(value));
}

function parseAllowedSandboxProfiles(values: string[]): Array<ReturnType<typeof toolSandboxProfileSchema.parse>> {
  return values.map((value) => toolSandboxProfileSchema.parse(value));
}

function parseAllowedPrivilegeProfiles(values: string[]): Array<ReturnType<typeof toolPrivilegeProfileSchema.parse>> {
  return values.map((value) => toolPrivilegeProfileSchema.parse(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function registerWithRetry(client: SynoSecConnectorClient) {
  let attempt = 0;

  while (true) {
    try {
      return await client.register();
    } catch (error) {
      attempt += 1;
      const delayMs = Math.min(1_000 * attempt, MAX_REGISTER_RETRY_DELAY_MS);
      console.error(`Connector registration failed; retrying in ${delayMs}ms. ${errorMessage(error)}`);
      await sleep(delayMs);
    }
  }
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

  await registerWithRetry(client);

  while (true) {
    try {
      await client.runOnce();
    } catch (error) {
      console.error(`Connector run loop error; re-registering. ${errorMessage(error)}`);
      client.invalidateRegistration();
      await registerWithRetry(client);
    }
    await new Promise((resolve) => setTimeout(resolve, env.pollIntervalMs));
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
