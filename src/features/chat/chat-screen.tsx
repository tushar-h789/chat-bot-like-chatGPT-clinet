"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { AssistantMarkdown } from "@/features/chat/assistant-markdown";
import { ChatComposer } from "@/features/chat/composer";
import { MessageActions } from "@/features/chat/message-actions";
import { ChatSidebar } from "@/features/chat/sidebar";
import { ThreadHeader } from "@/features/chat/thread-header";
import { toolLabel } from "@/features/chat/tools";
import { IconButton } from "@/features/chat/ui/icon-button";
import { ArrowDownIcon } from "@/features/chat/ui/icons";
import {
  speak,
  startDictation,
  stopSpeaking,
  type Dictation,
} from "@/features/chat/voice";
import { logout } from "@/lib/api/auth";
import { streamChat, streamRegenerate } from "@/lib/api/chat";
import {
  createConversation,
  deleteConversation,
  listConversations,
  listMessages,
  renameConversation,
} from "@/lib/api/conversations";
import { apiErrorMessage } from "@/lib/api/errors";
import { deleteFile, uploadFile } from "@/lib/api/files";
import type { AttachedFile, ToolCall, User } from "@/lib/api/types";
import { getUsage } from "@/lib/api/usage";
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

const STARTERS = [
  "Explain this like I'm new to it",
  "Help me draft a short reply",
  "Give me a concise summary",
];

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
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [liveUser, setLiveUser] = useState<string | null>(null);
  const [liveAssistant, setLiveAssistant] = useState("");
  const [liveTools, setLiveTools] = useState<ToolCall[]>([]);
  const [listening, setListening] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const [voiceConversationId, setVoiceConversationId] = useState(
    selectedConversationId,
  );
  if (voiceConversationId !== selectedConversationId) {
    setVoiceConversationId(selectedConversationId);
    setListening(false);
    setSpeakingId(null);
    setEditingTitle(false);
    setHeaderMenuOpen(false);
  }
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
      setEditingTitle(false);
      await queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: () => deleteConversation(selectedConversationId as string),
    onSuccess: async () => {
      setError(null);
      setConfirmDeleteId(null);
      setHeaderMenuOpen(false);
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

  function saveTitle(value?: string) {
    if (!selected) {
      setEditingTitle(false);
      return;
    }
    const next = (value ?? titleDraft).trim();
    if (!next || next === selected.title) {
      setTitleDrafts((current) => ({
        ...current,
        [selected.id]: selected.title,
      }));
      setEditingTitle(false);
      return;
    }
    setTitleDrafts((current) => ({ ...current, [selected.id]: next }));
    rename.mutate(next);
  }

  async function startStream(
    content: string,
    files: AttachedFile[],
    search: boolean,
  ) {
    stopDictation();
    stopSpeaking();
    setSpeakingId(null);
    const controller = new AbortController();
    abortRef.current = controller;
    setStreaming(true);
    setStickToBottom(true);
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
    setStickToBottom(true);
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
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      stopSpeaking();
    };
  }, [selectedConversationId]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !stickToBottom) {
      return;
    }
    scroller.scrollTo?.({ top: scroller.scrollHeight });
  }, [messages.data, liveAssistant, liveUser, liveTools, streaming, stickToBottom]);

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

  const empty =
    !streaming &&
    (!selected || messages.data?.length === 0) &&
    !messages.isLoading;

  return (
    <div className="flex h-dvh overflow-hidden">
      <ChatSidebar
        open={sidebarOpen}
        user={user}
        usage={usage.data}
        conversations={conversations.data}
        loading={conversations.isLoading}
        selectedId={selectedConversationId}
        creating={create.isPending}
        signingOut={signOut.isPending}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => create.mutate()}
        onSelect={(conversationId) => {
          setConfirmDeleteId(null);
          selectConversation(conversationId);
        }}
        onSignOut={() => signOut.mutate()}
      />

      <section className="flex min-w-0 flex-1 flex-col">
        <ThreadHeader
          title={selected?.title ?? null}
          titleDraft={titleDraft}
          editing={editingTitle}
          menuOpen={headerMenuOpen}
          confirmDelete={selected != null && confirmDeleteId === selected.id}
          renaming={rename.isPending}
          deleting={remove.isPending}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onStartEdit={() => {
            if (!selected) {
              return;
            }
            setTitleDrafts((current) => ({
              ...current,
              [selected.id]: current[selected.id] ?? selected.title,
            }));
            setEditingTitle(true);
          }}
          onTitleChange={(value) => {
            if (!selected) {
              return;
            }
            setTitleDrafts((current) => ({ ...current, [selected.id]: value }));
          }}
          onSaveTitle={saveTitle}
          onCancelEdit={() => {
            if (selected) {
              setTitleDrafts((current) => ({
                ...current,
                [selected.id]: selected.title,
              }));
            }
            setEditingTitle(false);
          }}
          onToggleMenu={() => {
            setHeaderMenuOpen((current) => !current);
            setConfirmDeleteId(null);
          }}
          onCloseMenu={() => {
            setHeaderMenuOpen(false);
            setConfirmDeleteId(null);
          }}
          onAskDelete={() => {
            if (selected) {
              setConfirmDeleteId(selected.id);
            }
          }}
          onConfirmDelete={() => remove.mutate()}
        />

        <div className="relative min-h-0 flex-1">
          <div
            ref={scrollerRef}
            className="h-full overflow-y-auto"
            onScroll={(event) => {
              const el = event.currentTarget;
              const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
              setStickToBottom(gap < 96);
            }}
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
              {empty ? (
                <div className="flex flex-col items-center gap-6 py-12">
                  <p className="text-center text-2xl font-medium tracking-tight text-zinc-200">
                    {selected
                      ? "Send a message to start this conversation."
                      : "What can I help with?"}
                  </p>
                  {!selected ? (
                    <ul className="flex w-full max-w-md flex-col gap-2">
                      {STARTERS.map((prompt) => (
                        <li key={prompt}>
                          <button
                            type="button"
                            className="h-11 w-full rounded-xl border border-white/10 px-4 text-left text-sm text-zinc-300 hover:bg-white/5"
                            onClick={() => setDraft(prompt)}
                          >
                            {prompt}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
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
                        <div className="max-w-[min(85%,36rem)] rounded-3xl bg-zinc-800 px-4 py-2.5 text-sm">
                          <FileNames files={message.files ?? []} />
                          {message.web_search ? (
                            <p className="mb-1 text-xs text-zinc-400">
                              Web search
                            </p>
                          ) : null}
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      </li>
                    );
                  }
                  const replacing = regeneratingId === message.id;
                  const text = replacing ? liveAssistant : message.content;
                  const calls = replacing
                    ? liveTools
                    : (message.tool_calls ?? []);
                  if (!replacing && text === "" && calls.length === 0) {
                    return (
                      <li className="text-sm text-zinc-400" key={message.id}>
                        <p>The model did not reply.</p>
                        {latestReply ? (
                          <MessageActions
                            text=""
                            speaking={false}
                            canRegenerate
                            onCopyError={setError}
                            onSpeak={() => undefined}
                            onRegenerate={() => void startRegenerate(message.id)}
                          />
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
                        <p
                          className="animate-pulse text-sm text-zinc-400"
                          role="status"
                        >
                          Thinking
                        </p>
                      ) : (
                        <p className="text-sm text-zinc-400">
                          The model did not reply.
                        </p>
                      )}
                      {replacing ? null : (
                        <MessageActions
                          text={text}
                          speaking={speakingId === message.id}
                          canRegenerate={latestReply}
                          cancelled={message.status === "cancelled"}
                          onCopyError={setError}
                          onSpeak={() => toggleSpeak(message.id, text)}
                          onRegenerate={() => void startRegenerate(message.id)}
                        />
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
                    <div className="max-w-[min(85%,36rem)] rounded-3xl bg-zinc-800 px-4 py-2.5 text-sm">
                      <FileNames files={liveFiles} />
                      {liveSearch ? (
                        <p className="mb-1 text-xs text-zinc-400">Web search</p>
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
                      <p
                        className="animate-pulse text-sm text-zinc-400"
                        role="status"
                      >
                        Thinking
                      </p>
                    )}
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
          {!stickToBottom ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
              <IconButton
                label="Jump to latest"
                className="pointer-events-auto rounded-full border border-white/15 bg-zinc-900"
                onClick={() => {
                  setStickToBottom(true);
                  scrollerRef.current?.scrollTo({
                    top: scrollerRef.current.scrollHeight,
                    behavior: "smooth",
                  });
                }}
              >
                <ArrowDownIcon />
              </IconButton>
            </div>
          ) : null}
        </div>

        <ChatComposer
          draft={draft}
          attachments={attachments}
          attachmentNote={attachmentNote(attachments)}
          error={error}
          streaming={streaming}
          uploading={uploading}
          searchOn={searchOn}
          listening={listening}
          onDraftChange={setDraft}
          onAttach={(file) => void attach(file)}
          onDetach={(fileId) => void detach(fileId)}
          onToggleSearch={() => setSearchOn((current) => !current)}
          onToggleMic={toggleMic}
          onStop={() => abortRef.current?.abort()}
          onSubmit={() => {
            const content = draft.trim();
            if (!content) {
              return;
            }
            void startStream(content, attachments, searchOn);
          }}
        />
      </section>
    </div>
  );
}
