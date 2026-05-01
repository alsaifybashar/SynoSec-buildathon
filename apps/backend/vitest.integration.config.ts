import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@/prisma": path.resolve(__dirname, "./prisma"),
      "@": path.resolve(__dirname, "./src"),
      "@synosec/contracts": path.resolve(__dirname, "../../packages/contracts/src/index.ts")
    }
  },
  test: {
    environment: "node",
    setupFiles: "./tests/setup/vitest.integration.ts",
    include: [
      "src/**/*.integration.test.ts",
      "tests/integration/**/*.test.ts"
    ]
  }
});
