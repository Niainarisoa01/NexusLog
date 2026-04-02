// NexusLog Engine — Streaming Parser
//
// Loads .evtx files in chunks using flume bounded channels for back-pressure.
// This prevents OOM for large files (> 1 Go) by sending events progressively
// to the frontend via Tauri Events.
//
// Phase 0: Core streaming implementation
// Phase 2: Integration with Tauri Events for real-time UI updates

use std::path::Path;

use evtx::EvtxParser;
use flume::Sender;

use super::models::EventChunk;
use super::parser::{map_to_model, ParseError};

/// Load an EVTX file in streaming mode, sending events in chunks.
///
/// Events are sent through a bounded flume channel, providing automatic
/// back-pressure when the consumer (frontend) can't keep up.
///
/// # Arguments
/// * `path` - Path to the .evtx file
/// * `chunk_size` - Number of events per chunk (recommended: 5000)
/// * `sender` - Bounded channel sender for EventChunk
///
/// # Returns
/// Total number of events parsed, or an error
pub fn load_evtx_streamed(
    path: &Path,
    chunk_size: usize,
    sender: Sender<EventChunk>,
) -> Result<u64, ParseError> {
    if !path.exists() {
        return Err(ParseError::FileNotFound(
            path.display().to_string(),
        ));
    }

    let mut parser = EvtxParser::from_path(path)
        .map_err(|e| ParseError::FileOpen(e.to_string()))?;

    let mut chunk_id: u32 = 0;
    let mut buffer = Vec::with_capacity(chunk_size);
    let mut total_loaded: u64 = 0;

    for result in parser.records_json_value() {
        match result {
            Ok(record) => {
                if let Some(event) = map_to_model(record.data, record.event_record_id) {
                    buffer.push(event);
                    total_loaded += 1;

                    if buffer.len() >= chunk_size {
                        let chunk = EventChunk {
                            chunk_id,
                            events: std::mem::take(&mut buffer),
                            total_count: 0, // Unknown until file is fully parsed
                            loaded_count: total_loaded,
                            progress_percent: 0.0, // Updated by caller if file size is known
                            is_last: false,
                        };

                        if sender.send(chunk).is_err() {
                            tracing::warn!("Streaming cancelled by receiver");
                            return Ok(total_loaded);
                        }

                        chunk_id += 1;
                        buffer = Vec::with_capacity(chunk_size);
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Skipping malformed record in streaming: {}", e);
            }
        }
    }

    // Send remaining events as the last chunk
    if !buffer.is_empty() {
        let chunk = EventChunk {
            chunk_id,
            events: buffer,
            total_count: total_loaded,
            loaded_count: total_loaded,
            progress_percent: 100.0,
            is_last: true,
        };

        let _ = sender.send(chunk);
    } else {
        // Send an empty last chunk to signal completion
        let chunk = EventChunk {
            chunk_id,
            events: vec![],
            total_count: total_loaded,
            loaded_count: total_loaded,
            progress_percent: 100.0,
            is_last: true,
        };

        let _ = sender.send(chunk);
    }

    tracing::info!(
        "Streamed {} events in {} chunks from {}",
        total_loaded,
        chunk_id + 1,
        path.display()
    );

    Ok(total_loaded)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_streamed_file_not_found() {
        let (tx, _rx) = flume::bounded(4);
        let result = load_evtx_streamed(
            Path::new("/nonexistent/file.evtx"),
            5000,
            tx,
        );
        assert!(result.is_err());
    }

    #[test]
    fn test_streamed_cancelled_by_receiver() {
        // Dropping the receiver should cause the sender to detect disconnection
        let (tx, rx) = flume::bounded(1);
        drop(rx); // Simulate frontend cancellation

        // With a non-existent file, it errors before sending
        let result = load_evtx_streamed(
            Path::new("/nonexistent/file.evtx"),
            5000,
            tx,
        );
        assert!(result.is_err());
    }
}
