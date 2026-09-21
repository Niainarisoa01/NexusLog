"use client";

import React, { createContext, useState, useMemo, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { getAppTheme } from "./muiTheme";
import { PaletteMode } from "@mui/material";

export const ColorModeContext = createContext({
  toggleColorMode: () => {},
  mode: "light" as PaletteMode,
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>(() => {
    if (typeof window === "undefined") return "dark";
    const savedMode = localStorage.getItem("nexuslog-theme-mode") as PaletteMode;
    if (savedMode === "light" || savedMode === "dark") {
      return savedMode;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    return prefersDark ? "dark" : "light";
  });

  // Keep data-theme attribute in sync with mode
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const next = prevMode === "light" ? "dark" : "light";
          localStorage.setItem("nexuslog-theme-mode", next);
          document.documentElement.setAttribute("data-theme", next);
          return next;
        });
      },
      mode,
    }),
    [mode]
  );

  const theme = useMemo(() => getAppTheme(mode), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
