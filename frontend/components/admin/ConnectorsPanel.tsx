"use client";

import { useEffect, useState } from "react";

import { PixelBadge, PixelCard } from "@/components/pixel";
import { type ConnectorStatus, getConnectorStatus } from "@/lib/admin-api";
import { friendlyError } from "@/lib/api";

const tone = (s: string) => (s === "healthy" ? "mint" : s === "configured" ? "sky" : s === "error" ? "coral" : "yellow") as "mint" | "sky" | "coral" | "yellow";

export function ConnectorsPanel({ token }: { token: string }) {
  const [rows, setRows] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    getConnectorStatus(token)
      .then((r) => !cancelled && setRows(r))
      .catch((e) => !cancelled && setError(friendlyError(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section>
      {loading && <p className="text-sm text-muted-onPaper">Loading…</p>}
      {error && <p role="alert" className="mb-3 border-2 border-brand-black bg-accent-coral px-3 py-2 text-sm font-semibold">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((c) => (
          <PixelCard key={c.name} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-pixel text-lg font-bold">{c.label}</h3>
              <PixelBadge tone={tone(c.status)}>{c.status}</PixelBadge>
            </div>
            <p className="mt-2 text-sm text-muted-onPaper">{c.detail}</p>
          </PixelCard>
        ))}
      </div>
    </section>
  );
}
