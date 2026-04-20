import { toolAdapterSchema } from "@synosec/contracts";
import { SynoSecConnectorClient } from "./index.js";

function readAllowedAdapters(): Array<ReturnType<typeof toolAdapterSchema.parse>> {
  const rawValue = process.env["CONNECTOR_ALLOWED_ADAPTERS"] ?? "network_scan,service_scan,http_probe,tls_audit";
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .map((value) => toolAdapterSchema.parse(value));
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
      allowedAdapters: readAllowedAdapters(),
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
