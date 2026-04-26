import { localAttackPathTargetDefaults, localDemoTargetDefaults } from "@synosec/contracts";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  getSeededWorkflowDefinitions,
  localAttackPathApplicationId,
  localApplicationId,
  osiSingleAgentWorkflowId,
  portfolioApplicationId,
  portfolioEvidenceGraphWorkflowId,
  securePentApplicationId,
  seededAgentId,
  seededRoleDefinitions as roleDefinitions,
  seededToolDefinitions as toolDefinitions
} from "./seed-data/ai-builder-defaults.js";
import "@/shared/config/load-env.js";
import { attachExecutionConfig } from "@/modules/ai-tools/tool-execution-config.js";
import { getBuiltinAiTools } from "@/modules/ai-tools/builtin-ai-tools.js";

const prisma = new PrismaClient();
const cloudflareConstraintId = "seed-constraint-cloudflare-v1";
const localTargetBypassConstraintId = "seed-constraint-local-target-bypass-v1";
const cloudflareScansPolicyUrl = "https://developers.cloudflare.com/fundamentals/reference/scans-penetration/";
const legacySingleAgentSeedIds = {
  runId: "b6ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c",
  tacticId: "54ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c",
  vulnerabilityId: "64ec7b8e-b8dc-4b58-bf5a-5f3f0f7e8d4c"
} as const;
const deprecatedSeededAgentIds = [
  "3d9992c0-a20b-4527-86d3-9479e86d6c3b",
  "751d2c0b-85f1-4f7a-8ac6-2c05d0ce0f56",
  "f1f99dd4-c2a7-47e8-946e-6a880f09001f",
  "897204f6-2e08-4775-aae8-f233d4ec8154",
  "fa1a0bfa-6b02-4948-8e1c-155f6b9a4ae7",
  "fcfe30d4-9473-4e74-8836-d824ff777c88",
  "36f56ea0-e8ce-48ca-bda8-c33ed49e67b2",
  "72ea29f0-f780-4402-bfe4-574604830749",
  "7115bc3d-9237-4fba-97f7-8d72966502c0"
] as const;

