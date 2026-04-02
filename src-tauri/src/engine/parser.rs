// NexusLog Engine — EVTX Parser
//
// Wraps the `evtx` crate to provide high-level parsing with rayon parallelism.
// This module is cross-platform: it works on Windows, Linux, and macOS.
//
// Two parsing modes:
//   1. Sequential (load_evtx)      — simple, direct iteration
//   2. Parallel  (load_evtx_parallel) — rayon batch mapping for max throughput
//
// Phase 0: Basic file loading + JSON conversion
// Phase 0 Section 3: Rayon parallelization + performance benchmarking

use std::path::Path;
use std::time::Instant;

use evtx::EvtxParser;
use rayon::prelude::*;
use serde_json::Value;

use super::models::{EventLevel, EventRecord};

/// Errors that can occur during EVTX parsing
#[derive(Debug, thiserror::Error)]
pub enum ParseError {
    #[error("Failed to open EVTX file: {0}")]
    FileOpen(String),
    #[error("Failed to parse EVTX record: {0}")]
    RecordParse(String),
    #[error("File not found: {0}")]
    FileNotFound(String),
    #[error("Invalid file format: {0}")]
    InvalidFormat(String),
}

/// Performance statistics returned after parsing
#[derive(Debug, Clone)]
pub struct ParseStats {
    /// Number of events successfully parsed
    pub event_count: u64,
    /// Number of records that failed to parse (skipped)
    pub skipped_count: u64,
    /// Total parsing duration in milliseconds
    pub duration_ms: u64,
    /// Throughput in events per second
    pub events_per_sec: f64,
    /// File size in bytes
    pub file_size_bytes: u64,
    /// Throughput in MB/s
    pub mb_per_sec: f64,
}

/// Parse an entire .evtx file using rayon parallelization.
///
/// This is the **recommended** high-performance parsing mode.
/// The strategy:
///   1. Read all raw JSON values from the evtx crate (single-threaded I/O)
///   2. Batch-convert them to EventRecord using rayon parallel iterator
///
/// This approach maximizes CPU utilization on the map_to_model step,
/// which involves JSON field extraction, timestamp parsing, and string allocation.
///
/// # Arguments
/// * `path` — Path to the .evtx file
///
/// # Returns
/// * `Ok((Vec<EventRecord>, ParseStats))` on success
/// * `Err(ParseError)` if the file cannot be opened or parsed
pub fn load_evtx_parallel(path: &Path) -> Result<(Vec<EventRecord>, ParseStats), ParseError> {
    if !path.exists() {
        return Err(ParseError::FileNotFound(path.display().to_string()));
    }

    let file_size_bytes = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    let start = Instant::now();

    let mut parser = EvtxParser::from_path(path)
        .map_err(|e| ParseError::FileOpen(e.to_string()))?;

    // Phase 1: Collect all raw JSON values (single-threaded evtx I/O)
    let mut raw_records: Vec<(Value, u64)> = Vec::new();
    let mut skipped_count: u64 = 0;

    for result in parser.records_json_value() {
        match result {
            Ok(record) => {
                raw_records.push((record.data, record.event_record_id));
            }
            Err(e) => {
                tracing::warn!("Skipping malformed EVTX record: {}", e);
                skipped_count += 1;
            }
        }
    }

    // Phase 2: Parallel conversion using rayon
    let events: Vec<EventRecord> = raw_records
        .into_par_iter()
        .filter_map(|(data, record_id)| map_to_model(data, record_id))
        .collect();

    let duration = start.elapsed();
    let duration_ms = duration.as_millis() as u64;
    let event_count = events.len() as u64;
    let duration_secs = duration.as_secs_f64().max(0.001); // Avoid division by zero

    let stats = ParseStats {
        event_count,
        skipped_count,
        duration_ms,
        events_per_sec: event_count as f64 / duration_secs,
        file_size_bytes,
        mb_per_sec: (file_size_bytes as f64 / (1024.0 * 1024.0)) / duration_secs,
    };

    tracing::info!(
        "Parallel-parsed {} events ({} skipped) from {} in {:.2?} ({:.0} events/s, {:.1} MB/s)",
        event_count,
        skipped_count,
        path.display(),
        duration,
        stats.events_per_sec,
        stats.mb_per_sec,
    );

    Ok((events, stats))
}

