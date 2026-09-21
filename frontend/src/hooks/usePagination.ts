import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PaginationRequest, EventRecord } from "@/types/models";
import { useEventStore } from "@/store/eventStore";

export function usePagination() {
  const [loading, setLoading] = useState(false);
  const { filter, status } = useEventStore();

  const fetchPage = useCallback(async (offset: number, limit: number): Promise<EventRecord[]> => {
    if (status !== "ready" && status !== "streaming") return [];
    
    setLoading(true);
    try {
      const request: PaginationRequest = {
        offset,
        limit,
        filters: filter,
        sort_by: null,
        sort_order: "Descending"
      };
      
      const payload = {
        request
      };
      
      const page: EventRecord[] = await invoke("get_paginated_events", payload);
      return page;
    } catch (err) {
      console.error("Failed to fetch page", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [filter, status]);

  return { fetchPage, loading };
}
