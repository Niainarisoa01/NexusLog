import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useEventStore } from "@/store/eventStore";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

export function Sidebar() {
  const { t } = useTranslation();
  const { loadSummary } = useEventStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Box
      component="aside"
      className="glass"
      sx={{
        width: collapsed ? 64 : 250,
        minWidth: collapsed ? 64 : 250,
        borderRight: 1,
        borderColor: "divider",
        p: collapsed ? 1 : 3,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        overflowY: "auto",
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: collapsed ? "center" : "space-between", alignItems: "center" }}>
        {!collapsed && (
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{ fontWeight: "bold", letterSpacing: 1 }}
          >
            {t("sidebar.workspace", "WORKSPACE")}
          </Typography>
        )}
        <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: "text.secondary" }}>
          {collapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
      </Box>

      {loadSummary?.file_path ? (
        collapsed ? (
           <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
             <InsertDriveFileIcon color="primary" />
           </Box>
        ) : (
          <Box
            sx={{
              p: 2,
              bgcolor: "background.default",
              borderRadius: 1,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, wordBreak: "break-all" }}
              color="text.primary"
            >
              {loadSummary.file_path.split(/[\\/]/).pop()}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
              {loadSummary.total_events?.toLocaleString() || 0} {t("eventTable.totalEvents", "events", {count: loadSummary.total_events || 0})}
            </Typography>
          </Box>
        )
      ) : (
        !collapsed && (
          <Typography variant="body2" color="text.secondary">
            {t("sidebar.noFiles", "No files open")}
          </Typography>
        )
      )}
    </Box>
  );
}
