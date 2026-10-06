import { create } from "zustand";

type UiState = {
  sidebarOpen: boolean;
  selectedConversationId: string | null;
  setSidebarOpen: (open: boolean) => void;
  selectConversation: (conversationId: string | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: false,
  selectedConversationId: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  selectConversation: (selectedConversationId) =>
    set({ selectedConversationId, sidebarOpen: false }),
}));
