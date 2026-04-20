import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const envDir = "../../";
  const env = loadEnv(mode, envDir, "");
  const proxyTarget = env["VITE_API_PROXY_TARGET"] || "http://localhost:3001";
  const frontendPort = Number(env["VITE_DEV_PORT"] || "5173");

  return {
    envDir,
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src")
      }
    },
    server: {
      host: "0.0.0.0",
      port: frontendPort,
      strictPort: true,
      proxy: {
        "/api": proxyTarget,
        "/ws": {
          target: proxyTarget.replace("http://", "ws://").replace("https://", "wss://"),
          ws: true,
          rewriteWsOrigin: true
        }
      }
    },
    test: {
      environment: "jsdom",
      globals: true,
      setupFiles: "./src/test/setup.ts"
    }
  };
});
