import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Libre_Caslon_Text, Pixelify_Sans, Work_Sans } from "next/font/google";
import "./globals.css";
import { CookieNotice } from "@/components/site/CookieNotice";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

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
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Campus AI: study help that reads your coursework",
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // app/icon.svg and app/apple-icon.png are picked up automatically by
  // Next.js (tab favicon + iOS home-screen icon), no `icons` field needed.
  // The social preview image comes from app/opengraph-image.tsx (and
  // twitter-image.tsx), also picked up automatically.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Campus AI: study help that reads your coursework",
    description: SITE_DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Campus AI: study help that reads your coursework",
    description: SITE_DESCRIPTION,
  },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#FACC15",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${caslon.variable} ${workSans.variable} ${pixelify.variable}`}>
      <body className="bg-ink font-sans text-paper antialiased">
        {children}
        <CookieNotice />
        {/* Cookie-free page-view analytics; only reports when hosted on Vercel. */}
        <Analytics />
      </body>
    </html>
  );
}
