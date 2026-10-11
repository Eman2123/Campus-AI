"use client";

import { useEffect, useState } from "react";

import { PixelBadge, PixelCard } from "@/components/pixel";
import { type AdminUser, type AgentUsage, type ConnectorStatus, getAgentUsage, getConnectorStatus, listUsers } from "@/lib/admin-api";
import { friendlyError } from "@/lib/api";

import { useAdmin } from "./AdminContext";
import { connectorTone } from "./ConnectorsPanel";

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <PixelCard className="p-4">
      <b className="block font-pixel text-3xl font-bold leading-none">{value}</b>
      <small className="text-muted-onPaper">{label}</small>
    </PixelCard>
  );
}

export function OverviewPanel() {
  const { token } = useAdmin();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [agents, setAgents] = useState<AgentUsage[] | null>(null);
  const [conns, setConns] = useState<ConnectorStatus[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    const fail = (e: unknown) => !cancelled && setErrors((x) => [...x, friendlyError(e)]);
    listUsers(token).then((r) => !cancelled && setUsers(r)).catch(fail);
    getAgentUsage(token, 24).then((r) => !cancelled && setAgents(r.by_agent)).catch(fail);
    getConnectorStatus(token).then((r) => !cancelled && setConns(r)).catch(fail);
    return () => {
      cancelled = true;
    };
  }, [token]);

  const calls = agents?.reduce((n, a) => n + a.total_calls, 0) ?? 0;
  const failed = agents?.reduce((n, a) => n + a.failure_count, 0) ?? 0;
  const max = Math.max(1, ...(agents ?? []).map((a) => a.total_calls));
  const okConns = conns?.filter((c) => c.status !== "error").length ?? 0;
  const dash = "-";

  return (
    <>
      {errors.length > 0 && (
        <p role="alert" className="mb-4 border-2 border-brand-black bg-accent-coral px-3 py-2 text-sm font-semibold">{errors[0]}</p>
      )}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Stat value={users ? users.length : dash} label="Total users" />
        <Stat value={users ? users.filter((u) => u.is_active).length : dash} label="Active users" />
        <Stat value={agents ? calls : dash} label="Calls (24h)" />
        <Stat value={agents ? (calls ? `${Math.round(((calls - failed) / calls) * 100)}%` : dash) : dash} label="Success rate" />
        <Stat value={conns ? `${okConns} / ${conns.length}` : dash} label="Connectors OK" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section>
          <h2 className="mb-2 font-pixel text-lg font-bold">Calls by agent (last 24 hours)</h2>
          <PixelCard className="flex flex-col gap-2.5 p-4">
            {agents && agents.length === 0 && <p className="text-sm text-muted-onPaper">No agent calls yet.</p>}
            {(agents ?? []).map((a) => (
              <div key={a.agent_name} className="grid grid-cols-[90px_1fr_36px] items-center gap-2.5 text-sm">
                <span className="capitalize">{a.agent_name}</span>
                <i className="block h-4 border-2 border-brand-black">
                  <u className="block h-full border-r-2 border-brand-black bg-brand-yellow" style={{ width: `${Math.max(4, (a.total_calls / max) * 100)}%` }} />
                </i>
                <b>{a.total_calls}</b>
              </div>
            ))}
          </PixelCard>
        </section>

        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-2 font-pixel text-lg font-bold">Connector health</h2>
            <PixelCard className="p-0">
              {(conns ?? []).map((c) => (
                <div key={c.name} className="flex items-center justify-between border-t-2 border-brand-black px-3.5 py-2.5 text-sm first:border-0">
                  <span>{c.label}</span>
                  <PixelBadge tone={connectorTone(c.status)}>{c.status}</PixelBadge>
                </div>
              ))}
            </PixelCard>
          </section>
          <section>
            <h2 className="mb-2 font-pixel text-lg font-bold">Newest users</h2>
            <PixelCard className="p-0">
              {(users ?? []).slice(0, 4).map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-2 border-t-2 border-brand-black px-3.5 py-2.5 text-sm first:border-0">
                  <span className="min-w-0">
                    <span className="block truncate">{u.email}</span>
                    <small className="text-muted-onPaper">{new Date(u.created_at).toLocaleDateString()}</small>
                  </span>
                  <PixelBadge tone={u.is_active ? "mint" : "coral"}>{u.is_active ? "Active" : "Disabled"}</PixelBadge>
                </div>
              ))}
            </PixelCard>
          </section>
        </div>
      </div>
    </>
  );
}
