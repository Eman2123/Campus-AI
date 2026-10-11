import { apiFetch } from "@/lib/api";

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type AgentUsage = {
  agent_name: string;
  total_calls: number;
  success_count: number;
  failure_count: number;
  avg_duration_ms: number | null;
  min_duration_ms: number | null;
  max_duration_ms: number | null;
  last_called_at: string | null;
};

export type AgentUsageSummary = { since_hours: number; by_agent: AgentUsage[] };

export type ConnectorStatus = { name: string; label: string; status: string; detail: string };

export const listUsers = (token: string, q?: string) =>
  apiFetch<AdminUser[]>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`, { token });

export const setUserActive = (token: string, id: string, active: boolean) =>
  apiFetch<AdminUser>(`/api/admin/users/${id}/${active ? "enable" : "disable"}`, { method: "POST", token });

export const getAgentUsage = (token: string, hours: number) =>
  apiFetch<AgentUsageSummary>(`/api/admin/analytics/agents?hours=${hours}`, { token });

export const getConnectorStatus = (token: string) =>
  apiFetch<ConnectorStatus[]>("/api/admin/connectors/status", { token });
