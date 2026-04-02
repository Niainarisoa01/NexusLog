// NexusLog Engine — Global State
//
// In-memory data store for loaded events, enabling backend pagination.

use std::sync::Mutex;
use crate::engine::models::EventRecord;

/// The global application state holding loaded events in memory.
pub struct AppState {
    pub loaded_events: Mutex<Vec<EventRecord>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            loaded_events: Mutex::new(Vec::new()),
        }
    }
}
