"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n/config";
import { useEventStore } from "@/store/eventStore";
import { useEventLog } from "@/hooks/useEventLog";
import { AppLayout } from "@/components/layout/AppLayout";
import { EventTable } from "@/components/events/EventTable";
import { FilterBar } from "@/components/events/FilterBar";
import { DetailPanel } from "@/components/events/DetailPanel";
import { FileDropZone } from "@/components/ui/FileDropZone";

import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid"; // We use Grid instead of Box for complex layouts where possible, grid v2 is available on MUI 5+
import Container from "@mui/material/Container";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FlashOnIcon from "@mui/icons-material/FlashOn";
import SearchIcon from "@mui/icons-material/Search";
import SecurityIcon from "@mui/icons-material/Security";
import PublicIcon from "@mui/icons-material/Public";
import SensorsIcon from "@mui/icons-material/Sensors";

export default function Home() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const { status, reset } = useEventStore();
  const { loadFile } = useEventLog();

  useEffect(() => {
    setMounted(true);
    // Expose reset for console debugging — always available
    if (typeof window !== "undefined") {
      window.resetApp = () => {
        reset();
      };
    }
  }, [reset]);

  if (!mounted) {
    return <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", bgcolor: "background.default" }} />;
  }

  // If a file is loaded or loading, show the main application layout
  if (status !== "idle") {
    return (
      <FileDropZone>
        <AppLayout>
          <Box sx={{ display: "flex", flexDirection: "column", flex: 1, position: "relative" }}>
             <FilterBar />
             <EventTable />
             <DetailPanel />
          </Box>
        </AppLayout>
      </FileDropZone>
    );
  }

  return (
    <FileDropZone>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        <Box component="main" sx={{ flex: 1 }}>
          <Container maxWidth="lg" sx={{ py: 10 }}>
            {/* Hero Section */}
            <Box sx={{ textAlign: "center", mb: 8 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  mx: "auto",
                  mb: 4,
                  borderRadius: 2,
                  bgcolor: "primary.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "primary.contrastText",
                  fontSize: "2.5rem",
                  fontWeight: "bold",
                  boxShadow: 3
                }}
              >
                N
              </Box>

              <Typography variant="h1" sx={{ mb: 2 }}>
                {t("welcome.title", "NexusLog")}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 600, mx: "auto", mb: 6 }}>
                {t("welcome.subtitle", "Ultra-fast Windows Event Log Viewer powered by Rust")}
              </Typography>

              <Box sx={{ display: "flex", justifyContent: "center", gap: 3, flexWrap: "wrap" }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<FolderOpenIcon />}
                  onClick={async () => {
                    const isTauri = typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined;
                    if (!isTauri) {
                      alert("Opening local files requires running within the Tauri desktop application. Please run 'cargo tauri dev' and use the application window.");
                      return;
                    }
                    try {
                      const { open } = await import("@tauri-apps/plugin-dialog");
                      const selected = await open({
                         multiple: false,
                         filters: [{ name: "Windows Event Logs", extensions: ["evtx"] }]
                      });
                      if (selected && typeof selected === "string") {
                         loadFile(selected);
                      }
                    } catch (err) {
                      console.error("Failed to open file dialog:", err);
                    }
                  }}
                  sx={{ px: 4, py: 1.5, borderRadius: 50 }}
                >
                  {t("welcome.openFile", "Open File")}
                </Button>

                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<SensorsIcon />}
                  sx={{ px: 4, py: 1.5, borderRadius: 50, borderColor: "divider", color: "text.primary" }}
                >
                  {t("welcome.liveMode", "Live Mode")}
                </Button>
              </Box>
            </Box>

            {/* Features Grid */}
            <Grid container spacing={4} sx={{ maxWidth: 960, mx: "auto" }}>
              {[
                {
                  icon: <FlashOnIcon fontSize="large" />,
                  title: t("welcome.features.fast", "Blazing Fast"),
                  desc: t("welcome.features.fastDesc", "Parse 500MB files in under 5 seconds with Rust"),
                  color: "warning.main",
                },
                {
                  icon: <SearchIcon fontSize="large" />,
                  title: t("welcome.features.search", "Full-Text Search"),
                  desc: t("welcome.features.searchDesc", "Find any event instantly with tantivy indexing"),
                  color: "primary.main",
                },
                {
                  icon: <SecurityIcon fontSize="large" />,
                  title: t("welcome.features.sigma", "Sigma Rules"),
                  desc: t("welcome.features.sigmaDesc", "Detect threats with community Sigma rules"),
                  color: "error.main",
                },
                {
                  icon: <PublicIcon fontSize="large" />,
                  title: t("welcome.features.crossPlatform", "Cross-Platform"),
                  desc: t("welcome.features.crossPlatformDesc", "Analyze .evtx files on Windows, Linux & macOS"),
                  color: "success.main",
                },
              ].map((feature, i) => (
                <Grid item xs={12} sm={6} key={i}>
                  <Box
                    sx={{
                      p: 4,
                      bgcolor: "background.paper",
                      borderRadius: 2,
                      border: 1,
                      borderColor: "divider",
                      height: "100%",
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-4px)",
                        boxShadow: 3,
                      }
                    }}
                  >
                    <Box sx={{ color: feature.color, mb: 2 }}>{feature.icon}</Box>
                    <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>{feature.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{feature.desc}</Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Container>
        </Box>
      </Box>
    </FileDropZone>
  );
}
