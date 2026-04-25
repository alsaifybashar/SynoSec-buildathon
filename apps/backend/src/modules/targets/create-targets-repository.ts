import { prisma } from "@/shared/database/prisma-client.js";
import { PrismaTargetsRepository } from "@/modules/targets/prisma-targets.repository.js";

export function createTargetsRepositoryFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PrismaTargetsRepository(prisma);
}
