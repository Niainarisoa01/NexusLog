// NexusLog Plugins — Extensibility API
//
// This module defines the plugin trait and loader for community extensions.
// Implementation planned for Phase 3.
//
// Plugin capabilities:
// - Custom log format parsers (syslog, auditd, journalctl)
// - Custom export formats
// - Event enrichment (GeoIP, reputation, etc.)
// - Custom detection rules

/// Placeholder for the NexusLog plugin trait.
/// Full implementation in Phase 3.
pub trait NexusLogPlugin: Send + Sync {
    /// Plugin display name
    fn name(&self) -> &str;
    /// Plugin version (semver)
    fn version(&self) -> &str;
}
