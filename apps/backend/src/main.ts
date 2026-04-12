import http from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import type { WsEvent } from "@synosec/contracts";
import "./core/env/load-env.js";
import { createApp } from "./app/create-app.js";
import { createApplicationsRepositoryFromEnvironment } from "./modules/applications/create-applications-repository.js";
import { closeNeo4jDriver, initNeo4jSchema, listScans } from "./db/neo4j.js";
import { seedDemoScan } from "./seed/demo-data.js";

const port = Number(process.env["BACKEND_PORT"] ?? "3001");
const clients = new Set<WebSocket>();

function broadcast(event: WsEvent): void {
  const message = JSON.stringify(event);

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

const app = createApp({
  applicationsRepository: createApplicationsRepositoryFromEnvironment(),
  broadcast
});
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (socket) => {
  clients.add(socket);

  socket.on("close", () => {
    clients.delete(socket);
  });

  socket.on("error", () => {
    clients.delete(socket);
  });
});

await initNeo4jSchema();

try {
  const existingScans = await listScans();
  if (existingScans.length === 0) {
    await seedDemoScan();
  }
} catch (error) {
  console.warn("Scan auto-seed skipped:", error instanceof Error ? error.message : error);
}

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  console.log(`WebSocket server on ws://localhost:${port}/ws`);
});

async function shutdown() {
  await closeNeo4jDriver();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", () => {
  void shutdown();
});

process.on("SIGINT", () => {
  void shutdown();
});
