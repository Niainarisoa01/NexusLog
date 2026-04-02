// NexusLog Engine — Core business logic
//
// This module contains all the heavy-lifting logic:
// - EVTX parsing (parser.rs)
// - Streaming/chunked loading (streaming.rs)
// - Data models (models.rs)
// - Live monitoring [Windows only] (live.rs) — Phase 2
// - Full-text search (search.rs) — Phase 2
// - Sigma detection (sigma.rs) — Phase 3
// - Multi-file correlation (correlator.rs) — Phase 3
// - Export logic (exporter.rs) — Phase 3

pub mod models;
pub mod parser;
pub mod streaming;
pub mod state;
