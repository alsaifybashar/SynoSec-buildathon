import { useEffect, useMemo, useState } from "react";
import { ChevronRight, LogIn, LogOut, Menu, X } from "lucide-react";
import { toast } from "sonner";
import { bootstrapAuthSession, logout } from "@/features/auth/auth-store";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuText,
  SidebarProvider
} from "@/shared/ui/sidebar";
import { Toaster } from "@/shared/ui/toaster";
import { Spinner } from "@/shared/ui/spinner";
import { AppRouter, useAppRouter } from "@/app/router";
import { cn } from "@/lib/utils";
import { navigationTree } from "@/app/navigation";
import { LoginPage } from "@/features/auth/login-page";

type ThemeId = "synosec" | "dark";

type ThemeMeta = {
  id: ThemeId;
  label: string;
  hint: string;
  swatch: { base: string; surface: string; accent: string };
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

function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme.id === value);
}

function getInitialTheme(): ThemeId {
  const storedTheme = window.localStorage.getItem(themeStorageKey);
  return storedTheme && isThemeId(storedTheme) ? storedTheme : "synosec";
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
    <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue as ThemeId)}>
      <SelectTrigger
        aria-label="Select theme"
        className="h-7 w-auto gap-1.5 rounded-[3px] border-sidebar-border/60 bg-sidebar-accent/40 px-2 text-[0.7rem] font-medium text-sidebar-foreground hover:bg-sidebar-accent [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-sidebar-muted-foreground"
      >
        <SelectValue>
          <span className="flex items-center gap-1.5">
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

