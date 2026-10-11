"use client";

import { useEffect, useState } from "react";

import { PixelBadge, PixelButton, PixelCard } from "@/components/pixel";
import { type ConnectorStatus, getConnectorStatus } from "@/lib/admin-api";
import { friendlyError } from "@/lib/api";

export const connectorTone = (s: string) => (s === "healthy" ? "mint" : s === "configured" ? "sky" : s === "error" ? "coral" : "yellow") as "mint" | "sky" | "coral" | "yellow";

export function ConnectorsPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getConnectorStatus(token)
      .then((r) => {
        if (!cancelled) {
          setRows(r);
          setError("");
        }
      })
      .catch((e) => !cancelled && setError(friendlyError(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, reload]);

  const bad = rows.filter((r) => r.status === "error").length;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-sm text-muted-onPaper">
          {loading ? "Loading…" : bad ? `${bad} connector${bad === 1 ? "" : "s"} need attention` : "All connectors look fine"}
        </span>
        <PixelButton size="sm" variant="dark" disabled={loading} onClick={() => setReload((n) => n + 1)}>Check again</PixelButton>
      </div>
      {error && <p role="alert" className="mb-3 border-2 border-brand-black bg-accent-coral px-3 py-2 text-sm font-semibold">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((c) => (
          <PixelCard key={c.name} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-pixel text-lg font-bold">{c.label}</h3>
              <PixelBadge tone={connectorTone(c.status)}>{c.status}</PixelBadge>
            </div>
            <p className="mt-2 text-sm text-muted-onPaper">{c.detail}</p>
          </PixelCard>
        ))}
      </div>
    </section>
  );
}
