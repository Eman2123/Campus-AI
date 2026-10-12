import type { Metadata } from "next";

import { CalendarView } from "@/components/dashboard/CalendarView";

export const metadata: Metadata = { title: "Calendar", robots: { index: false, follow: false } };

export default function CalendarPage() {
  return <CalendarView />;
}
