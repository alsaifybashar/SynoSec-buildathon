import { PrismaClient } from "@/platform/generated/prisma/index.js";
import "@/platform/core/env/load-env.js";

declare global {
  // eslint-disable-next-line no-var
  var __synosecPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__synosecPrisma__ ??
  new PrismaClient({
    log: process.env["BACKEND_ENV"] === "development" ? ["warn", "error"] : ["error"]
  });

if (process.env["NODE_ENV"] !== "production") {
  globalThis.__synosecPrisma__ = prisma;
}
