import {
  AppWindow,
  FileSearch,
  Route,
  ScrollText,
  Wrench,
  type LucideIcon
} from "lucide-react";

export type NavigationId =
  | "targets"
  | "ai-tools"
  | "execution-constraints"
  | "workflows"
  | "execution-reports";

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
  | "targets"
  | "ai-tools"
  | "execution-constraints"
  | "workflows";

export type CrudRouteConfig = {
  id: CrudNavigationId;
  listPath: string;
  createPath: string;
  detailPath: string;
  editPath?: string;
  paramName: string;
};

function createNavigationItem(item: NavigationItem) {
  return item;
}

export const defaultNavigationId: NavigationId = "targets";
export const defaultRoutePath = "/targets";
export const loginRoutePath = "/login";

export const crudRouteConfigs: Record<CrudNavigationId, CrudRouteConfig> = {
  targets: {
    id: "targets",
    listPath: "/targets",
    createPath: "/targets/new",
    detailPath: "/targets/:targetId",
    paramName: "targetId"
  },
  "ai-tools": {
    id: "ai-tools",
    listPath: "/tool-registry",
    createPath: "/tool-registry/new",
    detailPath: "/tool-registry/:toolId",
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
    editPath: "/workflows/:workflowId/edit",
    paramName: "workflowId"
  }
};

export const navigationTree: NavigationTreeEntry[] = [
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
      label: "Reports",
      path: "/execution-reports",
      icon: FileSearch
    })
  },
  {
    kind: "group",
    group: {
      id: "configuration",
      label: "Configuration",
      icon: AppWindow,
      items: [
        createNavigationItem({
          id: "targets",
          label: "Targets",
          path: crudRouteConfigs.targets.listPath,
          icon: AppWindow
        }),
        createNavigationItem({
          id: "ai-tools",
          label: "Tool Registry",
          path: crudRouteConfigs["ai-tools"].listPath,
          icon: Wrench
        }),
        createNavigationItem({
          id: "execution-constraints",
          label: "Execution Constraints",
          path: crudRouteConfigs["execution-constraints"].listPath,
          icon: ScrollText
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

export function getEditPath(id: CrudNavigationId, detailId: string) {
  const route = crudRouteConfigs[id];
  if (!route.editPath) {
    return getDetailPath(id, detailId);
  }

  return route.editPath.replace(`:${route.paramName}`, detailId);
}

export function getDetailPath(id: CrudNavigationId, detailId: string) {
  const route = crudRouteConfigs[id];
  return route.detailPath.replace(`:${route.paramName}`, detailId);
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
