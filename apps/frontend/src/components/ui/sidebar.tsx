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
        "sticky top-0 hidden h-screen w-[196px] shrink-0 border-r border-border/70 bg-card/80 backdrop-blur xl:block",
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
  return <p className={cn("px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid gap-1", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-foreground transition hover:bg-accent hover:text-accent-foreground",
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
