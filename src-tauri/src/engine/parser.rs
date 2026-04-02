// NexusLog Engine — EVTX Parser
//
// Wraps the `evtx` crate to provide high-level parsing with rayon parallelism.
// This module is cross-platform: it works on Windows, Linux, and macOS.
//
// Phase 0: Basic file loading + JSON conversion
// Phase 2: Streaming mode via flume channels (see streaming.rs)

use std::path::Path;

use evtx::EvtxParser;
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

/// Parse an entire .evtx file and return all events as a Vec.
///
/// This is the simple/direct loading mode — loads everything into memory.
/// For large files (> 1 Go), use `streaming::load_evtx_streamed` instead.
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
}
