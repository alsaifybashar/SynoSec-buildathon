import { PrismaClient } from "@prisma/client";
import { localDemoTargetDefaults } from "@synosec/contracts";
import "../src/env.js";

const prisma = new PrismaClient();

const localApplicationId = "5ecf4a8e-df5f-4945-a7e1-230ef43eac80";
const targetRuntimeId = "6fd90dd7-6f27-47d0-ab24-6328bb2f3624";
const localWorkflowId = "0adf35d4-ec20-429b-9a2d-08b3807ab7a1";

async function main() {
  await prisma.workflow.deleteMany({
    where: {
      id: { not: localWorkflowId },
      name: {
        in: [
          "Nightly perimeter sweep",
          "Ad-hoc runtime validation",
          "Runtime reachability validation"
        ]
      }
    }
  });

  await prisma.runtime.deleteMany({
    where: {
      id: { not: targetRuntimeId },
      name: {
        in: [
          "Edge Gateway",
          "Queue Worker",
          "Backend Orchestrator"
        ]
      }
    }
  });

  await prisma.application.deleteMany({
    where: {
      id: { not: localApplicationId },
      name: {
        in: [
          "Operator Portal",
          "Report Builder",
          "Queue Reconciler",
          "External Validation Slot"
        ]
      }
    }
  });

  await prisma.application.upsert({
    where: { id: localApplicationId },
    update: {
      name: "Local Vulnerable Target",
      baseUrl: localDemoTargetDefaults.hostUrl,
      environment: "development",
      status: "active",
      lastScannedAt: new Date("2026-04-12T12:00:00.000Z")
    },
    create: {
      id: localApplicationId,
      name: "Local Vulnerable Target",
      baseUrl: localDemoTargetDefaults.hostUrl,
      environment: "development",
      status: "active",
      lastScannedAt: new Date("2026-04-12T12:00:00.000Z")
    }
  });

  await prisma.runtime.upsert({
    where: { id: targetRuntimeId },
    update: {
      name: "Vulnerable Target Container",
      serviceType: "api",
      provider: "docker",
      environment: "development",
      region: "local-docker",
      status: "healthy",
      applicationId: localApplicationId
    },
    create: {
      id: targetRuntimeId,
      name: "Vulnerable Target Container",
      serviceType: "api",
      provider: "docker",
      environment: "development",
      region: "local-docker",
      status: "healthy",
      applicationId: localApplicationId
    }
  });

  await prisma.workflow.upsert({
    where: { id: localWorkflowId },
    update: {
      name: "Local vulnerable target scan",
      trigger: "manual",
      status: "active",
      maxDepth: 3,
      targetMode: "application",
      applicationId: localApplicationId
    },
    create: {
      id: localWorkflowId,
      name: "Local vulnerable target scan",
      trigger: "manual",
      status: "active",
      maxDepth: 3,
      targetMode: "application",
      applicationId: localApplicationId
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
