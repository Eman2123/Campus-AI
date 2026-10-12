import type { Metadata } from "next";

import { ChatView } from "@/components/dashboard/ChatView";

export const metadata: Metadata = { title: "Chat", robots: { index: false, follow: false } };

export default function DashboardPage() {
  return <ChatView />;
}