function pickInitials(input?: string | null) {
  if (!input) return "··";
  const words = input.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "··";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export default function App() {
  const { route, navigateToSection, navigateToPath, navigateToCreate, navigateToDetail } = useAppRouter();
  const auth = useAuthStore();
  const [theme, setTheme] = useState<ThemeId>(() => getInitialTheme());
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const groupActiveMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const entry of navigationTree) {
      if (entry.kind === "group") {
        map[entry.group.id] = entry.group.items.some((item) => item.id === route.section);
      }
    }
    return map;
  }, [route.section]);

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
  const currentPathWithQuery = `${window.location.pathname}${window.location.search}`;
  const isLoginRoute = window.location.pathname === "/login";
  const loginRedirectTarget = new URLSearchParams(window.location.search).get("redirectTo") || "/applications";
  const authEnabled = auth.status === "ready" ? auth.session.authEnabled : false;
  const isAuthenticated = auth.status === "ready" && auth.session.authenticated;
  const shouldAwaitLoginRedirect =
    auth.status === "ready" &&
    auth.session.authEnabled &&
    !auth.session.authenticated &&
    !isLoginRoute;

  useEffect(() => {
    document.documentElement.dataset["theme"] = theme;
    window.localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  useEffect(() => {
    void bootstrapAuthSession().catch((error) => {
      toast.error("Session check failed", {
        description: error instanceof Error ? error.message : "Unable to load session state."
      });
    });
  }, []);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [route.section, route.detailId]);

  useEffect(() => {
    if (auth.status !== "ready") {
      return;
    }

    if (!auth.session.authEnabled) {
      if (isLoginRoute) {
        navigateToPath("/applications");
      }
      return;
    }

    if (auth.session.authenticated) {
      if (isLoginRoute) {
        navigateToPath(loginRedirectTarget);
      }
      return;
    }

    if (!isLoginRoute) {
      navigateToPath(`/login?redirectTo=${encodeURIComponent(currentPathWithQuery)}`);
    }
  }, [auth, currentPathWithQuery, isLoginRoute, loginRedirectTarget, navigateToPath]);

  function renderNavigation() {
    const user = auth.status === "ready" && auth.session.authEnabled ? auth.session.user : null;
    const showSignIn =
      auth.status === "ready" && auth.session.authEnabled && !auth.session.authenticated;

    return (
      <>
        <SidebarContent className="mt-4 flex-1">
          <SidebarGroup>
            <SidebarMenu>
              {navigationTree.map((entry) => {
                if (entry.kind === "item") {
                  const item = entry.item;
                  const Icon = item.icon;
                  const isActive = item.id === route.section;

                  return (
                    <SidebarMenuItem
                      key={item.id}
                      className={cn(
                        isActive &&
                          "bg-sidebar-accent text-sidebar-accent-foreground shadow-[inset_0_0_0_1px_hsl(var(--sidebar-border))] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-sidebar-primary before:content-['']"
                      )}
                      onClick={() => navigateToSection(item.id)}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", isActive ? "text-sidebar-primary" : "text-sidebar-muted-foreground")} />
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
                      onClick={() =>
                        setExpandedGroups((prev) => ({ ...prev, [group.id]: !isExpanded }))
                      }
                    >
                      <GroupIcon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          hasActiveChild ? "text-sidebar-primary" : "text-sidebar-muted-foreground"
                        )}
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
                          const isActive = item.id === route.section;

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
                                className={cn(
                                  "h-4 w-4 shrink-0 transition-colors",
                                  isActive ? "text-sidebar-primary" : "text-sidebar-muted-foreground"
                                )}
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

        <div className="mt-2 border-t border-sidebar-border/60">
          {/* Theme — tiny single-row control */}
          <div className="flex items-center justify-between gap-2 border-b border-sidebar-border/40 px-3 py-1.5">
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.26em] text-sidebar-muted-foreground/70">
              theme
            </span>
            <ThemeSwitcher value={theme} onValueChange={setTheme} />
          </div>

          {/* User / sign-in — compact, inline buttons */}
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
              <button
                type="button"
                aria-label="Sign out"
                title="Sign out"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-sidebar-border/60 bg-sidebar-accent/40 text-sidebar-muted-foreground transition hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={() => {
                  void logout().catch((error) => {
                    toast.error("Sign out failed", {
                      description: error instanceof Error ? error.message : "Unable to sign out."
                    });
                  });
                }}
              >
                <LogOut className="h-3 w-3" />
              </button>
            </div>
          ) : showSignIn ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.72rem] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent/50"
              onClick={() => navigateToPath(`/login?redirectTo=${encodeURIComponent(currentPathWithQuery)}`)}
            >
              <LogIn className="h-3.5 w-3.5 text-sidebar-muted-foreground" />
              <span>Sign in</span>
              <span className="ml-auto font-mono text-[0.58rem] uppercase tracking-[0.22em] text-sidebar-muted-foreground/70">
                google
              </span>
            </button>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <SidebarProvider>
      {auth.status === "loading" ? (
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/90 px-5 py-4 shadow-panel">
            <Spinner className="h-5 w-5" />
            <span className="text-sm font-medium">Loading session…</span>
          </div>
        </div>
      ) : auth.status === "error" ? (
        <div className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
          <div className="max-w-md rounded-2xl border border-border/70 bg-card/90 p-6 shadow-panel">
            <p className="text-lg font-semibold">Session check failed</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{auth.message}</p>
            <button
              type="button"
              className="mt-4 inline-flex items-center justify-center rounded-[4px] border border-border/70 bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                void bootstrapAuthSession().catch((error) => {
                  toast.error("Session check failed", {
                    description: error instanceof Error ? error.message : "Unable to load session state."
                  });
                });
              }}
            >
              Retry session check
            </button>
          </div>
        </div>
      ) : shouldAwaitLoginRedirect ? (
        <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
          <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/90 px-5 py-4 shadow-panel">
            <Spinner className="h-5 w-5" />
            <span className="text-sm font-medium">Redirecting to sign-in…</span>
          </div>
        </div>
      ) : authEnabled && !isAuthenticated ? (
        <LoginPage googleClientId={auth.session.googleClientId} />
      ) : (
      <div className="flex min-h-screen bg-background text-foreground">
        <div className={cn("fixed inset-0 z-40 bg-background/80 backdrop-blur-sm xl:hidden", !isMobileNavOpen && "pointer-events-none opacity-0")} onClick={() => setIsMobileNavOpen(false)} />

        <Sidebar>
          <div className="flex h-full flex-col pt-5">
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
            <div aria-hidden className="border-t border-sidebar-border/60" />

            {renderNavigation()}
          </div>
        </Sidebar>

        <div className={cn("fixed inset-y-0 left-0 z-50 w-[18rem] max-w-[85vw] border-r border-sidebar-border bg-sidebar pt-5 text-sidebar-foreground shadow-2xl transition-transform duration-200 xl:hidden", isMobileNavOpen ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-full flex-col">
            <div className="relative px-5 pb-4 text-center">
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
              <button
                type="button"
                className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-accent/70 text-sidebar-foreground hover:bg-sidebar-accent"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Close navigation menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div aria-hidden className="border-t border-sidebar-border/60" />

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

          <AppRouter
            route={route}
            navigateToPath={navigateToPath}
            navigateToSection={navigateToSection}
            navigateToCreate={navigateToCreate}
            navigateToDetail={navigateToDetail}
          />
        </main>

        <Toaster />
      </div>
      )}
    </SidebarProvider>
  );
}
