import { prisma } from "../../core/database/prisma-client.js";
import { PrismaRuntimesRepository } from "./prisma-runtimes.repository.js";

export function createRuntimesRepositoryFromEnvironment() {
  if (!process.env["DATABASE_URL"]) {
    throw new Error("DATABASE_URL is required. Load .env or run `make database` first.");
  }

  return new PrismaRuntimesRepository(prisma);
}
