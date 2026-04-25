import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { loginRoutePath } from "@/app/navigation";
import { bootstrapAuthSession } from "@/features/auth/auth-store";
import { useAuthStore } from "@/features/auth/use-auth-store";
import { AppSidebar } from "@/app/app-sidebar";
import { AppContentRoutes } from "@/app/routes";
import { SidebarProvider } from "@/shared/ui/sidebar";
import { Toaster } from "@/shared/ui/toaster";
import { Spinner } from "@/shared/ui/spinner";
import { cn } from "@/shared/lib/utils";

type ThemeId = "synosec" | "dark";

const themeStorageKey = "synosec-theme";
const themes = ["synosec", "dark"] as const;

function isThemeId(value: string): value is ThemeId {
  return themes.some((theme) => theme === value);
}

function AppShell() {
  const location = useLocation();
  const auth = useAuthStore();
  const [theme, setTheme] = useState<ThemeId>(() => {
    const storedTheme = window.localStorage.getItem(themeStorageKey);
    return storedTheme && isThemeId(storedTheme) ? storedTheme : "synosec";
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const currentPathWithQuery = `${location.pathname}${location.search}`;

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
  }, [location.pathname]);

  if (auth.status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/90 px-5 py-4 shadow-panel">
          <Spinner className="h-5 w-5" />
          <span className="text-sm font-medium">Loading session…</span>
        </div>
      </div>
    );
  }

  if (auth.status === "error") {
    return (
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
    );
  }

  if (location.pathname === loginRoutePath) {
    return (
      <>
        <AppContentRoutes
          authRequired={auth.session.authEnabled}
          authenticated={auth.session.authenticated}
          googleClientId={auth.session.googleClientId}
        />
        <Toaster />
      </>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <div
          className={cn(
            "fixed inset-0 z-40 bg-background/80 backdrop-blur-sm xl:hidden",
            !isMobileNavOpen && "pointer-events-none opacity-0"
          )}
          onClick={() => setIsMobileNavOpen(false)}
        />
        <AppSidebar
          pathname={location.pathname}
          theme={theme}
          onThemeChange={setTheme}
          currentPathWithQuery={currentPathWithQuery}
          user={auth.session.authEnabled ? auth.session.user : null}
          showSignIn={auth.session.authEnabled && !auth.session.authenticated}
          isMobileNavOpen={isMobileNavOpen}
          onCloseMobileNav={() => setIsMobileNavOpen(false)}
        />

        <main className="relative flex-1 p-0">
          <button
            type="button"
            className="fixed right-4 top-4 z-30 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/70 bg-card/90 text-foreground shadow-lg backdrop-blur xl:hidden"
            onClick={() => setIsMobileNavOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu className="h-4 w-4" />
          </button>

          <AppContentRoutes
            authRequired={auth.session.authEnabled}
            authenticated={auth.session.authenticated}
            googleClientId={auth.session.googleClientId}
          />
        </main>

        <Toaster />
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
