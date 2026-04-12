import { apiRoutes, demoResponseSchema } from "@synosec/contracts";
import { type Express } from "express";
import { demoResponse } from "./demo.data.js";

export function registerDemoRoutes(app: Express) {
  app.get(apiRoutes.demo, (_request, response) => {
    response.json(demoResponseSchema.parse(demoResponse));
  });
}
