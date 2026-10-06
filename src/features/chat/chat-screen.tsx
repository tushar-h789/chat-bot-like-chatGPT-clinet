"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { AssistantMarkdown } from "@/features/chat/assistant-markdown";
import { toolLabel } from "@/features/chat/tools";
import {
  speak,
  startDictation,
  stopSpeaking,
  type Dictation,
} from "@/features/chat/voice";
import { logout } from "@/lib/api/auth";
import { getUsage } from "@/lib/api/usage";
import { streamChat, streamRegenerate } from "@/lib/api/chat";
import { deleteFile, uploadFile } from "@/lib/api/files";
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  renameConversation,
} from "@/lib/api/conversations";
import { apiErrorMessage } from "@/lib/api/errors";
import type { AttachedFile, ToolCall, User } from "@/lib/api/types";
import { useUiStore } from "@/stores/ui-store";

type ChatScreenProps = {
  user: User;
};

const TEXT_MEDIA_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
]);
const IMAGE_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

function attachmentNote(files: AttachedFile[]): string {
  const parts = [
    files.some((file) => TEXT_MEDIA_TYPES.has(file.media_type)) ? "text" : "",
    files.some((file) => IMAGE_MEDIA_TYPES.has(file.media_type)) ? "images" : "",
    files.some((file) => file.media_type === "application/pdf") ? "PDFs" : "",
  ].filter(Boolean);
  if (parts.length === 0) {
    return "";
  }
  const listed =
    parts.length === 1
      ? parts[0]
      : parts.length === 2
        ? `${parts[0]} and ${parts[1]}`
        : `${parts[0]}, ${parts[1]}, and ${parts[2]}`;
  if (parts.length === 1 && parts[0] === "text") {
    return "The model can read attached text files.";
  }
  return `The model can read attached ${listed}.`;
}

function FileNames({ files }: { files: AttachedFile[] }) {
  if (files.length === 0) {
    return null;
  }
  return (
    <ul className="mb-1 flex flex-wrap gap-1">
      {files.map((file) => (
        <li
          className="rounded-full bg-zinc-700 px-2 py-0.5 text-xs"
          key={file.id}
        >
          {file.name}
        </li>
      ))}
    </ul>
  );
}

