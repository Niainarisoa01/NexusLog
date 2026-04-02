// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(author, version, about = "NexusLog — Ultra-fast Windows Event Log Viewer", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Option<Commands>,
}

#[derive(Subcommand)]
enum Commands {
    /// Export an EVTX file to JSON
    Export {
        /// Input EVTX file path
        #[arg(short, long)]
        input: PathBuf,
        /// Output JSON file path
        #[arg(short, long)]
        output: PathBuf,
    },
    /// Parse an EVTX file and display statistics (no output file)
    Parse {
        /// Input EVTX file path
        #[arg(short, long)]
        input: PathBuf,
        /// Use sequential mode instead of parallel (default: parallel with rayon)
        #[arg(long, default_value_t = false)]
        sequential: bool,
    },
    /// Benchmark: parse in streaming mode and report memory-efficient stats
    Bench {
        /// Input EVTX file path
        #[arg(short, long)]
        input: PathBuf,
        /// Chunk size for streaming (default: 5000)
        #[arg(short, long, default_value_t = 5000)]
        chunk_size: usize,
    },
}

#[cfg(windows)]
fn attach_console() {
    // Dynamically attach to the parent console if invoked from a command line.
    // This allows stdout/stderr to print properly and display our CLI messages.
    unsafe {
        let _ = windows::Win32::System::Console::AttachConsole(windows::Win32::System::Console::ATTACH_PARENT_PROCESS);
    }
}

#[cfg(not(windows))]
fn attach_console() {}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Some(Commands::Export { input, output }) => {
            attach_console();
            println!("NexusLog CLI - Exporting EVTX to JSON");
            println!("Input: {}", input.display());
            println!("Output: {}", output.display());
            
            let start = std::time::Instant::now();
            match nexuslog_lib::engine::exporter::export_evtx_to_json(&input, &output) {
                Ok(count) => {
                    let elapsed = start.elapsed();
                    println!("Success! Exported {} records in {:.2?}", count, elapsed);
                    std::process::exit(0);
                }
                Err(e) => {
                    eprintln!("Export failed: {}", e);
                    std::process::exit(1);
                }
            }
        }
        Some(Commands::Parse { input, sequential }) => {
            attach_console();
            run_parse_command(&input, sequential);
        }
        Some(Commands::Bench { input, chunk_size }) => {
            attach_console();
            run_bench_command(&input, chunk_size);
        }
        None => {
            // Launch the Tauri GUI
            nexuslog_lib::run();
        }
    }
}

/// CLI `parse` command — Load an EVTX file and display performance stats.
///
/// Two modes:
///   - Parallel (default): uses rayon for maximum throughput
///   - Sequential: single-threaded baseline for comparison
fn run_parse_command(input: &PathBuf, sequential: bool) {
    println!();
    println!("╔══════════════════════════════════════════════════════╗");
    println!("║          NexusLog CLI — EVTX Parser Benchmark       ║");
    println!("╚══════════════════════════════════════════════════════╝");
    println!();

    if !input.exists() {
        eprintln!("Error: File not found: {}", input.display());
        std::process::exit(1);
    }

    let file_size = std::fs::metadata(input).map(|m| m.len()).unwrap_or(0);
    let file_size_mb = file_size as f64 / (1024.0 * 1024.0);
    println!("  File:   {}", input.display());
    println!("  Size:   {:.2} MB ({} bytes)", file_size_mb, file_size);
    println!("  Mode:   {}", if sequential { "Sequential" } else { "Parallel (rayon)" });
    println!();

    if sequential {
        // Sequential mode
        let start = std::time::Instant::now();
        match nexuslog_lib::engine::parser::load_evtx(input.as_path()) {
            Ok(events) => {
                let elapsed = start.elapsed();
                let count = events.len() as u64;
                let secs = elapsed.as_secs_f64().max(0.001);
                println!("  ✓ Results:");
                println!("    Events parsed:    {}", count);
                println!("    Duration:         {:.2?}", elapsed);
                println!("    Throughput:        {:.0} events/s", count as f64 / secs);
                println!("    Throughput:        {:.1} MB/s", file_size_mb / secs);
                println!();

                if elapsed.as_secs() < 5 {
                    println!("  [PASS] Under 5-second target");
                } else {
                    println!("  [WARN] Exceeded 5-second target ({:.1}s)", secs);
                }
            }
            Err(e) => {
                eprintln!("  [FAIL] Parse error: {}", e);
                std::process::exit(1);
            }
        }
    } else {
        // Parallel mode (default)
        match nexuslog_lib::engine::parser::load_evtx_parallel(input.as_path()) {
            Ok((_events, stats)) => {
                println!("  Results:");
                println!("    Events parsed:    {}", stats.event_count);
                println!("    Skipped:          {}", stats.skipped_count);
                println!("    Duration:         {} ms ({:.2}s)", stats.duration_ms, stats.duration_ms as f64 / 1000.0);
                println!("    Throughput:        {:.0} events/s", stats.events_per_sec);
                println!("    Throughput:        {:.1} MB/s", stats.mb_per_sec);
                println!();

                if stats.duration_ms < 5000 {
                    println!("  [PASS] Under 5-second target");
                } else {
                    println!("  [WARN] Exceeded 5-second target ({:.1}s)", stats.duration_ms as f64 / 1000.0);
                }
            }
            Err(e) => {
                eprintln!("  [FAIL] Parse error: {}", e);
                std::process::exit(1);
            }
        }
    }

    println!();
    std::process::exit(0);
}