/// Parse an entire .evtx file sequentially (single-threaded).
///
/// This is the simple/direct loading mode — loads everything into memory.
/// For maximum performance, use `load_evtx_parallel` instead.
/// For large files (> 1 Go), use `streaming::load_evtx_streamed`.
///
/// # Arguments
/// * `path` - Path to the .evtx file
///
/// # Returns
/// * `Ok(Vec<EventRecord>)` - All parsed events
/// * `Err(ParseError)` - If the file cannot be opened or parsed
pub fn load_evtx(path: &Path) -> Result<Vec<EventRecord>, ParseError> {
    if !path.exists() {
        return Err(ParseError::FileNotFound(
            path.display().to_string(),
        ));
    }

    let mut parser = EvtxParser::from_path(path)
        .map_err(|e| ParseError::FileOpen(e.to_string()))?;

    let mut records = Vec::new();

    for result in parser.records_json_value() {
        match result {
            Ok(record) => {
                if let Some(event) = map_to_model(record.data, record.event_record_id) {
                    records.push(event);
                }
            }
            Err(e) => {
                tracing::warn!("Skipping malformed EVTX record: {}", e);
            }
        }
    }

    tracing::info!(
        "Parsed {} events from {}",
        records.len(),
        path.display()
    );

    Ok(records)
}

/// Convert a raw JSON Value from the evtx crate into our EventRecord model.
///
/// The evtx crate produces JSON with this structure:
/// ```json
/// {
///   "Event": {
///     "System": {
///       "EventID": 4625,
///       "Level": 0,
///       "TimeCreated": { "#attributes": { "SystemTime": "2024-01-01T..." } },
///       "Provider": { "#attributes": { "Name": "..." } },
///       "Channel": "Security",
///       "Computer": "WORKSTATION-01",
///       ...
///     },
///     "EventData": { ... }
///   }
/// }
/// ```
pub fn map_to_model(data: Value, record_id: u64) -> Option<EventRecord> {
    let event = data.get("Event")?;
    let system = event.get("System")?;

    // Extract EventID — can be a number or an object with #text
    let event_id = extract_event_id(system)?;

    // Extract Level
    let level_num = system.get("Level")
        .and_then(|v| v.as_u64())
        .unwrap_or(4) as u8;
    let level = EventLevel::from_u8(level_num);

    // Extract Timestamp
    let timestamp = system
        .get("TimeCreated")
        .and_then(|tc| tc.get("#attributes"))
        .and_then(|attrs| attrs.get("SystemTime"))
        .and_then(|st| st.as_str())
        .and_then(|s| {
            chrono::DateTime::parse_from_rfc3339(s)
                .ok()
                .map(|dt| dt.with_timezone(&chrono::Utc))
        })
        .unwrap_or_else(chrono::Utc::now);

    // Extract Provider
    let provider = system
        .get("Provider")
        .and_then(|p| p.get("#attributes"))
        .and_then(|attrs| attrs.get("Name"))
        .and_then(|n| n.as_str())
        .unwrap_or("Unknown")
        .to_string();

    // Extract Channel
    let channel = system
        .get("Channel")
        .and_then(|c| c.as_str())
        .unwrap_or("Unknown")
        .to_string();

    // Extract Computer
    let computer = system
        .get("Computer")
        .and_then(|c| c.as_str())
        .unwrap_or("Unknown")
        .to_string();

    // Extract Task
    let task_id = system
        .get("Task")
        .and_then(|t| t.as_u64())
        .map(|t| t as u16);

    // Extract Keywords
    let keywords = system
        .get("Keywords")
        .and_then(|k| {
            if let Some(s) = k.as_str() {
                u64::from_str_radix(s.trim_start_matches("0x"), 16).ok()
            } else {
                k.as_u64()
            }
        });

    // Extract UserID (Security SID)
    let user_id = system
        .get("Security")
        .and_then(|s| s.get("#attributes"))
        .and_then(|attrs| attrs.get("UserID"))
        .and_then(|u| u.as_str())
        .map(|s| s.to_string());

    // Extract EventData
    let event_data = event
        .get("EventData")
        .cloned()
        .unwrap_or(serde_json::Value::Null);

    Some(EventRecord {
        record_id,
        event_id,
        level,
        timestamp,
        provider,
        channel,
        computer,
        task_id,
        keywords,
        user_id,
        data: event_data,
        raw_xml: None, // XML mode not yet implemented
        source_file: None,
        sigma_matches: vec![],
    })
}