function ToolNotes({ calls }: { calls: ToolCall[] }) {
  if (calls.length === 0) {
    return null;
  }
  return (
    <ul className="mb-2 flex flex-col gap-1">
      {calls.map((call, index) => (
        <li className="text-xs text-zinc-400" key={`${call.name}-${index}`}>
          {toolLabel(call.name)}
          {call.result ? ` · ${call.result}` : ""}
        </li>
      ))}
    </ul>
  );
}

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
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [liveFiles, setLiveFiles] = useState<AttachedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchOn, setSearchOn] = useState(false);
  const [liveSearch, setLiveSearch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [liveUser, setLiveUser] = useState<string | null>(null);
  const [liveAssistant, setLiveAssistant] = useState("");
  const [liveTools, setLiveTools] = useState<ToolCall[]>([]);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<Dictation | null>(null);
  const draftBaseRef = useRef("");
  const scrollerRef = useRef<HTMLDivElement>(null);
  const pendingDeltaRef = useRef("");
  const frameRef = useRef(0);

  const conversations = useQuery({
    queryKey: ["conversations"],
    queryFn: listConversations,
  });
  const usage = useQuery({
    queryKey: ["usage"],
    queryFn: getUsage,
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

  async function attach(file: File) {
    if (attachments.length >= 4) {
      setError("A message can include at most 4 files.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const saved = await uploadFile(file);
      setAttachments((current) => [...current, saved].slice(0, 4));
    } catch (caught) {
      fail(caught);
    } finally {
      setUploading(false);
    }
  }

  async function detach(fileId: string) {
    setAttachments((current) => current.filter((file) => file.id !== fileId));
    try {
      await deleteFile(fileId);
    } catch (caught) {
      fail(caught);
    }
  }

  function stopDictation() {
    const current = recognitionRef.current;
    recognitionRef.current = null;
    current?.stop();
    setListening(false);
  }

  function toggleMic() {
    if (listening) {
      stopDictation();
      return;
    }
    stopSpeaking();
    setSpeakingId(null);
    draftBaseRef.current = draft.trim() ? `${draft.trimEnd()} ` : "";
    const session = startDictation({
      onChange: (text) => setDraft(`${draftBaseRef.current}${text}`.trim()),
      onEnd: () => {
        recognitionRef.current = null;
        setListening(false);
      },
      onError: (message) => setError(message),
    });
    if (session === null) {
      setError("Voice input is not available in this browser.");
      return;
    }
    recognitionRef.current = session;
    setListening(true);
    setError(null);
  }

  function toggleSpeak(messageId: string, text: string) {
    if (speakingId === messageId) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    stopDictation();
    const result = speak(text, () => {
      setSpeakingId((current) => (current === messageId ? null : current));
    });
    if (result === "unavailable") {
      setError("Voice output is not available in this browser.");
      return;
    }
    if (result === "empty") {
      setError("There is nothing to read.");
      return;
    }
    setSpeakingId(messageId);
    setError(null);
  }

  async function startStream(content: string, files: AttachedFile[], search: boolean) {
    stopDictation();
    stopSpeaking();
    setSpeakingId(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setLiveUser(content);
    setLiveFiles(files);
    setLiveSearch(search);
    setLiveAssistant("");
    setLiveTools([]);
    setError(null);
    setDraft("");
    setAttachments([]);
    try {
      await streamChat({
        content,
        conversationId: selectedConversationId,
        fileIds: files.map((file) => file.id),
        webSearch: search,
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
        onTool: (call) => {
          setLiveTools((current) => [...current, call]);
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
      await queryClient.invalidateQueries({ queryKey: ["usage"] });
      setStreaming(false);
      setRegeneratingId(null);
      setLiveUser(null);
      setLiveFiles([]);
      setLiveSearch(false);
      setLiveAssistant("");
      setLiveTools([]);
    }
  }

  async function startRegenerate(messageId: string) {
    if (!selectedConversationId || streaming) {
      return;
    }
    stopDictation();
    stopSpeaking();
    setSpeakingId(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setRegeneratingId(messageId);
    setLiveUser(null);
    setLiveFiles([]);
    setLiveAssistant("");
    setLiveTools([]);
    setError(null);
    try {
      await streamRegenerate({
        conversationId: selectedConversationId,
        messageId,
        signal: controller.signal,
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
        onTool: (call) => {
          setLiveTools((current) => [...current, call]);
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
      await queryClient.invalidateQueries({ queryKey: ["usage"] });
      setStreaming(false);
      setRegeneratingId(null);
      setLiveAssistant("");
      setLiveTools([]);
    }
  }

  useEffect(() => {
    setListening(false);
    setSpeakingId(null);
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      stopSpeaking();
    };
  }, [selectedConversationId]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) {
      return;
    }
    scroller.scrollTo?.({ top: scroller.scrollHeight });
  }, [messages.data, liveAssistant, liveUser, liveTools, streaming]);

  const signOut = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      selectConversation(null);
      queryClient.removeQueries({ queryKey: ["conversations"] });
      queryClient.removeQueries({ queryKey: ["messages"] });
      queryClient.removeQueries({ queryKey: ["usage"] });
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
          {usage.data?.daily_token_limit != null ? (
            <p className="mt-1 text-xs text-zinc-500">
              {usage.data.tokens_today.toLocaleString("en-US")} /{" "}
              {usage.data.daily_token_limit.toLocaleString("en-US")} tokens today
            </p>
          ) : null}
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
              {messages.data?.map((message, index, all) => {
                const mine = message.role === "user";
                const latestReply =
                  !streaming &&
                  index === all.length - 1 &&
                  message.role === "assistant";
                if (mine) {
                  return (
                    <li className="flex justify-end" key={message.id}>
                      <div className="max-w-[85%] rounded-3xl bg-zinc-800 px-4 py-2.5 text-sm">
                        <FileNames files={message.files ?? []} />
                        {message.web_search ? (
                          <p className="mb-1 text-xs text-zinc-400">Web</p>
                        ) : null}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </li>
                  );
                }
                const replacing = regeneratingId === message.id;
                const text = replacing ? liveAssistant : message.content;
                const calls = replacing ? liveTools : (message.tool_calls ?? []);
                if (!replacing && text === "" && calls.length === 0) {
                  return (
                    <li className="text-sm text-zinc-400" key={message.id}>
                      <p>The model did not reply.</p>
                      {latestReply ? (
                        <button
                          className="mt-2 hover:text-zinc-200"
                          type="button"
                          onClick={() => void startRegenerate(message.id)}
                        >
                          Regenerate
                        </button>
                      ) : null}
                    </li>
                  );
                }
                return (
                  <li className="w-full" key={message.id}>
                    <ToolNotes calls={calls} />
                    {text ? (
                      <AssistantMarkdown text={text} />
                    ) : replacing ? (
                      <p className="text-sm text-zinc-400" role="status">
                        Thinking
                      </p>
                    ) : (
                      <p className="text-sm text-zinc-400">The model did not reply.</p>
                    )}
                    {replacing ? null : (
                      <div className="mt-2 flex items-center gap-3 text-xs text-zinc-500">
                        {message.status === "cancelled" ? (
                          <span>Stopped</span>
                        ) : null}
                        {text ? <CopyReply text={text} /> : null}
                        {text ? (
                          <button
                            className="hover:text-zinc-200"
                            type="button"
                            onClick={() => toggleSpeak(message.id, text)}
                          >
                            {speakingId === message.id ? "Stop voice" : "Speak"}
                          </button>
                        ) : null}
                        {latestReply ? (
                          <button
                            className="hover:text-zinc-200"
                            type="button"
                            onClick={() => void startRegenerate(message.id)}
                          >
                            Regenerate
                          </button>
                        ) : null}
                      </div>
                    )}
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
                  <div className="max-w-[85%] rounded-3xl bg-zinc-800 px-4 py-2.5 text-sm">
                    <FileNames files={liveFiles} />
                    {liveSearch ? (
                      <p className="mb-1 text-xs text-zinc-400">Web</p>
                    ) : null}
                    <p className="whitespace-pre-wrap">{liveUser}</p>
                  </div>
                </li>
              ) : null}
              {streaming && regeneratingId === null ? (
                <li className="w-full">
                  <ToolNotes calls={liveTools} />
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
            if (streaming || uploading || !content) {
              return;
            }
            void startStream(content, attachments, searchOn);
          }}
        >
          <div className="mx-auto w-full max-w-3xl">
            {error ? (
              <p className="mb-2 text-sm text-red-300" role="alert">
                {error}
              </p>
            ) : null}
            <div className="rounded-3xl border border-white/15 bg-zinc-900 px-4 py-3 shadow-2xl">
              {attachments.length > 0 ? (
                <div className="mb-2">
                  <ul className="flex flex-wrap gap-2">
                    {attachments.map((file) => (
                      <li
                        className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-xs"
                        key={file.id}
                      >
                        <span>{file.name}</span>
                        <button
                          className="text-zinc-400 hover:text-zinc-100"
                          type="button"
                          aria-label={`Remove ${file.name}`}
                          onClick={() => void detach(file.id)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-zinc-500">
                    {attachmentNote(attachments)}
                  </p>
                </div>
              ) : null}
              <label className="sr-only" htmlFor="composer">
                Message
              </label>
              <textarea
                id="composer"
                className="max-h-48 min-h-12 w-full resize-none bg-transparent text-sm outline-none"
                placeholder="Message"
                value={draft}
                disabled={streaming || listening}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    className="hidden"
                    type="file"
                    accept=".txt,.md,.csv,.json,.pdf,.png,.jpg,.jpeg,.webp,.gif"
                    onChange={(event) => {
                      const chosen = event.target.files?.[0];
                      event.target.value = "";
                      if (chosen) {
                        void attach(chosen);
                      }
                    }}
                  />
                  <button
                    className="rounded-full border border-white/15 px-3 py-1 text-xs disabled:opacity-40"
                    type="button"
                    disabled={streaming || uploading || attachments.length >= 4}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? "Uploading" : "Attach"}
                  </button>
                  <button
                    className={
                      searchOn
                        ? "rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-950 disabled:opacity-40"
                        : "rounded-full border border-white/15 px-3 py-1 text-xs disabled:opacity-40"
                    }
                    type="button"
                    aria-pressed={searchOn}
                    disabled={streaming}
                    onClick={() => setSearchOn((current) => !current)}
                  >
                    Search
                  </button>
                  <button
                    className={
                      listening
                        ? "rounded-full bg-white px-3 py-1 text-xs font-medium text-zinc-950 disabled:opacity-40"
                        : "rounded-full border border-white/15 px-3 py-1 text-xs disabled:opacity-40"
                    }
                    type="button"
                    aria-pressed={listening}
                    disabled={streaming}
                    onClick={toggleMic}
                  >
                    {listening ? "Listening" : "Mic"}
                  </button>
                  <p className="text-xs text-zinc-500">
                    Enter to send. Shift+Enter for a new line.
                  </p>
                </div>
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
                    disabled={draft.trim() === "" || uploading}
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
