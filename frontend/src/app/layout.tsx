import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, Public_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const sans = Public_Sans({ variable: "--font-sans-app", subsets: ["latin"] });
const display = Fraunces({ variable: "--font-display-app", subsets: ["latin"], weight: ["500", "600"] });

export const metadata: Metadata = {
  title: {
    default: "AfyaLink — Offline-first community health reporting",
    template: "%s · AfyaLink",
  },
  description: "From Community Reports to Faster Health Action. Offline-first health reporting for Community Health Volunteers in rural Kenya.",
  applicationName: "AfyaLink",
  appleWebApp: { capable: true, title: "AfyaLink", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0e6a59",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable} antialiased`}>
      <body className="min-h-dvh">
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
          Skip to content
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
