"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { logout } from "@/lib/api/auth";
import {
  createConversation,
  createMessage,
  deleteConversation,
  listConversations,
  listMessages,
  renameConversation,
} from "@/lib/api/conversations";
import { apiErrorMessage } from "@/lib/api/errors";
import type { User } from "@/lib/api/types";
import { useUiStore } from "@/stores/ui-store";

type ChatScreenProps = {
  user: User;
};

export function ChatScreen({ user }: ChatScreenProps) {
  const queryClient = useQueryClient();
  const sidebarOpen = useUiStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUiStore((state) => state.setSidebarOpen);
  const selectedConversationId = useUiStore(
    (state) => state.selectedConversationId,
  );
  const selectConversation = useUiStore((state) => state.selectConversation);
  const [draft, setDraft] = useState("");
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
  });
  const messages = useQuery({
    queryKey: ["messages", selectedConversationId],
    queryFn: () => listMessages(selectedConversationId as string),
    enabled: selectedConversationId !== null,
  });

  const selected = conversations.data?.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const titleDraft = selected
    ? (titleDrafts[selected.id] ?? selected.title)
    : "";

  function fail(caught: unknown) {
    setError(apiErrorMessage(caught));
  }

  const create = useMutation({
    mutationFn: () => createConversation(),
    onSuccess: async (conversation) => {
      setError(null);
      setConfirmDeleteId(null);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      selectConversation(conversation.id);
    },
    onError: fail,
  });

  const rename = useMutation({
    mutationFn: (title: string) =>
      renameConversation(selectedConversationId as string, title),
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: () => deleteConversation(selectedConversationId as string),
    onSuccess: async () => {
      setError(null);
      setConfirmDeleteId(null);
      setDraft("");
      selectConversation(null);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: fail,
  });

  const send = useMutation({
    mutationFn: (content: string) =>
      createMessage(selectedConversationId as string, content),
    onSuccess: async () => {
      setError(null);
      setDraft("");
      await queryClient.invalidateQueries({
        queryKey: ["messages", selectedConversationId],
      });
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: fail,
  });

  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      selectConversation(null);
      queryClient.removeQueries({ queryKey: ["conversations"] });
      queryClient.removeQueries({ queryKey: ["messages"] });
      queryClient.setQueryData(["me"], null);
    },
    onError: fail,
  });

  return (
    <div className="flex min-h-dvh">
      <aside
        className={`${sidebarOpen ? "flex" : "hidden"} absolute inset-y-0 left-0 z-10 w-72 flex-col border-r border-white/10 bg-zinc-950 md:static md:flex`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/10 p-3">
          <h1 className="text-sm font-semibold">AI Chatbot</h1>
          <button
            className="rounded-md border border-white/10 px-2 py-1 text-xs"
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending}
          >
            New chat
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2" aria-label="Conversations">
          {conversations.isLoading ? (
            <p className="px-2 py-3 text-sm text-zinc-500">Loading</p>
          ) : null}
          {conversations.data?.length === 0 ? (
            <p className="px-2 py-3 text-sm text-zinc-500">
              No conversations yet.
            </p>
          ) : null}
          <ul className="space-y-1">
            {conversations.data?.map((conversation) => (
              <li key={conversation.id}>
                <button
                  className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                    conversation.id === selectedConversationId
                      ? "bg-white/10"
                      : "hover:bg-white/5"
                  }`}
                  type="button"
                  onClick={() => {
                    setConfirmDeleteId(null);
                    selectConversation(conversation.id);
                  }}
                >
                  {conversation.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-white/10 p-3 pb-16">
          <p className="truncate text-xs text-zinc-400">{user.email}</p>
          <button
            className="mt-2 text-sm text-zinc-200 underline-offset-4 hover:underline"
            type="button"
            onClick={() => signOut.mutate()}
            disabled={signOut.isPending}
          >
            Log out
          </button>
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <button
            className="rounded-md border border-white/10 px-2 py-1 text-xs md:hidden"
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            Conversations
          </button>
          {selected ? (
            <form
              className="flex min-w-0 flex-1 items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                rename.mutate(titleDraft);
              }}
            >
              <label className="sr-only" htmlFor="conversation-title">
                Conversation title
              </label>
              <input
                id="conversation-title"
                className="min-w-0 flex-1 rounded-md border border-white/10 bg-transparent px-2 py-1 text-sm"
                value={titleDraft}
                onChange={(event) =>
                  setTitleDrafts((current) => ({
                    ...current,
                    [selected.id]: event.target.value,
                  }))
                }
              />
              <button
                className="rounded-md border border-white/10 px-2 py-1 text-xs"
                type="submit"
                disabled={rename.isPending}
              >
                Rename
              </button>
              {confirmDeleteId === selected.id ? (
                <button
                  className="rounded-md bg-red-500/20 px-2 py-1 text-xs text-red-200"
                  type="button"
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                >
                  Confirm delete
                </button>
              ) : (
                <button
                  className="rounded-md border border-white/10 px-2 py-1 text-xs"
                  type="button"
                  onClick={() => setConfirmDeleteId(selected.id)}
                >
                  Delete
                </button>
              )}
            </form>
          ) : (
            <p className="text-sm text-zinc-400">Start a conversation.</p>
          )}
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-6">
          {selected && messages.data?.length === 0 ? (
            <p className="text-sm text-zinc-500">
              Send a message to save it in this conversation.
            </p>
          ) : null}
          <ul className="space-y-3">
            {messages.data?.map((message) => (
              <li
                className="ml-auto max-w-xl rounded-2xl bg-white/10 px-4 py-3 text-sm whitespace-pre-wrap"
                key={message.id}
              >
                {message.content}
              </li>
            ))}
          </ul>
        </div>

        <form
          className="border-t border-white/10 p-4"
          onSubmit={(event) => {
            event.preventDefault();
            const content = draft.trim();
            if (!selectedConversationId || !content) {
              return;
            }
            send.mutate(content);
          }}
        >
          {error ? (
            <p className="mb-2 text-sm text-red-300" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <label className="sr-only" htmlFor="composer">
              Message
            </label>
            <textarea
              id="composer"
              className="min-h-12 flex-1 resize-y rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-white/40"
              placeholder={
                selected
                  ? "Write a message"
                  : "Create a conversation before sending"
              }
              value={draft}
              disabled={!selected}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <button
              className="self-end rounded-xl bg-white px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-60"
              type="submit"
              disabled={!selected || send.isPending || draft.trim() === ""}
            >
              Send
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Messages are saved to your account. Model replies arrive in a later
            phase.
          </p>
        </form>
      </section>
    </div>
  );
}
