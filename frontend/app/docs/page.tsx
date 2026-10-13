import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { PixelButton } from "@/components/pixel";
import { Logo } from "@/components/ui/Logo";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Product guide",
  description: "What Campus AI is, who it is for, and how to use every part of it: agents, notes, planner, voice, settings and privacy.",
  alternates: { canonical: "/docs" },
};

const NAV = [
  { id: "overview", label: "What Campus AI is" },
  { id: "getting-started", label: "Getting started" },
  { id: "agents", label: "The study agents" },
  { id: "notes", label: "Your notes" },
  { id: "planner", label: "Planner and reminders" },
  { id: "voice", label: "Voice" },
  { id: "dashboard", label: "The dashboard" },
  { id: "privacy", label: "Account and privacy" },
  { id: "faq", label: "FAQ" },
] as const;

const AGENTS = [
  ["Quiz", "Practise with questions on a topic or on your own notes."],
  ["Flashcards", "Turn material into question and answer cards for revision."],
  ["Notes", "Turn material into short, organised summary notes."],
  ["Homework", "Work through a problem step by step and understand the method."],
  ["Research", "Get a clear explanation of a concept, with an example or analogy."],
  ["Document Q&A", "Answer questions using what is in your uploaded files."],
  ["Planner", "Turn deadlines and exams into a schedule and reminders."],
  ["Feedback", "Check your answer: correct, partly correct or wrong, and why."],
] as const;

