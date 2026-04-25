import { prisma } from "@/shared/database/prisma-client.js";
import { PrismaExecutionConstraintsRepository } from "./prisma-execution-constraints.repository.js";

export function createExecutionConstraintsRepositoryFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PrismaExecutionConstraintsRepository(prisma);
}
