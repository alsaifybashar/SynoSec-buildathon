import { z } from "zod";

const connectorEnvSchema = z.object({
  controlPlaneUrl: z.string().url("CONNECTOR_CONTROL_PLANE_URL must be a valid URL."),
  sharedToken: z.string().min(1, "CONNECTOR_SHARED_TOKEN is required."),
  pollIntervalMs: z.coerce.number().int().positive().default(1000),
  commandTimeoutMs: z.coerce.number().int().positive().default(30000),
  name: z.string().min(1).default("local-dev-connector"),
  version: z.string().min(1).default("0.1.0"),
  runMode: z.enum(["dry-run", "simulate", "execute"]).default("dry-run"),
  allowedCapabilities: z.array(z.string().min(1)).min(1),
  allowedSandboxProfiles: z.array(z.string().min(1)).min(1),
  allowedPrivilegeProfiles: z.array(z.string().min(1)).min(1),
  hostname: z.string().min(1).default("unknown")
});

export type ConnectorEnv = z.infer<typeof connectorEnvSchema>;

function parseCsv(value: string | undefined, fallback: string[]) {
  return (value ?? fallback.join(","))
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function loadConnectorEnv(): ConnectorEnv {
  return connectorEnvSchema.parse({
    controlPlaneUrl: process.env["CONNECTOR_CONTROL_PLANE_URL"],
    sharedToken: process.env["CONNECTOR_SHARED_TOKEN"],
    pollIntervalMs: process.env["CONNECTOR_POLL_INTERVAL_MS"] ?? "1000",
    commandTimeoutMs: process.env["CONNECTOR_COMMAND_TIMEOUT_MS"] ?? "30000",
    name: process.env["CONNECTOR_NAME"] ?? "local-dev-connector",
    version: process.env["CONNECTOR_VERSION"] ?? "0.1.0",
    runMode: process.env["CONNECTOR_RUN_MODE"] ?? "dry-run",
    allowedCapabilities: parseCsv(process.env["CONNECTOR_ALLOWED_CAPABILITIES"], ["passive", "web-recon", "network-recon", "content-discovery", "active-recon"]),
    allowedSandboxProfiles: parseCsv(process.env["CONNECTOR_ALLOWED_SANDBOX_PROFILES"], ["network-recon", "read-only-parser", "active-recon"]),
    allowedPrivilegeProfiles: parseCsv(process.env["CONNECTOR_ALLOWED_PRIVILEGE_PROFILES"], ["read-only-network", "active-network"]),
    hostname: process.env["HOSTNAME"] ?? "unknown"
  });
}
