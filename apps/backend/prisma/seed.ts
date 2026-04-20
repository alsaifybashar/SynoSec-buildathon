import { localDemoTargetDefaults } from "@synosec/contracts";
import { PrismaClient } from "../src/platform/generated/prisma/index.js";
import {
  getSeededProviderDefinitions,
  getSeededWorkflowDefinitions,
  localApplicationId,
  seededAgentId,
  seededRoleDefinitions as roleDefinitions,
  seededToolDefinitions as toolDefinitions,
  targetRuntimeId
} from "./seed-data/ai-builder-defaults.js";
import "../src/platform/env.js";
import { attachExecutionConfig } from "../src/features/modules/ai-tools/tool-execution-config.js";

const prisma = new PrismaClient();

async function main() {
  const providerDefinitions = getSeededProviderDefinitions();
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

  await Promise.all(
    providerDefinitions.map((provider) =>
      prisma.aiProvider.upsert({
        where: { id: provider.id },
        update: {
          name: provider.name,
          kind: provider.kind,
          status: "active",
          description: provider.description,
          baseUrl: provider.baseUrl,
          model: provider.model,
          apiKey: provider.apiKey
        },
        create: {
          id: provider.id,
          name: provider.name,
          kind: provider.kind,
          status: "active",
          description: provider.description,
          baseUrl: provider.baseUrl,
          model: provider.model,
          apiKey: provider.apiKey
        }
      })
    )
  );

  await Promise.all(
    toolDefinitions.map((tool) =>
      prisma.aiTool.upsert({
        where: { id: tool.id },
        update: {
          name: tool.name,
          status: "active",
          source: "custom",
          description: tool.description,
          adapter: null,
          binary: tool.binary,
          category: tool.category,
          riskTier: tool.riskTier,
          notes: tool.notes,
          inputSchema: attachExecutionConfig(tool.inputSchema, {
            executionMode: tool.executionMode,
            sandboxProfile: tool.sandboxProfile,
            privilegeProfile: tool.privilegeProfile,
            defaultArgs: [...tool.defaultArgs],
            timeoutMs: tool.timeoutMs,
            scriptPath: tool.scriptPath,
            scriptVersion: tool.scriptVersion,
            scriptSource: tool.scriptSource,
            capabilities: [...tool.capabilities]
          }),
          outputSchema: tool.outputSchema
        },
        create: {
          id: tool.id,
          name: tool.name,
          status: "active",
          source: "custom",
          description: tool.description,
          adapter: null,
          binary: tool.binary,
          category: tool.category,
          riskTier: tool.riskTier,
          notes: tool.notes,
          inputSchema: attachExecutionConfig(tool.inputSchema, {
            executionMode: tool.executionMode,
            sandboxProfile: tool.sandboxProfile,
            privilegeProfile: tool.privilegeProfile,
            defaultArgs: [...tool.defaultArgs],
            timeoutMs: tool.timeoutMs,
            scriptPath: tool.scriptPath,
            scriptVersion: tool.scriptVersion,
            scriptSource: tool.scriptSource,
            capabilities: [...tool.capabilities]
          }),
          outputSchema: tool.outputSchema
        }
      })
    )
  );

  await Promise.all(
    providerDefinitions.flatMap((provider) =>
      roleDefinitions.map((role) =>
        prisma.aiAgent.upsert({
          where: { id: seededAgentId(provider.key, role.key) },
          update: {
            name: `${provider.name} ${role.name}`,
            status: "active",
            description: role.description,
            providerId: provider.id,
            systemPrompt: role.systemPrompt,
            modelOverride: null
          },
          create: {
            id: seededAgentId(provider.key, role.key),
            name: `${provider.name} ${role.name}`,
            status: "active",
            description: role.description,
            providerId: provider.id,
            systemPrompt: role.systemPrompt,
            modelOverride: null
          }
        })
      )
    )
  );

  const seededAgentIdList = providerDefinitions.flatMap((provider) =>
    roleDefinitions.map((role) => seededAgentId(provider.key, role.key))
  );

  await prisma.aiAgentTool.deleteMany({
    where: {
      agentId: { in: seededAgentIdList }
    }
  });

  await prisma.aiAgentTool.createMany({
    data: providerDefinitions.flatMap((provider) =>
      roleDefinitions.flatMap((role) =>
        role.toolIds.map((toolId, index) => ({
          agentId: seededAgentId(provider.key, role.key),
          toolId,
          ord: index
        }))
      )
    )
  });

  const workflowDefinitions = getSeededWorkflowDefinitions();

  await Promise.all(
    workflowDefinitions.map(async (workflow) => {
      await prisma.workflow.upsert({
        where: { id: workflow.id },
        update: {
          name: workflow.name,
          status: workflow.status,
          description: workflow.description,
          applicationId: workflow.applicationId,
          runtimeId: workflow.runtimeId
        },
        create: {
          id: workflow.id,
          name: workflow.name,
          status: workflow.status,
          description: workflow.description,
          applicationId: workflow.applicationId,
          runtimeId: workflow.runtimeId
        }
      });

      await prisma.workflowStage.deleteMany({
        where: { workflowId: workflow.id }
      });

      await prisma.workflowStage.createMany({
        data: workflow.stages.map((stage, index) => ({
          id: stage.id,
          workflowId: workflow.id,
          label: stage.label,
          agentId: stage.agentId,
          ord: index
        }))
      });
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
