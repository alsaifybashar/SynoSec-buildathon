import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { HTMLAttributes } from "react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "../../lib/utils";
import { Button } from "./button";

type SidebarContextValue = {
  collapsed: boolean;
  toggle: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("Sidebar components must be used inside SidebarProvider.");
  }
  return context;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed((value) => !value) }}>{children}</SidebarContext.Provider>;
}

export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  const { collapsed } = useSidebar();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 border-r border-border/70 bg-card/80 backdrop-blur xl:block",
        collapsed ? "w-[88px]" : "w-[280px]",
        className
      )}
      {...props}
    />
  );
}

export function SidebarHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-6 flex items-center justify-between gap-3", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-6", className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-3", className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  const { collapsed } = useSidebar();
  return <p className={cn("px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground", collapsed && "sr-only", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-1", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  const { collapsed } = useSidebar();
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center px-0",
        className
      )}
      type="button"
      {...props}
    />
  );
}

export function SidebarMenuText({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const { collapsed } = useSidebar();
  return <span className={cn(collapsed && "sr-only", className)} {...props} />;
}

export function SidebarTrigger() {
  const { collapsed, toggle } = useSidebar();

  return (
    <Button aria-label="Toggle sidebar" variant="ghost" size="icon" onClick={toggle}>
      {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
    </Button>
  );
}
