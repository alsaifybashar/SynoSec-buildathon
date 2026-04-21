import { createElement, type ComponentType, type ReactNode } from "react";
import {
  AppWindow,
  Bot,
  BrainCog,
  Network,
  Newspaper,
  Orbit,
  PlugZap,
  Radar,
  Route,
  ScrollText,
  Shapes,
  Terminal,
  Waves,
  Waypoints,
  Wrench,
  type LucideIcon
} from "lucide-react";
import { AiAgentsPage } from "@/pages/ai-agents-page";
import { AiProvidersPage } from "@/pages/ai-providers-page";
import { AiToolsPage } from "@/pages/ai-tools-page";
import { ApplicationsPage } from "@/pages/applications-page";
import { BpmnAtlasPage } from "@/pages/bpmn-atlas-page";
import { FlowChoreographyPage } from "@/pages/flow-choreography-page";
import { FlowStudioPage } from "@/pages/flow-studio-page";
import { RuntimesPage } from "@/pages/runtimes-page";
import { Workflow2Page } from "@/pages/workflow-2-page";
import { WorkflowBiospherePage } from "@/pages/workflow-biosphere-page";
import { WorkflowDossierPage } from "@/pages/workflow-dossier-page";
import { WorkflowTerminalPage } from "@/pages/workflow-terminal-page";
import { WorkflowsPage } from "@/features/workflows/workflows-page";
import { SingleAgentScansPage } from "@/features/scans/single-agent-scans-page";

export type NavigationId =
  | "runtimes"
  | "applications"
  | "ai-providers"
  | "ai-agents"
  | "ai-tools"
  | "workflows"
  | "single-agent-scans"
  | "flow-studio"
  | "choreography"
  | "bpmn-atlas"
  | "workflow-2"
  | "workflow-dossier"
  | "workflow-terminal"
  | "workflow-biosphere";

export type AppRoute = {
  section: NavigationId;
  detailId: string | undefined;
  detailLabel: string | undefined;
};

export type NavigationState = {
  detailLabel: string | undefined;
};

export type NavigationRenderContext = {
  route: AppRoute;
  navigateToPath: (path: string, state?: NavigationState) => void;
  navigateToSection: (section: NavigationId) => void;
  navigateToCreate: (section: NavigationId) => void;
  navigateToDetail: (section: NavigationId, id: string, label: string | undefined) => void;
};

export type NavigationItem = {
  id: NavigationId;
  label: string;
  slug: string;
  icon: LucideIcon;
  render: (context: NavigationRenderContext) => ReactNode;
};

function createCrudNavigationItem(options: {
  id: NavigationId;
  label: string;
  slug: string;
  icon: LucideIcon;
  detailIdProp: string;
  detailLabelProp: string;
  component: ComponentType<any>;
}) {
  return {
    id: options.id,
    label: options.label,
    slug: options.slug,
    icon: options.icon,
    render(context: NavigationRenderContext) {
      return createElement(options.component, {
        key: `${options.id}:${context.route.detailId ?? "list"}`,
        ...(context.route.detailLabel ? { [options.detailLabelProp]: context.route.detailLabel } : {}),
        ...(context.route.detailId ? { [options.detailIdProp]: context.route.detailId } : {}),
        onNavigateToList: () => context.navigateToSection(options.id),
        onNavigateToCreate: () => context.navigateToCreate(options.id),
        onNavigateToDetail: (id: string, label?: string) => context.navigateToDetail(options.id, id, label)
      });
    }
  } satisfies NavigationItem;
}

const flowStudioItem: NavigationItem = {
  id: "flow-studio",
  label: "Flow Studio",
  slug: "flow-studio",
  icon: Waypoints,
  render(context) {
    return createElement(FlowStudioPage, {
      key: `flow-studio:${context.route.detailId ?? "root"}`,
      ...(context.route.detailId ? { workflowId: context.route.detailId } : {}),
      onNavigateToRoot: () => context.navigateToSection("flow-studio"),
      onNavigateToFlow: (id: string) => context.navigateToPath(getDetailPath("flow-studio", id))
    });
  }
};

const choreographyItem: NavigationItem = {
  id: "choreography",
  label: "Choreography",
  slug: "choreography",
  icon: Orbit,
  render() {
    return createElement(FlowChoreographyPage, { key: "choreography" });
  }
};

const bpmnAtlasItem: NavigationItem = {
  id: "bpmn-atlas",
  label: "Process Atlas",
  slug: "bpmn-atlas",
  icon: ScrollText,
  render() {
    return createElement(BpmnAtlasPage, { key: "bpmn-atlas" });
  }
};

const workflow2Item: NavigationItem = {
  id: "workflow-2",
  label: "Workflow 2",
  slug: "workflow-2",
  icon: BrainCog,
  render() {
    return createElement(Workflow2Page, { key: "workflow-2" });
  }
};

