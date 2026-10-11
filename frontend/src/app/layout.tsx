import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Geist } from "next/font/google";
import { PageTexture } from "@/components/brand/hex-texture";
import { Providers } from "./providers";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "AfyaLink — Community health reporting that works offline",
    template: "%s · AfyaLink",
  },
  description:
    "AfyaLink helps community health volunteers record and share health reports, even without a reliable connection. Administrators review them on live dashboards and maps.",
  applicationName: "AfyaLink",
  appleWebApp: { capable: true, title: "AfyaLink", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0b3d35",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} antialiased`}>
      {/* Browser extensions (e.g. Grammarly) add attributes to <body>; ignore those mismatches only. */}
      <body className="min-h-dvh" suppressHydrationWarning>
        <noscript>
          <style>{"[data-reveal]{opacity:1!important;transform:none!important}"}</style>
        </noscript>
        <PageTexture />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2 focus:shadow-lg"
        >
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
