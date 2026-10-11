"use client";

import { useAdmin } from "@/components/admin/AdminContext";
import { PageHeader } from "@/components/admin/AdminShell";
import { UsersPanel } from "@/components/admin/UsersPanel";

export default function AdminUsersPage() {
  const { token, user } = useAdmin();
  return (
    <>
      <PageHeader title="Users" sub="Search, disable or re-enable accounts." />
      <UsersPanel token={token} selfId={user.id} />
    </>
  );
}
