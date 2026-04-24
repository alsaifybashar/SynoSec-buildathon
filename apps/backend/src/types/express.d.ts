import type { AuthConfig } from "@/features/auth/auth-config.js";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        config: AuthConfig;
        session: {
          id: string;
          csrfToken: string;
          expiresAt?: Date;
          revokedAt?: Date | null;
          user?: {
            id: string;
            email: string;
            displayName: string | null;
            avatarUrl: string | null;
          };
        } | null;
        user: {
          id: string;
          email: string;
          displayName: string | null;
          avatarUrl: string | null;
        } | null;
      };
    }
  }
}

export {};
