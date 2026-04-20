import type { HTMLAttributes } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SidebarProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function Sidebar({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen w-[208px] shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground xl:block",
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
  return <div className={cn("flex flex-col gap-5", className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "px-3 font-mono text-[0.625rem] font-medium uppercase tracking-[0.3em] text-sidebar-muted-foreground/80",
        className
      )}
      {...props}
    />
  );
}

export function SidebarMenu({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-0.5", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "relative flex w-full items-center gap-3 rounded-l-none rounded-r-[3px] px-3 py-2 text-left text-[0.8125rem] font-medium text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
        className
      )}
      type="button"
      {...props}
    />
  );
}

export function SidebarMenuText({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={className} {...props} />;
}
