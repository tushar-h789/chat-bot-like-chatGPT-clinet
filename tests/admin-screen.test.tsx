import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminScreen } from "@/features/admin/admin-screen";
import { getAdminStats } from "@/lib/api/admin";
import { fetchCurrentUser } from "@/lib/api/auth";

vi.mock("@/lib/api/auth", () => ({
  fetchCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/lib/api/admin", () => ({
  getAdminStats: vi.fn(),
}));

function renderAdmin() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AdminScreen />
    </QueryClientProvider>,
  );
}

describe("AdminScreen", () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(getAdminStats).mockReset();
  });

  it("asks a signed-out visitor to sign in", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderAdmin();

    expect(
      await screen.findByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(getAdminStats).not.toHaveBeenCalled();
  });

  it("hides totals from a signed-in user who is not an admin", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      created_at: "2026-10-06T15:40:00.000000Z",
      is_admin: false,
    });

    renderAdmin();

    expect(await screen.findByText("Admin access is required.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to chat" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(getAdminStats).not.toHaveBeenCalled();
  });

  it("shows account totals for an admin", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      created_at: "2026-10-06T15:40:00.000000Z",
      is_admin: true,
    });
    vi.mocked(getAdminStats).mockResolvedValue({
      total_users: 2,
      active_sessions: 1,
      users_with_usage: 1,
      replies: 3,
      input_tokens: 10,
      output_tokens: 20,
      total_tokens: 30,
      tokens_today: 8,
      users: [
        {
          id: "user-2",
          email: "bob@example.com",
          created_at: "2026-10-07T12:00:00.000000Z",
          is_admin: false,
          replies: 3,
          total_tokens: 30,
        },
      ],
    });

    renderAdmin();

    expect(await screen.findByText("bob@example.com")).toBeInTheDocument();
    expect(screen.getByText("Accounts")).toBeInTheDocument();
    expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    expect(getAdminStats).toHaveBeenCalledTimes(1);
  });
});
