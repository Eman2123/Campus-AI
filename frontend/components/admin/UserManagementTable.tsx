"use client";

import { useEffect, useState, type FormEvent } from "react";

import { ApiError } from "@/lib/api";
import { disableUser, enableUser, listUsers, type AdminUser } from "@/lib/admin";

type UserManagementTableProps = {
  token: string;
  currentUserId: string;
};

export function UserManagementTable({ token, currentUserId }: UserManagementTableProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);

  async function refresh(q?: string) {
    setLoading(true);
    try {
      const result = await listUsers(token, q);
      setUsers(result);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    refresh(query.trim() || undefined);
  }

  function handleClearSearch() {
    setQuery("");
    refresh();
  }

  async function handleToggle(user: AdminUser) {
    setActioningId(user.id);
    setError(null);
    try {
      const updated = user.is_active ? await disableUser(token, user.id) : await enableUser(token, user.id);
      setUsers((prev) => prev.map((existing) => (existing.id === updated.id ? updated : existing)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't update that user.");
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-2">
        <input
          type="text"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email"
          className="min-w-0 flex-1 rounded-sm border border-paper/15 bg-ink-soft px-3 py-2 font-sans text-sm text-paper placeholder:text-muted-onDark focus:border-paper/40 focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-sm border border-paper/30 px-4 py-2 font-sans text-sm text-paper transition-colors hover:border-paper/60"
        >
          Search
        </button>
        {query && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="rounded-sm px-3 py-2 font-sans text-sm text-muted-onDark transition-colors hover:text-paper"
          >
            Clear
          </button>
        )}
      </form>

      {error && <p className="mt-3 font-sans text-sm text-note-coral">{error}</p>}

      <div className="mt-4 overflow-x-auto rounded-sm border border-paper/10">
        <table className="w-full text-left font-sans text-sm">
          <thead>
            <tr className="border-b border-paper/10 text-muted-onDark">
              <th className="px-4 py-2 font-normal">Email</th>
              <th className="px-4 py-2 font-normal">Role</th>
              <th className="px-4 py-2 font-normal">Status</th>
              <th className="px-4 py-2 font-normal">Joined</th>
              <th className="px-4 py-2 font-normal" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-paper/5 text-paper">
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3 text-muted-onDark">{user.role}</td>
                <td className="px-4 py-3">
                  <span className={user.is_active ? "text-note-mint" : "text-note-coral"}>
                    {user.is_active ? "Active" : "Disabled"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-onDark">{new Date(user.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  {user.id === currentUserId ? (
                    <span className="font-sans text-xs text-muted-onDark">You</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleToggle(user)}
                      disabled={actioningId === user.id}
                      className="font-sans text-xs text-muted-onDark underline transition-colors hover:text-paper disabled:opacity-50"
                    >
                      {user.is_active ? "Disable" : "Enable"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center font-sans text-sm text-muted-onDark">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <p className="mt-2 font-sans text-xs text-muted-onDark">Loading…</p>}
    </div>
  );
}
