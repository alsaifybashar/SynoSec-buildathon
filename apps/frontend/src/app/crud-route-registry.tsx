import type { ComponentType } from "react";
import { AiAgentsPage } from "@/features/ai-agents/page";
import { AiProvidersPage } from "@/features/ai-providers/page";
import { AiToolsPage } from "@/features/ai-tools/page";
import { ExecutionConstraintsPage } from "@/features/execution-constraints/page";
import { TargetsPage } from "@/features/targets/page";
import { WorkflowDetailPage } from "@/features/workflows/detail-page";
import { WorkflowsPage } from "@/features/workflows/page";
import { crudRouteConfigs, type CrudNavigationId } from "@/app/navigation";

export type CrudRouteRegistryEntry = {
  id: CrudNavigationId;
  component: ComponentType<Record<string, unknown>>;
  detailComponent?: ComponentType<Record<string, unknown>>;
  detailIdProp: string;
  detailLabelProp: string;
  onNavigateToRelatedDetail?: boolean;
};

export const crudRouteRegistry: CrudRouteRegistryEntry[] = [
  {
    id: "targets",
    component: TargetsPage as ComponentType<Record<string, unknown>>,
    detailIdProp: "targetId",
    detailLabelProp: "targetNameHint"
  },
  {
    id: "ai-providers",
    component: AiProvidersPage as ComponentType<Record<string, unknown>>,
    detailIdProp: "providerId",
    detailLabelProp: "providerNameHint"
  },
  {
    id: "ai-agents",
    component: AiAgentsPage as ComponentType<Record<string, unknown>>,
    detailIdProp: "agentId",
    detailLabelProp: "agentNameHint"
  },
  {
    id: "ai-tools",
    component: AiToolsPage as ComponentType<Record<string, unknown>>,
    detailIdProp: "toolId",
    detailLabelProp: "toolNameHint"
  },
  {
    id: "execution-constraints",
    component: ExecutionConstraintsPage as ComponentType<Record<string, unknown>>,
    detailIdProp: "constraintId",
    detailLabelProp: "constraintNameHint"
  },
  {
    id: "workflows",
    component: WorkflowsPage as ComponentType<Record<string, unknown>>,
    detailComponent: WorkflowDetailPage as ComponentType<Record<string, unknown>>,
    detailIdProp: "workflowId",
    detailLabelProp: "workflowNameHint",
    onNavigateToRelatedDetail: true
  }
];

export const legacyCrudRedirects = [
  { path: "/applications", redirectTo: crudRouteConfigs.targets.listPath },
  { path: "/applications/new", redirectTo: crudRouteConfigs.targets.createPath },
  { path: "/applications/:applicationId", section: "targets", legacyParamName: "applicationId" },
  { path: "/runtimes", redirectTo: crudRouteConfigs.targets.listPath },
  { path: "/runtimes/new", redirectTo: crudRouteConfigs.targets.createPath },
  { path: "/runtimes/:runtimeId", redirectTo: crudRouteConfigs.targets.listPath },
  { path: "/ai-providers", redirectTo: crudRouteConfigs["ai-providers"].listPath },
  { path: "/ai-providers/:providerId", section: "ai-providers", legacyParamName: "providerId" },
  { path: "/ai-agents", redirectTo: crudRouteConfigs["ai-agents"].listPath },
  { path: "/ai-agents/:agentId", section: "ai-agents", legacyParamName: "agentId" },
  { path: "/ai-tools", redirectTo: crudRouteConfigs["ai-tools"].listPath },
  { path: "/ai-tools/:toolId", section: "ai-tools", legacyParamName: "toolId" }
] as const;
