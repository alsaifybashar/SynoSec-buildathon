import {
  AlignLeft,
  AppWindow,
  Bot,
  Columns2,
  FileSearch,
  GitCompare,
  ListTree,
  MessageSquareText,
  Network,
  NotebookText,
  Orbit,
  PlugZap,
  Route,
  ScrollText,
  Shapes,
  Sparkles,
  Wrench,
  type LucideIcon
} from "lucide-react";

export type NavigationId =
  | "runtimes"
  | "applications"
  | "ai-providers"
  | "ai-agents"
  | "ai-tools"
  | "execution-constraints"
  | "workflows"
  | "execution-reports"
  | "workflow-thread"
  | "workflow-trace"
  | "workflow-ledger"
  | "workflow-steps"
  | "workflow-journal"
  | "attack-map"
  | "design-stream"
  | "design-duplex"
  | "design-document"
  | "design-diff";

export type NavigationState = {
  detailLabel?: string;
};

export type NavigationItem = {
  id: NavigationId;
  label: string;
  path: string;
  icon: LucideIcon;
  matchPaths?: string[];
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

export type CrudNavigationId =
  | "applications"
  | "runtimes"
  | "ai-providers"
  | "ai-agents"
  | "ai-tools"
  | "execution-constraints"
  | "workflows";

export type CrudRouteConfig = {
  id: CrudNavigationId;
  listPath: string;
  createPath: string;
  detailPath: string;
  paramName: string;
};

function createNavigationItem(item: NavigationItem) {
  return item;
}

export const defaultNavigationId: NavigationId = "applications";
export const defaultRoutePath = "/applications";
export const loginRoutePath = "/login";

export const crudRouteConfigs: Record<CrudNavigationId, CrudRouteConfig> = {
  applications: {
    id: "applications",
    listPath: "/applications",
    createPath: "/applications/new",
    detailPath: "/applications/:applicationId",
    paramName: "applicationId"
  },
  runtimes: {
    id: "runtimes",
    listPath: "/runtimes",
    createPath: "/runtimes/new",
    detailPath: "/runtimes/:runtimeId",
    paramName: "runtimeId"
  },
  "ai-providers": {
    id: "ai-providers",
    listPath: "/ai/providers",
    createPath: "/ai/providers/new",
    detailPath: "/ai/providers/:providerId",
    paramName: "providerId"
  },
  "ai-agents": {
    id: "ai-agents",
    listPath: "/ai/agents",
    createPath: "/ai/agents/new",
    detailPath: "/ai/agents/:agentId",
    paramName: "agentId"
  },
  "ai-tools": {
    id: "ai-tools",
    listPath: "/ai/tools",
    createPath: "/ai/tools/new",
    detailPath: "/ai/tools/:toolId",
    paramName: "toolId"
  },
  "execution-constraints": {
    id: "execution-constraints",
    listPath: "/execution-constraints",
    createPath: "/execution-constraints/new",
    detailPath: "/execution-constraints/:constraintId",
    paramName: "constraintId"
  },
  workflows: {
    id: "workflows",
    listPath: "/workflows",
    createPath: "/workflows/new",
    detailPath: "/workflows/:workflowId",
    paramName: "workflowId"
  }
};

export const navigationTree: NavigationTreeEntry[] = [
  {
    kind: "item",
    item: createNavigationItem({
      id: "runtimes",
      label: "Runtimes",
      path: crudRouteConfigs.runtimes.listPath,
      icon: Network
    })
  },
  {
    kind: "item",
    item: createNavigationItem({
      id: "applications",
      label: "Applications",
      path: crudRouteConfigs.applications.listPath,
      icon: AppWindow
    })
  },
  {
    kind: "item",
    item: createNavigationItem({
      id: "ai-providers",
      label: "AI Providers",
      path: crudRouteConfigs["ai-providers"].listPath,
      icon: PlugZap
    })
  },
  {
    kind: "item",
    item: createNavigationItem({
      id: "ai-agents",
      label: "AI Agents",
      path: crudRouteConfigs["ai-agents"].listPath,
      icon: Bot
    })
  },
  {
    kind: "item",
    item: createNavigationItem({
      id: "ai-tools",
      label: "AI Tools",
      path: crudRouteConfigs["ai-tools"].listPath,
      icon: Wrench
    })
  },
  {
    kind: "item",
    item: createNavigationItem({
      id: "execution-constraints",
      label: "Execution Constraints",
      path: crudRouteConfigs["execution-constraints"].listPath,
      icon: ScrollText
    })
  },
  {
    kind: "item",
    item: createNavigationItem({
      id: "workflows",
      label: "Workflows",
      path: crudRouteConfigs.workflows.listPath,
      icon: Route
    })
  },
  {
    kind: "item",
    item: createNavigationItem({
      id: "execution-reports",
      label: "Execution Reports",
      path: "/execution-reports",
      icon: FileSearch
    })
  },
  {
    kind: "item",
    item: createNavigationItem({
      id: "attack-map",
      label: "Attack Map",
      path: "/attack-map",
      icon: Orbit
    })
  },
  {
    kind: "group",
    group: {
      id: "designs",
      label: "Designs",
      icon: Shapes,
      items: [
        createNavigationItem({
          id: "design-stream",
          label: "Streaming Document",
          path: "/designs/stream",
          icon: Sparkles
        }),
        createNavigationItem({
          id: "design-duplex",
          label: "Duplex Stream",
          path: "/designs/duplex",
          icon: Columns2
        }),
        createNavigationItem({
          id: "design-document",
          label: "Live Document",
          path: "/designs/document",
          icon: ScrollText
        }),
        createNavigationItem({
          id: "design-diff",
          label: "Diff View",
          path: "/designs/diff",
          icon: GitCompare
        }),
        createNavigationItem({
          id: "workflow-thread",
          label: "Chat · Thread",
          path: "/designs/workflow/thread",
          icon: MessageSquareText
        }),
        createNavigationItem({
          id: "workflow-trace",
          label: "Chat · Trace",
          path: "/designs/workflow/trace",
          icon: AlignLeft
        }),
        createNavigationItem({
          id: "workflow-ledger",
          label: "Chat · Ledger",
          path: "/designs/workflow/ledger",
          icon: Columns2
        }),
        createNavigationItem({
          id: "workflow-steps",
          label: "Chat · Steps",
          path: "/designs/workflow/steps",
          icon: ListTree
        }),
        createNavigationItem({
          id: "workflow-journal",
          label: "Chat · Journal",
          path: "/designs/workflow/journal",
          icon: NotebookText
        })
      ]
    }
  }
];

export const navigationItems: NavigationItem[] = navigationTree.flatMap((entry) =>
  entry.kind === "item" ? [entry.item] : entry.group.items
);

const navigationById = new Map(navigationItems.map((item) => [item.id, item]));

export function getNavigationItem(id: NavigationId) {
  return navigationById.get(id) ?? navigationById.get(defaultNavigationId)!;
}

export function getSectionPath(id: NavigationId) {
  return getNavigationItem(id).path;
}

export function getCreatePath(id: CrudNavigationId) {
  return crudRouteConfigs[id].createPath;
}

export function getDetailPath(id: CrudNavigationId, detailId: string) {
  return `${crudRouteConfigs[id].listPath}/${detailId}`;
}

function matchesPath(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function getActiveNavigationId(pathname: string) {
  const exactMatch = navigationItems.find((item) => pathname === item.path);
  if (exactMatch) {
    return exactMatch.id;
  }

  const nestedMatch = navigationItems.find((item) => matchesPath(pathname, item.path));
  return nestedMatch?.id ?? defaultNavigationId;
}

export function isNavigationItemActive(item: NavigationItem, pathname: string) {
  const matchPaths = item.matchPaths ?? [item.path];
  return matchPaths.some((path) => matchesPath(pathname, path));
}
