import fs from "node:fs";
import dotenv from "dotenv";

const rootEnvPath = new URL("../../../../../../.env", import.meta.url);

if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath.pathname });
}
