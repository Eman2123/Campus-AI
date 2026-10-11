"use client";

import { useEffect, useState } from "react";

import { PixelBadge, PixelButton, PixelCard } from "@/components/pixel";
import { friendlyError } from "@/lib/api";
import { deleteDocument, digestMe, downloadIcs, remindMe } from "@/lib/dashboard-api";
import { cn } from "@/lib/cn";
import { getThemePref, setThemePref, type ThemePref } from "@/lib/theme";

import { useDashboard } from "./DashboardContext";

function Switch({ on, onChange, label }: { on: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={cn("pixel-focus relative h-7 w-14 shrink-0 border-pixel border-brand-black", on ? "bg-accent-mint" : "bg-brand-white")}
    >
      <i className={cn("absolute top-0.5 h-5 w-5 bg-brand-black", on ? "left-7" : "left-0.5")} />
    </button>
  );
}

function Seg({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex border-pixel border-brand-black">
      {options.map((o) => (
        <button key={o} type="button" onClick={() => onChange(o)} className={cn("px-3 py-1.5 font-pixel text-sm font-semibold", value === o ? "bg-brand-black text-brand-white" : "bg-brand-white")}>
          {o}
        </button>
      ))}
    </div>
  );
}

function Select({ options, value, onChange, label }: { options: string[]; value: string; onChange: (v: string) => void; label: string }) {
  return (
    <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="border-pixel border-brand-black bg-brand-white px-2 py-1.5 text-sm">
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

function Row({ title, desc, danger, children }: { title: string; desc?: string; danger?: boolean; children?: React.ReactNode }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4 border-b-2 border-brand-black px-4 py-3 last:border-0", danger && "bg-accent-coral/20")}>
      <div>
        <p className="font-semibold">{title}</p>
        {desc && <p className="text-xs text-muted-onPaper">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 font-pixel text-lg font-bold">{title}</h2>
      <PixelCard className="p-0">{children}</PixelCard>
    </section>
  );
}

export function SettingsView() {
  const { user, token, signOut, docs, refreshDocs } = useDashboard();
  const name = user.name ?? "";
  const [theme, setTheme] = useState<ThemePref>("Light");
  useEffect(() => setTheme(getThemePref()), []);
  const [week, setWeek] = useState("Monday");
  const [remind, setRemind] = useState("48 hours");
  const [ahead, setAhead] = useState("7 days");
  const [on, setOn] = useState<Record<string, boolean>>({
    motion: false, reminders: true, digest: true, drive: true, typewriter: true, voice: true, remember: true,
  });
  const [note, setNote] = useState("");
  const toggle = (k: string) => setOn((s) => ({ ...s, [k]: !s[k] }));
  // Switches, selects, theme and week start are not stored by the backend yet; they only live in this page.
  const demo = (what: string) => () => setNote(`${what} is not available yet: the backend has no endpoint for it.`);
  async function run(job: () => Promise<string>) {
    try {
      setNote(await job());
    } catch (err) {
      setNote(friendlyError(err));
    }
  }
  const deleteAll = () =>
    run(async () => {
      if (docs.length === 0) return "You have no documents to delete.";
      if (!window.confirm(`Delete all ${docs.length} document(s)? This cannot be undone.`)) return "";
      for (const d of docs) await deleteDocument(token, d.id);
      await refreshDocs();
      return "All documents deleted.";
    });

  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <header className="border-b-pixel border-brand-black bg-brand-white px-5 py-3">
        <h1 className="font-pixel text-2xl font-bold">Settings</h1>
      </header>
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <Section title="Profile">
          <Row title="Name" desc="Changing your name isn't available yet."><span className="text-sm">{name || "Not set"}</span></Row>
          <Row title="Email" desc="Used to sign in and for reminders. Can't be changed here."><span className="text-sm">{user.email}</span></Row>
          <Row title="Password" desc="We'll email you a link to set a new one."><PixelButton size="sm" variant="secondary" href="/forgot-password">Send reset link</PixelButton></Row>
        </Section>

        <Section title="Appearance">
          <Row title="Theme" desc="Applies to the dashboard and admin pages on this device."><Seg options={["Light", "Dark", "System"]} value={theme} onChange={(v) => { setTheme(v as ThemePref); setThemePref(v as ThemePref); }} /></Row>
          <Row title="Reduce motion" desc="Turns off animated effects across the app."><Switch on={on.motion} onChange={() => toggle("motion")} label="Reduce motion" /></Row>
        </Section>

        <Section title="Notifications">
          <Row title="Deadline reminders" desc="Email me before something is due."><Switch on={on.reminders} onChange={() => toggle("reminders")} label="Deadline reminders" /></Row>
          <Row title="Remind me before"><Select label="Remind me before" options={["24 hours", "48 hours", "72 hours"]} value={remind} onChange={setRemind} /></Row>
          <Row title="Daily digest" desc="One morning email with what's coming up."><Switch on={on.digest} onChange={() => toggle("digest")} label="Daily digest" /></Row>
          <Row title="Digest looks ahead"><Select label="Digest looks ahead" options={["3 days", "7 days", "14 days"]} value={ahead} onChange={setAhead} /></Row>
          <Row title="Send a reminder now" desc="Emails you your upcoming deadlines right away."><PixelButton size="sm" variant="secondary" onClick={() => run(async () => { const r = await remindMe(token); return r.reminders_sent ? `Sent ${r.reminders_sent} reminder email(s).` : "No deadlines in the reminder window right now."; })}>Send reminder</PixelButton></Row>
          <Row title="Send today's digest now" desc="Emails you what is coming up."><PixelButton size="sm" variant="secondary" onClick={() => run(async () => { const r = await digestMe(token); return r.digests_sent ? "Digest sent to your email." : "Nothing to put in a digest right now."; })}>Send digest</PixelButton></Row>
        </Section>

        <Section title="Calendar">
          <Row title="Week starts on"><Seg options={["Monday", "Sunday"]} value={week} onChange={setWeek} /></Row>
          <Row title="Export your schedule" desc="A .ics file for Google Calendar, Apple Calendar or Outlook."><PixelButton size="sm" variant="secondary" onClick={() => run(async () => { await downloadIcs(token); return "Downloaded campus-ai-schedule.ics"; })}>Export .ics</PixelButton></Row>
        </Section>

        <Section title="Documents">
          <Row title="File uploads into Google Drive" desc={'Sorted by subject into a "Campus AI" folder.'}><Switch on={on.drive} onChange={() => toggle("drive")} label="File uploads into Google Drive" /></Row>
          <Row title="Delete all documents" desc="Removes your uploads and what the AI learned from them."><PixelButton size="sm" variant="secondary" onClick={deleteAll}>Delete documents</PixelButton></Row>
        </Section>

        <Section title="Chat and voice">
          <Row title="Typewriter replies" desc="Show answers as they arrive instead of all at once."><Switch on={on.typewriter} onChange={() => toggle("typewriter")} label="Typewriter replies" /></Row>
          <Row title="Voice input" desc="Show the microphone button in the chat box."><Switch on={on.voice} onChange={() => toggle("voice")} label="Voice input" /></Row>
          <Row title="Clear chat history" desc="Deletes every past conversation."><PixelButton size="sm" variant="secondary" onClick={demo("Clearing history")}>Clear history</PixelButton></Row>
        </Section>

        <Section title="Account">
          <Row title="Keep me signed in for 30 days" desc="Applies the next time you sign in."><Switch on={on.remember} onChange={() => toggle("remember")} label="Keep me signed in" /></Row>
          <Row title="Sign in with Google"><PixelBadge tone="mint">Connected</PixelBadge></Row>
          <Row title="Sign out on this device"><PixelButton size="sm" variant="secondary" onClick={signOut}>Sign out</PixelButton></Row>
          <Row title="Delete account" desc="Permanently removes your account, chats, documents and schedule." danger>
            <PixelButton size="sm" className="bg-accent-coral" onClick={demo("Deleting your account")}>Delete account</PixelButton>
          </Row>
        </Section>

        {note && <p className="mt-4 text-sm" role="status">{note}</p>}
      </div>
    </main>
  );
}
