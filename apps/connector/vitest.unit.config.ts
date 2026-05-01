import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@synosec/contracts": path.resolve(__dirname, "../../packages/contracts/src/index.ts")
    }
  },
  test: {
    environment: "node",
    setupFiles: "./tests/setup/vitest.unit.ts",
    include: [
      "src/**/*.test.ts",
      "tests/unit/**/*.test.ts"
    ],
    exclude: [
      "tests/integration/**/*.test.ts"
    ]
  }
});
