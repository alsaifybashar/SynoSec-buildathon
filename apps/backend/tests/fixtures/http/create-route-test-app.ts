import express from "express";

export function createRouteTestApp() {
  const app = express();
  app.use(express.json());
  return app;
}
