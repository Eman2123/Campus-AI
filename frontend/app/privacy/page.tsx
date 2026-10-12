import type { Metadata } from "next";

import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Campus AI collects, why, who helps us run it, and how you can delete your data.",
  alternates: { canonical: "/privacy" },
};

// NOTE: written to match what the app actually does today (see backend/app).
// It is a plain-language starting point, not legal advice: have it reviewed
// before launch, and update it whenever a provider or feature changes.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="2026-10-12">
      <p>
        Campus AI is a study assistant. This page explains what we collect when you use it, what we do with it, and the
        control you have. We keep it short on purpose.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account details:</strong> your email address, an optional name, and your password. Passwords are stored as a
          one-way hash, never in readable form. If you use Google sign-in we receive your verified email and name from Google.
        </li>
        <li>
          <strong>Your study material:</strong> the documents you upload (PDF, DOCX, TXT, Markdown), the text we extract from
          them, and the numeric &ldquo;embeddings&rdquo; we compute so your questions can be matched to your notes.
        </li>
        <li>
          <strong>Your conversations:</strong> the messages you send, the replies, and which study agent answered.
        </li>
        <li>
          <strong>Your schedule:</strong> deadlines and study sessions you or the planner create.
        </li>
        <li>
          <strong>Voice input:</strong> if you use the microphone, the recording is sent for transcription and the resulting
          text is used as your message.
        </li>
        <li>
          <strong>Basic usage data:</strong> anonymous page-view counts, and technical logs (such as request times and errors)
          that help us keep the service running.
        </li>
      </ul>

      <h2>What we use it for</h2>
      <p>
        Only to run Campus AI for you: signing you in, answering from your notes, building your study plan, sending the reset
        and reminder emails you ask for, and fixing problems. We do not sell your data and we do not show ads.
      </p>

      <h2>Who helps us run it</h2>
      <p>These services process data on our behalf, only as needed for the feature they power:</p>
      <ul>
        <li>An AI model provider (AIML API) receives your question and the relevant excerpts of your notes to write answers and compute embeddings.</li>
        <li>AssemblyAI transcribes voice recordings.</li>
        <li>Resend delivers emails such as password resets and reminders.</li>
        <li>Google, only if you choose Google sign-in or turn on Drive filing.</li>
        <li>Our hosting and database providers store the app and your data.</li>
      </ul>

      <h2>Cookies and browser storage</h2>
      <p>
        We do not use advertising or cross-site tracking cookies. Your browser&rsquo;s storage keeps you signed in (for the
        length you chose with &ldquo;Keep me signed in&rdquo;) and remembers your settings. Our page-view analytics do not use
        cookies.
      </p>

      <h2>Keeping and deleting your data</h2>
      <p>
        Your data stays until you delete it. In Settings you can delete individual documents, all conversations, or your whole
        account; deleting your account removes your profile, documents, conversations and schedule. Reset links expire after
        30 minutes and can be used once.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask to see, correct or remove your data at any time, and you can do most of it yourself in Settings. Where the
        law in your country gives you more rights, they apply too.
      </p>

      <h2>Children</h2>
      <p>Campus AI is meant for students old enough to hold their own account. If you believe a young child has signed up, tell us and we will remove the account.</p>

      <h2>Changes</h2>
      <p>If we change this page in a way that matters, we will update the date above and, for big changes, tell you in the app.</p>
    </LegalPage>
  );
}
