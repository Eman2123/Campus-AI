"use client";

import { useAdmin } from "@/components/admin/AdminContext";
import { AgentsPanel } from "@/components/admin/AgentsPanel";
import { PageHeader } from "@/components/admin/AdminShell";

export default function AdminAgentsPage() {
  const { token } = useAdmin();
  return (
    <>
      <PageHeader title="Agents" sub="Calls and response times per agent." />
      <AgentsPanel token={token} />
    </>
  );
}
