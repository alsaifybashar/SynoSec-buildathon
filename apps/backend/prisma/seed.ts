import { localDemoTargetDefaults, localFullStackTargetDefaults, localJuiceShopTargetDefaults } from "@synosec/contracts";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  getSeededWorkflowDefinitions,
  localApplicationId,
  localFullStackApplicationId,
  localJuiceShopApplicationId,
  osiSingleAgentWorkflowId,
  portfolioApplicationId,
  portfolioEvidenceGraphWorkflowId,
  securePentApplicationId,
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
const deprecatedSeededWorkflowIds = [
  "0e8e3912-c48f-4c34-9ac0-c54ec70df3f6"
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
      id: { notIn: [localApplicationId, localFullStackApplicationId, localJuiceShopApplicationId, portfolioApplicationId, securePentApplicationId] },
      name: {
        in: [
          "Local Attack Path Target",
          "Local Juice Shop Target",
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
      executionBaseUrl: localDemoTargetDefaults.internalUrl,
      environment: "development",
      status: "active",
      lastScannedAt: new Date("2026-04-12T12:00:00.000Z")
    },
    create: {
      id: localApplicationId,
      name: "Local Vulnerable Target",
      baseUrl: localDemoTargetDefaults.hostUrl,
      executionBaseUrl: localDemoTargetDefaults.internalUrl,
      environment: "development",
      status: "active",
      lastScannedAt: new Date("2026-04-12T12:00:00.000Z")
    }
  });

  await prisma.application.upsert({
    where: { id: localFullStackApplicationId },
    update: {
      name: "Local Full Stack Target",
      baseUrl: localFullStackTargetDefaults.hostUrl,
      executionBaseUrl: localFullStackTargetDefaults.internalUrl,
      environment: "development",
      status: "active",
      lastScannedAt: new Date("2026-04-12T12:00:00.000Z")
    },
    create: {
      id: localFullStackApplicationId,
      name: "Local Full Stack Target",
      baseUrl: localFullStackTargetDefaults.hostUrl,
      executionBaseUrl: localFullStackTargetDefaults.internalUrl,
      environment: "development",
      status: "active",
      lastScannedAt: new Date("2026-04-12T12:00:00.000Z")
    }
  });

  await prisma.application.upsert({
    where: { id: localJuiceShopApplicationId },
    update: {
      name: "Local Juice Shop Target",
      baseUrl: localJuiceShopTargetDefaults.hostUrl,
      executionBaseUrl: localJuiceShopTargetDefaults.internalUrl,
      environment: "development",
      status: "active",
      lastScannedAt: new Date("2026-04-12T12:00:00.000Z")
    },
    create: {
      id: localJuiceShopApplicationId,
      name: "Local Juice Shop Target",
      baseUrl: localJuiceShopTargetDefaults.hostUrl,
      executionBaseUrl: localJuiceShopTargetDefaults.internalUrl,
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
      executionBaseUrl: null,
      environment: "production",
      status: "active",
      lastScannedAt: null
    },
    create: {
      id: portfolioApplicationId,
      name: "Nils Wickman Portfolio",
      baseUrl: "https://nilswickman.com",
      executionBaseUrl: null,
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
      executionBaseUrl: null,
      environment: "production",
      status: "active",
      lastScannedAt: null
    },
    create: {
      id: securePentApplicationId,
      name: "SecurePent",
      baseUrl: "https://securepent.com",
      executionBaseUrl: null,
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
        applicationId: localFullStackApplicationId,
        constraintId: localTargetBypassConstraintId
      }
    },
    update: {},
    create: {
      applicationId: localFullStackApplicationId,
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
          accessProfile: resolveAccessProfile(tool.id),
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
          accessProfile: resolveAccessProfile(tool.id),
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
          accessProfile: tool.accessProfile,
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
          accessProfile: tool.accessProfile,
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
          portfolioEvidenceGraphWorkflowId,
          ...deprecatedSeededWorkflowIds
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
function resolveAccessProfile(toolId: string) {
  return "standard" as const;
}
