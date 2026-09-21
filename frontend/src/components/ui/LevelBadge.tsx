import { EventLevel } from "@/types/models";
import { useTranslation } from "react-i18next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";

interface LevelBadgeProps {
  level: EventLevel | string;
}

export function LevelBadge({ level }: LevelBadgeProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  
  let color = theme.palette.text.secondary;
  let bg = theme.palette.action.hover;
  let extraClass = "";

  switch (level) {
    case "Critical":
      color = theme.palette.error.main;
      bg = theme.palette.error.main + "22"; 
      extraClass = "animate-pulse-critical"; 
      break;
    case "Error":
      color = theme.palette.error.main;
      bg = theme.palette.error.main + "14";
      break;
    case "Warning":
      color = theme.palette.warning.main;
      bg = theme.palette.warning.main + "14";
      break;
    case "Information":
    case "Info":
      color = theme.palette.text.secondary;
      bg = "transparent";
      break;
    case "Verbose":
      color = theme.palette.text.disabled;
      bg = "transparent";
      break;
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        className={extraClass}
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: color,
        }}
      />
      <Typography
        variant="caption"
        className={extraClass}
        sx={{
          color,
          bgcolor: bg,
          px: 1,
          py: 0.25,
          borderRadius: 1,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {t(`levels.${level.toLowerCase()}`, level)}
      </Typography>
    </Box>
  );
}
