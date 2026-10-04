"use client";

import type { ScheduleItem } from "@/lib/schedule";

type ScheduleListPanelProps = {
  items: ScheduleItem[];
  selectedDate: string | null; // YYYY-MM-DD
};

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function formatLongDate(dateKey: string): string {
  // Parsing "YYYY-MM-DD" directly would read as UTC midnight and can
  // display as the previous day in a negative-UTC-offset timezone —
  // build the Date from local year/month/day parts instead.
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function ScheduleListPanel({ items, selectedDate }: ScheduleListPanelProps) {
  const filtered = selectedDate
    ? items.filter((item) => item.due_date.slice(0, 10) === selectedDate)
    : items.filter((item) => new Date(item.due_date) >= new Date(new Date().toDateString())).slice(0, 8);

  const heading = selectedDate ? formatLongDate(selectedDate) : "Upcoming";

  return (
    <div className="rounded-sm border border-paper/10 bg-ink-soft p-4 sm:p-6">
      <p className="font-display text-lg text-paper">{heading}</p>
      <ul className="mt-4 space-y-3">
        {filtered.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-3 font-sans text-sm">
            <span className="flex min-w-0 items-center gap-2 text-paper">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  item.source === "deadline" ? "bg-note-coral" : "bg-note-periwinkle"
                }`}
              />
              <span className="truncate">{item.title}</span>
            </span>
            <span className="shrink-0 font-sans text-xs text-muted-onDark">{formatShortDate(item.due_date)}</span>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="font-sans text-sm text-muted-onDark">
            {selectedDate ? "Nothing due this day." : "Nothing upcoming — ask the Planner to build you a study plan."}
          </li>
        )}
      </ul>
    </div>
  );
}
