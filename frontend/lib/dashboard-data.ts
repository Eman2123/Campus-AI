import type { EmbeddingStatus, ScheduleItem } from "@/lib/dashboard-api";

export const SUGGESTIONS = ["What's due this week?", "Make flashcards from my notes", "Summarize my latest document"];

/** Starter text dropped into the message box; the backend's supervisor picks the agent from the wording. */
export const STARTERS: Record<string, string> = {
  Quiz: "Quiz me on ",
  Flashcards: "Make flashcards from ",
  Notes: "Summarize ",
  Homework: "Help me solve ",
  Research: "Explain ",
  Planner: "Plan my study schedule for ",
};

export type EventKind = "study" | "deadline";
export type CalEvent = { id: string; date: string; title: string; kind: EventKind; at: Date };

export const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function toEvents(items: ScheduleItem[]): CalEvent[] {
  return items
    .map((s) => {
      const at = new Date(s.due_date);
      return { id: s.id, date: dateKey(at), title: s.title, kind: (s.source === "deadline" ? "deadline" : "study") as EventKind, at };
    })
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function docBadge(status: EmbeddingStatus): { label: string; tone: "mint" | "sky" | "coral" } {
  if (status === "ready") return { label: "Ready", tone: "mint" };
  if (status === "failed") return { label: "Failed", tone: "coral" };
  return { label: "Reading", tone: "sky" };
}

export function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
