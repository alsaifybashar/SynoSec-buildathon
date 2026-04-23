import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "@/features/auth/login-page";

describe("LoginPage", () => {
  const initialize = vi.fn();
  const renderButton = vi.fn();

  beforeEach(() => {
    initialize.mockReset();
    renderButton.mockReset();
    window.history.replaceState({}, "", "/login?redirectTo=%2Fai-providers");
    window.google = {
      accounts: {
        id: {
          initialize,
          renderButton,
          disableAutoSelect: vi.fn()
        }
      }
    };
  });

  it("configures Google sign-in in redirect mode and posts back to the auth endpoint", async () => {
    render(<LoginPage googleClientId="google-client-id" />);

    await waitFor(() => {
      expect(initialize).toHaveBeenCalledWith({
        client_id: "google-client-id",
        ux_mode: "redirect",
        login_uri: "http://localhost:3000/api/auth/google"
      });
    });

    expect(renderButton).toHaveBeenCalled();
  });
});
