"use client";

import { useEffect, useState } from "react";

import { MonthCalendar } from "@/components/calendar/MonthCalendar";
import { ScheduleListPanel } from "@/components/calendar/ScheduleListPanel";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ApiError } from "@/lib/api";
import { listSchedule, type ScheduleItem } from "@/lib/schedule";
import { useAuthGuard } from "@/lib/useAuthGuard";

export default function CalendarPage() {
  const { user, token, loading, signOut } = useAuthGuard();
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    listSchedule(token)
      .then(setItems)
      .catch((err) => setFetchError(err instanceof ApiError ? err.message : "Couldn't load your schedule."));
  }, [token]);

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-ink">
        <p className="font-sans text-sm text-muted-onDark">Loading…</p>
      </main>
    );
  }

  if (!user || !token) return null; // useAuthGuard is already redirecting to /signin

  return (
    <main className="flex h-screen flex-col bg-ink">
      <DashboardHeader user={user} token={token} onSignOut={signOut} />

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-6 lg:grid-cols-[3fr_2fr]">
          <MonthCalendar items={items} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          <ScheduleListPanel items={items} selectedDate={selectedDate} />
        </div>

        {fetchError && (
          <p className="mx-auto mt-4 max-w-4xl text-center font-sans text-sm text-note-coral">{fetchError}</p>
        )}

        {selectedDate && (
          <div className="mx-auto mt-4 max-w-4xl text-center">
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="font-sans text-xs text-muted-onDark underline"
            >
              Clear selection
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
