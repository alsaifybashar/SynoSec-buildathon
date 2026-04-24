import { randomUUID } from "node:crypto";
import { localDemoTargetDefaults } from "@synosec/contracts";
import { PrismaClient } from "@prisma/client";
import {
  getSeededProviderDefinitions,
  getSeededSingleAgentScanDefinition,
  getSeededWorkflowDefinitions,
  localApplicationId,
  seededAgentId,
  seededRoleDefinitions as roleDefinitions,
  seededSingleAgentTacticId,
  seededToolDefinitions as toolDefinitions,
  targetRuntimeId
} from "./seed-data/ai-builder-defaults.js";
import "@/shared/config/load-env.js";
import { attachExecutionConfig } from "@/features/ai-tools/tool-execution-config.js";

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
            capabilities: [...tool.capabilities]
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
            capabilities: [...tool.capabilities]
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
        {
          const displayName = provider.key === "local" && role.key === "orchestrator"
            ? "Single-Agent Security Runner"
            : `${provider.name} ${role.name}`;

          return prisma.aiAgent.upsert({
            where: { id: seededAgentId(provider.key, role.key) },
            update: {
              name: displayName,
              status: "active",
              description: role.description,
              providerId: provider.id,
              systemPrompt: role.systemPrompt,
              modelOverride: null
            },
            create: {
              id: seededAgentId(provider.key, role.key),
              name: displayName,
              status: "active",
              description: role.description,
              providerId: provider.id,
              systemPrompt: role.systemPrompt,
              modelOverride: null
            }
          });
        }
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
          ord: index,
          objective: stage.objective,
          allowedToolIds: stage.allowedToolIds,
          requiredEvidenceTypes: stage.requiredEvidenceTypes,
          findingPolicy: stage.findingPolicy,
          completionRule: stage.completionRule,
          resultSchemaVersion: stage.resultSchemaVersion,
          handoffSchema: stage.handoffSchema
        }))
      });
    })
  );

  const singleAgentScan = getSeededSingleAgentScanDefinition();

  await prisma.workflowTraceEntry.deleteMany({
    where: { workflowRunId: singleAgentScan.id }
  });
  await prisma.workflowTraceEvent.deleteMany({
    where: { workflowRunId: singleAgentScan.id }
  });
  await prisma.workflowRun.deleteMany({
    where: { id: singleAgentScan.id }
  });

  await prisma.scanAuditEntry.deleteMany({
    where: { scanRunId: singleAgentScan.id }
  });
  await prisma.scanLayerCoverage.deleteMany({
    where: { scanRunId: singleAgentScan.id }
  });
  await prisma.scanFinding.deleteMany({
    where: { scanRunId: singleAgentScan.id }
  });
  await prisma.scanTactic.deleteMany({
    where: { scanRunId: singleAgentScan.id }
  });

  await prisma.workflowRun.create({
    data: {
      id: singleAgentScan.id,
      workflowId: singleAgentScan.workflowId,
      status: "completed",
      currentStepIndex: 1,
      startedAt: new Date(singleAgentScan.scan.startedAt),
      completedAt: new Date(singleAgentScan.scan.completedAt)
    }
  });

  await prisma.scanRun.upsert({
    where: { id: singleAgentScan.id },
    update: {
      mode: singleAgentScan.mode,
      applicationId: singleAgentScan.applicationId,
      runtimeId: singleAgentScan.runtimeId,
      agentId: singleAgentScan.agentId,
      scope: singleAgentScan.scan.scope,
      llmConfig: undefined,
      status: "complete",
      stopReason: undefined,
      summary: undefined,
      createdAt: new Date(singleAgentScan.scan.startedAt),
      completedAt: new Date(singleAgentScan.scan.completedAt)
    },
    create: {
      id: singleAgentScan.id,
      mode: singleAgentScan.mode,
      applicationId: singleAgentScan.applicationId,
      runtimeId: singleAgentScan.runtimeId,
      agentId: singleAgentScan.agentId,
      scope: singleAgentScan.scan.scope,
      llmConfig: undefined,
      status: "complete",
      stopReason: undefined,
      summary: undefined,
      createdAt: new Date(singleAgentScan.scan.startedAt),
      completedAt: new Date(singleAgentScan.scan.completedAt)
    }
  });

  await prisma.scanTactic.create({
    data: {
      id: seededSingleAgentTacticId,
      scanRunId: singleAgentScan.id,
      target: "localhost:8888",
      layer: "L7",
      service: "http",
      port: 8888,
      riskScore: 0.8,
      status: "complete",
      parentTacticId: null,
      depth: 0,
      createdAt: new Date(singleAgentScan.scan.startedAt)
    }
  });

  await prisma.scanFinding.create({
    data: {
      id: singleAgentScan.vulnerability.id,
      scanRunId: singleAgentScan.vulnerability.scanId,
      scanTacticId: seededSingleAgentTacticId,
      agentId: singleAgentScan.vulnerability.agentId,
      primaryLayer: singleAgentScan.vulnerability.primaryLayer,
      relatedLayers: [...singleAgentScan.vulnerability.relatedLayers],
      category: singleAgentScan.vulnerability.category,
      target: singleAgentScan.vulnerability.target,
      severity: singleAgentScan.vulnerability.severity,
      confidence: singleAgentScan.vulnerability.confidence,
      title: singleAgentScan.vulnerability.title,
      description: singleAgentScan.vulnerability.description,
      evidence: singleAgentScan.vulnerability.evidence.map((item) => item.quote).join("\n\n"),
      evidenceItems: singleAgentScan.vulnerability.evidence,
      technique: singleAgentScan.vulnerability.technique,
      impact: singleAgentScan.vulnerability.impact,
      recommendation: singleAgentScan.vulnerability.recommendation,
      reproduceCommand: singleAgentScan.vulnerability.reproduction.commandPreview,
      reproduction: singleAgentScan.vulnerability.reproduction,
      validated: false,
      validationStatus: singleAgentScan.vulnerability.validationStatus,
      cwe: singleAgentScan.vulnerability.cwe ?? null,
      owasp: singleAgentScan.vulnerability.owasp ?? null,
      tags: [...singleAgentScan.vulnerability.tags],
      evidenceRefs: singleAgentScan.vulnerability.evidence.flatMap((item) =>
        [item.artifactRef, item.observationRef].filter((value): value is string => Boolean(value))
      ),
      sourceToolRuns: singleAgentScan.vulnerability.evidence.flatMap((item) => item.toolRunRef ? [item.toolRunRef] : []),
      confidenceReason: "Seeded single-source demo evidence.",
      createdAt: new Date(singleAgentScan.vulnerability.createdAt)
    }
  });

  await prisma.scanLayerCoverage.createMany({
    data: singleAgentScan.layerCoverage.map((coverage) => ({
      scanRunId: coverage.scanId,
      layer: coverage.layer,
      coverageStatus: coverage.coverageStatus,
      confidenceSummary: coverage.confidenceSummary,
      toolRefs: coverage.toolRefs,
      evidenceRefs: coverage.evidenceRefs,
      vulnerabilityIds: coverage.vulnerabilityIds,
      gaps: coverage.gaps,
      updatedAt: new Date(coverage.updatedAt)
    }))
  });

  await prisma.scanAuditEntry.createMany({
    data: singleAgentScan.auditEntries.map((entry) => ({
      id: randomUUID(),
      scanRunId: entry.scanId,
      timestamp: new Date(entry.createdAt),
      actor: entry.actorType,
      action: entry.action,
      targetTacticId: null,
      scopeValid: true,
      details: { detail: entry.detail }
    }))
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
