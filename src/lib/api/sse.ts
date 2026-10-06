export type SseEvent = {
  event: string;
  data: string;
};

export function takeSseEvents(buffer: string): {
  events: SseEvent[];
  rest: string;
} {
  const chunks = buffer.split("\n\n");
  const rest = chunks.pop() ?? "";
  const events: SseEvent[] = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) {
      continue;
    }
    let event = "message";
    const dataLines: string[] = [];
    for (const line of chunk.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    }
    if (dataLines.length > 0) {
      events.push({ event, data: dataLines.join("\n") });
    }
  }
  return { events, rest };
}
