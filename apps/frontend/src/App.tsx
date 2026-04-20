import { useEffect, useState } from "react";
import {
  Bot,
  AppWindow,
  Menu,
  PlugZap,
  Network,
  Route,
  Wrench,
  X
} from "lucide-react";
import { ApplicationsPage } from "@/pages/applications-page";
import { RuntimesPage } from "@/pages/runtimes-page";
import { AiProvidersPage } from "@/pages/ai-providers-page";
import { AiAgentsPage } from "@/pages/ai-agents-page";
import { AiToolsPage } from "@/pages/ai-tools-page";
import { WorkflowsPage } from "@/pages/workflows-page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuText,
  SidebarProvider
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

type NavigationId = "runtimes" | "applications" | "ai-providers" | "ai-agents" | "ai-tools" | "workflows";

type NavigationItem = {
  id: NavigationId;
  label: string;
  icon: typeof Network;
};

type AppRoute = {
  section: NavigationId;
  detailId: string | undefined;
  detailLabel: string | undefined;
};

type ThemeId = "synosec" | "dark";

type ThemeMeta = {
  id: ThemeId;
  label: string;
  hint: string;
  swatch: { base: string; surface: string; accent: string };
};

const navigationItems: NavigationItem[] = [
  { id: "runtimes", label: "Runtimes", icon: Network },
  { id: "applications", label: "Applications", icon: AppWindow },
  { id: "ai-providers", label: "AI Providers", icon: PlugZap },
  { id: "ai-agents", label: "AI Agents", icon: Bot },
  { id: "ai-tools", label: "AI Tools", icon: Wrench },
  { id: "workflows", label: "Workflows", icon: Route }
];

const navigationPaths: Record<NavigationId, string> = {
  runtimes: "/runtimes",
  applications: "/applications",
  "ai-providers": "/ai-providers",
  "ai-agents": "/ai-agents",
  "ai-tools": "/ai-tools",
  workflows: "/workflows"
};

const themeStorageKey = "synosec-theme";

const themes: ThemeMeta[] = [
  {
    id: "synosec",
    label: "SynoSec",
    hint: "Warm paper · teal",
    swatch: { base: "#faf8f3", surface: "#d5ecf1", accent: "#12889a" }
  },
  {
    id: "dark",
    label: "Dark",
    hint: "Midnight · cyan",
    swatch: { base: "#131820", surface: "#2c3542", accent: "#3dbeee" }
  }
];

const defaultSection: NavigationId = "applications";

function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

function getInitialTheme(): ThemeId {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return storedTheme && isThemeId(storedTheme) ? storedTheme : "synosec";
}

function getRouteFromPath(pathname: string, state?: unknown): AppRoute {
  const segments = pathname.split("/").filter(Boolean);
  const detailLabel = typeof state === "object" && state !== null && "detailLabel" in state && typeof state.detailLabel === "string"
    ? state.detailLabel
    : undefined;

  if (segments.length === 0) {
    return { section: defaultSection, detailId: undefined, detailLabel };
  }

  const section = segments[0] as NavigationId;
  if (!(section in navigationPaths)) {
    return { section: defaultSection, detailId: undefined, detailLabel };
  }

  return {
    section,
    detailId: segments[1],
    detailLabel
  };
}

function ThemeSwatch({ swatch, className }: { swatch: ThemeMeta["swatch"]; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex h-4 w-7 shrink-0 overflow-hidden rounded-full ring-1 ring-foreground/15",
        className
      )}
    >
      <span className="h-full w-1/3" style={{ background: swatch.base }} />
      <span className="h-full w-1/3" style={{ background: swatch.surface }} />
      <span className="h-full w-1/3" style={{ background: swatch.accent }} />
    </span>
  );
}

