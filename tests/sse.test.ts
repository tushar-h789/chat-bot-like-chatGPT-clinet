import { describe, expect, it } from "vitest";

import { takeSseEvents } from "@/lib/api/sse";

describe("takeSseEvents", () => {
  it("splits complete events and keeps a partial chunk", () => {
    const buffer = [
      'event: conversation\ndata: {"id":"abc","title":"Hi"}',
      "",
      'event: delta\ndata: {"text":"Hel"}',
      "",
      "event: delta\ndata: ",
    ].join("\n");

    const parsed = takeSseEvents(buffer);

    expect(parsed.events).toEqual([
      { event: "conversation", data: '{"id":"abc","title":"Hi"}' },
      { event: "delta", data: '{"text":"Hel"}' },
    ]);
    expect(parsed.rest).toBe("event: delta\ndata: ");
  });

  it("assembles a chat stream from separate delta events", () => {
    const buffer = [
      'event: conversation\ndata: {"id":"abc","title":"Hi there"}',
      "",
      'event: delta\ndata: {"text":"Hello"}',
      "",
      'event: delta\ndata: {"text":" there"}',
      "",
      'event: done\ndata: {"message_id":"msg","status":"complete"}',
      "",
      "",
    ].join("\n");

    const parsed = takeSseEvents(buffer);
    const text = parsed.events
      .filter((event) => event.event === "delta")
      .map((event) => JSON.parse(event.data).text as string)
      .join("");

    expect(parsed.events.map((event) => event.event)).toEqual([
      "conversation",
      "delta",
      "delta",
      "done",
    ]);
    expect(text).toBe("Hello there");
  });
});