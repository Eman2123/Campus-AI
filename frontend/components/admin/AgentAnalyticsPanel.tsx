"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { getAgentUsageSummary, type AgentUsage } from "@/lib/admin";

type AgentAnalyticsPanelProps = {
  token: string;
};

const WINDOW_OPTIONS = [
  { label: "24h", hours: 24 },
  { label: "7d", hours: 24 * 7 },
  { label: "30d", hours: 24 * 30 },
];

function formatMs(value: number | null): string {
  if (value === null) return "—";
  return value < 1000 ? `${Math.round(value)}ms` : `${(value / 1000).toFixed(1)}s`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function AgentAnalyticsPanel({ token }: AgentAnalyticsPanelProps) {
  const [hours, setHours] = useState(24);
  const [byAgent, setByAgent] = useState<AgentUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getAgentUsageSummary(token, hours)
      .then((summary) => {
        if (!cancelled) {
          setByAgent(summary.by_agent);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Couldn't load agent analytics.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, hours]);

  const maxCalls = Math.max(1, ...byAgent.map((a) => a.total_calls));
  const totalCalls = byAgent.reduce((sum, a) => sum + a.total_calls, 0);
  const totalFailures = byAgent.reduce((sum, a) => sum + a.failure_count, 0);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-xs text-muted-onDark">
          {totalCalls} call{totalCalls === 1 ? "" : "s"}
          {totalFailures > 0 && <span className="text-note-coral"> · {totalFailures} failed</span>}
        </p>
        <div className="flex gap-1">
          {WINDOW_OPTIONS.map((option) => (
            <button
              key={option.hours}
              type="button"
              onClick={() => setHours(option.hours)}
              className={`rounded-sm border px-3 py-1 font-sans text-xs transition-colors ${
                hours === option.hours
                  ? "border-paper/60 text-paper"
                  : "border-paper/15 text-muted-onDark hover:border-paper/30 hover:text-paper"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 font-sans text-sm text-note-coral">{error}</p>}

      {/* Calls-per-agent bars — no charting library here (same reasoning
          as MonthCalendar, Day 32: this sandbox can't npm install one),
          so this is a plain div whose width is proportional to the
          busiest agent in the current window. */}
      <div className="mt-4 space-y-2">
        {byAgent.map((agent) => (
          <div key={agent.agent_name} className="flex items-center gap-3">
            <span className="w-24 shrink-0 truncate font-sans text-xs text-muted-onDark" title={agent.agent_name}>
              {agent.agent_name}
            </span>
            <div className="h-5 flex-1 overflow-hidden rounded-sm bg-ink-soft">
              <div
                className="h-full rounded-sm bg-note-periwinkle/70"
                style={{ width: `${(agent.total_calls / maxCalls) * 100}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right font-sans text-xs text-paper">{agent.total_calls}</span>
          </div>
        ))}
        {!loading && byAgent.length === 0 && (
          <p className="py-6 text-center font-sans text-sm text-muted-onDark">
            No agent calls in this window yet.
          </p>
        )}
      </div>

      <div className="mt-6 overflow-x-auto rounded-sm border border-paper/10">
        <table className="w-full text-left font-sans text-sm">
          <thead>
            <tr className="border-b border-paper/10 text-muted-onDark">
              <th className="px-4 py-2 font-normal">Agent</th>
              <th className="px-4 py-2 font-normal">Calls</th>
              <th className="px-4 py-2 font-normal">Failures</th>
              <th className="px-4 py-2 font-normal">Avg</th>
              <th className="px-4 py-2 font-normal">Min / Max</th>
              <th className="px-4 py-2 font-normal">Last call</th>
            </tr>
          </thead>
          <tbody>
            {byAgent.map((agent) => (
              <tr key={agent.agent_name} className="border-b border-paper/5 text-paper">
                <td className="px-4 py-3">{agent.agent_name}</td>
                <td className="px-4 py-3">{agent.total_calls}</td>
                <td className="px-4 py-3">
                  <span className={agent.failure_count > 0 ? "text-note-coral" : "text-muted-onDark"}>
                    {agent.failure_count}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-onDark">{formatMs(agent.avg_duration_ms)}</td>
                <td className="px-4 py-3 text-muted-onDark">
                  {formatMs(agent.min_duration_ms)} / {formatMs(agent.max_duration_ms)}
                </td>
                <td className="px-4 py-3 text-muted-onDark">{formatRelative(agent.last_called_at)}</td>
              </tr>
            ))}
            {!loading && byAgent.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center font-sans text-sm text-muted-onDark">
                  Nothing to show yet.
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
