"use client";

import { useMemo, useState } from "react";

import { PixelBadge, PixelButton, PixelCard } from "@/components/pixel";
import { friendlyError } from "@/lib/api";
import { digestMe, downloadIcs, remindMe } from "@/lib/dashboard-api";
import { dateKey, startOfDay, toEvents, type CalEvent } from "@/lib/dashboard-data";
import { cn } from "@/lib/cn";

import { useDashboard } from "./DashboardContext";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const key = dateKey;

function EventChip({ e }: { e: CalEvent }) {
  return (
    <span
      className={cn(
        "mt-1 block truncate border-2 border-brand-black px-1.5 py-0.5 text-[11px] font-semibold sm:text-xs",
        e.kind === "deadline" ? "bg-accent-coral" : "bg-accent-mint",
      )}
    >
      {e.title}
    </span>
  );
}

export function CalendarView() {
  const { token, schedule } = useDashboard();
  const TODAY = useMemo(() => new Date(), []);
  const EVENTS = useMemo(() => toEvents(schedule), [schedule]);
  const [busy, setBusy] = useState(false);
  const [cur, setCur] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [view, setView] = useState<"month" | "list">("month");
  const [note, setNote] = useState("");

  const y = cur.getFullYear();
  const m = cur.getMonth();
  const offset = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7;
  const byDate = (d: Date) => EVENTS.filter((e) => e.date === key(d));
  const upcoming = EVENTS.filter((e) => e.at >= startOfDay(TODAY)).slice(0, 6);

  async function run(job: () => Promise<string>) {
    setBusy(true);
    try {
      setNote(await job());
    } catch (err) {
      setNote(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b-pixel border-brand-black bg-brand-white px-5 py-3">
          <div className="flex items-center gap-2">
            <PixelButton size="sm" variant="secondary" aria-label="Previous month" onClick={() => setCur(new Date(y, m - 1, 1))}>‹</PixelButton>
            <h1 className="min-w-44 text-center font-pixel text-2xl font-bold">{MONTHS[m]} {y}</h1>
            <PixelButton size="sm" variant="secondary" aria-label="Next month" onClick={() => setCur(new Date(y, m + 1, 1))}>›</PixelButton>
            <PixelButton size="sm" onClick={() => setCur(new Date(TODAY.getFullYear(), TODAY.getMonth(), 1))}>Today</PixelButton>
          </div>
          <div className="flex border-pixel border-brand-black">
            {(["month", "list"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn("px-3 py-1.5 font-pixel text-sm font-semibold capitalize", view === v ? "bg-brand-black text-brand-white" : "bg-brand-white")}
              >
                {v}
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {view === "month" ? (
            <>
              <div className="grid grid-cols-7 border-pixel border-brand-black bg-brand-white shadow-pixel">
                {DAYS.map((d) => (
                  <div key={d} className="bg-brand-black px-2 py-1.5 font-pixel text-sm font-semibold text-brand-white">{d}</div>
                ))}
                {Array.from({ length: cells }, (_, j) => {
                  const d = new Date(y, m, 1 - offset + j);
                  const outside = d.getMonth() !== m;
                  const today = key(d) === key(TODAY);
                  return (
                    <div key={j} className={cn("min-h-16 min-w-0 border border-brand-black p-1.5 text-xs sm:min-h-24 sm:text-sm", outside && "opacity-40", today && "bg-brand-yellow-soft")}>
                      <span className={cn("inline-block border-2 border-transparent px-1.5", today && "border-brand-black bg-brand-yellow")}>{d.getDate()}</span>
                      {byDate(d).map((e) => <EventChip key={e.id} e={e} />)}
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex gap-5 text-sm">
                <span className="flex items-center gap-2"><i className="h-4 w-4 border-2 border-brand-black bg-accent-mint" />Study session</span>
                <span className="flex items-center gap-2"><i className="h-4 w-4 border-2 border-brand-black bg-accent-coral" />Deadline</span>
                <span className="flex items-center gap-2"><i className="h-4 w-4 border-2 border-brand-black bg-brand-yellow" />Today</span>
              </div>
            </>
          ) : (
            <PixelCard className="p-0">
              {EVENTS.length === 0 && <p className="px-4 py-3 text-sm text-muted-onPaper">Nothing scheduled yet. Ask the planner in chat to build a plan.</p>}
              {EVENTS.map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b-2 border-brand-black px-4 py-3 last:border-0">
                  <span className="flex items-center gap-3"><PixelBadge tone={e.kind === "deadline" ? "coral" : "mint"}>{e.kind}</PixelBadge>{e.title}</span>
                  <small>{e.date}</small>
                </div>
              ))}
            </PixelCard>
          )}
        </div>
      </main>

      <aside className="hidden w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l-pixel border-brand-black bg-brand-yellow-soft p-4 lg:flex">
        <p className="font-pixel text-lg font-bold">Coming up</p>
        <PixelCard className="p-0">
          {upcoming.length === 0 && <p className="px-3 py-2.5 text-sm text-muted-onPaper">Nothing coming up.</p>}
          {upcoming.map((e) => (
            <div key={e.id} className="flex items-center justify-between border-b-2 border-brand-black px-3 py-2.5 text-sm last:border-0">
              <span>{e.title}<br /><small className="text-muted-onPaper">{e.date}</small></span>
              <PixelBadge tone={e.kind === "deadline" ? "coral" : "mint"}>{e.kind}</PixelBadge>
            </div>
          ))}
        </PixelCard>
        <p className="mt-2 font-pixel text-lg font-bold">Get notified</p>
        <PixelButton variant="dark" size="sm" disabled={busy} onClick={() => run(async () => { const r = await remindMe(token); return r.reminders_sent ? `Sent ${r.reminders_sent} reminder email(s).` : "No deadlines in the reminder window right now."; })}>Remind me about deadlines</PixelButton>
        <PixelButton variant="secondary" size="sm" disabled={busy} onClick={() => run(async () => { const r = await digestMe(token); return r.digests_sent ? "Digest sent to your email." : "Nothing to put in a digest right now."; })}>Email me this week&apos;s digest</PixelButton>
        <PixelButton variant="secondary" size="sm" disabled={busy} onClick={() => run(async () => { await downloadIcs(token); return "Downloaded campus-ai-schedule.ics"; })}>Export as .ics</PixelButton>
        {note && <p className="text-xs text-muted-onPaper" role="status">{note}</p>}
      </aside>
    </>
  );
}
