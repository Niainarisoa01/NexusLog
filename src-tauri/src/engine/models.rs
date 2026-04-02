// NexusLog Engine — Data Models
//
// Central data types shared between backend and frontend via Tauri IPC.
// These types are mirrored in the frontend TypeScript (src/types/models.ts).

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Severity level of a Windows Event Log entry.
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum EventLevel {
    Critical,
    Error,
    Warning,
    Information,
    Verbose,
}

impl EventLevel {
    /// Convert from the numeric level value in EVTX records.
    /// Windows Event Log levels: 1=Critical, 2=Error, 3=Warning, 4=Info, 5=Verbose
    pub fn from_u8(level: u8) -> Self {
        match level {
            1 => EventLevel::Critical,
            2 => EventLevel::Error,
            3 => EventLevel::Warning,
            4 => EventLevel::Information,
            5 => EventLevel::Verbose,
            _ => EventLevel::Information,
        }
    }

    /// Display name for the level
    pub fn as_str(&self) -> &'static str {
        match self {
            EventLevel::Critical => "Critical",
            EventLevel::Error => "Error",
            EventLevel::Warning => "Warning",
            EventLevel::Information => "Information",
            EventLevel::Verbose => "Verbose",
        }
    }
}

/// A single Windows Event Log record — the central data type of NexusLog.
///
/// This struct represents one event from either a .evtx file or a live Windows channel.
/// All fields are designed to be serializable to JSON for IPC with the frontend.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventRecord {
    /// Unique record number within the EVTX file or channel
    pub record_id: u64,
    /// Windows Event ID (e.g., 4625 = failed logon, 7045 = service install)
    pub event_id: u32,
    /// Severity level
    pub level: EventLevel,
    /// Timestamp in UTC
    pub timestamp: DateTime<Utc>,
    /// Event provider/source name (e.g., "Microsoft-Windows-Security-Auditing")
    pub provider: String,
    /// Event channel (e.g., "Security", "System", "Application")
    pub channel: String,
    /// Computer name where the event was generated
    pub computer: String,
    /// Task category ID
    pub task_id: Option<u16>,
    /// Event keywords bitmask
    pub keywords: Option<u64>,
    /// Security user identifier (SID)
    pub user_id: Option<String>,
    /// Dynamic event data fields (EventData/UserData) as JSON
    pub data: serde_json::Value,
    /// Raw XML representation for expert mode
    pub raw_xml: Option<String>,
    /// Source file path (for multi-file correlation)
    pub source_file: Option<String>,
    /// Sigma rule matches for this event (populated by Sigma engine in Phase 3)
    pub sigma_matches: Vec<SigmaMatch>,
}

/// A Sigma rule detection match
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SigmaMatch {
    /// Unique rule identifier
    pub rule_id: String,
    /// Human-readable rule title
    pub rule_title: String,
    /// Severity of the detection
    pub severity: SigmaSeverity,
    /// Description of what was detected
    pub description: String,
    /// MITRE ATT&CK tags (e.g., "attack.persistence", "attack.t1543.003")
    pub tags: Vec<String>,
}

/// Sigma rule severity levels
#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq, PartialOrd, Ord)]
pub enum SigmaSeverity {
    Critical,
    High,
    Medium,
    Low,
    Informational,
}

/// A chunk of events sent during streaming load.
/// The frontend receives these progressively and can display a progress bar.
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EventChunk {
    /// Sequential chunk identifier
    pub chunk_id: u32,
    /// Events in this chunk
    pub events: Vec<EventRecord>,
    /// Total number of events in the file (if known)
    pub total_count: u64,
    /// Number of events loaded so far
    pub loaded_count: u64,
    /// Loading progress percentage (0.0 - 100.0)
    pub progress_percent: f32,
    /// Whether this is the last chunk
    pub is_last: bool,
}

