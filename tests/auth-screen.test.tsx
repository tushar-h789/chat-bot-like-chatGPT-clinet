import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AuthScreen } from "@/features/auth/auth-screen";

describe("AuthScreen", () => {
  it("signs in with the entered email and password", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn().mockResolvedValue(undefined);
    const onRegister = vi.fn().mockResolvedValue(undefined);

    render(<AuthScreen onLogin={onLogin} onRegister={onRegister} />);

    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(onLogin).toHaveBeenCalledWith(
      "ada@example.com",
      "correct-horse-battery",
    );
    expect(onRegister).not.toHaveBeenCalled();
  });

  it("creates an account from the register form", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onRegister = vi.fn().mockResolvedValue(undefined);

    render(<AuthScreen onLogin={onLogin} onRegister={onRegister} />);
    await user.click(
      screen.getByRole("button", { name: "Need an account? Create one" }),
    );
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-horse-battery");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(onRegister).toHaveBeenCalledWith(
      "ada@example.com",
      "correct-horse-battery",
    );
  });

  it("lets the visitor show and hide the password", async () => {
    const user = userEvent.setup();

    render(
      <AuthScreen
        onLogin={vi.fn()}
        onRegister={vi.fn()}
      />,
    );

    const field = screen.getByLabelText("Password");
    expect(field).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(field).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(field).toHaveAttribute("type", "password");
  });
});
