import { prisma } from "@/shared/database/prisma-client.js";
import { PrismaWorkflowsRepository } from "./prisma-workflows.repository.js";

export function createWorkflowsRepositoryFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PrismaWorkflowsRepository(prisma);
}
