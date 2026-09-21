// NexusLog Filter Store (Zustand)
// Manages active filter state separately for performance

import { create } from "zustand";
import type { EventLevel } from "@/types/models";

interface FilterState {
  /** Selected severity levels */
  selectedLevels: EventLevel[];
  /** Selected Event IDs */
  selectedEventIds: number[];
  /** Selected providers */
  selectedProviders: string[];
  /** Date range start (ISO string) */
  dateFrom: string | null;
  /** Date range end (ISO string) */
  dateTo: string | null;
  /** Search text */
  searchText: string;

  // Actions
  setSelectedLevels: (levels: EventLevel[]) => void;
  toggleLevel: (level: EventLevel) => void;
  setSelectedEventIds: (ids: number[]) => void;
  setSelectedProviders: (providers: string[]) => void;
  setDateRange: (from: string | null, to: string | null) => void;
  setSearchText: (text: string) => void;
  clearAll: () => void;
  hasActiveFilters: () => boolean;
}

export const useFilterStore = create<FilterState>((set, get) => ({
  selectedLevels: [],
  selectedEventIds: [],
  selectedProviders: [],
  dateFrom: null,
  dateTo: null,
  searchText: "",

  setSelectedLevels: (levels: EventLevel[]) =>
    set({ selectedLevels: levels }),

  toggleLevel: (level: EventLevel) =>
    set((state) => {
      const exists = state.selectedLevels.includes(level);
      return {
        selectedLevels: exists
          ? state.selectedLevels.filter((l) => l !== level)
          : [...state.selectedLevels, level],
      };
    }),

  setSelectedEventIds: (ids: number[]) =>
    set({ selectedEventIds: ids }),

  setSelectedProviders: (providers: string[]) =>
    set({ selectedProviders: providers }),

  setDateRange: (from: string | null, to: string | null) =>
    set({ dateFrom: from, dateTo: to }),

  setSearchText: (text: string) => set({ searchText: text }),

  clearAll: () =>
    set({
      selectedLevels: [],
      selectedEventIds: [],
      selectedProviders: [],
      dateFrom: null,
      dateTo: null,
      searchText: "",
    }),

  hasActiveFilters: () => {
    const state = get();
    return (
      state.selectedLevels.length > 0 ||
      state.selectedEventIds.length > 0 ||
      state.selectedProviders.length > 0 ||
      state.dateFrom !== null ||
      state.dateTo !== null ||
      state.searchText.length > 0
    );
  },
}));
