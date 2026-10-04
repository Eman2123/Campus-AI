"use client";

import { useEffect, useState } from "react";

import { ApiError } from "@/lib/api";
import { getConnectorStatuses, type ConnectorStatus } from "@/lib/admin";

type ConnectorStatusPanelProps = {
  token: string;
};

const STATUS_STYLES: Record<ConnectorStatus["status"], { label: string; dot: string; text: string }> = {
  healthy: { label: "Healthy", dot: "bg-note-mint", text: "text-note-mint" },
  configured: { label: "Configured", dot: "bg-note-mint", text: "text-note-mint" },
  stub: { label: "Stub mode", dot: "bg-highlighter", text: "text-highlighter" },
  error: { label: "Error", dot: "bg-note-coral", text: "text-note-coral" },
};

export function ConnectorStatusPanel({ token }: ConnectorStatusPanelProps) {
  const [connectors, setConnectors] = useState<ConnectorStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);

  async function refresh() {
    setLoading(true);
    try {
      const result = await getConnectorStatuses(token);
      setConnectors(result);
      setRefreshedAt(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load connector status.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-xs text-muted-onDark">
          {refreshedAt ? `Checked ${refreshedAt.toLocaleTimeString()}` : "Checking…"}
        </p>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-sm border border-paper/15 px-3 py-1 font-sans text-xs text-muted-onDark transition-colors hover:border-paper/30 hover:text-paper disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      {error && <p className="mt-3 font-sans text-sm text-note-coral">{error}</p>}

      <div className="mt-4 space-y-2">
        {connectors.map((connector) => {
          const style = STATUS_STYLES[connector.status];
          return (
            <div
              key={connector.name}
              className="flex items-start gap-3 rounded-sm border border-paper/10 px-4 py-3"
            >
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-sans text-sm text-paper">{connector.label}</span>
                  <span className={`font-sans text-xs ${style.text}`}>{style.label}</span>
                </div>
                <p className="mt-1 font-sans text-xs text-muted-onDark">{connector.detail}</p>
              </div>
            </div>
          );
        })}
        {!loading && connectors.length === 0 && (
          <p className="py-6 text-center font-sans text-sm text-muted-onDark">No connectors to show.</p>
        )}
      </div>
    </div>
  );
}