function ThemeSwitcher({ value, onValueChange }: { value: ThemeId; onValueChange: (theme: ThemeId) => void }) {
  const current = themes.find((theme) => theme.id === value) ?? themes[0]!;

  return (
    <div className="space-y-2">
      <SidebarGroupLabel>Theme</SidebarGroupLabel>
      <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as ThemeId)}>
        <SelectTrigger
          aria-label="Select theme"
          className="h-10 rounded-md border-sidebar-border/80 bg-sidebar-accent/60 pl-2.5 text-[0.75rem] text-sidebar-foreground ring-offset-sidebar hover:bg-sidebar-accent [&>svg]:text-sidebar-muted-foreground"
        >
          <SelectValue>
            <span className="flex items-center gap-2.5">
              <ThemeSwatch swatch={current.swatch} />
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-[0.8125rem] font-medium text-sidebar-foreground">{current.label}</span>
                <span className="truncate font-mono text-[0.575rem] uppercase tracking-[0.22em] text-sidebar-muted-foreground/80">
                  {current.hint}
                </span>
              </span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end" className="min-w-[14rem] p-1.5">
          {themes.map((theme) => (
            <SelectItem
              key={theme.id}
              value={theme.id}
              className="rounded-sm py-2 pl-2.5 pr-8 focus:bg-accent/70"
            >
              <span className="flex items-center gap-2.5">
                <ThemeSwatch swatch={theme.swatch} />
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-[0.8125rem] font-medium">{theme.label}</span>
                  <span className="truncate font-mono text-[0.575rem] uppercase tracking-[0.22em] text-muted-foreground/75">
                    {theme.hint}
                  </span>
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath(window.location.pathname, window.history.state));
  const [theme, setTheme] = useState<ThemeId>(() => getInitialTheme());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const syncFromLocation = () => {
      if (window.location.pathname === "/") {
        window.history.replaceState({}, "", navigationPaths[defaultSection]);
      }

      setRoute(getRouteFromPath(window.location.pathname, window.history.state));
    };

    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);

    return () => {
      window.removeEventListener("popstate", syncFromLocation);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [route.section, route.detailId]);

  function navigateToPath(path: string, state?: { detailLabel: string | undefined }) {
    if (window.location.pathname !== path) {
      window.history.pushState(state ?? {}, "", path);
    }

    setRoute(getRouteFromPath(path, state));
  }

  function renderNavigation() {
    return (
      <>
        <SidebarContent className="mt-5 flex-1">
          <SidebarGroup>
            <SidebarGroupLabel className="mb-2">Resources</SidebarGroupLabel>
            <SidebarMenu>
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === route.section;

                return (
                  <SidebarMenuItem
                    key={item.id}
                    className={cn(
                      isActive &&
                        "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border))] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-sidebar-primary before:content-['']"
                    )}
                    onClick={() => navigateToPath(navigationPaths[item.id])}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-sidebar-primary" : "text-sidebar-muted-foreground")} />
                    <SidebarMenuText>{item.label}</SidebarMenuText>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        <div className="mt-4 space-y-4 border-t border-sidebar-border/60 pt-5">
          <ThemeSwitcher value={theme} onValueChange={setTheme} />
          <div className="flex items-center justify-between px-3 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-sidebar-muted-foreground/60">
            <span>v0.1.0</span>
            <span aria-hidden className="h-px w-4 bg-sidebar-border" />
            <span>main</span>
          </div>
        </div>
      </>
    );
  }

  function renderPage() {
    if (route.section === "runtimes") {
      return (
        <RuntimesPage
          key={`runtimes:${route.detailId ?? "list"}`}
          {...(route.detailLabel ? { runtimeNameHint: route.detailLabel } : {})}
          {...(route.detailId ? { runtimeId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths.runtimes)}
          onNavigateToCreate={() => navigateToPath("/runtimes/new")}
          onNavigateToDetail={(id, label) => navigateToPath(`/runtimes/${id}`, { detailLabel: label })}
        />
      );
    }

    if (route.section === "applications") {
      return (
        <ApplicationsPage
          key={`applications:${route.detailId ?? "list"}`}
          {...(route.detailLabel ? { applicationNameHint: route.detailLabel } : {})}
          {...(route.detailId ? { applicationId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths.applications)}
          onNavigateToCreate={() => navigateToPath("/applications/new")}
          onNavigateToDetail={(id, label) => navigateToPath(`/applications/${id}`, { detailLabel: label })}
        />
      );
    }

    if (route.section === "ai-providers") {
      return (
        <AiProvidersPage
          key={`ai-providers:${route.detailId ?? "list"}`}
          {...(route.detailLabel ? { providerNameHint: route.detailLabel } : {})}
          {...(route.detailId ? { providerId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths["ai-providers"])}
          onNavigateToCreate={() => navigateToPath("/ai-providers/new")}
          onNavigateToDetail={(id, label) => navigateToPath(`/ai-providers/${id}`, { detailLabel: label })}
        />
      );
    }

    if (route.section === "ai-agents") {
      return (
        <AiAgentsPage
          key={`ai-agents:${route.detailId ?? "list"}`}
          {...(route.detailLabel ? { agentNameHint: route.detailLabel } : {})}
          {...(route.detailId ? { agentId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths["ai-agents"])}
          onNavigateToCreate={() => navigateToPath("/ai-agents/new")}
          onNavigateToDetail={(id, label) => navigateToPath(`/ai-agents/${id}`, { detailLabel: label })}
        />
      );
    }

    if (route.section === "ai-tools") {
      return (
        <AiToolsPage
          key={`ai-tools:${route.detailId ?? "list"}`}
          {...(route.detailLabel ? { toolNameHint: route.detailLabel } : {})}
          {...(route.detailId ? { toolId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths["ai-tools"])}
          onNavigateToCreate={() => navigateToPath("/ai-tools/new")}
          onNavigateToDetail={(id, label) => navigateToPath(`/ai-tools/${id}`, { detailLabel: label })}
        />
      );
    }

    if (route.section === "workflows") {
      return (
        <WorkflowsPage
          key={`workflows:${route.detailId ?? "list"}`}
          {...(route.detailLabel ? { workflowNameHint: route.detailLabel } : {})}
          {...(route.detailId ? { workflowId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths.workflows)}
          onNavigateToCreate={() => navigateToPath("/workflows/new")}
          onNavigateToDetail={(id, label) => navigateToPath(`/workflows/${id}`, { detailLabel: label })}
        />
      );
    }

    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <div className={cn("fixed inset-0 z-40 bg-background/80 backdrop-blur-sm xl:hidden", !isMobileNavOpen && "pointer-events-none opacity-0")} onClick={() => setIsMobileNavOpen(false)} />

        <Sidebar>
          <div className="flex h-full flex-col px-3 pb-5 pt-6">
            <div className="px-3 pb-4">
              <p className="font-mono text-[0.95rem] font-semibold uppercase leading-none tracking-[0.3em] text-sidebar-foreground">
                Syno<span className="text-sidebar-primary">Sec</span>
              </p>
              <p className="mt-2 font-mono text-[0.575rem] uppercase tracking-[0.32em] text-sidebar-muted-foreground/75">
                security console
              </p>
            </div>

            {renderNavigation()}
          </div>
        </Sidebar>

        <div className={cn("fixed inset-y-0 left-0 z-50 w-[18rem] max-w-[85vw] border-r border-sidebar-border bg-sidebar px-3 pb-5 pt-6 text-sidebar-foreground shadow-2xl transition-transform duration-200 xl:hidden", isMobileNavOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-full flex-col">
            <div className="flex items-start justify-between px-3 pb-4">
              <div>
                <p className="font-mono text-[0.95rem] font-semibold uppercase leading-none tracking-[0.3em] text-sidebar-foreground">
                  Syno<span className="text-sidebar-primary">Sec</span>
                </p>
                <p className="mt-2 font-mono text-[0.575rem] uppercase tracking-[0.32em] text-sidebar-muted-foreground/75">
                  security console
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {renderNavigation()}
          </div>
        </div>

        <main className="relative flex-1 p-0">
          <button
            type="button"
            className="fixed right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-card/90 text-foreground shadow-lg backdrop-blur xl:hidden"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          {renderPage()}
        </main>

        <Toaster />
      </div>
    </SidebarProvider>
  );
}
