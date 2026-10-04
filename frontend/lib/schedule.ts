import { apiFetch, ApiError } from "@/lib/api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type ScheduleItem = {
  id: string;
  title: string;
  due_date: string;
  source: "deadline" | "study_session";
  created_at: string;
};

/** Backs the Day 32 calendar view. Read-only, same as the endpoint. */
export async function listSchedule(token: string): Promise<ScheduleItem[]> {
  return apiFetch<ScheduleItem[]>("/api/schedule", { token });
}

/**
 * GET /api/schedule/export.ics (Day 20) needs the Authorization header,
 * so a plain <a href="..."> download link won't work — browsers don't
 * attach custom headers to anchor navigation. Fetches the file as a
 * blob instead and triggers the download via a temporary object URL.
 */
export async function downloadScheduleIcs(token: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/schedule/export.ics`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let message = `Export failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") message = data.detail;
    } catch {
      // response body wasn't JSON — keep the generic message
    }
    throw new ApiError(message, res.status);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "campus-ai-schedule.ics";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
