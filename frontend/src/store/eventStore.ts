// NexusLog Event Store (Zustand)
// Manages the loaded events state, loading progress, and file info

import { create } from "zustand";
import type { EventRecord, FilterQuery, LoadSummary } from "@/types/models";
import { createEmptyFilter } from "@/types/filters";

/** Application loading status */
export type LoadingStatus =
  | "idle"
  | "loading"
  | "streaming"
  | "indexing"
  | "ready"
  | "error";

interface EventState {
  /** Total number of events loaded/filtered in the virtualized grid */
  totalEventsCount: number;
  /** Total number of events matching active filters (or null if no filter active) */
  filteredEventsCount: number | null;
  /** Currently selected event for detail panel */
  selectedEvent: EventRecord | null;
  /** Active filter query */
  filter: FilterQuery;
  /** Loading status */
  status: LoadingStatus;
  /** Loading progress (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  errorMessage: string | null;
  /** File load summary */
  loadSummary: LoadSummary | null;
  /** List of open file paths */
  openFiles: string[];

  // Actions
  setTotalEventsCount: (count: number) => void;
  setFilteredEventsCount: (count: number | null) => void;
  setSelectedEvent: (event: EventRecord | null) => void;
  setFilter: (filter: FilterQuery) => void;
  clearFilter: () => void;
  setStatus: (status: LoadingStatus) => void;
  setProgress: (progress: number) => void;
  setError: (message: string) => void;
  setLoadSummary: (summary: LoadSummary | null) => void;
  addOpenFile: (path: string) => void;
  removeOpenFile: (path: string) => void;
  reset: () => void;
}

const initialState = {
  totalEventsCount: 0,
  filteredEventsCount: null as number | null,
  selectedEvent: null as EventRecord | null,
  filter: createEmptyFilter(),
  status: "idle" as LoadingStatus,
  progress: 0,
  errorMessage: null as string | null,
  loadSummary: null as LoadSummary | null,
  openFiles: [] as string[],
};

export const useEventStore = create<EventState>((set) => ({
  ...initialState,

  setTotalEventsCount: (count: number) =>
    set({ totalEventsCount: count }),

  setFilteredEventsCount: (count: number | null) =>
    set({ filteredEventsCount: count }),

  setSelectedEvent: (event: EventRecord | null) =>
    set({ selectedEvent: event }),

  setFilter: (filter: FilterQuery) => set({ filter }),

  clearFilter: () => set({ filter: createEmptyFilter(), filteredEventsCount: null }),

  setStatus: (status: LoadingStatus) =>
    set({ status, errorMessage: status === "error" ? null : null }),

  setProgress: (progress: number) => set({ progress }),

  setError: (message: string) =>
    set({ status: "error", errorMessage: message }),

  setLoadSummary: (summary: LoadSummary | null) => set({ loadSummary: summary }),

  addOpenFile: (path: string) =>
    set((state) => ({
      openFiles: state.openFiles.includes(path)
        ? state.openFiles
        : [...state.openFiles, path],
    })),

  removeOpenFile: (path: string) =>
    set((state) => ({
      openFiles: state.openFiles.filter((f) => f !== path),
    })),

  reset: () => set(initialState),
}));
