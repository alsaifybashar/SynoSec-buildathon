import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

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
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
