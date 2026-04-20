import http from "node:http";
import "@/core/env/load-env.js";
import { createApp } from "@/platform/app/create-app.js";
import { createApplicationsRepositoryFromEnvironment } from "@/features/modules/applications/create-applications-repository.js";
import { createRuntimesRepositoryFromEnvironment } from "@/features/modules/runtimes/create-runtimes-repository.js";
import { createAiProvidersRepositoryFromEnvironment } from "@/features/modules/ai-providers/create-ai-providers-repository.js";
import { createAiAgentsRepositoryFromEnvironment } from "@/features/modules/ai-agents/create-ai-agents-repository.js";
import { createAiToolsRepositoryFromEnvironment } from "@/features/modules/ai-tools/create-ai-tools-repository.js";

const port = Number(process.env["BACKEND_PORT"] ?? "3001");

const app = createApp({
  applicationsRepository: createApplicationsRepositoryFromEnvironment(),
  runtimesRepository: createRuntimesRepositoryFromEnvironment(),
  aiProvidersRepository: createAiProvidersRepositoryFromEnvironment(),
  aiAgentsRepository: createAiAgentsRepositoryFromEnvironment(),
  aiToolsRepository: createAiToolsRepositoryFromEnvironment()
});
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

async function shutdown() {
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
