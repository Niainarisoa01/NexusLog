import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ThemeRegistry from "@/styles/ThemeRegistry";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NexusLog — Ultra-fast Windows Event Log Viewer",
  description:
    "Open-source Windows Event Log Viewer powered by Rust. Blazing fast parsing, full-text search, Sigma rules detection, and cross-platform support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeRegistry>
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}

