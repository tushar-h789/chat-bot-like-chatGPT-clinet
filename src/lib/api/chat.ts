import { apiBaseUrl, getCsrfToken } from "@/lib/api/client";
import { takeSseEvents } from "@/lib/api/sse";

type StreamChatInput = {
  content: string;
  conversationId: string | null;
  signal: AbortSignal;
  onConversation: (conversation: { id: string; title: string }) => void;
  onDelta: (text: string) => void;
};

export async function streamChat(input: StreamChatInput): Promise<void> {
  const token = await getCsrfToken();
  const response = await fetch(`${apiBaseUrl()}/api/v1/chat`, {
    method: "POST",
    credentials: "include",
    signal: input.signal,
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify({
      content: input.content,
      conversation_id: input.conversationId,
    }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? "The message could not be sent.");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("The model stream is empty.");
  }
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
      const parsed = takeSseEvents(buffer);
      buffer = parsed.rest;
      for (const event of parsed.events) {
        const payload = JSON.parse(event.data) as {
          id?: string;
          title?: string;
          text?: string;
          message?: string;
        };
        if (event.event === "conversation" && payload.id && payload.title) {
          input.onConversation({ id: payload.id, title: payload.title });
        } else if (event.event === "delta" && payload.text) {
          input.onDelta(payload.text);
        } else if (event.event === "error") {
          throw new Error(payload.message ?? "The model failed to respond.");
        }
      }
      if (done) {
        break;
      }
    }
  } catch (caught) {
    if (caught instanceof DOMException && caught.name === "AbortError") {
      throw caught;
    }
    if (
      caught instanceof TypeError &&
      /network error|failed to fetch|load failed/i.test(caught.message)
    ) {
      throw new Error("The model could not be reached. Try again.");
    }
    throw caught;
  }
}
