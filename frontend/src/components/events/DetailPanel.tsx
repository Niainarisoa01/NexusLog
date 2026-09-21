import { useState, useEffect } from "react";
import { useEventStore } from "@/store/eventStore";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import CloseIcon from "@mui/icons-material/Close";
import Paper from "@mui/material/Paper";
import Slide from "@mui/material/Slide";

export function DetailPanel() {
  const { selectedEvent, setSelectedEvent } = useEventStore();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"general" | "data" | "xml" | "context">("general");

  const isOpen = Boolean(selectedEvent);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setSelectedEvent(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setSelectedEvent]);

  return (
    <Slide direction="left" in={isOpen} mountOnEnter unmountOnExit>
      <Paper
        elevation={4}
        square
        className="glass"
        sx={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 450,
          borderLeft: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          zIndex: 20,
        }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
             {t("detail.title", "Event Details")} {selectedEvent && `- ${selectedEvent.event_id}`}
          </Typography>
          <IconButton onClick={() => setSelectedEvent(null)} size="small" sx={{ color: "text.secondary" }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs 
            value={activeTab} 
            onChange={(_, val) => setActiveTab(val)} 
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab value="general" label={t("detail.tabs.general", "General")} />
            <Tab value="data" label={t("detail.tabs.data", "Data")} />
            <Tab value="xml" label={t("detail.tabs.xml", "XML")} />
            <Tab value="context" label={t("detail.tabs.context", "Context")} />
          </Tabs>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
          {selectedEvent && activeTab === "general" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
               <Typography variant="body2">
                 <Typography component="span" color="text.secondary" sx={{ fontWeight: 600 }}>{t("detail.fields.timestamp", "Timestamp")}:</Typography> {new Date(selectedEvent.timestamp).toLocaleString()}
               </Typography>
               <Typography variant="body2">
                 <Typography component="span" color="text.secondary" sx={{ fontWeight: 600 }}>{t("detail.fields.provider", "Provider")}:</Typography> {selectedEvent.provider}
               </Typography>
               <Typography variant="body2">
                 <Typography component="span" color="text.secondary" sx={{ fontWeight: 600 }}>{t("detail.fields.channel", "Channel")}:</Typography> {selectedEvent.channel}
               </Typography>
               <Typography variant="body2">
                 <Typography component="span" color="text.secondary" sx={{ fontWeight: 600 }}>{t("detail.fields.computer", "Computer")}:</Typography> {selectedEvent.computer}
               </Typography>
               <Typography variant="body2">
                 <Typography component="span" color="text.secondary" sx={{ fontWeight: 600 }}>{t("detail.fields.userId", "User ID")}:</Typography> {selectedEvent.user_id || "N/A"}
               </Typography>
            </Box>
          )}

          {selectedEvent && activeTab === "data" && (
            <Box 
              component="pre" 
              sx={{ 
                p: 2, 
                bgcolor: "background.default", 
                borderRadius: 1, 
                overflowX: "auto",
                fontSize: "0.85rem",
                fontFamily: "monospace",
                border: 1,
                borderColor: "divider",
                className: "glass"
              }}
            >
              {JSON.stringify(selectedEvent.data, null, 2)}
            </Box>
          )}

          {selectedEvent && activeTab === "xml" && (
            <Box 
              component="pre" 
              className="glass"
              sx={{ 
                p: 2, 
                bgcolor: "background.default", 
                borderRadius: 1, 
                overflowX: "auto",
                fontSize: "0.85rem",
                fontFamily: "monospace",
                border: 1,
                borderColor: "divider"
              }}
            >
              {selectedEvent.raw_xml || "No XML Document Available"}
            </Box>
          )}

          {selectedEvent && activeTab === "context" && (
            <Typography variant="body2" color="text.secondary">
              Feature planned for Phase 3. Context timeline...
            </Typography>
          )}
        </Box>
      </Paper>
    </Slide>
  );
}