const workflowDossierItem: NavigationItem = {
  id: "workflow-dossier",
  label: "Run · Case File",
  slug: "workflow-dossier",
  icon: Newspaper,
  render() {
    return createElement(WorkflowDossierPage, { key: "workflow-dossier" });
  }
};

const workflowTerminalItem: NavigationItem = {
  id: "workflow-terminal",
  label: "Run · Sync Terminal",
  slug: "workflow-terminal",
  icon: Terminal,
  render() {
    return createElement(WorkflowTerminalPage, { key: "workflow-terminal" });
  }
};

const workflowBiosphereItem: NavigationItem = {
  id: "workflow-biosphere",
  label: "Run · Biosphere",
  slug: "workflow-biosphere",
  icon: Waves,
  render() {
    return createElement(WorkflowBiospherePage, { key: "workflow-biosphere" });
  }
};

export type NavigationGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavigationItem[];
};

export type NavigationTreeEntry =
  | { kind: "item"; item: NavigationItem }
  | { kind: "group"; group: NavigationGroup };

export const navigationTree: NavigationTreeEntry[] = [
  {
    kind: "item",
    item: createCrudNavigationItem({
      id: "runtimes",
      label: "Runtimes",
      slug: "runtimes",
      icon: Network,
      detailIdProp: "runtimeId",
      detailLabelProp: "runtimeNameHint",
      component: RuntimesPage
    })
  },
  {
    kind: "item",
    item: createCrudNavigationItem({
      id: "applications",
      label: "Applications",
      slug: "applications",
      icon: AppWindow,
      detailIdProp: "applicationId",
      detailLabelProp: "applicationNameHint",
      component: ApplicationsPage
    })
  },
  {
    kind: "item",
    item: createCrudNavigationItem({
      id: "ai-providers",
      label: "AI Providers",
      slug: "ai-providers",
      icon: PlugZap,
      detailIdProp: "providerId",
      detailLabelProp: "providerNameHint",
      component: AiProvidersPage
    })
  },
  {
    kind: "item",
    item: createCrudNavigationItem({
      id: "ai-agents",
      label: "AI Agents",
      slug: "ai-agents",
      icon: Bot,
      detailIdProp: "agentId",
      detailLabelProp: "agentNameHint",
      component: AiAgentsPage
    })
  },
  {
    kind: "item",
    item: createCrudNavigationItem({
      id: "ai-tools",
      label: "AI Tools",
      slug: "ai-tools",
      icon: Wrench,
      detailIdProp: "toolId",
      detailLabelProp: "toolNameHint",
      component: AiToolsPage
    })
  },
  {
    kind: "item",
    item: createCrudNavigationItem({
      id: "workflows",
      label: "Workflows",
      slug: "workflows",
      icon: Route,
      detailIdProp: "workflowId",
      detailLabelProp: "workflowNameHint",
      component: WorkflowsPage
    })
  },
  {
    kind: "item",
    item: createCrudNavigationItem({
      id: "single-agent-scans",
      label: "Single-Agent Scans",
      slug: "single-agent-scans",
      icon: Radar,
      detailIdProp: "scanId",
      detailLabelProp: "scanNameHint",
      component: SingleAgentScansPage
    })
  },
  {
    kind: "group",
    group: {
      id: "designs",
      label: "Designs",
      icon: Shapes,
      items: [
        flowStudioItem,
        choreographyItem,
        bpmnAtlasItem,
        workflow2Item,
        workflowDossierItem,
        workflowTerminalItem,
        workflowBiosphereItem
      ]
    }
  }
];

export const navigationItems: NavigationItem[] = navigationTree.flatMap((entry) =>
  entry.kind === "item" ? [entry.item] : entry.group.items
);

export const defaultSection: NavigationId = "applications";

const navigationBySlug = new Map(navigationItems.map((item) => [item.slug, item]));
const navigationById = new Map(navigationItems.map((item) => [item.id, item]));

export function getNavigationItem(section: NavigationId) {
  return navigationById.get(section) ?? navigationById.get(defaultSection)!;
}

export function getSectionPath(section: NavigationId) {
  return `/${getNavigationItem(section).slug}`;
}

export function getDetailPath(section: NavigationId, detailId: string) {
  return `${getSectionPath(section)}/${detailId}`;
}

export function getRouteFromPath(pathname: string, state?: unknown): AppRoute {
  const segments = pathname.split("/").filter(Boolean);
  const detailLabel = typeof state === "object" && state !== null && "detailLabel" in state && typeof state.detailLabel === "string"
    ? state.detailLabel
    : undefined;

  if (segments.length === 0) {
    return { section: defaultSection, detailId: undefined, detailLabel };
  }

  const navigationItem = navigationBySlug.get(segments[0] ?? "");
  if (!navigationItem) {
    return { section: defaultSection, detailId: undefined, detailLabel };
  }

  return {
    section: navigationItem.id,
    detailId: segments[1],
    detailLabel
  };
}
