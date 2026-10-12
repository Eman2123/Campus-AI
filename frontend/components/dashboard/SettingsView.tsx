"use client";

import { useEffect, useState } from "react";

import { PixelButton, PixelCard } from "@/components/pixel";
import { friendlyError } from "@/lib/api";
import { deleteAccount, deleteDocument, digestMe, downloadIcs, remindMe } from "@/lib/dashboard-api";
import { getRememberDefault, setRememberDefault } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { getThemePref, setThemePref, type ThemePref } from "@/lib/theme";

import { useDashboard } from "./DashboardContext";
import { openTour } from "./OnboardingTour";

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
  const { user, token, signOut, docs, refreshDocs, clearHistory, renameUser, prefs, setPref } = useDashboard();
  const [theme, setTheme] = useState<ThemePref>("Light");
  useEffect(() => setTheme(getThemePref()), []);
  const [name, setName] = useState(user.name ?? "");
  const [remember, setRemember] = useState(true);
  useEffect(() => setRemember(getRememberDefault()), []);
  const [note, setNote] = useState("");
  async function run(job: () => Promise<string>) {
    try {
      setNote(await job());
    } catch (err) {
      setNote(friendlyError(err));
    }
  }
  const nameChanged = name.trim() !== (user.name ?? "") && name.trim().length > 0;
  const deleteAll = () =>
    run(async () => {
      if (docs.length === 0) return "You have no documents to delete.";
      if (!window.confirm(`Delete all ${docs.length} document(s)? This cannot be undone.`)) return "";
      for (const d of docs) await deleteDocument(token, d.id);
      await refreshDocs();
      return "All documents deleted.";
    });
  const clearChats = () =>
    run(async () => {
      if (!window.confirm("Delete every past conversation? This cannot be undone.")) return "";
      await clearHistory();
      return "Chat history cleared.";
    });
  const removeAccount = () =>
    run(async () => {
      const typed = window.prompt(`This permanently deletes your account, chats, documents and schedule.\n\nType your email (${user.email}) to confirm:`);
      if (typed === null) return "";
      await deleteAccount(token, typed.trim());
      signOut();
      return "Account deleted.";
    });

  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-y-auto">
      <header className="border-b-pixel border-brand-black bg-brand-white px-5 py-3">
        <h1 className="font-pixel text-2xl font-bold">Settings</h1>
      </header>
      <div className="mx-auto max-w-3xl px-5 pb-16">
        <Section title="Profile">
          <Row title="Name" desc="Shown in the sidebar and your greeting.">
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (nameChanged) void run(async () => { await renameUser(name.trim()); return "Name updated."; });
              }}
            >
              <input
                aria-label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="Your name"
                className="w-44 border-pixel border-brand-black bg-brand-white px-2 py-1.5 text-sm"
              />
              <PixelButton size="sm" type="submit" variant="secondary" disabled={!nameChanged}>Save</PixelButton>
            </form>
          </Row>
          <Row title="Email" desc="Used to sign in and for reminders. Can't be changed here."><span className="text-sm">{user.email}</span></Row>
          <Row title="Password" desc="We'll email you a link to set a new one."><PixelButton size="sm" variant="secondary" href="/forgot-password">Send reset link</PixelButton></Row>
        </Section>

        <Section title="Appearance">
          <Row title="Theme" desc="Applies to the dashboard and admin pages on this device."><Seg options={["Light", "Dark", "System"]} value={theme} onChange={(v) => { setTheme(v as ThemePref); setThemePref(v as ThemePref); }} /></Row>
          <Row title="Reduce motion" desc="Turns off animated effects across the app."><Switch on={prefs.reduce_motion} onChange={() => void setPref({ reduce_motion: !prefs.reduce_motion })} label="Reduce motion" /></Row>
        </Section>

        <Section title="Notifications">
          <Row title="Deadline reminders" desc="Email me before something is due."><Switch on={prefs.reminders_enabled} onChange={() => void setPref({ reminders_enabled: !prefs.reminders_enabled })} label="Deadline reminders" /></Row>
          <Row title="Remind me before"><Select label="Remind me before" options={["24 hours", "48 hours", "72 hours"]} value={`${prefs.remind_hours} hours`} onChange={(v) => void setPref({ remind_hours: parseInt(v, 10) })} /></Row>
          <Row title="Daily digest" desc="One morning email with what's coming up."><Switch on={prefs.digest_enabled} onChange={() => void setPref({ digest_enabled: !prefs.digest_enabled })} label="Daily digest" /></Row>
          <Row title="Digest looks ahead"><Select label="Digest looks ahead" options={["3 days", "7 days", "14 days"]} value={`${prefs.digest_days} days`} onChange={(v) => void setPref({ digest_days: parseInt(v, 10) })} /></Row>
          <Row title="Send a reminder now" desc="Emails you your upcoming deadlines right away."><PixelButton size="sm" variant="secondary" onClick={() => run(async () => { const r = await remindMe(token); return r.reminders_sent ? `Sent ${r.reminders_sent} reminder email(s).` : "No deadlines in the reminder window right now."; })}>Send reminder</PixelButton></Row>
          <Row title="Send today's digest now" desc="Emails you what is coming up."><PixelButton size="sm" variant="secondary" onClick={() => run(async () => { const r = await digestMe(token); return r.digests_sent ? "Digest sent to your email." : "Nothing to put in a digest right now."; })}>Send digest</PixelButton></Row>
        </Section>

        <Section title="Calendar">
          <Row title="Week starts on"><Seg options={["Monday", "Sunday"]} value={prefs.week_starts_on} onChange={(v) => void setPref({ week_starts_on: v as "Monday" | "Sunday" })} /></Row>
          <Row title="Export your schedule" desc="A .ics file for Google Calendar, Apple Calendar or Outlook."><PixelButton size="sm" variant="secondary" onClick={() => run(async () => { await downloadIcs(token); return "Downloaded campus-ai-schedule.ics"; })}>Export .ics</PixelButton></Row>
        </Section>

        <Section title="Documents">
          <Row title="File uploads into Google Drive" desc={'Sorted by subject into a "Campus AI" folder. Applies to new uploads.'}><Switch on={prefs.drive_upload} onChange={() => void setPref({ drive_upload: !prefs.drive_upload })} label="File uploads into Google Drive" /></Row>
          <Row title="Delete all documents" desc="Removes your uploads and what the AI learned from them."><PixelButton size="sm" variant="secondary" onClick={deleteAll}>Delete documents</PixelButton></Row>
        </Section>

        <Section title="Chat and voice">
          <Row title="Typewriter replies" desc="Show answers as they arrive instead of all at once."><Switch on={prefs.typewriter} onChange={() => void setPref({ typewriter: !prefs.typewriter })} label="Typewriter replies" /></Row>
          <Row title="Voice input" desc="Show the microphone button in the chat box."><Switch on={prefs.voice_input} onChange={() => void setPref({ voice_input: !prefs.voice_input })} label="Voice input" /></Row>
          <Row title="Clear chat history" desc="Deletes every past conversation."><PixelButton size="sm" variant="secondary" onClick={clearChats}>Clear history</PixelButton></Row>
        </Section>

        <Section title="Help">
          <Row title="Product tour" desc="A quick walkthrough of every part of Campus AI."><PixelButton size="sm" variant="secondary" onClick={openTour}>Show the tour</PixelButton></Row>
        </Section>

        <Section title="Account">
          <Row title="Keep me signed in for 30 days" desc="Default for the sign-in checkbox on this device."><Switch on={remember} onChange={() => { setRemember(!remember); setRememberDefault(!remember); }} label="Keep me signed in" /></Row>
          <Row title="Sign out on this device"><PixelButton size="sm" variant="secondary" onClick={signOut}>Sign out</PixelButton></Row>
          <Row title="Delete account" desc="Permanently removes your account, chats, documents and schedule." danger>
            <PixelButton size="sm" className="bg-accent-coral" onClick={removeAccount}>Delete account</PixelButton>
          </Row>
        </Section>

        {note && <p className="mt-4 text-sm" role="status">{note}</p>}
      </div>
    </main>
  );
}