/// Extract EventID which can be either a plain number or an object like:
/// `{"#text": 4625, "#attributes": {"Qualifiers": ""}}`
fn extract_event_id(system: &Value) -> Option<u32> {
    let eid = system.get("EventID")?;

    if let Some(id) = eid.as_u64() {
        return Some(id as u32);
    }

    if let Some(text) = eid.get("#text") {
        return text.as_u64().map(|id| id as u32);
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_map_to_model_basic() {
        let json = serde_json::json!({
            "Event": {
                "System": {
                    "EventID": 4625,
                    "Level": 2,
                    "TimeCreated": {
                        "#attributes": {
                            "SystemTime": "2026-01-15T10:30:00.000Z"
                        }
                    },
                    "Provider": {
                        "#attributes": {
                            "Name": "Microsoft-Windows-Security-Auditing"
                        }
                    },
                    "Channel": "Security",
                    "Computer": "DC01",
                    "Task": 12544,
                    "Security": {
                        "#attributes": {
                            "UserID": "S-1-5-18"
                        }
                    }
                },
                "EventData": {
                    "TargetUserName": "admin",
                    "LogonType": "3"
                }
            }
        });

        let record = map_to_model(json, 42).unwrap();
        assert_eq!(record.record_id, 42);
        assert_eq!(record.event_id, 4625);
        assert_eq!(record.level, EventLevel::Error);
        assert_eq!(record.provider, "Microsoft-Windows-Security-Auditing");
        assert_eq!(record.channel, "Security");
        assert_eq!(record.computer, "DC01");
        assert_eq!(record.task_id, Some(12544));
        assert_eq!(record.user_id, Some("S-1-5-18".to_string()));
    }

    #[test]
    fn test_extract_event_id_plain() {
        let system = serde_json::json!({"EventID": 1234});
        assert_eq!(extract_event_id(&system), Some(1234));
    }

    #[test]
    fn test_extract_event_id_object() {
        let system = serde_json::json!({
            "EventID": {"#text": 4688, "#attributes": {"Qualifiers": ""}}
        });
        assert_eq!(extract_event_id(&system), Some(4688));
    }

    #[test]
    fn test_file_not_found() {
        let result = load_evtx(Path::new("/nonexistent/file.evtx"));
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ParseError::FileNotFound(_)));
    }

    #[test]
    fn test_file_not_found_parallel() {
        let result = load_evtx_parallel(Path::new("/nonexistent/file.evtx"));
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(matches!(err, ParseError::FileNotFound(_)));
    }

    #[test]
    fn test_map_to_model_parallel_batch() {
        // Simulate a batch of raw records for parallel processing
        let raw_records: Vec<(Value, u64)> = (0..100)
            .map(|i| {
                let json = serde_json::json!({
                    "Event": {
                        "System": {
                            "EventID": 4625,
                            "Level": 3,
                            "TimeCreated": {
                                "#attributes": {
                                    "SystemTime": "2026-01-15T10:30:00.000Z"
                                }
                            },
                            "Provider": {
                                "#attributes": {
                                    "Name": "TestProvider"
                                }
                            },
                            "Channel": "Security",
                            "Computer": "WORKSTATION"
                        },
                        "EventData": {}
                    }
                });
                (json, i as u64)
            })
            .collect();

        let events: Vec<EventRecord> = raw_records
            .into_par_iter()
            .filter_map(|(data, record_id)| map_to_model(data, record_id))
            .collect();

        assert_eq!(events.len(), 100);
        // Verify all events were mapped correctly
        for event in &events {
            assert_eq!(event.event_id, 4625);
            assert_eq!(event.level, EventLevel::Warning);
            assert_eq!(event.provider, "TestProvider");
        }
    }
}
