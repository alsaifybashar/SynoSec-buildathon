import http from "node:http";
import { randomUUID } from "node:crypto";
import { PrismaClient, type Prisma } from "@prisma/client";
import { loadBackendEnv } from "@/shared/config/backend-env.js";
import { buildBackendDependencies } from "@/app/build-backend-dependencies.js";
import { createApp } from "@/app/create-app.js";

const env = loadBackendEnv();
const port = env.backendPort;
const host = "0.0.0.0";

async function failInterruptedWorkflowRuns() {
  const prisma = new PrismaClient();
  try {
    const interruptedRuns = await prisma.workflowRun.findMany({
      where: { status: "running" },
      select: {
        id: true,
        workflowId: true,
        workflowLaunchId: true,
        currentStepIndex: true,
        traceEvents: {
          select: {
            ord: true,
            workflowStageId: true
          },
          orderBy: { ord: "desc" },
          take: 1
        }
      }
    });

    if (interruptedRuns.length === 0) {
      return;
    }

    await prisma.$transaction(interruptedRuns.map((run) => {
      const latestEvent = run.traceEvents[0];
      const nextOrd = (latestEvent?.ord ?? -1) + 1;
      return prisma.workflowRun.update({
        where: { id: run.id },
        data: {
          status: "failed",
          completedAt: new Date(),
          traceEvents: {
            create: {
              id: randomUUID(),
              workflowId: run.workflowId,
              workflowStageId: latestEvent?.workflowStageId ?? null,
              stepIndex: run.currentStepIndex,
              ord: nextOrd,
              type: "run_failed" as never,
              status: "failed" as never,
              title: "Workflow run interrupted",
              summary: "Workflow background run interrupted by backend restart.",
              detail: "Backend process restarted while the background workflow run was active. Marked as failed during startup recovery.",
              payload: {
                interruptedBy: "backend_restart"
              } as Prisma.InputJsonValue,
              createdAt: new Date()
            }
          }
        }
      });
    }));

    const launchIds = [...new Set(interruptedRuns.map((run) => run.workflowLaunchId))];
    await Promise.all(launchIds.map(async (launchId) => {
      const runs = await prisma.workflowRun.findMany({
        where: { workflowLaunchId: launchId },
        select: { status: true }
      });
      if (runs.length === 0) {
        return;
      }

      const statuses = runs.map((run) => run.status);
      const hasActive = statuses.some((status) => status === "running" || status === "pending");
      const allCompleted = statuses.every((status) => status === "completed");
      const allFailed = statuses.every((status) => status === "failed");
      const launchStatus = hasActive ? "running" : allCompleted ? "completed" : allFailed ? "failed" : "partial";

      await prisma.workflowLaunch.update({
        where: { id: launchId },
        data: {
          status: launchStatus,
          completedAt: launchStatus === "running" ? null : new Date()
        }
      });
    }));

    console.warn(`Startup recovery: marked ${interruptedRuns.length} interrupted workflow run(s) as failed.`);
  } finally {
    await prisma.$disconnect();
  }
}

async function bootstrap() {
  await failInterruptedWorkflowRuns();

  const app = createApp(buildBackendDependencies());
  const server = http.createServer(app);
  let shuttingDown = false;

  server.listen(port, host, () => {
    console.log(`Backend listening on http://${host}:${port}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(`Backend port ${port} is already in use. Stop the existing listener or rerun make dev.`);
      process.exit(1);
    }

    throw error;
  });

  async function shutdown() {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
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
}

void bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
