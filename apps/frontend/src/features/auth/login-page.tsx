import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Spinner } from "@/shared/ui/spinner";

const googleScriptId = "google-identity-services";

function ensureGoogleIdentityScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.getElementById(googleScriptId) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Google Identity Services failed to load.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = googleScriptId;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity Services failed to load."));
    document.head.appendChild(script);
  });
}

function getActiveTheme(): string {
  if (typeof document === "undefined") {
    return "synosec";
  }
  return document.documentElement.dataset["theme"] ?? "synosec";
}

function useActiveTheme(): string {
  const [theme, setTheme] = useState<string>(() => getActiveTheme());

  useEffect(() => {
    const target = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(target.dataset["theme"] ?? "synosec");
    });
    observer.observe(target, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}

export function LoginPage({
  googleClientId
}: {
  googleClientId: string | null;
}) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "submitting" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const activeTheme = useActiveTheme();
  const isDarkTheme = activeTheme === "dark";

  useEffect(() => {
    if (!googleClientId) {
      setState("error");
      setMessage("Google sign-in is not configured for this environment.");
      return;
    }

    let cancelled = false;

    void ensureGoogleIdentityScript()
      .then(() => {
        if (cancelled || !buttonRef.current || !window.google?.accounts?.id) {
          return;
        }

        const loginUri = new URL("/api/auth/google", window.location.origin);

        window.google.accounts.id.initialize({
          client_id: googleClientId,
          ux_mode: "redirect",
          login_uri: loginUri.toString()
        });

        buttonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: isDarkTheme ? "filled_black" : "outline",
          size: "large",
          shape: "rectangular",
          text: "signin_with",
          width: 320
        });

        setState("ready");
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setState("error");
        setMessage(error instanceof Error ? error.message : "Google sign-in could not be initialized.");
      });

    return () => {
      cancelled = true;
      buttonRef.current?.replaceChildren();
    };
  }, [googleClientId, isDarkTheme]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.18)_0%,transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,hsl(var(--primary)/0.08)_45%,transparent_75%)]" />
      <Card className="relative w-full max-w-lg border-border/70 bg-card/95 shadow-2xl">
        <CardHeader className="space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Sign in to SynoSec</CardTitle>
          <CardDescription>
            Access to the control plane is restricted to explicitly allowed Google accounts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" ? (
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-3 rounded-sm border border-border/70 bg-background px-4 py-3 text-sm font-medium">
                <Spinner className="h-4 w-4" />
                <span>Loading Google sign-in…</span>
              </div>
            </div>
          ) : null}
          <div ref={buttonRef} className="flex min-h-12 items-center justify-center" />
          {message ? (
            <p className="rounded-sm border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {message}
            </p>
          ) : null}
          <p className="text-sm leading-6 text-muted-foreground">
            Sign in with an allowlisted Google account to access the control plane.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
