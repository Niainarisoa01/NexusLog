import React, { useEffect, useState } from "react";
import { useEventLog } from "@/hooks/useEventLog";
import { useTranslation } from "react-i18next";
import MoveToInboxIcon from "@mui/icons-material/MoveToInbox";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";

export function FileDropZone({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const { loadFile } = useEventLog();
  const { t } = useTranslation();

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };
    
    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };
    
    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
         const file = e.dataTransfer.files[0] as File & { path?: string };
         if (file.path && file.path.endsWith(".evtx")) {
             loadFile(file.path);
         }
      }
    };
    
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);
    
    return () => {
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragleave", handleDragLeave);
      window.removeEventListener("drop", handleDrop);
    };
  }, [loadFile]);

  return (
    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
      {children}
      {isDragging && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: (theme) => alpha(theme.palette.common.black, 0.6),
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(4px)",
          }}
        >
          <Box
            sx={{
               p: 6,
               border: 2,
               borderStyle: "dashed",
               borderColor: "primary.main",
               borderRadius: 4,
               bgcolor: "background.paper",
               textAlign: "center",
               display: "flex",
               flexDirection: "column",
               alignItems: "center",
               boxShadow: 24,
            }}
          >
             <MoveToInboxIcon sx={{ fontSize: "4rem", color: "primary.main", mb: 2 }} />
             <Typography variant="h5" color="primary.main" sx={{ fontWeight: 600 }}>
               {t("welcome.openFile", "Drop .evtx file here")}
             </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
}
