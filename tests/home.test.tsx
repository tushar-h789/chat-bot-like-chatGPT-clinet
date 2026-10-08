import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import { fetchCurrentUser } from "@/lib/api/auth";
import { listConversations } from "@/lib/api/conversations";

vi.mock("@/lib/api/auth", () => ({
  fetchCurrentUser: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/lib/api/conversations", () => ({
  listConversations: vi.fn(),
  listMessages: vi.fn(),
  createConversation: vi.fn(),
  renameConversation: vi.fn(),
  deleteConversation: vi.fn(),
  createMessage: vi.fn(),
}));

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>,
  );
}

describe("Home", () => {
  beforeEach(() => {
    vi.mocked(fetchCurrentUser).mockReset();
    vi.mocked(listConversations).mockReset();
  });

  it("asks a signed-out visitor to sign in", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue(null);

    renderHome();

    expect(
      await screen.findByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tushar-AI ChatBot" }),
    ).toBeInTheDocument();
  });

  it("shows the conversation list for the signed-in user", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      created_at: "2026-10-06T15:40:00.000000Z",
      is_admin: false,
    });
    vi.mocked(listConversations).mockResolvedValue([
      {
        id: "conversation-1",
        title: "Phase 4 notes",
        created_at: "2026-10-06T15:40:00.000000Z",
        updated_at: "2026-10-06T15:40:00.000000Z",
      },
    ]);

    renderHome();

    expect(await screen.findByText("ada@example.com")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: "Phase 4 notes" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New chat" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Admin" })).not.toBeInTheDocument();
  });

  it("shows an admin link only for admins", async () => {
    vi.mocked(fetchCurrentUser).mockResolvedValue({
      id: "user-1",
      email: "ada@example.com",
      created_at: "2026-10-06T15:40:00.000000Z",
      is_admin: true,
    });
    vi.mocked(listConversations).mockResolvedValue([]);

    renderHome();

    expect(await screen.findByRole("link", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });
});
