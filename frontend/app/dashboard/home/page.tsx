import type { Metadata } from "next";

import { HomeView } from "@/components/dashboard/HomeView";

export const metadata: Metadata = { title: "Home", robots: { index: false, follow: false } };

export default function HomePage() {
  return <HomeView />;
}
