use std::fs::File;
use std::io::{BufWriter, Write};
use std::path::Path;

use evtx::EvtxParser;

use super::parser::{map_to_model, ParseError};

/// Export an EVTX file to JSON.
///
/// Iterates over all records in the `.evtx` file, converts them to the unified
/// `EventRecord` model, and streams them into a JSON array in the output file.
/// This method uses a buffered writer to maintain low memory usage and high
/// throughput even for huge files (> 500 MB).
///
/// # Arguments
/// * `input` - Path to the `.evtx` file
/// * `output` - Path to the `.json` output file
///
/// # Returns
/// Number of exported records on success, or an error.
pub fn export_evtx_to_json(input: &Path, output: &Path) -> Result<u64, ParseError> {
    if !input.exists() {
        return Err(ParseError::FileNotFound(input.display().to_string()));
    }

    let mut parser = EvtxParser::from_path(input)
        .map_err(|e| ParseError::FileOpen(e.to_string()))?;

    let file = File::create(output)
        .map_err(|e| ParseError::FileOpen(format!("Cannot create output file: {}", e)))?;
    let mut writer = BufWriter::new(file);

    writeln!(writer, "[").map_err(|e| ParseError::FileOpen(e.to_string()))?;

    let mut count = 0;
    let mut is_first = true;

    for result in parser.records_json_value() {
        match result {
            Ok(record) => {
                if let Some(event) = map_to_model(record.data, record.event_record_id) {
                    if !is_first {
                        writeln!(writer, ",").map_err(|e| ParseError::FileOpen(e.to_string()))?;
                    }
                    is_first = false;
                    
                    // Compact JSON output for performance and smaller file size
                    serde_json::to_writer(&mut writer, &event)
                        .map_err(|e| ParseError::RecordParse(e.to_string()))?;
                    
                    count += 1;
                }
            }
            Err(e) => {
                tracing::warn!("Skipping malformed EVTX record during export: {}", e);
            }
        }
    }

    writeln!(writer, "\n]").map_err(|e| ParseError::FileOpen(e.to_string()))?;

    tracing::info!("Exported {} events to {}", count, output.display());

    Ok(count)
}
