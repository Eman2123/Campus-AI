"use client";

import { useEffect, useState } from "react";

import { PixelBadge, PixelButton, PixelCard } from "@/components/pixel";
import { type AdminUser, listUsers, setUserActive } from "@/lib/admin-api";
import { friendlyError } from "@/lib/api";

export function UsersPanel({ token, selfId }: { token: string; selfId: string }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      setLoading(true);
      listUsers(token, q.trim() || undefined)
        .then((rows) => {
          if (!cancelled) {
            setUsers(rows);
            setError("");
          }
        })
        .catch((e) => !cancelled && setError(friendlyError(e)))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [token, q]);

  async function toggle(u: AdminUser) {
    setPending(u.id);
    setError("");
    try {
      const updated = await setUserActive(token, u.id, !u.is_active);
      setUsers((rows) => rows.map((r) => (r.id === updated.id ? updated : r)));
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setPending(null);
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email…"
          aria-label="Search users by email"
          className="w-full max-w-sm border-pixel border-brand-black bg-brand-white px-3 py-2 text-sm"
        />
        <span className="text-sm text-muted-onPaper">{loading ? "Loading…" : `${users.length} user${users.length === 1 ? "" : "s"}`}</span>
      </div>
      {error && <p role="alert" className="mb-3 border-2 border-brand-black bg-accent-coral px-3 py-2 text-sm font-semibold">{error}</p>}
      <PixelCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-brand-black font-pixel text-brand-white">
            <tr>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Joined</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && !loading && (
              <tr><td colSpan={5} className="px-3 py-4 text-muted-onPaper">No users found.</td></tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="border-t-2 border-brand-black">
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2"><PixelBadge tone={u.role === "admin" ? "yellow" : "white"}>{u.role}</PixelBadge></td>
                <td className="px-3 py-2"><PixelBadge tone={u.is_active ? "mint" : "coral"}>{u.is_active ? "Active" : "Disabled"}</PixelBadge></td>
                <td className="px-3 py-2">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="px-3 py-2 text-right">
                  {u.id === selfId ? (
                    <span className="text-xs text-muted-onPaper">You</span>
                  ) : (
                    <PixelButton size="sm" variant={u.is_active ? "secondary" : "primary"} disabled={pending === u.id} onClick={() => void toggle(u)}>
                      {u.is_active ? "Disable" : "Enable"}
                    </PixelButton>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </PixelCard>
    </section>
  );
}
