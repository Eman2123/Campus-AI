"use client";

import { type FormEvent, useState } from "react";

import { FormError, FormNotice } from "@/components/auth/FormError";
import { PixelButton, PixelInput } from "@/components/pixel";
import { apiFetch, friendlyError } from "@/lib/api";

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "privacy", label: "Privacy or my data" },
  { value: "copyright", label: "Copyright or content complaint" },
  { value: "bug", label: "Bug or problem" },
] as const;

type Topic = (typeof TOPICS)[number]["value"];

const fieldClass =
  "pixel-focus w-full border-pixel border-brand-black bg-brand-white px-3.5 font-sans text-base text-brand-black placeholder:text-brand-black/50";

/**
 * Contact form. Messages go to the backend, which forwards them to the owner's
 * private inbox: the address is never on this page or in the JS bundle.
 */
export function ContactForm({ initialTopic }: { initialTopic?: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState<Topic>(TOPICS.some((t) => t.value === initialTopic) ? (initialTopic as Topic) : "general");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot: people never see or fill this
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const { message: reply } = await apiFetch<{ message: string }>("/api/contact", {
        method: "POST",
        body: { name: name.trim(), email: email.trim(), topic, message: message.trim(), website },
      });
      setSent(reply);
      setMessage("");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-4">
        <FormNotice>{sent}</FormNotice>
        <PixelButton variant="secondary" size="sm" className="self-start" onClick={() => setSent(null)}>
          Send another message
        </PixelButton>
      </div>
    );
  }

  const ready = name.trim().length > 0 && email.trim().length > 0 && message.trim().length >= 10;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <PixelInput label="Your name" autoComplete="name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} required />
      <PixelInput
        label="Your email"
        type="email"
        autoComplete="email"
        inputMode="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        hint="We reply to this address. We use it only to answer you."
        required
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-topic" className="font-pixel text-sm font-semibold">
          Topic
        </label>
        <select id="contact-topic" value={topic} onChange={(e) => setTopic(e.target.value as Topic)} className={`${fieldClass} h-12`}>
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="contact-message" className="font-pixel text-sm font-semibold">
          Message
        </label>
        <textarea
          id="contact-message"
          rows={6}
          maxLength={4000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className={`${fieldClass} py-3`}
          placeholder="How can we help?"
          required
        />
        <p className="font-sans text-sm text-muted-onPaper">At least 10 characters. Please do not send passwords.</p>
      </div>
      {/* Honeypot: off-screen and skipped by keyboards and screen readers. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Leave this empty
          <input type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      <PixelButton type="submit" size="lg" disabled={busy || !ready} className="w-full">
        {busy ? "Sending…" : "Send message"}
      </PixelButton>
    </form>
  );
}
