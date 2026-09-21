"use client";

import { createTheme } from "@mui/material/styles";
import { PaletteMode } from "@mui/material";

export const getAppTheme = (mode: PaletteMode) => {
  const isLight = mode === "light";

  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? "#1E3A5F" : "#3b82f6", // Vibrant blue on dark mode for contrast
      },
      secondary: {
        main: isLight ? "#4B5563" : "#9ca3af", // Neutral gray
      },
      background: {
        default: isLight ? "#F9FAFB" : "#0f172a", // Dark slate background
        paper: isLight ? "#FFFFFF" : "#1e293b", // Slate paper
      },
      text: {
        primary: isLight ? "#111827" : "#f8fafc",
        secondary: isLight ? "#6B7280" : "#cbd5e1",
      },
      error: {
        main: isLight ? "#B91C1C" : "#ef4444",
      },
      warning: {
        main: "#B45309",
      },
      success: {
        main: isLight ? "#166534" : "#22c55e",
      },
    },
    typography: {
      fontFamily: "var(--font-inter), sans-serif",
      h1: { fontWeight: 700, fontSize: "2rem" },
      h2: { fontWeight: 600, fontSize: "1.5rem" },
      h3: { fontWeight: 600, fontSize: "1.25rem" },
      body1: { fontSize: "1rem" },
      body2: { fontSize: "0.875rem" },
      button: { textTransform: "none", fontWeight: 600 },
    },
    shape: {
      borderRadius: 8,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: "8px 16px",
          },
          contained: {
            boxShadow: "none",
            "&:hover": { boxShadow: "none" },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: "none" },
          elevation1: {
            boxShadow: isLight
              ? "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)"
              : "0 1px 3px 0 rgba(0, 0, 0, 0.5)",
          },
        },
      },
    },
  });
};
