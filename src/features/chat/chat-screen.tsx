"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { AssistantMarkdown } from "@/features/chat/assistant-markdown";
import { logout } from "@/lib/api/auth";
import { streamChat } from "@/lib/api/chat";
import {
  createConversation,
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

function CopyReply({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      className="hover:text-zinc-200"
      type="button"
      onClick={() => void copy()}
    >
      {copied ? "Copied" : "Copy reply"}
    </button>
  );
}

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
  const [streaming, setStreaming] = useState(false);
  const [liveUser, setLiveUser] = useState<string | null>(null);
  const [liveAssistant, setLiveAssistant] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pendingDeltaRef = useRef("");
  const frameRef = useRef(0);

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

  async function startStream(content: string) {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setLiveUser(content);
    setLiveAssistant("");
    setError(null);
    setDraft("");
    try {
      await streamChat({
        content,
        conversationId: selectedConversationId,
        signal: controller.signal,
        onConversation: (conversation) => {
          selectConversation(conversation.id);
          void queryClient.invalidateQueries({ queryKey: ["conversations"] });
        },
        onDelta: (text) => {
          pendingDeltaRef.current += text;
          if (frameRef.current !== 0) {
            return;
          }
          frameRef.current = window.requestAnimationFrame(() => {
            frameRef.current = 0;
            const chunk = pendingDeltaRef.current;
            pendingDeltaRef.current = "";
            if (chunk) {
              setLiveAssistant((current) => current + chunk);
            }
          });
        },
      });
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) {
        fail(caught);
      }
    } finally {
      if (frameRef.current !== 0) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
      const leftover = pendingDeltaRef.current;
      pendingDeltaRef.current = "";
      if (leftover) {
        setLiveAssistant((current) => current + leftover);
      }
      abortRef.current = null;
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
      await queryClient.invalidateQueries({ queryKey: ["messages"] });
      setStreaming(false);
      setLiveUser(null);
      setLiveAssistant("");
    }
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    scroller.scrollTo?.({ top: scroller.scrollHeight });
  }, [messages.data, liveAssistant, liveUser, streaming]);

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
    <div className="flex h-dvh">
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
        <header className="relative z-10 flex shrink-0 items-center gap-3 border-b border-white/10 bg-zinc-950 px-4 py-3">
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

        <div ref={scrollerRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
            {!streaming &&
            (!selected || messages.data?.length === 0) &&
            !messages.isLoading ? (
              <p className="py-16 text-center text-2xl font-medium tracking-tight text-zinc-200">
                {selected
                  ? "Send a message to start this conversation."
                  : "What can I help with?"}
              </p>
            ) : null}
            <ul className="flex flex-col gap-6">
              {messages.data?.map((message) => {
                const mine = message.role === "user";
                if (mine) {
                  return (
                    <li className="flex justify-end" key={message.id}>
                      <div className="max-w-[85%] rounded-3xl bg-zinc-800 px-4 py-2.5 text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </li>
                  );
                }
                if (message.content === "") {
                  return (
                    <li className="text-sm text-zinc-400" key={message.id}>
                      The model did not reply.
                    </li>
                  );
                }
                return (
                  <li className="w-full" key={message.id}>
                    <AssistantMarkdown text={message.content} />
                    <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                      {message.status === "cancelled" ? (
                        <span>Stopped</span>
                      ) : null}
                      <CopyReply text={message.content} />
                    </div>
                  </li>
                );
              })}
              {streaming &&
              liveUser &&
              !messages.data?.some(
                (message) =>
                  message.role === "user" && message.content === liveUser,
              ) ? (
                <li className="flex justify-end">
                  <div className="max-w-[85%] rounded-3xl bg-zinc-800 px-4 py-2.5 text-sm whitespace-pre-wrap">
                    {liveUser}
                  </div>
                </li>
              ) : null}
              {streaming ? (
                <li className="w-full">
                  {liveAssistant ? (
                    <AssistantMarkdown text={liveAssistant} />
                  ) : (
                    <p className="text-sm text-zinc-400" role="status">
                      Thinking
                    </p>
                  )}
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <form
          className="bg-zinc-950 px-4 pt-2 pb-4"
          onSubmit={(event) => {
            event.preventDefault();
            const content = draft.trim();
            if (streaming || !content) {
              return;
            }
            void startStream(content);
          }}
        >
          <div className="mx-auto w-full max-w-3xl">
            {error ? (
              <p className="mb-2 text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}
            <div className="rounded-3xl border border-white/15 bg-zinc-900 px-4 py-3 shadow-2xl">
              <label className="sr-only" htmlFor="composer">
                Message
              </label>
              <textarea
                id="composer"
                className="max-h-48 min-h-12 w-full resize-none bg-transparent text-sm outline-none"
                placeholder="Message"
                value={draft}
                disabled={streaming}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="text-xs text-zinc-500">
                  Enter to send. Shift+Enter for a new line.
                </p>
                {streaming ? (
                  <button
                    className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-950"
                    type="button"
                    onClick={() => abortRef.current?.abort()}
                  >
                    Stop
                  </button>
                ) : (
                  <button
                    className="rounded-full bg-white px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-40"
                    type="submit"
                    disabled={draft.trim() === ""}
                  >
                    Send
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
