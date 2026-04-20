import { toolCapabilityTagSchema, toolPrivilegeProfileSchema, toolSandboxProfileSchema } from "@synosec/contracts";
import { SynoSecConnectorClient } from "./index.js";

function readAllowedCapabilities(): Array<ReturnType<typeof toolCapabilityTagSchema.parse>> {
  const rawValue = process.env["CONNECTOR_ALLOWED_CAPABILITIES"] ?? "passive,web-recon,network-recon,content-discovery,active-recon";
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => toolCapabilityTagSchema.parse(value));
}

function readAllowedSandboxProfiles(): Array<ReturnType<typeof toolSandboxProfileSchema.parse>> {
  const rawValue = process.env["CONNECTOR_ALLOWED_SANDBOX_PROFILES"] ?? "network-recon,read-only-parser,active-recon";
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => toolSandboxProfileSchema.parse(value));
}

function readAllowedPrivilegeProfiles(): Array<ReturnType<typeof toolPrivilegeProfileSchema.parse>> {
  const rawValue = process.env["CONNECTOR_ALLOWED_PRIVILEGE_PROFILES"] ?? "read-only-network,active-network";
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => toolPrivilegeProfileSchema.parse(value));
}

async function main() {
  const baseUrl = process.env["CONNECTOR_CONTROL_PLANE_URL"] ?? "http://backend:3001";
  const token = process.env["CONNECTOR_SHARED_TOKEN"] ?? "synosec-connector-dev";
  const pollIntervalMs = Number(process.env["CONNECTOR_POLL_INTERVAL_MS"] ?? "1000");
  const client = new SynoSecConnectorClient({
    baseUrl,
    token,
    commandTimeoutMs: Number(process.env["CONNECTOR_COMMAND_TIMEOUT_MS"] ?? "30000"),
    registration: {
      name: process.env["CONNECTOR_NAME"] ?? "local-dev-connector",
      version: process.env["CONNECTOR_VERSION"] ?? "0.1.0",
      allowedCapabilities: readAllowedCapabilities(),
      allowedSandboxProfiles: readAllowedSandboxProfiles(),
      allowedPrivilegeProfiles: readAllowedPrivilegeProfiles(),
      runMode: process.env["CONNECTOR_RUN_MODE"] === "execute"
        ? "execute"
        : process.env["CONNECTOR_RUN_MODE"] === "simulate"
          ? "simulate"
          : "dry-run",
      concurrency: 1,
      capabilities: [
        {
          key: "hostname",
          value: process.env["HOSTNAME"] ?? "unknown"
        }
      ]
    }
  });

  await client.register();

  while (true) {
    await client.runOnce();
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(message);
  process.exit(1);
});
