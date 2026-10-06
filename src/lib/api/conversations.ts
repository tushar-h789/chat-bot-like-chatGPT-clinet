import { getApiClient } from "@/lib/api/client";
import type { ChatMessage, Conversation } from "@/lib/api/types";

export async function listConversations(): Promise<Conversation[]> {
  const response =
    await getApiClient().get<Conversation[]>("/api/v1/conversations");
  return response.data;
}

export async function createConversation(
  title?: string,
): Promise<Conversation> {
  const response = await getApiClient().post<Conversation>(
    "/api/v1/conversations",
    title ? { title } : {},
  );
  return response.data;
}

export async function renameConversation(
  conversationId: string,
  title: string,
): Promise<Conversation> {
  const response = await getApiClient().patch<Conversation>(
    `/api/v1/conversations/${conversationId}`,
    { title },
  );
  return response.data;
}

export async function deleteConversation(conversationId: string): Promise<void> {
  await getApiClient().delete(`/api/v1/conversations/${conversationId}`);
}

export async function listMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  const response = await getApiClient().get<ChatMessage[]>(
    `/api/v1/conversations/${conversationId}/messages`,
  );
  return response.data;
}

export async function createMessage(
  conversationId: string,
  content: string,
): Promise<ChatMessage> {
  const response = await getApiClient().post<ChatMessage>(
    `/api/v1/conversations/${conversationId}/messages`,
    { content },
  );
  return response.data;
}
