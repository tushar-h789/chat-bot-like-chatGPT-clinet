"use client";

import { useRef, type DragEvent, type FormEvent } from "react";

import { IconButton } from "@/features/chat/ui/icon-button";
import {
  CloseIcon,
  GlobeIcon,
  MicIcon,
  PaperclipIcon,
  SendIcon,
  StopIcon,
} from "@/features/chat/ui/icons";
import type { AttachedFile } from "@/lib/api/types";

type ChatComposerProps = {
  draft: string;
  attachments: AttachedFile[];
  attachmentNote: string;
  error: string | null;
  streaming: boolean;
  uploading: boolean;
  searchOn: boolean;
  listening: boolean;
  onDraftChange: (value: string) => void;
  onAttach: (file: File) => void;
  onDetach: (fileId: string) => void;
  onToggleSearch: () => void;
  onToggleMic: () => void;
  onStop: () => void;
  onSubmit: () => void;
};

export function ChatComposer({
  draft,
  attachments,
  attachmentNote,
  error,
  streaming,
  uploading,
  searchOn,
  listening,
  onDraftChange,
  onAttach,
  onDetach,
  onToggleSearch,
  onToggleMic,
  onStop,
  onSubmit,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (streaming || uploading || draft.trim() === "") {
      return;
    }
    onSubmit();
  }

  function takeFile(file: File | undefined) {
    if (file) {
      onAttach(file);
    }
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    takeFile(event.dataTransfer.files[0]);
  }

  return (
    <form
      className="bg-zinc-950 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-4"
      onSubmit={submit}
    >
      <div className="mx-auto w-full max-w-3xl">
        {error ? (
          <p className="mb-2 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <div
          className="rounded-3xl border border-white/15 bg-zinc-900 px-3 py-2.5 md:px-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={onDrop}
        >
          {attachments.length > 0 ? (
            <div className="mb-2">
              <ul className="flex flex-wrap gap-2">
                {attachments.map((file) => (
                  <li
                    className="flex max-w-full items-center gap-1 rounded-full bg-zinc-800 py-1 pr-1 pl-3 text-xs"
                    key={file.id}
                  >
                    <span className="truncate">{file.name}</span>
                    <IconButton
                      label={`Remove ${file.name}`}
                      className="h-7 w-7"
                      onClick={() => onDetach(file.id)}
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                    </IconButton>
                  </li>
                ))}
              </ul>
              {attachmentNote ? (
                <p className="mt-2 text-xs text-zinc-500">{attachmentNote}</p>
              ) : null}
            </div>
          ) : null}
          <label className="sr-only" htmlFor="composer">
            Message
          </label>
          <textarea
            ref={composerRef}
            id="composer"
            className="max-h-48 min-h-12 w-full resize-none bg-transparent text-base outline-none md:text-sm"
            placeholder="Ask anything, or attach a file"
            value={draft}
            disabled={streaming}
            rows={1}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <div className="mt-1 flex items-center justify-between gap-2">
            <div className="flex items-center gap-0.5">
              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                accept=".txt,.md,.csv,.json,.pdf,.png,.jpg,.jpeg,.webp,.gif"
                onChange={(event) => {
                  const chosen = event.target.files?.[0];
                  event.target.value = "";
                  takeFile(chosen);
                }}
              />
              <IconButton
                label={uploading ? "Uploading" : "Attach a file"}
                disabled={streaming || uploading || attachments.length >= 4}
                onClick={() => fileInputRef.current?.click()}
              >
                <PaperclipIcon />
              </IconButton>
              <IconButton
                label={searchOn ? "Web search on" : "Search the web"}
                active={searchOn}
                disabled={streaming}
                aria-pressed={searchOn}
                onClick={onToggleSearch}
              >
                <GlobeIcon />
              </IconButton>
              <IconButton
                label={listening ? "Stop listening" : "Dictate"}
                active={listening}
                disabled={streaming}
                aria-pressed={listening}
                onClick={onToggleMic}
              >
                <MicIcon />
              </IconButton>
              <p className="hidden text-xs text-zinc-500 md:inline">
                Enter to send
              </p>
            </div>
            {streaming ? (
              <IconButton
                label="Stop generating"
                className="rounded-full bg-white text-zinc-950 hover:bg-zinc-100 hover:text-zinc-950"
                onClick={onStop}
              >
                <StopIcon />
              </IconButton>
            ) : (
              <IconButton
                label="Send"
                className="rounded-full bg-white text-zinc-950 hover:bg-zinc-100 hover:text-zinc-950"
                type="submit"
                disabled={draft.trim() === "" || uploading}
              >
                <SendIcon />
              </IconButton>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}
