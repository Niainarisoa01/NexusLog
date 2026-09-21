import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Tauri — generates static HTML/CSS/JS in /out
  output: "export",

  // Required for static export — no Next.js image optimization server
  images: {
    unoptimized: true,
  },

  // Disable server-side features not available in Tauri
  trailingSlash: true,
};

export default nextConfig;
