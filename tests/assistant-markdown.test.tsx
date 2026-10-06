import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AssistantMarkdown } from "@/features/chat/assistant-markdown";
import { closeDanglingFence } from "@/features/chat/markdown";

vi.mock("shiki/bundle/web", () => ({
  bundledLanguages: { ts: {}, typescript: {} },
  codeToHtml: vi.fn(async (code: string) => {
    const escaped = code
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    return `<pre class="shiki"><code>${escaped}</code></pre>`;
  }),
}));

describe("closeDanglingFence", () => {
  it("closes a fence that is still streaming", () => {
    expect(closeDanglingFence("```ts\nconst n = 1")).toBe(
      "```ts\nconst n = 1\n```",
    );
  });

  it("leaves a finished fence alone", () => {
    const finished = "```ts\nconst n = 1\n```";
    expect(closeDanglingFence(finished)).toBe(finished);
  });
});

describe("AssistantMarkdown", () => {
  it("renders headings, lists, and code without raw html", async () => {
    render(
      <AssistantMarkdown
        text={[
          "# Title",
          "",
          "- one",
          "",
          "<script>alert(1)</script>",
          "",
          "```ts",
          "const n = 1",
          "```",
        ].join("\n")}
      />,
    );

    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toHaveTextContent("one");
    expect(document.querySelector("script")).toBeNull();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByText("ts")).toBeInTheDocument();
    await waitFor(() => {
      expect(document.querySelector("pre.shiki code")?.textContent).toBe(
        "const n = 1",
      );
    });
  });
});
