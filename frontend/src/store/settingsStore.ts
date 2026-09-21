// NexusLog Settings Store (Zustand)
// Manages user preferences: language, theme, UI state

import { create } from "zustand";
import type { Theme } from "@/styles/theme";

interface SettingsState {
  /** Current language code */
  language: string;
  /** Current theme */
  theme: Theme;
  /** Whether the sidebar is collapsed */
  sidebarCollapsed: boolean;
  /** Whether the detail panel is open */
  detailPanelOpen: boolean;

  // Actions
  setLanguage: (lang: string) => void;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  toggleDetailPanel: () => void;
  setDetailPanelOpen: (open: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language:
    typeof window !== "undefined"
      ? localStorage.getItem("nexuslog-lang") || "en"
      : "en",
  theme:
    typeof window !== "undefined"
      ? (localStorage.getItem("nexuslog-theme") as Theme) || "dark"
      : "dark",
  sidebarCollapsed: false,
  detailPanelOpen: false,

  setLanguage: (lang: string) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nexuslog-lang", lang);
    }
    set({ language: lang });
  },

  setTheme: (theme: Theme) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nexuslog-theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
    }
    set({ theme });
  },

  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

  toggleDetailPanel: () =>
    set((state) => ({ detailPanelOpen: !state.detailPanelOpen })),

  setDetailPanelOpen: (open: boolean) => set({ detailPanelOpen: open }),
}));
