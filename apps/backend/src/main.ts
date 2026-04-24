import http from "node:http";
import { loadBackendEnv } from "@/core/env/backend-env.js";
import { createApp } from "@/app/create-app.js";
import { createApplicationsRepositoryFromEnvironment } from "@/features/modules/applications/create-applications-repository.js";
import { createRuntimesRepositoryFromEnvironment } from "@/features/modules/runtimes/create-runtimes-repository.js";
import { createAiProvidersRepositoryFromEnvironment } from "@/features/modules/ai-providers/create-ai-providers-repository.js";
import { createAiAgentsRepositoryFromEnvironment } from "@/features/modules/ai-agents/create-ai-agents-repository.js";
import { createAiToolsRepositoryFromEnvironment } from "@/features/modules/ai-tools/create-ai-tools-repository.js";
import { createWorkflowsRepositoryFromEnvironment } from "@/features/modules/workflows/create-workflows-repository.js";
import { validateSeededToolDefinitions } from "../prisma/seed-data/ai-builder-defaults.js";

const env = loadBackendEnv();
const port = env.backendPort;

validateSeededToolDefinitions();

const app = createApp({
  applicationsRepository: createApplicationsRepositoryFromEnvironment(),
  runtimesRepository: createRuntimesRepositoryFromEnvironment(),
  aiProvidersRepository: createAiProvidersRepositoryFromEnvironment(),
  aiAgentsRepository: createAiAgentsRepositoryFromEnvironment(),
  aiToolsRepository: createAiToolsRepositoryFromEnvironment(),
  workflowsRepository: createWorkflowsRepositoryFromEnvironment()
});
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
