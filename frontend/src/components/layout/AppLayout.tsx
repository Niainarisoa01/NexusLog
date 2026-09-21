import { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import Box from "@mui/material/Box";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden", bgcolor: "background.default" }}>
      <Header />
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Sidebar />
        <Box component="main" sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}
