import { prisma } from "@/shared/database/prisma-client.js";
import { PrismaAiProvidersRepository } from "../ai-providers/prisma-ai-providers.repository.js";

export function createAiProvidersRepositoryFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PrismaAiProvidersRepository(prisma);
}
