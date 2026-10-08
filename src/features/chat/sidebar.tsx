"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { APP_NAME } from "@/config/brand";
import { IconButton } from "@/features/chat/ui/icon-button";
import { CloseIcon, PlusIcon, SearchIcon } from "@/features/chat/ui/icons";
import { userIsAdmin, type Conversation, type User } from "@/lib/api/types";
import type { UsageSummary } from "@/lib/api/usage";

type ChatSidebarProps = {
  open: boolean;
  user: User;
  usage?: UsageSummary;
  conversations?: Conversation[];
  loading: boolean;
  selectedId: string | null;
  creating: boolean;
  signingOut: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelect: (conversationId: string) => void;
  onSignOut: () => void;
};

function startOfDay(value: Date): number {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  ).getTime();
}

function groupLabel(updatedAt: string): string {
  const when = new Date(updatedAt);
  if (Number.isNaN(when.getTime())) {
    return "Earlier";
  }
  const today = startOfDay(new Date());
  const day = startOfDay(when);
  const diff = Math.round((today - day) / 86_400_000);
  if (diff <= 0) {
    return "Today";
  }
  if (diff === 1) {
    return "Yesterday";
  }
  if (diff < 7) {
    return "Previous 7 days";
  }
  return "Earlier";
}

export function ChatSidebar({
  open,
  user,
  usage,
  conversations,
  loading,
  selectedId,
  creating,
  signingOut,
  onClose,
  onNewChat,
  onSelect,
  onSignOut,
}: ChatSidebarProps) {
  const [query, setQuery] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setQuery("");
    }
  }

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", onKey);
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const previous = document.body.style.overflow;
    if (mobile) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = (conversations ?? []).filter((conversation) =>
      conversation.title.toLowerCase().includes(needle),
    );
    const buckets = new Map<string, Conversation[]>();
    for (const conversation of filtered) {
      const label = groupLabel(conversation.updated_at);
      const list = buckets.get(label) ?? [];
      list.push(conversation);
      buckets.set(label, list);
    }
    return ["Today", "Yesterday", "Previous 7 days", "Earlier"]
      .map((label) => ({ label, items: buckets.get(label) ?? [] }))
      .filter((group) => group.items.length > 0);
  }, [conversations, query]);

  const used = usage?.tokens_today ?? 0;
  const limit = usage?.daily_token_limit;
  const usageRatio =
    limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null;

  return (
    <>
      <button
        type="button"
        aria-label="Close conversations"
        className={`fixed inset-0 z-30 bg-black/55 md:hidden ${open ? "block" : "hidden"}`}
        onClick={onClose}
      />
      <aside
        className={`${open ? "flex" : "hidden"} fixed inset-y-0 left-0 z-40 w-[min(20rem,86vw)] flex-col border-r border-white/10 bg-zinc-950 md:static md:z-0 md:flex md:w-72`}
      >
        <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
          <h1 className="min-w-0 truncate text-sm font-semibold">{APP_NAME}</h1>
          <IconButton
            label="Close conversations"
            className="md:hidden"
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </div>
        <div className="px-3 pb-3">
          <button
            className="flex h-10 w-full touch-manipulation items-center justify-center gap-2 rounded-xl bg-white text-sm font-medium text-zinc-950 disabled:opacity-40"
            type="button"
            onClick={onNewChat}
            disabled={creating}
          >
            <PlusIcon className="h-4 w-4" />
            New chat
          </button>
        </div>
        <label className="sr-only" htmlFor="conversation-search">
          Search chats
        </label>
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-2.5">
          <SearchIcon className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            id="conversation-search"
            className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-zinc-500 md:text-sm"
            placeholder="Search chats"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <nav
          className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
          aria-label="Conversations"
        >
          {loading ? (
            <p className="px-2 py-3 text-sm text-zinc-500">Loading</p>
          ) : null}
          {!loading && (conversations?.length ?? 0) === 0 ? (
            <p className="px-2 py-3 text-sm text-zinc-500">
              No conversations yet.
            </p>
          ) : null}
          {!loading &&
          conversations &&
          conversations.length > 0 &&
          groups.length === 0 ? (
            <p className="px-2 py-3 text-sm text-zinc-500">
              No matching chats.
            </p>
          ) : null}
          {groups.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="px-2 py-1 text-[11px] font-medium tracking-wide text-zinc-500 uppercase">
                {group.label}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      className={`flex min-h-11 w-full touch-manipulation items-center rounded-lg px-2.5 py-2 text-left text-sm ${
                        conversation.id === selectedId
                          ? "bg-white/10"
                          : "hover:bg-white/5"
                      }`}
                      type="button"
                      onClick={() => onSelect(conversation.id)}
                    >
                      <span className="line-clamp-2 break-words">
                        {conversation.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="truncate text-xs text-zinc-400">{user.email}</p>
          {userIsAdmin(user) ? (
            <Link
              href="/admin"
              className="mt-2 inline-block text-sm text-zinc-200 underline-offset-4 hover:underline"
            >
              Admin
            </Link>
          ) : null}
          {usageRatio != null && limit != null ? (
            <div className="mt-2">
              <div
                className="h-1.5 overflow-hidden rounded-full bg-white/10"
                aria-hidden
              >
                <div
                  className="h-full rounded-full bg-white/70"
                  style={{ width: `${usageRatio}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-zinc-500">
                {used.toLocaleString("en-US")} / {limit.toLocaleString("en-US")}{" "}
                tokens today
              </p>
            </div>
          ) : null}
          <button
            className="mt-3 h-9 touch-manipulation text-sm text-zinc-200 underline-offset-4 hover:underline"
            type="button"
            onClick={onSignOut}
            disabled={signingOut}
          >
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}
