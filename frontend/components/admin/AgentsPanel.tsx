"use client";

import { useEffect, useState } from "react";

import { PixelCard } from "@/components/pixel";
import { type AgentUsage, getAgentUsage } from "@/lib/admin-api";
import { friendlyError } from "@/lib/api";

const WINDOWS = [
  { label: "Last hour", hours: 1 },
  { label: "Last 24 hours", hours: 24 },
  { label: "Last 7 days", hours: 24 * 7 },
  { label: "Last 30 days", hours: 24 * 30 },
];

const ms = (v: number | null) => (v === null ? "-" : v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);

export function AgentsPanel({ token }: { token: string }) {
  const [hours, setHours] = useState(24);
  const [rows, setRows] = useState<AgentUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAgentUsage(token, hours)
      .then((s) => {
        if (!cancelled) {
          setRows(s.by_agent);
          setError("");
        }
      })
      .catch((e) => !cancelled && setError(friendlyError(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, hours]);

  const total = rows.reduce((n, r) => n + r.total_calls, 0);
  const failed = rows.reduce((n, r) => n + r.failure_count, 0);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <select
          aria-label="Time window"
          value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          className="border-pixel border-brand-black bg-brand-white px-3 py-2 text-sm"
        >
          {WINDOWS.map((w) => <option key={w.hours} value={w.hours}>{w.label}</option>)}
        </select>
        <span className="text-sm text-muted-onPaper">
          {loading ? "Loading…" : `${total} call${total === 1 ? "" : "s"}, ${failed} failed`}
        </span>
      </div>
      {error && <p role="alert" className="mb-3 border-2 border-brand-black bg-accent-coral px-3 py-2 text-sm font-semibold">{error}</p>}
      <PixelCard className="overflow-x-auto p-0">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-brand-black font-pixel text-brand-white">
            <tr>
              <th className="px-3 py-2">Agent</th>
              <th className="px-3 py-2">Calls</th>
              <th className="px-3 py-2">Failed</th>
              <th className="px-3 py-2">Avg</th>
              <th className="px-3 py-2">Min</th>
              <th className="px-3 py-2">Max</th>
              <th className="px-3 py-2">Last called</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr><td colSpan={7} className="px-3 py-4 text-muted-onPaper">No agent calls in this window.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.agent_name} className="border-t-2 border-brand-black">
                <td className="px-3 py-2 font-semibold capitalize">{r.agent_name}</td>
                <td className="px-3 py-2">{r.total_calls}</td>
                <td className={r.failure_count ? "px-3 py-2 font-semibold text-noteDark-coral" : "px-3 py-2"}>{r.failure_count}</td>
                <td className="px-3 py-2">{ms(r.avg_duration_ms)}</td>
                <td className="px-3 py-2">{ms(r.min_duration_ms)}</td>
                <td className="px-3 py-2">{ms(r.max_duration_ms)}</td>
                <td className="px-3 py-2">{r.last_called_at ? new Date(r.last_called_at).toLocaleString() : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PixelCard>
    </section>
  );
}
