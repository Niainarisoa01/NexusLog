// NexusLog Theme Configuration
// Controls dark/light mode and provides theme utilities

export type Theme = "dark" | "light";

/** Get the current theme from localStorage or system preference */
export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";

  const saved = localStorage.getItem("nexuslog-theme") as Theme | null;
  if (saved === "dark" || saved === "light") return saved;

  // Default to dark mode (NexusLog's primary aesthetic)
  return "dark";
}

/** Apply theme to the document root */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;

  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("nexuslog-theme", theme);
}

/** Toggle between dark and light mode */
export function toggleTheme(): Theme {
  const current = document.documentElement.getAttribute("data-theme") as Theme;
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

/** Event level color mapping for both themes */
export const levelColors: Record<string, string> = {
  Critical: "var(--color-critical)",
  Error: "var(--color-error)",
  Warning: "var(--color-warning)",
  Information: "var(--color-info)",
  Verbose: "var(--color-verbose)",
};

/** Event level background color mapping */
export const levelBgColors: Record<string, string> = {
  Critical: "var(--color-critical-bg)",
  Error: "var(--color-error-bg)",
  Warning: "var(--color-warning-bg)",
  Information: "var(--color-info-bg)",
  Verbose: "var(--color-verbose-bg)",
};

/** Sigma severity color mapping */
export const sigmaSeverityColors: Record<string, string> = {
  Critical: "var(--color-sigma-critical)",
  High: "var(--color-sigma-high)",
  Medium: "var(--color-sigma-medium)",
  Low: "var(--color-sigma-low)",
  Informational: "var(--color-sigma-info)",
};
