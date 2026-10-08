"use client";

import { useEffect, useRef } from "react";

import { IconButton } from "@/features/chat/ui/icon-button";
import { MenuIcon, MoreIcon, TrashIcon } from "@/features/chat/ui/icons";

type ThreadHeaderProps = {
  title: string | null;
  titleDraft: string;
  editing: boolean;
  menuOpen: boolean;
  confirmDelete: boolean;
  renaming: boolean;
  deleting: boolean;
  onToggleSidebar: () => void;
  onStartEdit: () => void;
  onTitleChange: (value: string) => void;
  onSaveTitle: (value?: string) => void;
  onCancelEdit: () => void;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
};

export function ThreadHeader({
  title,
  titleDraft,
  editing,
  menuOpen,
  confirmDelete,
  renaming,
  deleting,
  onToggleSidebar,
  onStartEdit,
  onTitleChange,
  onSaveTitle,
  onCancelEdit,
  onToggleMenu,
  onCloseMenu,
  onAskDelete,
  onConfirmDelete,
}: ThreadHeaderProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onPointer(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        onCloseMenu();
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCloseMenu();
      }
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, onCloseMenu]);

  return (
    <header className="flex h-14 shrink-0 items-center gap-1 border-b border-white/10 bg-zinc-950 px-2 sm:px-3">
      <IconButton
        label="Open conversations"
        className="md:hidden"
        onClick={onToggleSidebar}
      >
        <MenuIcon />
      </IconButton>
      {title ? (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          {editing ? (
            <form
              className="min-w-0 flex-1"
              onSubmit={(event) => {
                event.preventDefault();
                onSaveTitle(titleDraft);
              }}
            >
              <label className="sr-only" htmlFor="conversation-title">
                Conversation title
              </label>
              <input
                ref={inputRef}
                id="conversation-title"
                className="h-9 w-full min-w-0 rounded-lg border border-white/15 bg-zinc-900 px-2.5 text-base md:text-sm"
                value={titleDraft}
                disabled={renaming}
                onChange={(event) => onTitleChange(event.target.value)}
                onBlur={(event) => onSaveTitle(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    onCancelEdit();
                  }
                }}
              />
            </form>
          ) : (
            <button
              type="button"
              className="min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left text-sm font-medium"
              title="Rename chat"
              onClick={onStartEdit}
            >
              {title}
            </button>
          )}
          <div className="relative" ref={menuRef}>
            <IconButton
              label="Chat actions"
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              onClick={onToggleMenu}
            >
              <MoreIcon />
            </IconButton>
            {menuOpen ? (
              <div
                className="absolute top-10 right-0 z-20 w-44 rounded-xl border border-white/10 bg-zinc-900 py-1"
                role="menu"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex h-10 w-full items-center px-3 text-left text-sm hover:bg-white/5"
                  onClick={() => {
                    onCloseMenu();
                    onStartEdit();
                  }}
                >
                  Rename
                </button>
                {confirmDelete ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-red-200 hover:bg-red-500/10"
                    disabled={deleting}
                    onClick={onConfirmDelete}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Confirm delete
                  </button>
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="flex h-10 w-full items-center gap-2 px-3 text-left text-sm text-red-200 hover:bg-red-500/10"
                    onClick={onAskDelete}
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="min-w-0 flex-1 truncate px-2 text-sm text-zinc-400">
          Start a conversation.
        </p>
      )}
    </header>
  );
}
