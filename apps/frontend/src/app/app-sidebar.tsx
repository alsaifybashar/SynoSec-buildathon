import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, LogIn, LogOut, Settings, X } from "lucide-react";
import { toast } from "sonner";
import { navigationTree, type NavigationId } from "@/app/navigation";
import { logout } from "@/features/auth/auth-store";
import { cn } from "@/shared/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuText
} from "@/shared/ui/sidebar";

type ThemeId = "synosec" | "dark";

type ThemeMeta = {
  id: ThemeId;
  label: string;
  hint: string;
  swatch: { base: string; surface: string; accent: string };
};

type SidebarUser = {
  displayName?: string | null;
  email?: string | null;
};

type AppSidebarProps = {
  currentSection: NavigationId;
  navigateToSection: (section: NavigationId) => void;
  navigateToPath: (path: string) => void;
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  currentPathWithQuery: string;
  user: SidebarUser | null;
  showSignIn: boolean;
  isMobileNavOpen: boolean;
  onCloseMobileNav: () => void;
};

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
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as ThemeId)}>
      <SelectTrigger
        aria-label="Select theme"
        className="h-7 w-auto gap-1 rounded-[3px] border-sidebar-border/60 bg-sidebar-accent/40 px-2 text-[0.7rem] font-medium leading-none text-sidebar-foreground hover:bg-sidebar-accent [&>svg]:h-[1em] [&>svg]:w-[1em] [&>svg]:text-sidebar-muted-foreground"
      >
        <SelectValue>
          <span className="flex items-center gap-1">
            <ThemeSwatch swatch={current.swatch} className="!h-3 !w-5" />
            <span className="truncate">{current.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[10rem] p-1">
        {themes.map((theme) => (
          <SelectItem
            key={theme.id}
            value={theme.id}
            className="rounded-sm py-1.5 pl-2 pr-6 text-[0.75rem] focus:bg-accent/70"
          >
            <span className="flex items-center gap-2">
              <ThemeSwatch swatch={theme.swatch} className="!h-3 !w-5" />
              <span className="truncate">{theme.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SettingsPopover({
  theme,
  onThemeChange,
  onLogout
}: {
  theme: ThemeId;
  onThemeChange: (theme: ThemeId) => void;
  onLogout: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="Open settings"
        aria-expanded={isOpen}
        title="Settings"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-sidebar-border/60 bg-sidebar-accent/40 text-[0.75rem] leading-none text-sidebar-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-foreground [&_svg]:h-[1em] [&_svg]:w-[1em]"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Settings />
      </button>

      {isOpen ? (
        <div className="absolute bottom-0 right-0 z-20 mb-2 ml-2 w-52 translate-x-full rounded-md border border-sidebar-border/70 bg-sidebar px-3 py-3 shadow-xl">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="font-mono text-[0.58rem] uppercase tracking-[0.24em] text-sidebar-muted-foreground/70">
                Theme
              </div>
              <ThemeSwitcher
                value={theme}
                onValueChange={(nextTheme) => {
                  onThemeChange(nextTheme);
                  setIsOpen(false);
                }}
              />
            </div>

            <div className="border-t border-sidebar-border/50 pt-3">
              <button
                type="button"
                className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1 text-left text-[0.64rem] font-medium uppercase tracking-[0.18em] text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground [&_svg]:h-[0.95em] [&_svg]:w-[0.95em]"
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
              >
                <LogOut className="text-sidebar-muted-foreground" />
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function pickInitials(input?: string | null) {
  if (!input) return "··";
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "··";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

function SidebarBrand() {
  return (
    <div className="px-5 pb-4 text-center">
      <p
        className="text-[1.6rem] font-bold uppercase leading-none tracking-[0.1em] text-sidebar-foreground"
        style={{ fontFamily: "'Chakra Petch', system-ui, sans-serif" }}
      >
        {"Syno"}
        <span className="relative inline-block italic text-sidebar-primary isolate">
          <span
            aria-hidden
            className="pointer-events-none absolute -z-10 blur-[10px]"
            style={{
              inset: "-30% -18%",
              background:
                "radial-gradient(ellipse at center, hsl(var(--sidebar-primary) / 0.35) 0%, transparent 72%)"
            }}
          />
          Sec
        </span>
        {"AI"}
      </p>
    </div>
  );
}

function SidebarNav({
  currentSection,
  navigateToSection
}: Pick<AppSidebarProps, "currentSection" | "navigateToSection">) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const groupActiveMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const entry of navigationTree) {
      if (entry.kind === "group") {
        map[entry.group.id] = entry.group.items.some((item) => item.id === currentSection);
      }
    }
    return map;
  }, [currentSection]);

  useEffect(() => {
    const activeGroupIds = Object.entries(groupActiveMap)
      .filter(([, isActive]) => isActive)
      .map(([id]) => id);
    if (activeGroupIds.length === 0) {
      return;
    }
    setExpandedGroups((prev) => {
      let next = prev;
      for (const id of activeGroupIds) {
        if (!next[id]) {
          if (next === prev) {
            next = { ...prev };
          }
          next[id] = true;
        }
      }
      return next;
    });
  }, [groupActiveMap]);

  return (
    <SidebarContent className="mt-4 flex-1">
      <SidebarGroup>
        <SidebarMenu>
          {navigationTree.map((entry) => {
            if (entry.kind === "item") {
              const item = entry.item;
              const Icon = item.icon;
              const isActive = item.id === currentSection;

              return (
                <SidebarMenuItem
                  key={item.id}
                  className={cn(
                    isActive &&
                      "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border))] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-sidebar-primary before:content-['']"
                  )}
                  onClick={() => navigateToSection(item.id)}
                >
                  <Icon
                    className={cn("transition-colors", isActive ? "text-sidebar-primary" : "text-sidebar-muted-foreground")}
                  />
                  <SidebarMenuText>{item.label}</SidebarMenuText>
                </SidebarMenuItem>
              );
            }

            const group = entry.group;
            const GroupIcon = group.icon;
            const hasActiveChild = groupActiveMap[group.id] ?? false;
            const isExpanded = expandedGroups[group.id] ?? false;

            return (
              <div key={group.id} className="grid gap-0.5">
                <SidebarMenuItem
                  aria-expanded={isExpanded}
                  onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.id]: !isExpanded }))}
                >
                  <GroupIcon
                    className={cn("transition-colors", hasActiveChild ? "text-sidebar-primary" : "text-sidebar-muted-foreground")}
                  />
                  <SidebarMenuText>{group.label}</SidebarMenuText>
                  <ChevronRight
                    className={cn(
                      "ml-auto h-3.5 w-3.5 shrink-0 text-sidebar-muted-foreground transition-transform",
                      isExpanded && "rotate-90"
                    )}
                  />
                </SidebarMenuItem>
                {isExpanded ? (
                  <div className="ml-5 grid gap-0.5 border-l border-sidebar-border/60 pl-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = item.id === currentSection;

                      return (
                        <SidebarMenuItem
                          key={item.id}
                          className={cn(
                            isActive &&
                              "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border))] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-sidebar-primary before:content-['']"
                          )}
                          onClick={() => navigateToSection(item.id)}
                        >
                          <Icon
                            className={cn("transition-colors", isActive ? "text-sidebar-primary" : "text-sidebar-muted-foreground")}
                          />
                          <SidebarMenuText>{item.label}</SidebarMenuText>
                        </SidebarMenuItem>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </SidebarMenu>
      </SidebarGroup>
    </SidebarContent>
  );
}

function SidebarFooter({
  theme,
  onThemeChange,
  user,
  showSignIn,
  currentPathWithQuery,
  navigateToPath
}: Pick<
  AppSidebarProps,
  "theme" | "onThemeChange" | "user" | "showSignIn" | "currentPathWithQuery" | "navigateToPath"
>) {
  return (
    <div className="mt-2 border-t border-sidebar-border/60">
      {user ? (
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sidebar-accent/60 font-mono text-[0.625rem] font-semibold text-sidebar-foreground">
            {pickInitials(user.displayName ?? user.email)}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[0.72rem] font-medium text-sidebar-foreground">
              {user.displayName ?? "Authorized"}
            </p>
            <p className="truncate font-mono text-[0.58rem] text-sidebar-muted-foreground/80">
              {user.email}
            </p>
          </div>
          <SettingsPopover
            theme={theme}
            onThemeChange={onThemeChange}
            onLogout={() => {
              void logout().catch((error) => {
                toast.error("Sign out failed", {
                  description: error instanceof Error ? error.message : "Unable to sign out."
                });
              });
            }}
          />
        </div>
      ) : showSignIn ? (
        <button
          type="button"
          className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-[0.72rem] font-medium leading-none text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50 [&_svg]:h-[1em] [&_svg]:w-[1em]"
          onClick={() => navigateToPath(`/login?redirectTo=${encodeURIComponent(currentPathWithQuery)}`)}
        >
          <LogIn className="text-sidebar-muted-foreground" />
          <span>Sign in</span>
          <span className="ml-auto font-mono text-[0.58rem] uppercase tracking-[0.22em] text-sidebar-muted-foreground/70">
            google
          </span>
        </button>
      ) : null}
    </div>
  );
}

export function AppSidebar(props: AppSidebarProps) {
  return (
    <>
      <Sidebar>
        <div className="flex h-full flex-col pt-5">
          <SidebarBrand />
          <div aria-hidden className="border-t border-sidebar-border/60" />
          <SidebarNav currentSection={props.currentSection} navigateToSection={props.navigateToSection} />
          <SidebarFooter
            theme={props.theme}
            onThemeChange={props.onThemeChange}
            user={props.user}
            showSignIn={props.showSignIn}
            currentPathWithQuery={props.currentPathWithQuery}
            navigateToPath={props.navigateToPath}
          />
        </div>
      </Sidebar>

      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-[18rem] max-w-[85vw] border-r border-sidebar-border bg-sidebar pt-5 text-sidebar-foreground shadow-2xl transition-transform duration-200 xl:hidden",
          props.isMobileNavOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="relative">
            <SidebarBrand />
            <button
              type="button"
              className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={props.onCloseMobileNav}
              aria-label="Close navigation menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div aria-hidden className="border-t border-sidebar-border/60" />
          <SidebarNav currentSection={props.currentSection} navigateToSection={props.navigateToSection} />
          <SidebarFooter
            theme={props.theme}
            onThemeChange={props.onThemeChange}
            user={props.user}
            showSignIn={props.showSignIn}
            currentPathWithQuery={props.currentPathWithQuery}
            navigateToPath={props.navigateToPath}
          />
        </div>
      </div>
    </>
  );
}
