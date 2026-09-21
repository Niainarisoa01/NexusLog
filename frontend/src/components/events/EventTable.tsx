import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEventStore } from "@/store/eventStore";
import { LevelBadge } from "@/components/ui/LevelBadge";
import { useTranslation } from "react-i18next";
import { EventRecord, PaginatedResponse } from "@/types/models";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import { invoke } from "@tauri-apps/api/core";

export function EventTable() {
  const { t } = useTranslation();
  const {
    totalEventsCount,
    filteredEventsCount,
    setFilteredEventsCount,
    status,
    filter,
    setSelectedEvent,
    selectedEvent,
  } = useEventStore();
  const parentRef = useRef<HTMLDivElement>(null);
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof EventRecord; direction: "Ascending" | "Descending" } | null>(null);

  const isFiltered = Boolean(
    (filter.levels && filter.levels.length > 0) ||
    (filter.search_text && filter.search_text.trim().length > 0) ||
    (filter.event_ids && filter.event_ids.length > 0) ||
    (filter.providers && filter.providers.length > 0)
  );

  const count = isFiltered && filteredEventsCount !== null ? filteredEventsCount : totalEventsCount;

  const rowVirtualizer = useVirtualizer({
    count,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const [rowCache, setRowCache] = useState<Record<number, EventRecord>>({});
  const fetchBoundaryRef = useRef({ startIndex: -1, endIndex: -1 });

  const startIndex = virtualItems[0]?.index || 0;
  const endIndex = virtualItems[virtualItems.length - 1]?.index || 0;
  const countRef = useRef(count);
  countRef.current = count;

  useEffect(() => {
    if (countRef.current === 0) return;
    
    // Check if the current virtual window is out of the fetched boundaries
    const bounds = fetchBoundaryRef.current;
    if (bounds.startIndex <= startIndex && bounds.endIndex >= endIndex) {
       return;
    }

    // Fetch block (+50 overscan to reduce frequent fetches)
    const blockStart = Math.max(0, startIndex - 50);
    const blockEnd = Math.min(countRef.current, endIndex + 50);
    const limit = Math.max(1, blockEnd - blockStart);

    let active = true;
    fetchBoundaryRef.current = { startIndex: blockStart, endIndex: blockEnd };

    const sortMapping: Partial<Record<keyof EventRecord, string>> = {
       "timestamp": "Timestamp",
       "level": "Level",
       "event_id": "EventId",
       "provider": "Provider",
       "computer": "Computer",
       "record_id": "RecordId"
    };

    const sort_by = sortConfig ? sortMapping[sortConfig.key] || null : null;

    invoke<PaginatedResponse>("get_paginated_events", {
      request: {
        offset: blockStart,
        limit,
        filters: filter && Object.keys(filter).length > 0 ? filter : null,
        sort_by,
        sort_order: sortConfig ? sortConfig.direction : "Descending",
      }
    }).then((res) => {
      if (!active) return;
      const { events, total_filtered } = res;
      setFilteredEventsCount(isFiltered ? total_filtered : null);
      setRowCache(prev => {
         const newCache = { ...prev };
         events.forEach((ev, i) => {
            newCache[blockStart + i] = ev;
         });
         return newCache;
      });
    }).catch(err => {
      console.error("Failed fetching paginated events", err);
    });

    return () => { active = false; };
  }, [startIndex, endIndex, sortConfig, filter, isFiltered, setFilteredEventsCount]);

  // Clear cache if filter or sort changes
  useEffect(() => {
     setRowCache({});
     fetchBoundaryRef.current = { startIndex: -1, endIndex: -1 };
     if (parentRef.current) {
        parentRef.current.scrollTop = 0;
     }
  }, [sortConfig, filter]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (count === 0) return;
    
    const currentIndexStr = selectedEvent 
      ? Object.keys(rowCache).find(idx => rowCache[Number(idx)]?.record_id === selectedEvent.record_id)
      : null;
      
    if (currentIndexStr) {
       const idx = Number(currentIndexStr);
       if (e.key === "ArrowDown" && idx < count - 1) {
          e.preventDefault();
          const nextEvent = rowCache[idx + 1];
          if (nextEvent) setSelectedEvent(nextEvent);
          rowVirtualizer.scrollToIndex(idx + 1);
       } else if (e.key === "ArrowUp" && idx > 0) {
          e.preventDefault();
          const prevEvent = rowCache[idx - 1];
          if (prevEvent) setSelectedEvent(prevEvent);
          rowVirtualizer.scrollToIndex(idx - 1);
       }
    }
  };

  const requestSort = (key: keyof EventRecord) => {
    let direction: "Ascending" | "Descending" = "Ascending";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "Ascending") {
      direction = "Descending";
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: keyof EventRecord) => {
    if (!sortConfig || sortConfig.key !== key) return "";
    return sortConfig.direction === "Ascending" ? " ▲" : " ▼";
  };

  if (status === "idle") return null;

  return (
    <Box
      ref={parentRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      sx={{
        height: "100%",
        width: "100%",
        overflow: "auto",
        position: "relative",
        bgcolor: "background.paper",
        outline: "none",
        "&:focus-visible": {
          boxShadow: (theme) => `inset 0 0 0 2px ${theme.palette.primary.main}`,
        }
      }}
    >
      {/* Table Header */}
      <Box 
         sx={{
           position: "sticky", top: 0, zIndex: 10,
           display: "flex", alignItems: "center",
           bgcolor: "background.default",
           borderBottom: 1, borderColor: "divider",
           px: 2, height: 36,
         }}
      >
         <Box sx={{ width: 180, resize: "horizontal", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", px: 2 }} onClick={() => requestSort("timestamp")}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", userSelect: "none" }}>{t("eventTable.columns.timestamp", "Timestamp")}{getSortIndicator("timestamp")}</Typography>
         </Box>
         <Box sx={{ width: 100, resize: "horizontal", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", px: 2 }} onClick={() => requestSort("level")}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", userSelect: "none" }}>{t("eventTable.columns.level", "Level")}{getSortIndicator("level")}</Typography>
         </Box>
         <Box sx={{ width: 80, resize: "horizontal", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", px: 2 }} onClick={() => requestSort("event_id")}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", userSelect: "none" }}>{t("eventTable.columns.eventId", "EventID")}{getSortIndicator("event_id")}</Typography>
         </Box>
         <Box sx={{ width: 220, resize: "horizontal", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", px: 2 }} onClick={() => requestSort("provider")}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", userSelect: "none" }}>{t("eventTable.columns.provider", "Provider")}{getSortIndicator("provider")}</Typography>
         </Box>
         <Box sx={{ flex: 1, display: "flex", alignItems: "center", px: 2, cursor: "pointer" }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", userSelect: "none" }}>{t("eventTable.columns.description", "Description")}</Typography>
         </Box>
         <Box sx={{ width: 140, resize: "horizontal", overflow: "hidden", cursor: "pointer", display: "flex", alignItems: "center", px: 2 }} onClick={() => requestSort("computer")}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: "text.secondary", userSelect: "none" }}>{t("eventTable.columns.computer", "Computer")}{getSortIndicator("computer")}</Typography>
         </Box>
      </Box>

      <Box
        sx={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const event = rowCache[virtualRow.index];
          const isSelected = event && selectedEvent?.record_id === event.record_id;

          return (
              <Box
                key={virtualRow.index}
                onClick={() => event && setSelectedEvent(event)}
                sx={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: "flex",
                  alignItems: "center",
                  px: 2,
                  boxSizing: "border-box",
                  borderBottom: 1,
                  borderColor: "divider",
                  bgcolor: isSelected ? "action.selected" : (virtualRow.index % 2 === 0 ? "transparent" : "background.default"),
                  cursor: event ? "pointer" : "default",
                  transition: "background-color 0.2s, transform 0.2s, box-shadow 0.2s",
                  transformOrigin: "center left",
                  "&:hover": event ? {
                    bgcolor: "action.hover",
                    transform: `translateY(${virtualRow.start}px) scale(1.002)`,
                    zIndex: 1,
                    boxShadow: (theme) => `inset 4px 0 0 0 ${theme.palette.primary.main}`,
                  } : {}
                }}
              >
                  {!event ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pl: 2 }}>
                          <CircularProgress size={14} thickness={5} sx={{ color: 'text.disabled', mr: 2 }} />
                          <Typography variant="body2" color="text.disabled">{t("common.loading", "Loading row...")}</Typography>
                      </Box>
                  ) : (
                      <>
                          <Typography variant="body2" sx={{ width: 180, px: 2, color: "text.secondary", overflow: "hidden", whiteSpace: "nowrap" }}>
                             {new Date(event.timestamp).toLocaleString()}
                          </Typography>
                          <Box sx={{ width: 100, px: 2, overflow: "hidden" }}>
                             <LevelBadge level={event.level} />
                          </Box>
                          <Typography variant="body2" sx={{ width: 80, px: 2, fontFamily: "monospace", color: "text.primary", overflow: "hidden" }}>
                             {event.event_id}
                          </Typography>
                          <Typography variant="body2" sx={{ width: 220, px: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "text.primary" }}>
                             {event.provider}
                          </Typography>
                          <Typography variant="body2" sx={{ flex: 1, px: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "text.secondary" }}>
                             {event.data && Object.keys(event.data).length > 0 ? JSON.stringify(event.data) : t("common.noData", "No description data")}
                          </Typography>
                          <Typography variant="body2" sx={{ width: 140, px: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "text.secondary" }}>
                             {event.computer}
                          </Typography>
                      </>
                  )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
