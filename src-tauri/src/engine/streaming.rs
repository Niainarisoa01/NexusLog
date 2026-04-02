// NexusLog Engine — Streaming Parser
//
// Loads .evtx files in chunks using flume bounded channels for back-pressure.
// This prevents OOM for large files (> 1 Go) by sending events progressively
// to the frontend via Tauri Events.
//
// Performance strategy:
//   1. Read raw JSON values from evtx crate in batches of `chunk_size`
//   2. Convert each batch in parallel using rayon
//   3. Send the converted EventRecord batch through bounded flume channel
//   4. Bounded channel (capacity 4) provides automatic back-pressure
//
// Memory control:
//   - Raw JSON values are dropped immediately after conversion
//   - Only `chunk_size` raw records are held in memory at any time
//   - Back-pressure ensures producer doesn't outpace consumer
//   - Peak memory ≈ 4 chunks × chunk_size × sizeof(EventRecord)

use std::path::Path;
use std::time::Instant;

use evtx::EvtxParser;
use flume::Sender;
use rayon::prelude::*;

use super::models::EventChunk;
use super::parser::{map_to_model, ParseError};

/// Streaming statistics returned after parsing
#[derive(Debug, Clone)]
pub struct StreamStats {
    /// Total events parsed
    pub total_events: u64,
    /// Number of chunks sent
    pub chunk_count: u32,
    /// Records that failed to parse (skipped)
    pub skipped_count: u64,
    /// Total duration in milliseconds
    pub duration_ms: u64,
    /// Throughput in events/second
    pub events_per_sec: f64,
}

/// Load an EVTX file in streaming mode with rayon-parallel batch conversion.
///
/// Events are collected in batches of `chunk_size`, converted in parallel
/// using rayon, then sent through a bounded flume channel providing automatic
/// back-pressure when the consumer (frontend) can't keep up.
///
/// # Memory model
/// At any point, memory usage is bounded by:
///   - `chunk_size` raw JSON values being collected (transient)
///   - Up to `channel_capacity` (typically 4) converted EventChunks in the channel
///   - Consumer-side storage (AppState or direct UI emission)
///
/// For a chunk_size of 5000 and channel capacity of 4:
///   Peak raw buffer ≈ 5000 × ~2KB = ~10 MB (transient)
///   Peak channel    ≈ 4 × 5000 × ~1KB = ~20 MB
///   Total streaming overhead ≈ 30 MB (independent of file size)
///
/// # Arguments
/// * `path` — Path to the .evtx file
/// * `chunk_size` — Number of events per chunk (recommended: 5000)
/// * `sender` — Bounded channel sender for EventChunk
///
/// # Returns
/// `StreamStats` on success, or an error
pub fn load_evtx_streamed(
    path: &Path,
    chunk_size: usize,
    sender: Sender<EventChunk>,
) -> Result<StreamStats, ParseError> {
    if !path.exists() {
        return Err(ParseError::FileNotFound(
            path.display().to_string(),
        ));
    }

    let start = Instant::now();

    let mut parser = EvtxParser::from_path(path)
        .map_err(|e| ParseError::FileOpen(e.to_string()))?;

    let mut chunk_id: u32 = 0;
    let mut raw_buffer: Vec<(serde_json::Value, u64)> = Vec::with_capacity(chunk_size);
    let mut total_loaded: u64 = 0;
    let mut skipped_count: u64 = 0;

    for result in parser.records_json_value() {
        match result {
            Ok(record) => {
                raw_buffer.push((record.data, record.event_record_id));

                if raw_buffer.len() >= chunk_size {
                    // Parallel conversion of the accumulated raw batch
                    let events: Vec<_> = std::mem::take(&mut raw_buffer)
                        .into_par_iter()
                        .filter_map(|(data, rid)| map_to_model(data, rid))
                        .collect();

                    total_loaded += events.len() as u64;

                    let chunk = EventChunk {
                        chunk_id,
                        events,
                        total_count: 0, // Unknown until file is fully parsed
                        loaded_count: total_loaded,
                        progress_percent: 0.0, // Updated by caller if file size is known
                        is_last: false,
                    };

                    if sender.send(chunk).is_err() {
                        tracing::warn!("Streaming cancelled by receiver");
                        let duration = start.elapsed();
                        return Ok(StreamStats {
                            total_events: total_loaded,
                            chunk_count: chunk_id,
                            skipped_count,
                            duration_ms: duration.as_millis() as u64,
                            events_per_sec: total_loaded as f64 / duration.as_secs_f64().max(0.001),
                        });
                    }

                    chunk_id += 1;
                    // Re-allocate buffer for next batch
                    raw_buffer = Vec::with_capacity(chunk_size);
                }
            }
            Err(e) => {
                tracing::warn!("Skipping malformed record in streaming: {}", e);
                skipped_count += 1;
            }
        }
    }

    // Send remaining events as the last chunk (parallel conversion)
    let final_events: Vec<_> = if !raw_buffer.is_empty() {
        std::mem::take(&mut raw_buffer)
            .into_par_iter()
            .filter_map(|(data, rid)| map_to_model(data, rid))
            .collect()
    } else {
        vec![]
    };

    total_loaded += final_events.len() as u64;

    let final_chunk = EventChunk {
        chunk_id,
        events: final_events,
        total_count: total_loaded,
        loaded_count: total_loaded,
        progress_percent: 100.0,
        is_last: true,
    };

    let _ = sender.send(final_chunk);

    let duration = start.elapsed();
    let duration_secs = duration.as_secs_f64().max(0.001);

    let stats = StreamStats {
        total_events: total_loaded,
        chunk_count: chunk_id + 1,
        skipped_count,
        duration_ms: duration.as_millis() as u64,
        events_per_sec: total_loaded as f64 / duration_secs,
    };

    tracing::info!(
        "Streamed {} events in {} chunks from {} in {:.2?} ({:.0} events/s, {} skipped)",
        stats.total_events,
        stats.chunk_count,
        path.display(),
        duration,
        stats.events_per_sec,
        stats.skipped_count,
    );

    Ok(stats)
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
