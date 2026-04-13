import type { Metadata } from "next";
import { JetBrains_Mono, Syne } from "next/font/google";
import "./globals.css";

const syne = Syne({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Helios — Sovereign Multi-Agent DeFi Economy",
  description:
    "Four AI agents autonomously find yield, execute trades, and compound profits on X Layer. Capital on autopilot.",
  openGraph: {
    title: "Helios — Capital on Autopilot",
    description: "Sovereign multi-agent DeFi economy on X Layer. Every cycle proven onchain.",
    siteName: "Helios",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${syne.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0F0D0E]">{children}</body>
    </html>
  );
}
