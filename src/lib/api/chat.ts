import { apiBaseUrl, getCsrfToken } from "@/lib/api/client";
import { takeSseEvents } from "@/lib/api/sse";
import type { ToolCall } from "@/lib/api/types";

type StreamChatInput = {
  content: string;
  conversationId: string | null;
  fileIds?: string[];
  webSearch?: boolean;
  signal: AbortSignal;
  onConversation: (conversation: { id: string; title: string }) => void;
  onDelta: (text: string) => void;
  onTool?: (call: ToolCall) => void;
};

type StreamHandlers = {
  signal: AbortSignal;
  onConversation?: (conversation: { id: string; title: string }) => void;
  onDelta: (text: string) => void;
  onTool?: (call: ToolCall) => void;
};

export async function streamChat(input: StreamChatInput): Promise<void> {
  await postEventStream(
    "/api/v1/chat",
    {
      content: input.content,
      conversation_id: input.conversationId,
      file_ids: input.fileIds ?? [],
      web_search: input.webSearch ?? false,
    },
    input,
  );
}

export async function streamRegenerate(input: {
  conversationId: string;
  messageId: string;
  signal: AbortSignal;
  onDelta: (text: string) => void;
  onTool?: (call: ToolCall) => void;
}): Promise<void> {
  await postEventStream(
    "/api/v1/chat/regenerate",
    {
      conversation_id: input.conversationId,
      message_id: input.messageId,
    },
    input,
  );
}

async function postEventStream(
  path: string,
  body: object,
  input: StreamHandlers,
): Promise<void> {
  const token = await getCsrfToken();
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    method: "POST",
    credentials: "include",
    signal: input.signal,
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(payload?.error?.message ?? "The message could not be sent.");
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
          name?: string;
          arguments?: Record<string, unknown>;
          result?: string;
        };
        if (event.event === "conversation" && payload.id && payload.title) {
          input.onConversation?.({ id: payload.id, title: payload.title });
        } else if (event.event === "tool" && payload.name) {
          input.onTool?.({
            name: payload.name,
            arguments: payload.arguments ?? {},
            result: payload.result ?? "",
          });
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