const FAQ = [
  ["Can I trust the answers?", "Campus AI can make mistakes, especially with exact dates, numbers and quotes. Check anything important against your syllabus, your lecturer or the original notes. The “Why?” link under the chat box explains this."],
  ["Why did my upload not work?", "Only PDF, DOCX, TXT and Markdown files up to 20 MB are accepted, and the file must really be that type. Export it again and re-upload."],
  ["The answer ignores my notes. Why?", "Check that the document shows Ready in the Documents panel, then name the subject or the file in your question."],
  ["The microphone does not work.", "Allow microphone access in your browser's site settings and try again. If it stays blocked, type your question instead."],
  ["I did not get a reminder email.", "Check that reminders are on in Settings, then use “Send a reminder now” to test. Look in your spam folder too."],
  ["I forgot my password.", "Use “Forgot password” on the sign-in page and open the emailed link. Links expire after 30 minutes and work once."],
  ["Can I use my schedule in my phone calendar?", "Yes. Export the .ics file from Settings and open it in Google Calendar, Apple Calendar or Outlook."],
  ["How do I delete everything?", "Settings, then Account, then Delete account. You will be asked to type your email to confirm."],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-t-pixel border-brand-black pt-8 first:border-t-0 first:pt-0">
      <h2 className="font-pixel text-3xl font-bold leading-tight">{title}</h2>
      <div className="mt-4 space-y-4 text-base leading-relaxed">{children}</div>
    </section>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-pixel border-brand-black bg-brand-yellow-soft p-4 shadow-pixel">
      <h3 className="font-pixel text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed">{children}</p>
    </div>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-brand-white text-brand-black">
      <header className="sticky top-0 z-40 border-b-pixel border-brand-black bg-brand-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
          <Logo height={32} />
          <div className="flex items-center gap-2">
            <PixelButton href="/signin" variant="secondary" size="sm">
              Sign in
            </PixelButton>
            <PixelButton href="/signup" size="sm">
              Create account
            </PixelButton>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <details className="border-pixel border-brand-black bg-brand-yellow-soft p-3 lg:hidden">
            <summary className="cursor-pointer font-pixel text-sm font-semibold">On this page</summary>
            <ul className="mt-3 space-y-2 text-sm">
              {NAV.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} className="pixel-focus hover:underline">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          <nav aria-label="On this page" className="hidden lg:block">
            <p className="font-pixel text-sm font-semibold uppercase tracking-wide text-muted-onPaper">Product guide</p>
            <ul className="mt-3 space-y-1">
              {NAV.map((n) => (
                <li key={n.id}>
                  <a href={`#${n.id}`} className="pixel-focus block border-l-4 border-transparent px-3 py-1.5 text-sm font-medium hover:border-brand-black hover:bg-brand-yellow-soft">
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 space-y-10">
          <div>
            <p className="font-pixel text-sm font-semibold text-muted-onPaper">Welcome</p>
            <h1 className="mt-1 font-pixel text-5xl font-bold leading-tight">{SITE_NAME} product guide</h1>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-onPaper">
              Everything a new student needs: what Campus AI is for, how to start, and what each part does.
            </p>
          </div>

          <Section id="overview" title="What Campus AI is">
            <p>
              Campus AI is an AI study assistant built for university students. You chat with it in plain language, upload your own notes and slides, and it answers from your material, plans your study time and reminds you before deadlines.
            </p>
            <p>
              It is made for students who juggle several courses, notes in many formats, and exams that arrive faster than expected. Instead of switching between a chat tool, a calendar and a folder of PDFs, you get one place that knows your subjects.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card title="Ask anything">Explanations, quizzes, flashcards and summaries, by text or voice.</Card>
              <Card title="Use your own notes">Upload files and get answers grounded in them.</Card>
              <Card title="Stay on schedule">A study planner, calendar export, reminders and a daily digest.</Card>
              <Card title="Stay in control">Delete your documents, chats or whole account at any time.</Card>
            </div>
          </Section>

          <Section id="getting-started" title="Getting started">
            <p>You can be chatting in about two minutes.</p>
            <ol className="ml-5 list-decimal space-y-2">
              <li>
                <b>Create an account.</b> Sign up with your email and a password, or continue with Google.
              </li>
              <li>
                <b>Take the short tour.</b> The first time you sign in, a nine-slide tour shows each feature. You can reopen it from Settings.
              </li>
              <li>
                <b>Upload a note.</b> Use the paperclip in the chat box or the Documents panel. PDF, DOCX, TXT and Markdown are supported.
              </li>
              <li>
                <b>Ask something.</b> Pick a starter chip (Quiz, Flashcards, Notes, Homework, Research or Planner) or just type.
              </li>
            </ol>
          </Section>

          <Section id="agents" title="The study agents">
            <p>
              Behind the chat box is a team of specialist agents. A supervisor reads each message and hands it to the best one, so you never have to choose. After a reply, the chat header shows which agent answered.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {AGENTS.map(([name, text]) => (
                <Card key={name} title={name}>
                  {text}
                </Card>
              ))}
            </div>
            <p>
              Wording helps: “quiz me on chapter 3” or “make flashcards from my notes” go straight to the right agent. Every reply has <b>Copy</b> and <b>Read aloud</b> buttons.
            </p>
          </Section>

          <Section id="notes" title="Your notes">
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <b>Supported files:</b> PDF, DOCX, TXT and Markdown, up to 20 MB each.
              </li>
              <li>
                <b>After upload:</b> the file is read, split into passages and indexed. A badge shows <b>Ready</b> when it can be used.
              </li>
              <li>
                <b>File Organizer:</b> each upload is tagged with its subject, such as Biology or Calculus, which helps the planner link a deadline to the right notes.
              </li>
              <li>
                <b>Asking:</b> try “Summarize my latest document” or “Make flashcards from my notes”.
              </li>
              <li>
                <b>Removing:</b> delete one file with its cross, or all of them in Settings. Deleting a file also removes what the AI learned from it.
              </li>
            </ul>
          </Section>

          <Section id="planner" title="Planner, calendar and reminders">
            <p>
              Say what is coming up in plain words, such as “I have a chemistry exam on Friday”, and the Planner agent adds it to your schedule. It can also propose study sessions and link a deadline to your notes on the same subject.
            </p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <b>Calendar:</b> deadlines and study sessions by day. The next deadline also shows at the top of the chat.
              </li>
              <li>
                <b>Export:</b> in Settings choose Export .ics to open your schedule in Google Calendar, Apple Calendar or Outlook.
              </li>
              <li>
                <b>Deadline reminders:</b> an email before something is due. Choose how many hours ahead, from 1 to 168, or turn it off.
              </li>
              <li>
                <b>Daily digest:</b> one morning email with what is coming up. Choose how many days ahead, from 1 to 30, or turn it off.
              </li>
              <li>
                <b>Try it now:</b> Settings has buttons to send yourself a reminder or today&rsquo;s digest immediately.
              </li>
            </ul>
          </Section>

          <Section id="voice" title="Voice">
            <p>There are two ways to use the microphone in the chat box. Your browser asks for permission the first time.</p>
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <b>Dictate:</b> you speak and your words appear in the text box. Edit them, then send.
              </li>
              <li>
                <b>Talk:</b> you speak and the agents answer. The reply is read aloud.
              </li>
              <li>
                <b>Read aloud:</b> press it under any reply to listen. Press again to stop.
              </li>
            </ul>
            <p>Voice input can be hidden in Settings under Chat and voice.</p>
          </Section>

          <Section id="dashboard" title="The dashboard">
            <ul className="ml-5 list-disc space-y-2">
              <li>
                <b>Home:</b> a quick overview of your day.
              </li>
              <li>
                <b>Chat:</b> the main workspace, with past chats in the sidebar and your documents and plan in the side panel.
              </li>
              <li>
                <b>Calendar:</b> deadlines and study sessions by date.
              </li>
              <li>
                <b>Settings:</b> profile, appearance, notifications, documents, voice, help and account.
              </li>
            </ul>
          </Section>

          <Section id="privacy" title="Account and privacy">
            <p>
              We keep your account details, uploaded documents and the text read from them, your conversations and your schedule. Passwords are stored as a one-way hash. We do not sell your data and we do not show ads.
            </p>
            <p>
              A few services help run features: an AI model provider (answers), AssemblyAI (voice transcription), ElevenLabs (spoken replies), Resend (emails) and Google (only if you choose Google sign-in). In Settings you can delete one document, all documents, all conversations or your whole account.
            </p>
            <p>
              Read the full <Link href="/privacy" className="font-semibold underline underline-offset-2">Privacy policy</Link> and <Link href="/terms" className="font-semibold underline underline-offset-2">Terms</Link>.
            </p>
          </Section>

          <Section id="faq" title="FAQ and help">
            <dl className="space-y-4">
              {FAQ.map(([q, a]) => (
                <div key={q}>
                  <dt className="font-bold">{q}</dt>
                  <dd className="mt-1 text-muted-onPaper">{a}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <div className="border-pixel border-brand-black bg-brand-yellow p-6 shadow-pixel">
            <h2 className="font-pixel text-2xl font-bold">Ready to start?</h2>
            <p className="mt-1">Upload your first note and ask a question.</p>
            <div className="mt-4">
              <PixelButton href="/signup" variant="secondary">
                Create account
              </PixelButton>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