/// Frontend pagination request for loading events in windows
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaginationRequest {
    /// Starting offset (0-indexed)
    pub offset: u64,
    /// Number of records to return (typically 1000-5000)
    pub limit: u64,
    /// Optional filter to apply
    pub filters: Option<FilterQuery>,
    /// Column to sort by
    pub sort_by: Option<SortField>,
    /// Sort direction
    pub sort_order: SortOrder,
}

/// Filter query for events
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FilterQuery {
    /// Filter by severity levels
    pub levels: Option<Vec<EventLevel>>,
    /// Filter by Event IDs
    pub event_ids: Option<Vec<u32>>,
    /// Filter by provider names
    pub providers: Option<Vec<String>>,
    /// Filter by channel names
    pub channels: Option<Vec<String>>,
    /// Filter by time range — start (inclusive)
    pub time_from: Option<DateTime<Utc>>,
    /// Filter by time range — end (inclusive)
    pub time_to: Option<DateTime<Utc>>,
    /// Full-text search query (processed by tantivy in Phase 2)
    pub search_text: Option<String>,
    /// XPath query string (for expert mode, Phase 3)
    pub xpath: Option<String>,
}

/// Sortable fields for the event table
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum SortField {
    Timestamp,
    Level,
    EventId,
    Provider,
    Computer,
    RecordId,
}

/// Sort direction
#[derive(Debug, Serialize, Deserialize, Clone)]
pub enum SortOrder {
    Ascending,
    Descending,
}

/// Summary returned after loading a file
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct LoadSummary {
    /// Total events parsed
    pub total_events: u64,
    /// Parsing duration in milliseconds
    pub duration_ms: u64,
    /// Source file path
    pub file_path: String,
    /// File size in bytes
    pub file_size_bytes: u64,
    /// Earliest event timestamp
    pub time_range_start: Option<DateTime<Utc>>,
    /// Latest event timestamp
    pub time_range_end: Option<DateTime<Utc>>,
    /// Distinct providers found
    pub providers: Vec<String>,
    /// Distinct channels found
    pub channels: Vec<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_event_level_from_u8() {
        assert_eq!(EventLevel::from_u8(1), EventLevel::Critical);
        assert_eq!(EventLevel::from_u8(2), EventLevel::Error);
        assert_eq!(EventLevel::from_u8(3), EventLevel::Warning);
        assert_eq!(EventLevel::from_u8(4), EventLevel::Information);
        assert_eq!(EventLevel::from_u8(5), EventLevel::Verbose);
        assert_eq!(EventLevel::from_u8(99), EventLevel::Information); // fallback
    }

    #[test]
    fn test_event_record_serialization() {
        let record = EventRecord {
            record_id: 1,
            event_id: 4625,
            level: EventLevel::Warning,
            timestamp: Utc::now(),
            provider: "Microsoft-Windows-Security-Auditing".to_string(),
            channel: "Security".to_string(),
            computer: "WORKSTATION-01".to_string(),
            task_id: Some(12544),
            keywords: Some(0x8010000000000000),
            user_id: Some("S-1-5-18".to_string()),
            data: serde_json::json!({"TargetUserName": "admin", "LogonType": "3"}),
            raw_xml: None,
            source_file: Some("Security.evtx".to_string()),
            sigma_matches: vec![],
        };

        let json = serde_json::to_string(&record).unwrap();
        let deserialized: EventRecord = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.event_id, 4625);
        assert_eq!(deserialized.level, EventLevel::Warning);
    }

    #[test]
    fn test_filter_query_default() {
        let filter = FilterQuery {
            levels: Some(vec![EventLevel::Error, EventLevel::Critical]),
            event_ids: None,
            providers: None,
            channels: None,
            time_from: None,
            time_to: None,
            search_text: None,
            xpath: None,
        };

        let json = serde_json::to_string(&filter).unwrap();
        assert!(json.contains("Error"));
        assert!(json.contains("Critical"));
    }
}
