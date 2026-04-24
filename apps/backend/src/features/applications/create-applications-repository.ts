import { prisma } from "@/shared/database/prisma-client.js";
import { PrismaApplicationsRepository } from "@/features/applications/prisma-applications.repository.js";

export function createApplicationsRepositoryFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PrismaApplicationsRepository(prisma);
}
