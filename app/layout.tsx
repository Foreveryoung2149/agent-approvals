import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Approvals — Human-in-the-loop for AI agents",
  description:
    "A simple API for AI agents to request human approval before consequential actions. One API call, email delivery, signed webhooks. Free tier: 100 approvals/month.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}