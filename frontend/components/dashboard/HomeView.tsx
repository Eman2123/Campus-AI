"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { PixelBadge, PixelButton, PixelCard } from "@/components/pixel";
import { dayLabel, docBadge, startOfDay, toEvents } from "@/lib/dashboard-data";

import { useDashboard } from "./DashboardContext";

const DAY_MS = 86_400_000;

function greeting(now: Date) {
  const h = now.getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "coral" | "mint" | "sky" | "yellow" }) {
  const bg = { coral: "bg-accent-coral", mint: "bg-accent-mint", sky: "bg-accent-sky", yellow: "bg-brand-yellow" }[tone ?? "yellow"];
  return (
    <PixelCard className="flex flex-col gap-1 p-4">
      <span className={`self-start border-2 border-brand-black px-2 py-0.5 font-pixel text-xs font-semibold uppercase tracking-wide ${bg}`}>{label}</span>
      <span className="mt-1 truncate font-pixel text-2xl font-bold">{value}</span>
      {sub && <span className="truncate text-xs text-muted-onPaper">{sub}</span>}
    </PixelCard>
  );
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-pixel text-lg font-bold">{title}</h2>
        {action}
      </div>
      <PixelCard className="p-0">{children}</PixelCard>
    </section>
  );
}

export function HomeView() {
  const router = useRouter();
  const { user, sessions, docs, schedule, openSession, startNewChat } = useDashboard();
  const now = new Date();
  const today = startOfDay(now);
  const events = toEvents(schedule);
  const upcoming = events.filter((e) => e.at >= today);
  const thisWeek = upcoming.filter((e) => e.at.getTime() < today.getTime() + 7 * DAY_MS);
  const nextDeadline = upcoming.find((e) => e.kind === "deadline");
  const daysToDeadline = nextDeadline ? Math.round((startOfDay(nextDeadline.at).getTime() - today.getTime()) / DAY_MS) : null;
  const ready = docs.filter((d) => d.embedding_status === "ready").length;
  const firstName = (user.name || user.email.split("@")[0]).split(" ")[0];

  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <header className="border-b-pixel border-brand-black bg-brand-white px-5 py-3">
        <h1 className="font-pixel text-2xl font-bold">{greeting(now)}, {firstName}</h1>
        <p className="text-xs text-muted-onPaper">Here is where your study stands today.</p>
      </header>

      <div className="bg-graph mx-auto flex max-w-5xl flex-col gap-6 px-5 pb-16 pt-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Next deadline"
            tone="coral"
            value={nextDeadline ? (daysToDeadline === 0 ? "Today" : `${daysToDeadline} day${daysToDeadline === 1 ? "" : "s"}`) : "None"}
            sub={nextDeadline ? nextDeadline.title : "Nothing due"}
          />
          <Stat label="This week" tone="mint" value={String(thisWeek.length)} sub={thisWeek.length === 1 ? "item scheduled" : "items scheduled"} />
          <Stat label="Documents" tone="sky" value={String(docs.length)} sub={docs.length ? `${ready} ready to ask about` : "Upload a PDF to start"} />
          <Stat label="Chats" value={String(sessions.length)} sub={sessions.length ? "conversations so far" : "Start your first one"} />
        </div>

        <div className="flex flex-wrap gap-2">
          <PixelButton
            onClick={() => {
              startNewChat();
              router.push("/dashboard");
            }}
          >
            + New chat
          </PixelButton>
          <PixelButton variant="secondary" href="/dashboard/calendar">Open calendar</PixelButton>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Coming up" action={<Link href="/dashboard/calendar" className="text-xs underline">See all</Link>}>
            {upcoming.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-onPaper">Nothing coming up. Ask the planner in chat to build a study plan.</p>
            ) : (
              upcoming.slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 border-b-2 border-brand-black px-4 py-2.5 text-sm last:border-0">
                  <span className="min-w-0">
                    <span className="block truncate">{e.title}</span>
                    <small className="text-muted-onPaper">{dayLabel(e.at)}</small>
                  </span>
                  <PixelBadge tone={e.kind === "deadline" ? "coral" : "mint"}>{e.kind}</PixelBadge>
                </div>
              ))
            )}
          </Panel>

          <Panel title="Recent chats">
            {sessions.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-onPaper">No chats yet. Ask something about your notes to begin.</p>
            ) : (
              sessions.slice(0, 5).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    openSession(c.id);
                    router.push("/dashboard");
                  }}
                  className="pixel-focus flex w-full items-center justify-between gap-3 border-b-2 border-brand-black px-4 py-2.5 text-left text-sm last:border-0 hover:bg-brand-yellow-soft"
                >
                  <span className="truncate">{c.preview}</span>
                  <small className="shrink-0 text-muted-onPaper">{c.message_count} msg</small>
                </button>
              ))
            )}
          </Panel>
        </div>

        <Panel title="Your documents">
          {docs.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-onPaper">Nothing uploaded yet. Open a chat and attach a PDF, DOCX or TXT file.</p>
          ) : (
            docs.slice(0, 6).map((d) => {
              const b = docBadge(d.embedding_status);
              return (
                <div key={d.id} className="flex items-center justify-between gap-3 border-b-2 border-brand-black px-4 py-2.5 text-sm last:border-0">
                  <span className="min-w-0">
                    <span className="block truncate">{d.filename}</span>
                    {d.subject && <small className="text-muted-onPaper">{d.subject}</small>}
                  </span>
                  <PixelBadge tone={b.tone}>{b.label}</PixelBadge>
                </div>
              );
            })
          )}
        </Panel>
      </div>
    </main>
  );
}
