import fs from "node:fs";
import dotenv from "dotenv";

const rootEnvPath = new URL("../../../.env", import.meta.url);
const rootEnvExamplePath = new URL("../../../.env.example", import.meta.url);

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath.pathname });
} else if (fs.existsSync(rootEnvExamplePath)) {
  dotenv.config({ path: rootEnvExamplePath.pathname });
}
