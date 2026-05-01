import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "@/features/auth/login-page";

describe("LoginPage", () => {
  const initialize = vi.fn();
  const renderButton = vi.fn();

  beforeEach(() => {
    initialize.mockReset();
    renderButton.mockReset();
    window.history.replaceState({}, "", "/login?redirectTo=%2Fai-agents");
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

  it("configures Google sign-in with a callback handler", async () => {
    render(
      <MemoryRouter initialEntries={["/login?redirectTo=%2Fai-agents"]}>
        <LoginPage googleClientId="google-client-id" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(initialize).toHaveBeenCalledWith({
        client_id: "google-client-id",
        callback: expect.any(Function)
      });
    });

    expect(renderButton).toHaveBeenCalled();
  });
});
