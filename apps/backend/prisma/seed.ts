import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import "../src/env.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.application.createMany({
    data: [
      {
        id: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80",
        name: "Operator Portal",
        baseUrl: "https://portal.synosec.local",
        environment: "production",
        status: "active",
        lastScannedAt: new Date("2026-04-12T12:00:00.000Z")
      },
      {
        id: "ef7b823f-5f2e-4052-8276-4eb537f74fcb",
        name: "Report Builder",
        baseUrl: null,
        environment: "staging",
        status: "investigating",
        lastScannedAt: null
      },
      {
        id: randomUUID(),
        name: "Queue Reconciler",
        baseUrl: "https://queue.synosec.local",
        environment: "development",
        status: "archived",
        lastScannedAt: new Date("2026-04-10T08:30:00.000Z")
      }
    ],
    skipDuplicates: true
  });

  await prisma.runtime.createMany({
    data: [
      {
        id: "6fd90dd7-6f27-47d0-ab24-6328bb2f3624",
        name: "Edge Gateway",
        serviceType: "gateway",
        provider: "docker",
        environment: "production",
        region: "eu-north-1",
        status: "healthy",
        applicationId: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80"
      },
      {
        id: randomUUID(),
        name: "Queue Worker",
        serviceType: "worker",
        provider: "aws",
        environment: "staging",
        region: "eu-west-1",
        status: "degraded",
        applicationId: null
      }
    ],
    skipDuplicates: true
  });

  await prisma.workflow.createMany({
    data: [
      {
        id: "0adf35d4-ec20-429b-9a2d-08b3807ab7a1",
        name: "Nightly perimeter sweep",
        trigger: "schedule",
        status: "active",
        maxDepth: 4,
        targetMode: "application",
        applicationId: "5ecf4a8e-df5f-4945-a7e1-230ef43eac80"
      },
      {
        id: randomUUID(),
        name: "Ad-hoc runtime validation",
        trigger: "manual",
        status: "draft",
        maxDepth: 2,
        targetMode: "runtime",
        applicationId: null
      }
    ],
    skipDuplicates: true
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
