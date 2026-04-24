import { createElement, type ComponentType, type ReactNode } from "react";
import {
  AppWindow,
  Bot,
  Network,
  PlugZap,
  Route,
  Target,
  Waypoints,
  Wrench,
  type LucideIcon
} from "lucide-react";
import { AiAgentsPage } from "@/pages/ai-agents-page";
import { AiProvidersPage } from "@/pages/ai-providers-page";
import { AiToolsPage } from "@/pages/ai-tools-page";
import { ApplicationsPage } from "@/pages/applications-page";
import { FlowStudioPage } from "@/pages/flow-studio-page";
import { RuntimesPage } from "@/pages/runtimes-page";
import { WorkflowsPage } from "@/features/workflows/workflows-page";
import { AttackMapPage } from "@/pages/attack-map-page";

export type NavigationId =
  | "runtimes"
  | "applications"
  | "ai-providers"
  | "ai-agents"
  | "ai-tools"
  | "workflows"
  | "attack-map"
  | "flow-studio";

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

const attackMapItem: NavigationItem = {
  id: "attack-map",
  label: "Attack Map",
  slug: "attack-map",
  icon: Target,
  render() {
    return createElement(AttackMapPage, { key: "attack-map" });
  }
};

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
    item: attackMapItem
  },
  { kind: "item", item: flowStudioItem }
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
