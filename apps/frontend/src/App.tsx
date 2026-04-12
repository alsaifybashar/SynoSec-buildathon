import { useState } from "react";
import { AppWindow, LayoutDashboard, Network, Workflow } from "lucide-react";
import { toast } from "sonner";
import { apiRoutes, type BriefResponse } from "@synosec/contracts";
import { Button } from "./components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuText,
  SidebarProvider
} from "./components/ui/sidebar";
import { Toaster } from "./components/ui/toaster";
import { Display, Eyebrow, Lead } from "./components/ui/typography";
import { cn } from "./lib/utils";

type NavigationItem = {
  id: "dashboard" | "runtimes" | "applications" | "workflows";
  label: string;
  icon: typeof LayoutDashboard;
};

const navigationItems: NavigationItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "runtimes", label: "Runtimes", icon: Network },
  { id: "applications", label: "Applications", icon: AppWindow },
  { id: "workflows", label: "Workflows", icon: Workflow }
];

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export default function App() {
  const [activeItem, setActiveItem] = useState<NavigationItem["id"]>("dashboard");
  const [loadingBrief, setLoadingBrief] = useState(false);

  async function handleBackendButtonClick() {
    setLoadingBrief(true);

    try {
      const brief = await fetchJson<BriefResponse>(apiRoutes.brief);
      toast.success("Backend connected", {
        description: brief.headline
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error("Backend request failed", {
        description: message
      });
    } finally {
      setLoadingBrief(false);
    }
  }

  function handleNavigation(item: NavigationItem) {
    if (item.id === "dashboard") {
      setActiveItem("dashboard");
      return;
    }

    toast("Coming soon", {
      description: `${item.label} is coming soon.`
    });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background xl:flex">
        <Sidebar className="border-border bg-card">
          <div className="flex h-full flex-col">
            <div className="border-b border-border px-4 py-6">
              <Eyebrow>SynoSec</Eyebrow>
              <p className="mt-2 text-lg font-semibold">Frontend</p>
            </div>

            <SidebarContent className="flex-1 px-2 py-4">
              <SidebarGroup>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = item.id === activeItem;

                    return (
                      <SidebarMenuItem
                        key={item.id}
                        className={cn(
                          "rounded-lg border border-transparent",
                          isActive && "border-border bg-accent text-accent-foreground"
                        )}
                        onClick={() => handleNavigation(item)}
                      >
                        <Icon className="h-4 w-4" />
                        <SidebarMenuText>{item.label}</SidebarMenuText>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
          </div>
        </Sidebar>

        <main className="flex flex-1 items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-2xl text-center">
            <Eyebrow>Dashboard</Eyebrow>
            <Display className="max-w-none">Dashboard</Display>
            <Lead className="mx-auto mt-4">
              Minimal SPA shell with sidebar navigation. Additional sections are stubbed and will surface as they are implemented.
            </Lead>

            <div className="mt-10 flex justify-center">
              <Button onClick={() => void handleBackendButtonClick()} disabled={loadingBrief} size="lg">
                {loadingBrief ? "Connecting..." : "Call backend"}
              </Button>
            </div>
          </div>
        </main>

        <Toaster />
      </div>
    </SidebarProvider>
  );
}
