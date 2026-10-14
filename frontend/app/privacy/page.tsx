import type { Metadata } from "next";

import Link from "next/link";

import { LegalPage } from "@/components/site/LegalPage";
import { LEGAL_UPDATED } from "@/lib/legal";
import { OPERATOR_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Campus AI collects, why, who helps us run it, how long we keep it, how it is protected, and your rights.",
  alternates: { canonical: "/privacy" },
};

// NOTE: written to match what the app actually does today (see backend/app).
// It is a plain-language starting point, not legal advice: have it reviewed
// before launch, and update it whenever a provider or feature changes.
export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated={LEGAL_UPDATED}>
      <p>
        Campus AI is a study assistant. This page explains what we collect when you use it, what we do with it, and the
        control you have. We keep it short on purpose.
      </p>

      <h2>Who is responsible for your data</h2>
      <p>
        {OPERATOR_NAME} runs Campus AI and decides how your data is used (in data-protection terms, the &ldquo;controller&rdquo;).
        {" "}
        You can reach us through the <Link href="/contact">contact form</Link> about anything on this page.
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
          <strong>Your agreement to these policies:</strong> when you create an account and tick the box (or continue with
          Google), we keep the date and the version of the Terms you agreed to.
        </li>
        <li>
          <strong>Messages you send us:</strong> what you write in the contact form (your name, email address and message) so
          we can answer you.
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
        <li>ElevenLabs turns a reply into speech when you use Read aloud or Talk (it receives the text of that reply).</li>
        <li>LangSmith (by LangChain), only while we have debugging traces switched on, receives the text of AI requests and replies so we can find and fix problems.</li>
        <li>Resend delivers emails such as password resets and reminders.</li>
        <li>Google, if you choose Google sign-in or leave Drive filing on (you can turn it off in Settings).</li>
        <li>Our hosting and database providers store the app and your data.</li>
      </ul>

      <h2>Cookies and browser storage</h2>
      <p>
        We do not use advertising or cross-site tracking cookies. Your browser&rsquo;s storage keeps you signed in (for the
        length you chose with &ldquo;Keep me signed in&rdquo;) and remembers your settings. Our page-view analytics do not use
        cookies.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[32rem] border-collapse border-2 border-brand-black font-sans text-sm">
          <caption className="mb-2 text-left font-pixel text-base font-semibold">Browser storage we use</caption>
          <thead>
            <tr>
              <th scope="col" className="border-2 border-brand-black bg-brand-yellow-soft p-2 text-left font-pixel text-sm">Name</th>
              <th scope="col" className="border-2 border-brand-black bg-brand-yellow-soft p-2 text-left font-pixel text-sm">What it is for</th>
              <th scope="col" className="border-2 border-brand-black bg-brand-yellow-soft p-2 text-left font-pixel text-sm">Where</th>
              <th scope="col" className="border-2 border-brand-black bg-brand-yellow-soft p-2 text-left font-pixel text-sm">How long</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border-2 border-brand-black p-2 align-top"><code>campus-ai:token</code></td>
              <td className="border-2 border-brand-black p-2 align-top">Keeps you signed in.</td>
              <td className="border-2 border-brand-black p-2 align-top">localStorage if you tick &ldquo;Keep me signed in&rdquo;, otherwise sessionStorage</td>
              <td className="border-2 border-brand-black p-2 align-top">Until you sign out, or the sign-in expires (24 hours, or 30 days with &ldquo;Keep me signed in&rdquo;)</td>
            </tr>
            <tr>
              <td className="border-2 border-brand-black p-2 align-top"><code>campus-ai:remember-default</code></td>
              <td className="border-2 border-brand-black p-2 align-top">Remembers your &ldquo;Keep me signed in&rdquo; choice.</td>
              <td className="border-2 border-brand-black p-2 align-top">localStorage</td>
              <td className="border-2 border-brand-black p-2 align-top">Until you clear your browser data</td>
            </tr>
            <tr>
              <td className="border-2 border-brand-black p-2 align-top"><code>campus-ai-theme</code></td>
              <td className="border-2 border-brand-black p-2 align-top">Remembers light, dark or system theme.</td>
              <td className="border-2 border-brand-black p-2 align-top">localStorage</td>
              <td className="border-2 border-brand-black p-2 align-top">Until you clear your browser data</td>
            </tr>
            <tr>
              <td className="border-2 border-brand-black p-2 align-top"><code>campus-ai:notice-ok</code></td>
              <td className="border-2 border-brand-black p-2 align-top">Remembers that you closed the storage notice.</td>
              <td className="border-2 border-brand-black p-2 align-top">localStorage</td>
              <td className="border-2 border-brand-black p-2 align-top">Until you clear your browser data</td>
            </tr>
            <tr>
              <td className="border-2 border-brand-black p-2 align-top"><code>campus-ai:tour-seen:&lt;your id&gt;</code></td>
              <td className="border-2 border-brand-black p-2 align-top">Remembers that you have seen the welcome tour.</td>
              <td className="border-2 border-brand-black p-2 align-top">localStorage</td>
              <td className="border-2 border-brand-black p-2 align-top">Until you clear your browser data</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>All of this is strictly needed to run the app or to remember a choice you made, which is why we do not ask for consent first. None of it is used for advertising or for tracking you across other sites. You can remove it at any time by signing out or clearing your browser data.</p>

      <h2>Why we may use your data (legal basis)</h2>
      <p>If the EU or UK GDPR applies to you, we need a legal reason for each use of your data. These are ours:</p>
      <ul>
        <li><strong>To provide Campus AI to you</strong> (your account, notes, conversations, schedule, answers, reminders and digests you have switched on): it is needed to deliver the service you signed up for.</li>
        <li><strong>Voice input and Read aloud:</strong> your consent, which you give by pressing the microphone or the speaker button. You can stop at any time by not using them.</li>
        <li><strong>Keeping the service secure and working</strong> (rate limits, abuse prevention, error logs, anonymous usage statistics): our legitimate interest in running a safe, reliable service.</li>
        <li><strong>Legal duties:</strong> when the law requires us to keep or hand over information.</li>
      </ul>

      <h2>Emails we send</h2>
      <p>
        We send only service emails: password resets, and the deadline reminders and daily digest that you can switch on or off in
        Settings. We send no marketing or promotional email. If that ever changes, we will ask for your separate consent first
        and every such message will have a way to unsubscribe.
      </p>

      <h2>Sharing your data</h2>
      <p>
        We do not sell your data and we do not share it for advertising. We pass it to the services listed above only so that
        they can do the job we asked of them, and we ask them to treat it as confidential and use it for nothing else. We may
        also disclose information when the law requires it, or to protect the safety of our users and our service. If we ever
        need to change this, we will tell you before it takes effect.
      </p>

      <h2>Where your data is processed</h2>
      <p>
        Some of our providers run servers in other countries. Where your data leaves your own country, we rely on the safeguards
        the law requires, such as standard contractual clauses with the provider. Ask us if you would like details.
      </p>

      <h2>How we protect your data</h2>
      <ul>
        <li>Passwords are stored only as a one-way (bcrypt) hash, so not even we can read them.</li>
        <li>Connections to the hosted service are encrypted (HTTPS).</li>
        <li>Everything you add is tied to your account and only reachable when you are signed in as you.</li>
        <li>Sign-in, sign-up, password-reset and upload requests are rate limited, and password-reset links expire after 30 minutes and work once.</li>
        <li>Sign-in sessions end after the time you chose, and you can sign out any time.</li>
        <li>Access to the admin pages is limited to named administrators.</li>
      </ul>
      <p>No system is perfectly secure, so please use a strong, unique password.</p>

      <h2>If something goes wrong (data breaches)</h2>
      <p>
        If a security incident puts your personal data at risk, we will contain it, find out what happened, and tell the
        authorities and the people affected without undue delay and, where GDPR applies, within the legal deadlines (72 hours for
        the supervisory authority). The message will say what happened, what data was involved, and what you can do about it.
      </p>

      <h2>How long we keep your data</h2>
      <ul>
        <li><strong>Account, documents, conversations and schedule:</strong> until you delete them, or your account.</li>
        <li><strong>Password-reset links:</strong> valid for 30 minutes and single-use; expired ones are deleted automatically.</li>
        <li><strong>Server logs:</strong> a short period set by our hosting provider.</li>
        <li><strong>Anonymous service statistics</strong> (which study agent ran, how long it took, whether it succeeded; no message text and no account): deleted automatically after 90 days.</li>
        <li><strong>Your agreement to the Terms</strong> (date and version): until you delete your account.</li>
        <li><strong>Contact-form messages:</strong> only as long as needed to answer you and deal with your request.</li>
        <li><strong>Backups:</strong> deleted data can remain in provider backups for a limited time before they are overwritten.</li>
      </ul>

      <h2>Deleting your data</h2>
      <p>
        In Settings you can delete individual documents, clear all your conversations, or delete your whole account. Deleting
        your account removes your profile, documents, conversations and schedule (and the copies we made in Google Drive, if you
        used Drive filing). You can also ask us through the <Link href="/contact?topic=privacy">contact form</Link> and we will do it for you.
      </p>

      <h2>Your rights</h2>
      <p>You can ask us at any time to:</p>
      <ul>
        <li><strong>Give you a copy of your data.</strong> Settings &rarr; Privacy and data &rarr; Download my data gives you a JSON file straight away.</li>
        <li><strong>Correct it.</strong> You can change your name in Settings; use the <Link href="/contact?topic=privacy">contact form</Link> for anything else.</li>
        <li><strong>Delete it.</strong> See above.</li>
        <li><strong>Limit or object to</strong> how we use it, or move it to another service (the download is in a common, machine-readable format).</li>
      </ul>
      <p>
        If you think we have mishandled your data, you can complain to the data-protection authority in your country. We would
        appreciate the chance to put it right first. Where the law in your country gives you more rights, they apply too.
      </p>

      <h2>Children</h2>
      <p>Campus AI is not meant for children under 13, and we do not knowingly collect their data. If you believe a young child has signed up, tell us through the <Link href="/contact?topic=privacy">contact form</Link> and we will remove the account.</p>

      <h2>Software we use</h2>
      <p>Campus AI is built with open-source software. The list and licences are on the <Link href="/licenses">Licences page</Link>.</p>

      <h2>Changes</h2>
      <p>If we change this page in a way that matters, we will update the date above and, for big changes, tell you in the app.</p>
    </LegalPage>
  );
}
