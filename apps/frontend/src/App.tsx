import { useEffect, useState } from "react";
import {
  AppWindow,
  LayoutDashboard,
  Network,
  Shield,
  Workflow
} from "lucide-react";
import { toast } from "sonner";
import { apiRoutes, type BriefResponse } from "@synosec/contracts";
import { ApplicationsPage } from "./components/applications-page";
import { RuntimesPage } from "./components/runtimes-page";
import { ScansPage } from "./components/scans-page";
import { WorkflowsPage } from "./components/workflows-page";
import { Button } from "./components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuText,
  SidebarProvider
} from "./components/ui/sidebar";
import { Toaster } from "./components/ui/toaster";
import { Display, Lead } from "./components/ui/typography";
import { fetchJson } from "./lib/api";
import { cn } from "./lib/utils";

type NavigationId = "dashboard" | "runtimes" | "applications" | "workflows" | "scans";

type NavigationItem = {
  id: NavigationId;
  label: string;
  icon: typeof LayoutDashboard;
};

type AppRoute = {
  section: NavigationId;
  detailId: string | undefined;
};

type ThemeId = "light" | "dark" | "synosec" | "amber";

const navigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "runtimes", label: "Runtimes", icon: Network },
  { id: "applications", label: "Applications", icon: AppWindow },
  { id: "workflows", label: "Workflows", icon: Workflow },
  { id: "scans", label: "Scans", icon: Shield }
];

const navigationPaths: Record<NavigationId, string> = {
  dashboard: "/",
  runtimes: "/runtimes",
  applications: "/applications",
  workflows: "/workflows",
  scans: "/scans"
};

const themeStorageKey = "synosec-theme";

const themes: Array<{ id: ThemeId; label: string }> = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "synosec", label: "SynoSec" },
  { id: "amber", label: "Amber Grid" }
];

function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

function getInitialTheme(): ThemeId {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return storedTheme && isThemeId(storedTheme) ? storedTheme : "light";
}

function getRouteFromPath(pathname: string): AppRoute {
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) {
    return { section: "dashboard", detailId: undefined };
  }

  const section = segments[0] as NavigationId;
  if (!(section in navigationPaths)) {
    return { section: "dashboard", detailId: undefined };
  }

  return {
    section,
    detailId: segments[1]
  };
}

function ThemeSwitcher({ value, onValueChange }: { value: ThemeId; onValueChange: (theme: ThemeId) => void }) {
  return (
    <div className="space-y-3">
      <SidebarGroupLabel>Theme</SidebarGroupLabel>
      <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as ThemeId)}>
        <SelectTrigger aria-label="Select theme" className="h-11 rounded-xl border-border bg-background/80">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent align="end">
          {themes.map((theme) => (
            <SelectItem key={theme.id} value={theme.id}>
              {theme.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromPath(window.location.pathname));
  const [loadingBrief, setLoadingBrief] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(() => getInitialTheme());

  useEffect(() => {
    const syncFromLocation = () => {
      setRoute(getRouteFromPath(window.location.pathname));
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

  async function handleBackendButtonClick() {
    setLoadingBrief(true);

    try {
      const payload = await fetchJson<BriefResponse>(apiRoutes.brief);
      toast.success("Backend connected", {
        description: payload.headline
      });
    } catch (error) {
      toast.error("Backend request failed", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setLoadingBrief(false);
    }
  }

  function navigateToPath(path: string) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }

    setRoute(getRouteFromPath(path));
  }

  function renderPage() {
    if (route.section === "dashboard") {
      return (
        <div className="w-full max-w-2xl text-center">
          <Display className="max-w-none">Dashboard</Display>
          <Lead className="mx-auto mt-4">
            Minimal SPA shell with shared list and detail pages for records, filters, sorting, searching, loading states, recovery, and a dedicated scanning workspace.
          </Lead>

          <div className="mt-10 flex justify-center">
            <Button onClick={() => void handleBackendButtonClick()} disabled={loadingBrief} size="lg">
              {loadingBrief ? "Connecting..." : "Call backend"}
            </Button>
          </div>
        </div>
      );
    }

    if (route.section === "runtimes") {
      return (
        <RuntimesPage
          {...(route.detailId ? { runtimeId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths.runtimes)}
          onNavigateToCreate={() => navigateToPath("/runtimes/new")}
          onNavigateToDetail={(id) => navigateToPath(`/runtimes/${id}`)}
        />
      );
    }

    if (route.section === "applications") {
      return (
        <ApplicationsPage
          {...(route.detailId ? { applicationId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths.applications)}
          onNavigateToCreate={() => navigateToPath("/applications/new")}
          onNavigateToDetail={(id) => navigateToPath(`/applications/${id}`)}
        />
      );
    }

    if (route.section === "scans") {
      return (
        <ScansPage
          {...(route.detailId ? { scanId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths.scans)}
          onNavigateToCreate={() => navigateToPath("/scans/new")}
          onNavigateToDetail={(id) => navigateToPath(`/scans/${id}`)}
        />
      );
    }

    return (
      <WorkflowsPage
        {...(route.detailId ? { workflowId: route.detailId } : {})}
        onNavigateToList={() => navigateToPath(navigationPaths.workflows)}
        onNavigateToCreate={() => navigateToPath("/workflows/new")}
        onNavigateToDetail={(id) => navigateToPath(`/workflows/${id}`)}
      />
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen text-foreground" style={{ backgroundImage: "var(--app-shell-background)" }}>
        <Sidebar className="border-r border-border/80 bg-card/70">
          <div className="flex h-full flex-col px-4 py-6">
            <div className="px-2 py-2 text-center">
              <p className="font-['Space_Grotesk'] text-[1.75rem] font-bold tracking-[-0.04em] text-foreground">SynoSec</p>
            </div>

            <SidebarContent className="mt-6 flex-1">
              <SidebarGroup>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === route.section;

                    return (
                      <SidebarMenuItem
                        key={item.id}
                        className={cn("rounded-xl border border-transparent", isActive && "border-border bg-accent text-accent-foreground")}
                        onClick={() => navigateToPath(navigationPaths[item.id])}
                      >
                        <Icon className="h-4 w-4" />
                        <SidebarMenuText>{item.label}</SidebarMenuText>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>

            <div className="mt-6 space-y-4 pt-4">
              <ThemeSwitcher value={theme} onValueChange={setTheme} />
            </div>
          </div>
        </Sidebar>

        <main className={cn("flex-1", route.section === "dashboard" ? "flex items-center justify-center p-6 md:p-10" : "p-0")}>
          {renderPage()}
        </main>

        <Toaster />
      </div>
    </SidebarProvider>
  );
}
