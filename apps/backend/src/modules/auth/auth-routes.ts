import { Router } from "express";
import { apiRoutes } from "@synosec/contracts";
import { buildAuthSessionPayload } from "@/modules/auth/auth-middleware.js";

export function createAuthRouter(): Router {
  const router = Router();

  router.get(apiRoutes.authSession, (request, response) => {
    response.json(buildAuthSessionPayload(request));
  });

  return router;
}
