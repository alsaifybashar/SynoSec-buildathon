import http from "node:http";
import { loadBackendEnv } from "@/shared/config/backend-env.js";
import { buildBackendDependencies } from "@/app/build-backend-dependencies.js";
import { createApp } from "@/app/create-app.js";
import { validateSeededToolDefinitions } from "../prisma/seed-data/ai-builder-defaults.js";

const env = loadBackendEnv();
const port = env.backendPort;

validateSeededToolDefinitions();

const app = createApp(buildBackendDependencies());
const server = http.createServer(app);
let shuttingDown = false;

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

server.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Backend port ${port} is already in use. Stop the existing listener or rerun make dev.`);
    process.exit(1);
  }

  throw error;
});

async function shutdown() {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  void shutdown();
});

process.on("SIGINT", () => {
  void shutdown();
});
