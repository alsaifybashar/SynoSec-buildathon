import { useEffect, useState } from "react";
import {
  Bot,
  AppWindow,
  Menu,
  PlugZap,
  Network,
  Wrench,
  X
} from "lucide-react";
import { ApplicationsPage } from "@/pages/applications-page";
import { RuntimesPage } from "@/pages/runtimes-page";
import { AiProvidersPage } from "@/pages/ai-providers-page";
import { AiAgentsPage } from "@/pages/ai-agents-page";
import { AiToolsPage } from "@/pages/ai-tools-page";
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

type NavigationId = "runtimes" | "applications" | "ai-providers" | "ai-agents" | "ai-tools";

type NavigationItem = {
  id: NavigationId;
  label: string;
  icon: typeof Network;
};

type AppRoute = {
  section: NavigationId;
  detailId: string | undefined;
};

type ThemeId = "light" | "dark" | "synosec" | "amber";

const navigationItems: NavigationItem[] = [
  { id: "runtimes", label: "Runtimes", icon: Network },
  { id: "applications", label: "Applications", icon: AppWindow },
  { id: "ai-providers", label: "AI Providers", icon: PlugZap },
  { id: "ai-agents", label: "AI Agents", icon: Bot },
  { id: "ai-tools", label: "AI Tools", icon: Wrench }
];

const navigationPaths: Record<NavigationId, string> = {
  runtimes: "/runtimes",
  applications: "/applications",
  "ai-providers": "/ai-providers",
  "ai-agents": "/ai-agents",
  "ai-tools": "/ai-tools"
};

const themeStorageKey = "synosec-theme";

const themes: Array<{ id: ThemeId; label: string }> = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "synosec", label: "SynoSec" },
  { id: "amber", label: "Amber Grid" }
];

const defaultSection: NavigationId = "applications";

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
    return { section: defaultSection, detailId: undefined };
  }

  const section = segments[0] as NavigationId;
  if (!(section in navigationPaths)) {
    return { section: defaultSection, detailId: undefined };
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
  const [theme, setTheme] = useState<ThemeId>(() => getInitialTheme());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    const syncFromLocation = () => {
      if (window.location.pathname === "/") {
        window.history.replaceState({}, "", navigationPaths[defaultSection]);
      }

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

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [route.section, route.detailId]);

  function navigateToPath(path: string) {
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path);
    }

    setRoute(getRouteFromPath(path));
  }

  function renderNavigation() {
    return (
      <>
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
                    <Icon className="h-4 w-4 shrink-0" />
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
      </>
    );
  }

  function renderPage() {
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

    if (route.section === "ai-providers") {
      return (
        <AiProvidersPage
          {...(route.detailId ? { providerId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths["ai-providers"])}
          onNavigateToCreate={() => navigateToPath("/ai-providers/new")}
          onNavigateToDetail={(id) => navigateToPath(`/ai-providers/${id}`)}
        />
      );
    }

    if (route.section === "ai-agents") {
      return (
        <AiAgentsPage
          {...(route.detailId ? { agentId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths["ai-agents"])}
          onNavigateToCreate={() => navigateToPath("/ai-agents/new")}
          onNavigateToDetail={(id) => navigateToPath(`/ai-agents/${id}`)}
        />
      );
    }

    if (route.section === "ai-tools") {
      return (
        <AiToolsPage
          {...(route.detailId ? { toolId: route.detailId } : {})}
          onNavigateToList={() => navigateToPath(navigationPaths["ai-tools"])}
          onNavigateToCreate={() => navigateToPath("/ai-tools/new")}
          onNavigateToDetail={(id) => navigateToPath(`/ai-tools/${id}`)}
        />
      );
    }

    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <div className={cn("fixed inset-0 z-40 bg-background/80 backdrop-blur-sm xl:hidden", !isMobileNavOpen && "pointer-events-none opacity-0")} onClick={() => setIsMobileNavOpen(false)} />

        <Sidebar className="border-r border-border/80 bg-card/70">
          <div className="flex h-full flex-col px-4 py-6">
            <div className="px-2 py-2 text-center">
              <p className="font-['Space_Grotesk'] text-[1.75rem] font-bold tracking-[-0.04em] text-foreground">SynoSec</p>
            </div>

            {renderNavigation()}
          </div>
        </Sidebar>

        <div className={cn("fixed inset-y-0 left-0 z-50 w-[18rem] max-w-[85vw] border-r border-border/80 bg-card px-4 py-6 shadow-2xl transition-transform duration-200 xl:hidden", isMobileNavOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-2 py-2">
              <p className="font-['Space_Grotesk'] text-[1.5rem] font-bold tracking-[-0.04em] text-foreground">SynoSec</p>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-background/80 text-foreground"
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
