import { authTools } from "./auth.js";
import { cloudTools } from "./cloud.js";
import { contentTools } from "./content.js";
import { dnsTools } from "./dns.js";
import { exploitationTools } from "./exploitation.js";
import { forensicsTools } from "./forensics.js";
import { kubernetesTools } from "./kubernetes.js";
import { networkTools } from "./network.js";
import { passwordTools } from "./password.js";
import { reversingTools } from "./reversing.js";
import { subdomainTools } from "./subdomain.js";
import type { ToolCatalogEntry } from "./types.js";
import { utilityTools } from "./utility.js";
import { webTools } from "./web.js";
import { windowsTools } from "./windows.js";

export { type ToolCatalogEntry, type ToolPhase } from "./types.js";

export const TOOL_CATALOG: ToolCatalogEntry[] = [
  ...subdomainTools,
  ...authTools,
  ...webTools,
  ...networkTools,
  ...reversingTools,
  ...forensicsTools,
  ...contentTools,
  ...dnsTools,
  ...passwordTools,
  ...cloudTools,
  ...kubernetesTools,
  ...windowsTools,
  ...exploitationTools,
  ...utilityTools
];
