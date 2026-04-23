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

export function LoginPage({
  googleClientId
}: {
  googleClientId: string | null;
}) {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "submitting" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);

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
          theme: "outline",
          size: "large",
          shape: "rectangular",
          text: "continue_with",
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
  }, [googleClientId]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#d5ecf1_0%,#faf8f3_45%,#f1ede2_100%)] px-6 py-10 text-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent_0%,rgba(18,136,154,0.08)_35%,transparent_70%)]" />
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
              <div className="flex items-center gap-3 rounded-[4px] border border-border/70 bg-background px-4 py-3 text-sm font-medium">
                <Spinner className="h-4 w-4" />
                <span>Loading Google sign-in…</span>
              </div>
            </div>
          ) : null}
          <div ref={buttonRef} className="flex min-h-12 items-center justify-center" />
          {message ? (
            <p className="rounded-[4px] border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
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
