"use client";

import { PageHeader } from "@/components/admin/AdminShell";
import { OverviewPanel } from "@/components/admin/OverviewPanel";

export default function AdminOverviewPage() {
  return (
    <>
      <PageHeader title="Overview" sub="How Campus AI is doing right now." />
      <OverviewPanel />
    </>
  );
}
