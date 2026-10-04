import { apiFetch } from "@/lib/api";

export type AdminUser = {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export async function listUsers(token: string, query?: string): Promise<AdminUser[]> {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : "";
  return apiFetch<AdminUser[]>(`/api/admin/users${suffix}`, { token });
}

export async function disableUser(token: string, userId: string): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/admin/users/${userId}/disable`, { method: "POST", token });
}

export async function enableUser(token: string, userId: string): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/admin/users/${userId}/enable`, { method: "POST", token });
}

// Day 36 — agent usage analytics
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

export type AgentUsageSummary = {
  since_hours: number;
  by_agent: AgentUsage[];
};

export async function getAgentUsageSummary(token: string, hours = 24): Promise<AgentUsageSummary> {
  return apiFetch<AgentUsageSummary>(`/api/admin/analytics/agents?hours=${hours}`, { token });
}

// Day 37 — connector status monitoring
export type ConnectorStatus = {
  name: string;
  label: string;
  status: "healthy" | "configured" | "stub" | "error";
  detail: string;
};

export async function getConnectorStatuses(token: string): Promise<ConnectorStatus[]> {
  return apiFetch<ConnectorStatus[]>("/api/admin/connectors/status", { token });
}