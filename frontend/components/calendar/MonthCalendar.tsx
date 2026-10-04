"use client";

import { useMemo, useState } from "react";

import type { ScheduleItem } from "@/lib/schedule";

type MonthCalendarProps = {
  items: ScheduleItem[];
  selectedDate: string | null; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
};

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MonthCalendar({ items, selectedDate, onSelectDate }: MonthCalendarProps) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const itemsByDate = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();
    for (const item of items) {
      const key = item.due_date.slice(0, 10);
      const existing = map.get(key);
      if (existing) existing.push(item);
      else map.set(key, [item]);
    }
    return map;
  }, [items]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = toDateKey(new Date());
  const monthLabel = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <div className="rounded-sm bg-paper p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="rounded-sm px-2 py-1 font-sans text-sm text-muted-onPaper transition-colors hover:text-ink"
          aria-label="Previous month"
        >
          ←
        </button>
        <p className="font-display text-lg text-ink">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="rounded-sm px-2 py-1 font-sans text-sm text-muted-onPaper transition-colors hover:text-ink"
          aria-label="Next month"
        >
          →
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 font-sans text-xs text-muted-onPaper">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="text-center">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((date, index) => {
          if (!date) return <div key={`empty-${index}`} />;

          const key = toDateKey(date);
          const dayItems = itemsByDate.get(key) ?? [];
          const isToday = key === todayKey;
          const isSelected = key === selectedDate;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDate(key)}
              className={`flex h-16 flex-col items-center rounded-sm border p-1 transition-colors sm:h-20 ${
                isSelected ? "border-ink bg-ink/5" : "border-transparent hover:border-ink/15"
              }`}
            >
              <span className={`font-sans text-xs ${isToday ? "font-semibold text-noteDark-coral" : "text-ink"}`}>
                {date.getDate()}
              </span>
              <div className="mt-1 flex flex-wrap justify-center gap-0.5">
                {dayItems.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.source === "deadline" ? "bg-note-coral" : "bg-note-periwinkle"
                    }`}
                  />
                ))}
                {dayItems.length > 3 && (
                  <span className="font-sans text-[9px] text-muted-onPaper">+{dayItems.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
