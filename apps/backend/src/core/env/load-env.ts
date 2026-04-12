import fs from "node:fs";
import dotenv from "dotenv";

const rootEnvPath = new URL("../../../../../.env", import.meta.url);
const rootEnvExamplePath = new URL("../../../../../.env.example", import.meta.url);

// Load example defaults first, then let a local .env override only the keys it defines.
if (fs.existsSync(rootEnvExamplePath)) {
  dotenv.config({ path: rootEnvExamplePath.pathname });
}

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath.pathname, override: true });
}
