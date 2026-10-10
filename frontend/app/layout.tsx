import type { Metadata } from "next";
import { Libre_Caslon_Text, Pixelify_Sans, Work_Sans } from "next/font/google";
import "./globals.css";

const caslon = Libre_Caslon_Text({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-caslon",
  display: "swap",
});

const workSans = Work_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-work-sans",
  display: "swap",
});

// Pixel display face: headings and short labels only. Body text stays Work Sans.
const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Campus AI — study help that reads your coursework",
  // app/icon.svg and app/apple-icon.png are picked up automatically by
  // Next.js (tab favicon + iOS home-screen icon) — no `icons` field needed.
  description:
    "Upload your notes, ask in plain English or by voice, and get homework help, quizzes, flashcards, and a backward study plan — grounded in your own material.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${caslon.variable} ${workSans.variable} ${pixelify.variable}`}>
      <body className="bg-ink font-sans text-paper antialiased">{children}</body>
    </html>
  );
}
