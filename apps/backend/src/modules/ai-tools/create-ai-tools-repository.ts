import { prisma } from "@/shared/database/prisma-client.js";
import { PrismaAiToolsRepository } from "@/modules/ai-tools/prisma-ai-tools.repository.js";

/**
 * Single production entry point for the AI tools repository: always
 * Prisma-backed. The Memory variant exists only for unit/integration
 * tests and must not be selected at runtime.
 */
export function createAiToolsRepositoryFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PrismaAiToolsRepository(prisma);
}
