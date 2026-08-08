import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono-custom",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Nodsend — Human approval infrastructure for AI agents",
    template: "%s | Nodsend",
  },
  description:
    "Put a secure human checkpoint between agent intent and execution with one approval API, signed outcomes, and a complete decision record.",
  metadataBase: new URL("https://nodsend.com"),
  openGraph: {
    title: "Nodsend — Human approval infrastructure for AI agents",
    description:
      "Your agent asks. A human decides. You get a webhook. One API call for approval workflows.",
    url: "https://nodsend.com",
    siteName: "Nodsend",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nodsend — Human approval infrastructure for AI agents",
    description:
      "Your agent asks. A human decides. You get a webhook. One API call for approval workflows.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full" suppressHydrationWarning>
      <body
        className={`${display.variable} ${mono.variable} min-h-full flex flex-col`}
      >
        <a href="#main-content" className="skip-link">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
