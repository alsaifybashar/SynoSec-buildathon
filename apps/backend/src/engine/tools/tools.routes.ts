import { Router, type Request, type Response } from "express";
import { getToolCapabilities } from "./tool-catalog.js";

export function createToolsRouter(): Router {
  const router = Router();

  router.get("/api/tools/capabilities", async (_req: Request, res: Response, next) => {
    try {
      const payload = await getToolCapabilities();
      res.json(payload);
    } catch (error) {
      next(error);
    }
  });

  return router;
}
