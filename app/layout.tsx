import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nodsend — Human-in-the-loop for AI agents",
  description:
    "Your agent asks. A human decides. You get a webhook. One API call for approval workflows — email delivery, signed webhooks, auto-expiry, and full audit trail.",
  metadataBase: new URL("https://nodsend.com"),
  openGraph: {
    title: "Nodsend — Human-in-the-loop for AI agents",
    description:
      "Your agent asks. A human decides. You get a webhook. One API call for approval workflows.",
    url: "https://nodsend.com",
    siteName: "Nodsend",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Nodsend — Human-in-the-loop for AI agents",
    description:
      "Your agent asks. A human decides. You get a webhook. One API call for approval workflows.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} min-h-full flex flex-col`}
      >
        {children}
      </body>
    </html>
  );
}