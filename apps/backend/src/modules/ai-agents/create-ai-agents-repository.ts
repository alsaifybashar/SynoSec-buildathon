import { prisma } from "@/shared/database/prisma-client.js";
import { PrismaAiAgentsRepository } from "@/modules/ai-agents/prisma-ai-agents.repository.js";

export function createAiAgentsRepositoryFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PrismaAiAgentsRepository(prisma);
}
