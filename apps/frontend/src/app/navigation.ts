import { createElement, type ComponentType, type ReactNode } from "react";
import {
  AlignLeft,
  AppWindow,
  Bot,
  Columns2,
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
import { AiAgentsPage } from "@/features/ai-agents/page";
import { AiProvidersPage } from "@/features/ai-providers/page";
import { AiToolsPage } from "@/features/ai-tools/page";
import { ApplicationsPage } from "@/features/applications/page";
import { RuntimesPage } from "@/features/runtimes/page";
import { AttackMapPage } from "@/features/attack-map/page";
import { WorkflowJournalPage } from "@/features/workflow-journal/page";
import { WorkflowLedgerPage } from "@/features/workflow-ledger/page";
import { WorkflowStepsPage } from "@/features/workflow-steps/page";
import { WorkflowThreadPage } from "@/features/workflow-thread/page";
import { WorkflowTracePage } from "@/features/workflow-trace/page";
import { WorkflowsPage } from "@/features/workflows/page";
import { DesignStream } from "@/features/designs/design-stream";
import { DesignDocument } from "@/features/designs/design-document";
import { DesignDiff } from "@/features/designs/design-diff";
import { DesignDuplex } from "@/features/designs/design-duplex";

export type NavigationId =
  | "runtimes"
  | "applications"
  | "ai-providers"
  | "ai-agents"
  | "ai-tools"
  | "workflows"
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

const workflowThreadItem: NavigationItem = {
  id: "workflow-thread",
  label: "Chat · Thread",
  slug: "workflow-thread",
  icon: MessageSquareText,
  render() {
    return createElement(WorkflowThreadPage, { key: "workflow-thread" });
  }
};

const workflowTraceItem: NavigationItem = {
  id: "workflow-trace",
  label: "Chat · Trace",
  slug: "workflow-trace",
  icon: AlignLeft,
  render() {
    return createElement(WorkflowTracePage, { key: "workflow-trace" });
  }
};

const workflowLedgerItem: NavigationItem = {
  id: "workflow-ledger",
  label: "Chat · Ledger",
  slug: "workflow-ledger",
  icon: Columns2,
  render() {
    return createElement(WorkflowLedgerPage, { key: "workflow-ledger" });
  }
};

const workflowStepsItem: NavigationItem = {
  id: "workflow-steps",
  label: "Chat · Steps",
  slug: "workflow-steps",
  icon: ListTree,
  render() {
    return createElement(WorkflowStepsPage, { key: "workflow-steps" });
  }
};

const workflowJournalItem: NavigationItem = {
  id: "workflow-journal",
  label: "Chat · Journal",
  slug: "workflow-journal",
  icon: NotebookText,
  render() {
    return createElement(WorkflowJournalPage, { key: "workflow-journal" });
  }
};

const attackMapItem: NavigationItem = {
  id: "attack-map",
  label: "Attack Map",
  slug: "attack-map",
  icon: Orbit,
  render() {
    return createElement(AttackMapPage, { key: "attack-map" });
  }
};

const designStreamItem: NavigationItem = {
  id: "design-stream",
  label: "Streaming Document",
  slug: "designs-stream",
  icon: Sparkles,
  render() {
    return createElement(DesignStream, { key: "design-stream" });
  }
};

const designDuplexItem: NavigationItem = {
  id: "design-duplex",
  label: "Duplex Stream",
  slug: "designs-duplex",
  icon: Columns2,
  render() {
    return createElement(DesignDuplex, { key: "design-duplex" });
  }
};

const designDocumentItem: NavigationItem = {
  id: "design-document",
  label: "Live Document",
  slug: "designs-document",
  icon: ScrollText,
  render() {
    return createElement(DesignDocument, { key: "design-document" });
  }
};

const designDiffItem: NavigationItem = {
  id: "design-diff",
  label: "Diff View",
  slug: "designs-diff",
  icon: GitCompare,
  render() {
    return createElement(DesignDiff, { key: "design-diff" });
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
  {
    kind: "group",
    group: {
      id: "designs",
      label: "Designs",
      icon: Shapes,
      items: [
        designStreamItem,
        designDuplexItem,
        designDocumentItem,
        designDiffItem,
        workflowThreadItem,
        workflowTraceItem,
        workflowLedgerItem,
        workflowStepsItem,
        workflowJournalItem
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
