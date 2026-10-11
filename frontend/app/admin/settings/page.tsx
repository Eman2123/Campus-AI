"use client";

import { AdminSettings } from "@/components/admin/AdminSettings";
import { PageHeader } from "@/components/admin/AdminShell";

export default function AdminSettingsPage() {
  return (
    <>
      <PageHeader title="Settings" sub="Your admin account." />
      <AdminSettings />
    </>
  );
}
