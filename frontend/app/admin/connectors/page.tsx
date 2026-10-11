"use client";

import { useAdmin } from "@/components/admin/AdminContext";
import { PageHeader } from "@/components/admin/AdminShell";
import { ConnectorsPanel } from "@/components/admin/ConnectorsPanel";

export default function AdminConnectorsPage() {
  const { token } = useAdmin();
  return (
    <>
      <PageHeader title="Connectors" sub="Email, storage, calendar and the scheduler." />
      <ConnectorsPanel token={token} />
    </>
  );
}
