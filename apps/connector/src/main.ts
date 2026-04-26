import { toolCapabilityTagSchema, toolPrivilegeProfileSchema, toolSandboxProfileSchema } from "@synosec/contracts";
import { ConnectorClientError, SynoSecConnectorClient } from "./index.js";
import { loadConnectorEnv } from "./env.js";
import { detectInstalledBinaries } from "./installed-binaries.js";

const MAX_RECOVERY_DELAY_MS = 30_000;
const ERROR_LOG_THROTTLE_WINDOW_MS = 30_000;

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

function computeBackoffDelayMs(attempt: number) {
  const boundedAttempt = Math.max(1, attempt);
  const exponential = Math.min(1_000 * (2 ** (boundedAttempt - 1)), MAX_RECOVERY_DELAY_MS);
  const jitter = Math.floor(exponential * Math.random() * 0.2);
  return Math.min(MAX_RECOVERY_DELAY_MS, exponential + jitter);
}

function shouldInvalidateRegistration(error: unknown) {
  if (!(error instanceof ConnectorClientError)) {
    return false;
  }

  if (error.status === null) {
    return true;
  }

  return error.status === 401 || error.status === 403 || error.status === 404;
}

function errorFingerprint(error: unknown) {
  if (error instanceof ConnectorClientError) {
    const summary = error.body ? error.body.slice(0, 160) : error.message;
    return `${error.phase}:${error.status ?? "network"}:${summary}`;
  }
  return errorMessage(error);
}

function formatRecoveryMessage(error: unknown, attempt: number, delayMs: number, invalidated: boolean) {
  if (error instanceof ConnectorClientError) {
    const detail = error.status === null
      ? `${error.message}: ${errorMessage(error.causeError)}`
      : `${error.message}: ${error.body ?? "<empty>"}`;
    const reRegisterNote = invalidated ? " Re-registering on next loop." : "";
    return `Connector recovery attempt ${attempt}: ${detail}${reRegisterNote} Retrying in ${delayMs}ms.`;
  }

  return `Connector recovery attempt ${attempt}: ${errorMessage(error)}. Retrying in ${delayMs}ms.`;
}

type RecoveryLogState = {
  key: string | null;
  lastAtMs: number;
  suppressed: number;
};

function logRecovery(state: RecoveryLogState, key: string, message: string) {
  const now = Date.now();
  if (state.key === key && now - state.lastAtMs < ERROR_LOG_THROTTLE_WINDOW_MS) {
    state.suppressed += 1;
    return;
  }

  if (state.suppressed > 0 && state.key) {
    console.error(`Connector recovery repeated ${state.suppressed} additional time(s): ${state.key}`);
    state.suppressed = 0;
  }

  console.error(message);
  state.key = key;
  state.lastAtMs = now;
}

function flushSuppressedRecoveryLogs(state: RecoveryLogState) {
  if (state.suppressed <= 0 || !state.key) {
    return;
  }

  console.error(`Connector recovery repeated ${state.suppressed} additional time(s): ${state.key}`);
  state.suppressed = 0;
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

  let recoveryAttempts = 0;
  const recoveryLogState: RecoveryLogState = {
    key: null,
    lastAtMs: 0,
    suppressed: 0
  };

  while (true) {
    try {
      await client.runOnce();
      if (recoveryAttempts > 0) {
        flushSuppressedRecoveryLogs(recoveryLogState);
        console.error(`Connector recovered after ${recoveryAttempts} attempt(s).`);
      }
      recoveryAttempts = 0;
      recoveryLogState.key = null;
      recoveryLogState.lastAtMs = 0;
    } catch (error) {
      recoveryAttempts += 1;
      const invalidated = shouldInvalidateRegistration(error);
      if (invalidated) {
        client.invalidateRegistration();
      }
      const delayMs = computeBackoffDelayMs(recoveryAttempts);
      const fingerprint = errorFingerprint(error);
      const recoveryMessage = formatRecoveryMessage(error, recoveryAttempts, delayMs, invalidated);
      logRecovery(recoveryLogState, fingerprint, recoveryMessage);
      await sleep(delayMs);
      continue;
    }
    await sleep(env.pollIntervalMs);
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
