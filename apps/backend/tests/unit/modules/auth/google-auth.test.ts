import { beforeEach, describe, expect, it, vi } from "vitest";
import { exchangeGoogleCode, fetchGoogleUserInfo } from "@/modules/auth/google-auth.js";

describe("google-auth", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("surfaces token exchange outages as provider unavailability instead of auth failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 503
    })));

    await expect(exchangeGoogleCode({
      clientId: "client-id",
      callbackUrl: "http://localhost/callback",
      code: "auth-code",
      codeVerifier: "verifier"
    })).rejects.toMatchObject({
      status: 502,
      code: "GOOGLE_TOKEN_EXCHANGE_UNAVAILABLE"
    });
  });

  it("surfaces userinfo outages as provider unavailability instead of auth failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 503
    })));

    await expect(fetchGoogleUserInfo("access-token")).rejects.toMatchObject({
      status: 502,
      code: "GOOGLE_USERINFO_UNAVAILABLE"
    });
  });
});
