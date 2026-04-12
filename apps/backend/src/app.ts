import cors from "cors";
import express, { type ErrorRequestHandler, type Express } from "express";
import {
  applicationSchema,
  apiRoutes,
  briefResponseSchema,
  createApplicationBodySchema,
  demoResponseSchema,
  healthResponseSchema,
  listApplicationsResponseSchema,
  updateApplicationBodySchema,
  type BriefResponse,
  type DemoResponse,
  type HealthResponse
} from "@synosec/contracts";
import { ZodError } from "zod";
import { type ApplicationStore } from "./applications/store.js";

const demoResponse: DemoResponse = {
  scanMode: "depth-first",
  targetCount: 2,
  findings: [
    {
      id: "finding-ssh-legacy",
      target: "192.168.10.14",
      severity: "medium",
      summary: "Legacy SSH banner exposed with deprecated ciphers enabled."
    },
    {
      id: "finding-cms-version",
      target: "intranet.synosec.local",
      severity: "high",
      summary: "Public version leak maps to a known CMS vulnerability."
    }
  ]
};

function buildBriefResponse(): BriefResponse {
  return {
    headline: "Manual backend fetch completed.",
    actions: [
      "Enumerate reachable hosts before deeper probing.",
      "Re-run high-severity services with authenticated checks.",
      "Queue new nodes for depth-first traversal."
    ],
    generatedAt: new Date().toISOString()
  };
}

function isProductionEnvironment() {
  return process.env["BACKEND_ENV"] === "production";
}

export function createErrorHandler(options?: { isProduction?: boolean }): ErrorRequestHandler {
  const isProduction = options?.isProduction ?? isProductionEnvironment();

  return (error, _request, response, _next) => {
    if (error instanceof ZodError && !response.headersSent) {
      response.status(400).json({
        message: error.issues[0]?.message ?? "Invalid request."
      });
      return;
    }

    const message = error instanceof Error ? error.message : "Unknown error";

    if (!response.headersSent) {
      response.status(500).json({
        message: isProduction ? "Something went wrong." : message
      });
    }
  };
}

export function createApp(options: { applicationStore: ApplicationStore }): Express {
  const app = express();
  const { applicationStore } = options;

  app.use(cors());
  app.use(express.json());

  app.get(apiRoutes.health, (_request, response) => {
    const payload: HealthResponse = {
      status: "ok",
      service: "synosec-backend",
      timestamp: new Date().toISOString()
    };

    response.json(healthResponseSchema.parse(payload));
  });

  app.get(apiRoutes.demo, (_request, response) => {
    response.json(demoResponseSchema.parse(demoResponse));
  });

  app.get(apiRoutes.brief, (_request, response) => {
    response.json(briefResponseSchema.parse(buildBriefResponse()));
  });

  app.get(apiRoutes.applications, async (_request, response, next) => {
    try {
      const applications = await applicationStore.list();
      response.json(listApplicationsResponseSchema.parse({ applications }));
    } catch (error) {
      next(error);
    }
  });

  app.get(`${apiRoutes.applications}/:id`, async (request, response, next) => {
    try {
      const application = await applicationStore.getById(request.params.id);

      if (!application) {
        response.status(404).json({ message: "Application not found." });
        return;
      }

      response.json(applicationSchema.parse(application));
    } catch (error) {
      next(error);
    }
  });

  app.post(apiRoutes.applications, async (request, response, next) => {
    try {
      const input = createApplicationBodySchema.parse(request.body);
      const application = await applicationStore.create(input);
      response.status(201).json(applicationSchema.parse(application));
    } catch (error) {
      next(error);
    }
  });

  app.patch(`${apiRoutes.applications}/:id`, async (request, response, next) => {
    try {
      const input = updateApplicationBodySchema.parse(request.body);
      const application = await applicationStore.update(request.params.id, input);

      if (!application) {
        response.status(404).json({ message: "Application not found." });
        return;
      }

      response.json(applicationSchema.parse(application));
    } catch (error) {
      next(error);
    }
  });

  app.delete(`${apiRoutes.applications}/:id`, async (request, response, next) => {
    try {
      const removed = await applicationStore.remove(request.params.id);

      if (!removed) {
        response.status(404).json({ message: "Application not found." });
        return;
      }

      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  app.use(createErrorHandler());

  return app;
}
