import { useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { EventChunk, LoadSummary } from "@/types/models";
import { useEventStore } from "@/store/eventStore";

export function useEventLog() {
  const { setStatus, setProgress, setError, setLoadSummary, setTotalEventsCount } = useEventStore();
  
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.testIPC = async () => {
         const res = await invoke("get_paginated_events", { request: { offset: 0, limit: 2, filters: null, sort_by: null, sort_order: "Descending"} });
         return res;
      };
      
      window.injectMockData = () => {
        // Mock data helper
      };
    }
  }, []);

  const testConnection = useCallback(async (): Promise<string | null> => {
    return "Phase 1 Connected";
  }, []);

  // Trigger file load command and listen
  const loadFile = useCallback(async (path: string) => {
    setStatus("loading");
    setProgress(0);
    setError("");
    setLoadSummary(null);
    setTotalEventsCount(0);

    let unlisten: UnlistenFn | null = null;
    try {
      // Listen to chunks coming from backend
      unlisten = await listen<EventChunk>("evtx-chunk", (event) => {
        const chunk = event.payload;
        setProgress(chunk.progress_percent);
        setTotalEventsCount(chunk.loaded_count);
      });

      setStatus("streaming");
      const result: LoadSummary = await invoke("load_file_command", { path });
      setLoadSummary(result);
      setTotalEventsCount(result.total_events);
      setStatus("ready");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setProgress(100);
      if (unlisten) {
        unlisten();
      }
    }
  }, [setStatus, setProgress, setError, setLoadSummary, setTotalEventsCount]);

  return { loadFile, testConnection };
}
