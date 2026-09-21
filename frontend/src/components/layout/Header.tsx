import { useContext } from "react";
import { useTranslation } from "react-i18next";
import { useEventStore } from "@/store/eventStore";
import { useEventLog } from "@/hooks/useEventLog";
import { ColorModeContext } from "@/styles/ThemeRegistry";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import LinearProgress from "@mui/material/LinearProgress";
import Tooltip from "@mui/material/Tooltip";

export function Header() {
  const { t, i18n } = useTranslation();
  const { loadFile } = useEventLog();
  const { progress, status, reset } = useEventStore();
  const themeContext = useContext(ColorModeContext);

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "fr" : "en";
    i18n.changeLanguage(newLang);
    localStorage.setItem("nexuslog-lang", newLang);
  };

  const toggleTheme = () => {
    themeContext.toggleColorMode();
  };

  const handleOpenFile = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        filters: [{
          name: "Windows Event Logs",
          extensions: ["evtx"]
        }]
      });
      if (selected && typeof selected === "string") {
        loadFile(selected);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = () => {
    reset();
  };

  // Expose resetApp for console debugging
  if (typeof window !== "undefined") {
    window.resetApp = handleReset;
  }

  return (
    <Box
      component="header"
      sx={{
        display: "flex",
        flexDirection: "column",
        bgcolor: "background.paper",
        zIndex: (theme) => theme.zIndex.appBar,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1,
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "primary.contrastText",
              fontWeight: "bold",
            }}
          >
            N
          </Box>
          <Typography variant="h6" color="text.primary" sx={{ fontWeight: 600, m: 0 }}>
            NexusLog
          </Typography>
          
          {(status === "streaming" || status === "loading") && (
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              {t("common.loading", "Loading...")} {progress.toFixed(1)}%
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {status !== "idle" && (
            <Tooltip title={t("common.reset", "Reset")}>
              <IconButton onClick={handleReset} color="warning" size="small">
                <RestartAltIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<FolderOpenIcon />}
            onClick={handleOpenFile}
            size="small"
          >
            {t("welcome.openFile", "Open File")}
          </Button>
          <Button
            variant="text"
            color="secondary"
            onClick={toggleLanguage}
            size="small"
          >
            {i18n.language.toUpperCase()}
          </Button>
          <IconButton onClick={toggleTheme} color="secondary" size="small">
            {themeContext.mode === "dark" ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </IconButton>
        </Box>
      </Box>
      {/* Progress Bar Display */}
      {(status === "streaming" || status === "loading") && (
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ height: 3 }} 
        />
      )}
    </Box>
  );
}
