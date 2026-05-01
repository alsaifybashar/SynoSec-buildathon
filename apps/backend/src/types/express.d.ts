import type { Session } from "@auth/express";
import type { AuthConfig, AuthenticatedSessionUser } from "@/modules/auth/auth-config.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        config: AuthConfig;
        session: Session | null;
        user: AuthenticatedSessionUser | null;
      };
    }
  }
}

export {};
