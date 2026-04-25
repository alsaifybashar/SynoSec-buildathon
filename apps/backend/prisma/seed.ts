import { localDemoTargetDefaults } from "@synosec/contracts";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  getSeededProviderDefinitions,
  getSeededWorkflowDefinitions,
  localApplicationId,
  seededAgentId,
  seededRoleDefinitions as roleDefinitions,
  seededToolDefinitions as toolDefinitions,
  targetRuntimeId
} from "./seed-data/ai-builder-defaults.js";
import "@/shared/config/load-env.js";
import { attachExecutionConfig } from "@/modules/ai-tools/tool-execution-config.js";

const prisma = new PrismaClient();
const localTargetAssetId = "7e8d6ec5-2d8b-4d41-9a46-8d5d8bff7a31";
const cloudflareConstraintId = "seed-constraint-cloudflare-v1";
const localTargetBypassConstraintId = "seed-constraint-local-target-bypass-v1";
const legacySingleAgentSeedIds = {
  runId: "b6ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c",
  tacticId: "54ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c",
  vulnerabilityId: "64ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c"
} as const;

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

  await prisma.targetAsset.upsert({
    where: { id: localTargetAssetId },
    update: {
      applicationId: localApplicationId,
      label: "Local vulnerable app",
      kind: "url",
      hostname: "localhost",
      baseUrl: localDemoTargetDefaults.hostUrl,
      ipAddress: "127.0.0.1",
      cidr: null,
      provider: "local",
      ownershipStatus: "verified",
      isDefault: true,
      metadata: {
        lab: true,
        internalHost: localDemoTargetDefaults.internalHost
      }
    },
    create: {
      id: localTargetAssetId,
      applicationId: localApplicationId,
      label: "Local vulnerable app",
      kind: "url",
      hostname: "localhost",
      baseUrl: localDemoTargetDefaults.hostUrl,
      ipAddress: "127.0.0.1",
      cidr: null,
      provider: "local",
      ownershipStatus: "verified",
      isDefault: true,
      metadata: {
        lab: true,
        internalHost: localDemoTargetDefaults.internalHost
      }
    }
  });

  await prisma.executionConstraint.upsert({
    where: { id: cloudflareConstraintId },
    update: {
      name: "Cloudflare Owned Asset Policy",
      kind: "provider_policy",
      provider: "cloudflare",
      version: 1,
      description: "Restricts testing to customer-owned assets behind Cloudflare and enforces Cloudflare-specific scan exclusions and throttling.",
      bypassForLocalTargets: false,
      denyProviderOwnedTargets: true,
      requireVerifiedOwnership: true,
      allowActiveExploit: false,
      requireRateLimitSupport: true,
      rateLimitRps: 5,
      requireHostAllowlistSupport: true,
      requirePathExclusionSupport: true,
      excludedPaths: ["/cdn-cgi/"]
    },
    create: {
      id: cloudflareConstraintId,
      name: "Cloudflare Owned Asset Policy",
      kind: "provider_policy",
      provider: "cloudflare",
      version: 1,
      description: "Restricts testing to customer-owned assets behind Cloudflare and enforces Cloudflare-specific scan exclusions and throttling.",
      bypassForLocalTargets: false,
      denyProviderOwnedTargets: true,
      requireVerifiedOwnership: true,
      allowActiveExploit: false,
      requireRateLimitSupport: true,
      rateLimitRps: 5,
      requireHostAllowlistSupport: true,
      requirePathExclusionSupport: true,
      excludedPaths: ["/cdn-cgi/"]
    }
  });

  await prisma.executionConstraint.upsert({
    where: { id: localTargetBypassConstraintId },
    update: {
      name: "Local Target Bypass Policy",
      kind: "workflow_gate",
      provider: null,
      version: 1,
      description: "Allows local and private development targets to bypass provider-governed execution constraints for seeded lab workflows.",
      bypassForLocalTargets: true,
      denyProviderOwnedTargets: false,
      requireVerifiedOwnership: false,
      allowActiveExploit: true,
      requireRateLimitSupport: false,
      rateLimitRps: null,
      requireHostAllowlistSupport: false,
      requirePathExclusionSupport: false,
      documentationUrls: [],
      excludedPaths: []
    },
    create: {
      id: localTargetBypassConstraintId,
      name: "Local Target Bypass Policy",
      kind: "workflow_gate",
      provider: null,
      version: 1,
      description: "Allows local and private development targets to bypass provider-governed execution constraints for seeded lab workflows.",
      bypassForLocalTargets: true,
      denyProviderOwnedTargets: false,
      requireVerifiedOwnership: false,
      allowActiveExploit: true,
      requireRateLimitSupport: false,
      rateLimitRps: null,
      requireHostAllowlistSupport: false,
      requirePathExclusionSupport: false,
      documentationUrls: [],
      excludedPaths: []
    }
  });

  await prisma.applicationConstraintBinding.upsert({
    where: {
      applicationId_constraintId: {
        applicationId: localApplicationId,
        constraintId: localTargetBypassConstraintId
      }
    },
    update: {},
    create: {
      applicationId: localApplicationId,
      constraintId: localTargetBypassConstraintId
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
          source: "system",
          description: tool.description,
          adapter: null,
          binary: tool.binary,
          category: tool.category,
          riskTier: tool.riskTier,
          notes: tool.notes,
          inputSchema: attachExecutionConfig(tool.inputSchema, {
            executorType: tool.executorType,
            bashSource: tool.bashSource,
            sandboxProfile: tool.sandboxProfile,
            privilegeProfile: tool.privilegeProfile,
            timeoutMs: tool.timeoutMs,
            capabilities: [...tool.capabilities],
            ...(tool.constraintProfile ? { constraintProfile: tool.constraintProfile } : {})
          }),
          outputSchema: tool.outputSchema
        },
        create: {
          id: tool.id,
          name: tool.name,
          status: "active",
          source: "system",
          description: tool.description,
          adapter: null,
          binary: tool.binary,
          category: tool.category,
          riskTier: tool.riskTier,
          notes: tool.notes,
          inputSchema: attachExecutionConfig(tool.inputSchema, {
            executorType: tool.executorType,
            bashSource: tool.bashSource,
            sandboxProfile: tool.sandboxProfile,
            privilegeProfile: tool.privilegeProfile,
            timeoutMs: tool.timeoutMs,
            capabilities: [...tool.capabilities],
            ...(tool.constraintProfile ? { constraintProfile: tool.constraintProfile } : {})
          }),
          outputSchema: tool.outputSchema
        }
      })
    )
  );

  await prisma.aiTool.deleteMany({
    where: {
      id: {
        startsWith: "seed-",
        notIn: toolDefinitions.map((tool) => tool.id)
      }
    }
  });

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
  const seededWorkflowIds = workflowDefinitions.map((workflow) => workflow.id);

  await prisma.workflow.deleteMany({
    where: {
      name: "Local Vulnerable App Walkthrough",
      id: { notIn: seededWorkflowIds }
    }
  });

  await Promise.all(
    workflowDefinitions.map(async (workflow) => {
      await prisma.workflow.upsert({
        where: { id: workflow.id },
        update: {
          name: workflow.name,
          status: workflow.status,
          executionKind: workflow.executionKind,
          description: workflow.description,
          applicationId: workflow.applicationId,
          runtimeId: workflow.runtimeId
        },
        create: {
          id: workflow.id,
          name: workflow.name,
          status: workflow.status,
          executionKind: workflow.executionKind,
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
          ord: index,
          objective: stage.objective,
          allowedToolIds: stage.allowedToolIds,
          requiredEvidenceTypes: stage.requiredEvidenceTypes,
          findingPolicy: stage.findingPolicy,
          completionRule: stage.completionRule,
          resultSchemaVersion: stage.resultSchemaVersion,
          handoffSchema: stage.handoffSchema === null
            ? Prisma.JsonNull
            : stage.handoffSchema as Prisma.InputJsonValue
        }))
      });
    })
  );

  await prisma.workflowTraceEntry.deleteMany({
    where: { workflowRunId: legacySingleAgentSeedIds.runId }
  });
  await prisma.workflowTraceEvent.deleteMany({
    where: { workflowRunId: legacySingleAgentSeedIds.runId }
  });
  await prisma.workflowRun.deleteMany({
    where: { id: legacySingleAgentSeedIds.runId }
  });
  await prisma.executionReport.deleteMany({
    where: {
      OR: [
        { sourceExecutionId: legacySingleAgentSeedIds.runId },
        { id: legacySingleAgentSeedIds.runId }
      ]
    }
  });

  await prisma.scanAuditEntry.deleteMany({
    where: { scanRunId: legacySingleAgentSeedIds.runId }
  });
  await prisma.scanLayerCoverage.deleteMany({
    where: { scanRunId: legacySingleAgentSeedIds.runId }
  });
  await prisma.scanFinding.deleteMany({
    where: {
      OR: [
        { scanRunId: legacySingleAgentSeedIds.runId },
        { id: legacySingleAgentSeedIds.vulnerabilityId }
      ]
    }
  });
  await prisma.scanTactic.deleteMany({
    where: {
      OR: [
        { scanRunId: legacySingleAgentSeedIds.runId },
        { id: legacySingleAgentSeedIds.tacticId }
      ]
    }
  });
  await prisma.scanRun.deleteMany({
    where: { id: legacySingleAgentSeedIds.runId }
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
