import { prisma } from "@/shared/database/prisma-client.js";
import { PrismaAiToolsRepository } from "@/modules/ai-tools/prisma-ai-tools.repository.js";

export function createAiToolsRepositoryFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PrismaAiToolsRepository(prisma);
}
