"use client";

import { useState } from "react";

import { IconButton } from "@/features/chat/ui/icon-button";
import {
  CheckIcon,
  CopyIcon,
  RefreshIcon,
  SpeakIcon,
  StopIcon,
} from "@/features/chat/ui/icons";

type MessageActionsProps = {
  text: string;
  speaking: boolean;
  canRegenerate: boolean;
  cancelled?: boolean;
  onCopyError: (message: string) => void;
  onSpeak: () => void;
  onRegenerate?: () => void;
};

export function MessageActions({
  text,
  speaking,
  canRegenerate,
  cancelled = false,
  onCopyError,
  onSpeak,
  onRegenerate,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      onCopyError("Copying to the clipboard was blocked.");
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mt-1 flex items-center gap-0.5">
      {cancelled ? (
        <span className="mr-1 text-xs text-zinc-500">Stopped</span>
      ) : null}
      {text ? (
        <IconButton
          label={copied ? "Copied" : "Copy reply"}
          onClick={() => void copy()}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
        </IconButton>
      ) : null}
      {text ? (
        <IconButton
          label={speaking ? "Stop reading" : "Read aloud"}
          active={speaking}
          onClick={onSpeak}
        >
          {speaking ? <StopIcon /> : <SpeakIcon />}
        </IconButton>
      ) : null}
      {canRegenerate ? (
        <IconButton label="Regenerate" onClick={onRegenerate}>
          <RefreshIcon />
        </IconButton>
      ) : null}
    </div>
  );
}
