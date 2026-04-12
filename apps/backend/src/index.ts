import http from "http";
import dotenv from "dotenv";
import { WebSocket, WebSocketServer } from "ws";
import type { WsEvent } from "@synosec/contracts";
import { createApp } from "./app.js";
import { closeNeo4jDriver, initNeo4jSchema } from "./db/neo4j.js";

dotenv.config({ path: new URL("../../../.env", import.meta.url).pathname });

// ---------------------------------------------------------------------------
// WebSocket client registry
// ---------------------------------------------------------------------------

const clients = new Set<WebSocket>();

function broadcast(event: WsEvent): void {
  const msg = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

// ---------------------------------------------------------------------------
// App + HTTP server
// ---------------------------------------------------------------------------

const app = createApp(broadcast);
const server = http.createServer(app);

// ---------------------------------------------------------------------------
// WebSocket server
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket) => {
  clients.add(ws);
  console.log(`WebSocket client connected (total: ${clients.size})`);

  ws.on("close", () => {
    clients.delete(ws);
    console.log(`WebSocket client disconnected (total: ${clients.size})`);
  });

  ws.on("error", (err: Error) => {
    console.error("WebSocket error:", err.message);
    clients.delete(ws);
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const port = Number(process.env["BACKEND_PORT"] ?? "3001");

// Initialize Neo4j schema before accepting requests
await initNeo4jSchema();

server.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
  console.log(`WebSocket server on ws://localhost:${port}/ws`);
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  await closeNeo4jDriver();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down...");
  await closeNeo4jDriver();
  process.exit(0);
});