/// CLI `bench` command — Stream-parse an EVTX file with memory-efficient chunked mode.
///
/// This simulates the exact same pipeline used by the Tauri GUI:
///   1. Open EVTX file
///   2. Stream events through bounded flume channel (chunk_size per batch)
///   3. Consumer thread receives and counts events
///   4. Report stats on completion
///
/// This is the recommended way to validate memory behavior for large files.
fn run_bench_command(input: &PathBuf, chunk_size: usize) {
    println!();
    println!("╔══════════════════════════════════════════════════════╗");
    println!("║       NexusLog CLI — Streaming Benchmark            ║");
    println!("╚══════════════════════════════════════════════════════╝");
    println!();

    if !input.exists() {
        eprintln!("Error: File not found: {}", input.display());
        std::process::exit(1);
    }

    let file_size = std::fs::metadata(input).map(|m| m.len()).unwrap_or(0);
    let file_size_mb = file_size as f64 / (1024.0 * 1024.0);
    println!("  File:        {}", input.display());
    println!("  Size:        {:.2} MB ({} bytes)", file_size_mb, file_size);
    println!("  Chunk size:  {} events/chunk", chunk_size);
    println!("  Channel:     bounded(4) — back-pressure enabled");
    println!();

    let (tx, rx) = flume::bounded(4);

    let input_clone = input.clone();
    let producer = std::thread::spawn(move || {
        nexuslog_lib::engine::streaming::load_evtx_streamed(
            input_clone.as_path(),
            chunk_size,
            tx,
        )
    });

    // Consumer: receive chunks and count events (simulates frontend)
    let start = std::time::Instant::now();
    let mut total_events: u64 = 0;
    let mut chunk_count: u32 = 0;
    let mut peak_chunk_size: usize = 0;

    while let Ok(chunk) = rx.recv() {
        let chunk_events = chunk.events.len();
        total_events += chunk_events as u64;
        chunk_count += 1;
        if chunk_events > peak_chunk_size {
            peak_chunk_size = chunk_events;
        }

        if chunk.is_last {
            println!("  Chunk {:>4}: {:>6} events [LAST] — total: {}", chunk.chunk_id, chunk_events, total_events);
        } else if chunk_count % 10 == 0 || chunk_count <= 3 {
            println!("  Chunk {:>4}: {:>6} events — running total: {}", chunk.chunk_id, chunk_events, total_events);
        }

        // Drop the chunk immediately to simulate memory-efficient consumption
        drop(chunk);
    }

    let elapsed = start.elapsed();
    let secs = elapsed.as_secs_f64().max(0.001);

    println!();
    println!("  Results:");
    println!("    Total events:     {}", total_events);
    println!("    Total chunks:     {}", chunk_count);
    println!("    Peak chunk size:  {} events", peak_chunk_size);
    println!("    Duration:         {:.2?}", elapsed);
    println!("    Throughput:        {:.0} events/s", total_events as f64 / secs);
    println!("    Throughput:        {:.1} MB/s", file_size_mb / secs);

    // Wait for producer thread to finish and get its stats
    match producer.join() {
        Ok(Ok(stats)) => {
            println!("    Skipped records:  {}", stats.skipped_count);
        }
        Ok(Err(e)) => {
            eprintln!("  [FAIL] Producer error: {}", e);
            std::process::exit(1);
        }
        Err(_) => {
            eprintln!("  [FAIL] Producer thread panicked");
            std::process::exit(1);
        }
    }

    println!();
    if elapsed.as_secs() < 5 {
        println!("  [PASS] Under 5-second target");
    } else {
        println!("  [WARN] Exceeded 5-second target ({:.1}s)", secs);
    }

    // Memory estimation
    // Each EventRecord is ~500 bytes on average (strings + JSON Value)
    // In streaming mode, only channel_capacity × chunk_size records are in flight
    let estimated_peak_mb = (4.0 * chunk_size as f64 * 500.0) / (1024.0 * 1024.0);
    println!("  [INFO] Estimated streaming peak memory: ~{:.0} MB (bounded by channel)", estimated_peak_mb);
    println!("         (Actual peak depends on consumer behavior)");

    println!();
    std::process::exit(0);
}