async function main() {
  await prisma.workflow.deleteMany({
    where: {
      application: {
      id: { not: localApplicationId },
      name: {
        in: [
          "Nils Wickman Portfolio",
          "SecurePent",
          "Operator Portal",
          "Report Builder",
          "Queue Reconciler",
          "External Validation Slot"
          ]
        }
      }
    }
  });

  await prisma.application.deleteMany({
    where: {
      id: { notIn: [localApplicationId, localAttackPathApplicationId, portfolioApplicationId, securePentApplicationId] },
      name: {
        in: [
          "Nils Wickman Portfolio",
          "SecurePent",
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

  await prisma.application.upsert({
    where: { id: localAttackPathApplicationId },
    update: {
      name: "Local Attack Path Target",
      baseUrl: localAttackPathTargetDefaults.hostUrl,
      environment: "development",
      status: "active",
      lastScannedAt: new Date("2026-04-12T12:00:00.000Z")
    },
    create: {
      id: localAttackPathApplicationId,
      name: "Local Attack Path Target",
      baseUrl: localAttackPathTargetDefaults.hostUrl,
      environment: "development",
      status: "active",
      lastScannedAt: new Date("2026-04-12T12:00:00.000Z")
    }
  });

  await prisma.application.upsert({
    where: { id: portfolioApplicationId },
    update: {
      name: "Nils Wickman Portfolio",
      baseUrl: "https://nilswickman.com",
      environment: "production",
      status: "active",
      lastScannedAt: null
    },
    create: {
      id: portfolioApplicationId,
      name: "Nils Wickman Portfolio",
      baseUrl: "https://nilswickman.com",
      environment: "production",
      status: "active",
      lastScannedAt: null
    }
  });

  await prisma.application.upsert({
    where: { id: securePentApplicationId },
    update: {
      name: "SecurePent",
      baseUrl: "https://securepent.com",
      environment: "production",
      status: "active",
      lastScannedAt: null
    },
    create: {
      id: securePentApplicationId,
      name: "SecurePent",
      baseUrl: "https://securepent.com",
      environment: "production",
      status: "active",
      lastScannedAt: null
    }
  });

  await prisma.executionConstraint.upsert({
    where: { id: cloudflareConstraintId },
    update: {
      name: "Cloudflare Owned Asset Policy",
      kind: "provider_policy",
      provider: "cloudflare",
      version: 1,
      description: "Restricts testing to customer-owned assets behind Cloudflare, denies Cloudflare-owned destinations, disables active exploitation, and enforces Cloudflare scan exclusions and throttling. Cloudflare penetration-test prerequisites such as WAF, bot, and rate-limiting zone configuration must still be validated outside this constraint.",
      bypassForLocalTargets: false,
      denyProviderOwnedTargets: true,
      requireVerifiedOwnership: true,
      allowActiveExploit: false,
      requireRateLimitSupport: true,
      rateLimitRps: 5,
      requireHostAllowlistSupport: true,
      requirePathExclusionSupport: true,
      documentationUrls: [cloudflareScansPolicyUrl],
      excludedPaths: ["/cdn-cgi/"]
    },
    create: {
      id: cloudflareConstraintId,
      name: "Cloudflare Owned Asset Policy",
      kind: "provider_policy",
      provider: "cloudflare",
      version: 1,
      description: "Restricts testing to customer-owned assets behind Cloudflare, denies Cloudflare-owned destinations, disables active exploitation, and enforces Cloudflare scan exclusions and throttling. Cloudflare penetration-test prerequisites such as WAF, bot, and rate-limiting zone configuration must still be validated outside this constraint.",
      bypassForLocalTargets: false,
      denyProviderOwnedTargets: true,
      requireVerifiedOwnership: true,
      allowActiveExploit: false,
      requireRateLimitSupport: true,
      rateLimitRps: 5,
      requireHostAllowlistSupport: true,
      requirePathExclusionSupport: true,
      documentationUrls: [cloudflareScansPolicyUrl],
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
      description: "Allows local and private development targets to bypass provider-governed execution constraints for approved lab workflows.",
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
      description: "Allows local and private development targets to bypass provider-governed execution constraints for approved lab workflows.",
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

  await prisma.applicationConstraintBinding.upsert({
    where: {
      applicationId_constraintId: {
        applicationId: localAttackPathApplicationId,
        constraintId: localTargetBypassConstraintId
      }
    },
    update: {},
    create: {
      applicationId: localAttackPathApplicationId,
      constraintId: localTargetBypassConstraintId
    }
  });

  await prisma.applicationConstraintBinding.upsert({
    where: {
      applicationId_constraintId: {
        applicationId: portfolioApplicationId,
        constraintId: cloudflareConstraintId
      }
    },
    update: {},
    create: {
      applicationId: portfolioApplicationId,
      constraintId: cloudflareConstraintId
    }
  });

  await prisma.applicationConstraintBinding.upsert({
    where: {
      applicationId_constraintId: {
        applicationId: securePentApplicationId,
        constraintId: cloudflareConstraintId
      }
    },
    update: {},
    create: {
      applicationId: securePentApplicationId,
      constraintId: cloudflareConstraintId
    }
  });

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
          }) as Prisma.InputJsonValue,
          outputSchema: tool.outputSchema as Prisma.InputJsonValue
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
          }) as Prisma.InputJsonValue,
          outputSchema: tool.outputSchema as Prisma.InputJsonValue
        }
      })
    )
  );

  await Promise.all(
    getBuiltinAiTools().map((tool) =>
      prisma.aiTool.upsert({
        where: { id: tool.id },
        update: {
          name: tool.name,
          status: "active",
          source: "system",
          description: tool.description,
          adapter: "builtin-capability",
          binary: null,
          category: tool.category,
          riskTier: tool.riskTier,
          notes: "Virtual builtin capability record used for grant references and default relationships.",
          inputSchema: tool.inputSchema as Prisma.InputJsonValue,
          outputSchema: tool.outputSchema as Prisma.InputJsonValue
        },
        create: {
          id: tool.id,
          name: tool.name,
          status: "active",
          source: "system",
          description: tool.description,
          adapter: "builtin-capability",
          binary: null,
          category: tool.category,
          riskTier: tool.riskTier,
          notes: "Virtual builtin capability record used for grant references and default relationships.",
          inputSchema: tool.inputSchema as Prisma.InputJsonValue,
          outputSchema: tool.outputSchema as Prisma.InputJsonValue
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
    roleDefinitions.map((role) =>
      prisma.aiAgent.upsert({
        where: { id: seededAgentId(role.key) },
        update: {
          name: `Anthropic ${role.name}`,
          status: "active",
          description: role.description,
          systemPrompt: role.systemPrompt
        },
        create: {
          id: seededAgentId(role.key),
          name: `Anthropic ${role.name}`,
          status: "active",
          description: role.description,
          systemPrompt: role.systemPrompt
        }
      })
    )
  );

  const seededAgentIdList = roleDefinitions.map((role) => seededAgentId(role.key));

  await prisma.aiAgentTool.deleteMany({
    where: {
      agentId: { in: seededAgentIdList }
    }
  });

  await prisma.aiAgentTool.createMany({
    data: roleDefinitions.flatMap((role) =>
      role.toolIds.map((toolId, index) => ({
        agentId: seededAgentId(role.key),
        toolId,
        ord: index
      }))
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

  await prisma.workflow.deleteMany({
    where: {
      id: {
        in: [
          osiSingleAgentWorkflowId,
          portfolioEvidenceGraphWorkflowId
        ],
        notIn: seededWorkflowIds
      }
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
          applicationId: null
        },
        create: {
          id: workflow.id,
          name: workflow.name,
          status: workflow.status,
          executionKind: workflow.executionKind,
          description: workflow.description,
          applicationId: null
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
          stageSystemPrompt: stage.stageSystemPrompt,
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

  await prisma.aiAgentTool.deleteMany({
    where: {
      agentId: { in: [...deprecatedSeededAgentIds] }
    }
  });

  await prisma.aiAgent.deleteMany({
    where: {
      id: { in: [...deprecatedSeededAgentIds] }
    }
  });

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
