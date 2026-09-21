use std::path::PathBuf;
use std::time::Instant;
use tauri::{AppHandle, Emitter, State};

use crate::engine::models::{EventChunk, PaginationRequest, EventRecord, SortField, SortOrder, FilterQuery, LoadSummary, PaginatedResponse};
use crate::engine::state::AppState;
use crate::engine::streaming::load_evtx_streamed;
/// Command to load an EVTX file. It will stream chunks to the frontend while
/// storing the events in the backend AppState in memory.
#[tauri::command]
pub async fn load_file_command(
    path: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<LoadSummary, String> {
    let file_path = PathBuf::from(&path);
    if !file_path.exists() {
        return Err(format!("File not found: {}", path));
    }
    
    tracing::info!("Starting to load file: {}", path);
    let start_time = Instant::now();
    let file_size_bytes = std::fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);
    
    // Clear previous state
    {
        let mut events = state.loaded_events.lock().unwrap();
        events.clear();
    }
    
    // Create a bounded channel for streaming
    let (tx, rx) = flume::bounded::<EventChunk>(4);
    
    let path_clone = file_path.clone();
    
    // Spawn the parsing blocking thread
    let _handle = std::thread::spawn(move || {
        let _ = load_evtx_streamed(&path_clone, 5000, tx);
    });
    
    let mut total_events = 0;
    
    // Asynchronously receive chunks from the parser thread
    while let Ok(mut chunk) = rx.recv_async().await {
        
        let chunk_size = chunk.events.len();
        
        // Push into state
        {
            let mut all_events = state.loaded_events.lock().unwrap();
            all_events.extend(chunk.events.clone());
        }
        
        total_events += chunk_size;
        
        // Recalculate percent based on estimated total events from file size
        // Average EVTX record is ~1000 bytes (header + XML + padding)
        if chunk.total_count == 0 && file_size_bytes > 0 {
            let estimated_total = (file_size_bytes as f64 / 1000.0).max(1.0);
            let progress = (total_events as f32 / estimated_total as f32) * 100.0;
            chunk.progress_percent = progress.min(99.0);
        } else if chunk.total_count > 0 {
            chunk.progress_percent = (total_events as f32 / chunk.total_count as f32) * 100.0;
        }

        if chunk.is_last {
            chunk.progress_percent = 100.0;
        }

        // Drop the massive EventRecord vector to prevent frontend UI freeze
        // We only send the metadata as progress updates to the frontend
        let progress_chunk = EventChunk {
            events: vec![],
            ..chunk
        };

        // Send to frontend
        let _ = app.emit("evtx-chunk", progress_chunk);
    }
    
    let duration_ms = start_time.elapsed().as_millis() as u64;
    tracing::info!("Loaded {} events in {} ms", total_events, duration_ms);
    
    Ok(LoadSummary {
        total_events: total_events as u64,
        duration_ms,
        file_path: path,
        file_size_bytes,
        time_range_start: None,
        time_range_end: None,
        providers: vec![],
        channels: vec![],
    })
}

/// Helper function to match filters
fn matches_filter(event: &EventRecord, query: &FilterQuery) -> bool {
    if let Some(levels) = &query.levels {
        if !levels.is_empty() && !levels.contains(&event.level) {
            return false;
        }
    }
    if let Some(event_ids) = &query.event_ids {
        if !event_ids.is_empty() && !event_ids.contains(&event.event_id) {
            return false;
        }
    }
    if let Some(providers) = &query.providers {
        if !providers.is_empty() && !providers.contains(&event.provider) {
            return false;
        }
    }
    if let Some(channels) = &query.channels {
        if !channels.is_empty() && !channels.contains(&event.channel) {
            return false;
        }
    }
    if let Some(time_from) = &query.time_from {
        if event.timestamp < *time_from {
            return false;
        }
    }
    if let Some(time_to) = &query.time_to {
        if event.timestamp > *time_to {
            return false;
        }
    }
    if let Some(search) = &query.search_text {
        let trimmed = search.trim();
        if !trimmed.is_empty() {
             let text = trimmed.to_lowercase();
             let msg = event.data.to_string().to_lowercase();
             let provider = event.provider.to_lowercase();
             let channel = event.channel.to_lowercase();
             let computer = event.computer.to_lowercase();
             let event_id_str = event.event_id.to_string();

             if !msg.contains(&text)
                 && !provider.contains(&text)
                 && !channel.contains(&text)
                 && !computer.contains(&text)
                 && !event_id_str.contains(&text) {
                 return false;
             }
        }
    }
    
    true
}

/// Get a paginated window of events along with the total count matching active filters
#[tauri::command]
pub fn get_paginated_events(
    request: PaginationRequest,
    state: State<'_, AppState>,
) -> Result<PaginatedResponse, String> {
    let events = state.loaded_events.lock().unwrap();
    
    let mut filtered: Vec<&EventRecord> = if let Some(filters) = &request.filters {
        events.iter().filter(|e| matches_filter(e, filters)).collect()
    } else {
        events.iter().collect()
    };
    
    let total_filtered = filtered.len();

    // Sort
    if let Some(sort_by) = &request.sort_by {
        filtered.sort_by(|a, b| {
            let cmp = match sort_by {
                SortField::Timestamp => a.timestamp.cmp(&b.timestamp),
                SortField::Level => a.level.cmp(&b.level),
                SortField::EventId => a.event_id.cmp(&b.event_id),
                SortField::Provider => a.provider.cmp(&b.provider),
                SortField::Computer => a.computer.cmp(&b.computer),
                SortField::RecordId => a.record_id.cmp(&b.record_id),
            };
            
            match request.sort_order {
                SortOrder::Ascending => cmp,
                SortOrder::Descending => cmp.reverse(),
            }
        });
    }
    
    // Paginate
    let start = request.offset as usize;
    let end = (start + request.limit as usize).min(total_filtered);
    
    let page: Vec<EventRecord> = if start >= total_filtered {
        vec![]
    } else {
        filtered[start..end].iter().map(|&e| e.clone()).collect()
    };
    
    Ok(PaginatedResponse {
        events: page,
        total_filtered,
    })
}
