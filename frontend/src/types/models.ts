// NexusLog TypeScript Models
// Mirror of the Rust types in src-tauri/src/engine/models.rs
// Keep these in sync with the backend!

/** Severity level of a Windows Event Log entry */
export type EventLevel =
  | "Critical"
  | "Error"
  | "Warning"
  | "Information"
  | "Verbose";

/** A single Windows Event Log record */
export interface EventRecord {
  record_id: number;
  event_id: number;
  level: EventLevel;
  /** ISO 8601 timestamp string */
  timestamp: string;
  provider: string;
  channel: string;
  computer: string;
  task_id: number | null;
  keywords: number | null;
  user_id: string | null;
  /** Dynamic event data fields */
  data: Record<string, unknown>;
  raw_xml: string | null;
  source_file: string | null;
  sigma_matches: SigmaMatch[];
}

/** A Sigma rule detection match */
export interface SigmaMatch {
  rule_id: string;
  rule_title: string;
  severity: SigmaSeverity;
  description: string;
  tags: string[];
}

/** Sigma rule severity levels */
export type SigmaSeverity =
  | "Critical"
  | "High"
  | "Medium"
  | "Low"
  | "Informational";

/** A chunk of events sent during streaming load */
export interface EventChunk {
  chunk_id: number;
  events: EventRecord[];
  total_count: number;
  loaded_count: number;
  progress_percent: number;
  is_last: boolean;
}

/** Filter query for events */
export interface FilterQuery {
  levels: EventLevel[] | null;
  event_ids: number[] | null;
  providers: string[] | null;
  channels: string[] | null;
  /** ISO 8601 datetime string */
  time_from: string | null;
  /** ISO 8601 datetime string */
  time_to: string | null;
  search_text: string | null;
  xpath: string | null;
}

/** Frontend pagination request */
export interface PaginationRequest {
  offset: number;
  limit: number;
  filters: FilterQuery | null;
  sort_by: SortField | null;
  sort_order: SortOrder;
}

/** Paginated response with matching count */
export interface PaginatedResponse {
  events: EventRecord[];
  total_filtered: number;
}

/** Sort direction */
export type SortOrder = "Ascending" | "Descending";

/** Sortable fields */
export type SortField =
  | "Timestamp"
  | "Level"
  | "EventId"
  | "Provider"
  | "Computer"
  | "RecordId";

/** Summary returned after loading a file */
export interface LoadSummary {
  total_events: number;
  duration_ms: number;
  file_path: string;
  file_size_bytes: number;
  time_range_start: string | null;
  time_range_end: string | null;
  providers: string[];
  channels: string[];
}
