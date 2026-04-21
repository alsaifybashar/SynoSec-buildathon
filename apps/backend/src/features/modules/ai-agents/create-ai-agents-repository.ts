import { prisma } from "../../../core/database/prisma-client.js";
import { PrismaAiAgentsRepository } from "../ai-agents/prisma-ai-agents.repository.js";

export function createAiAgentsRepositoryFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PrismaAiAgentsRepository(prisma);
}
