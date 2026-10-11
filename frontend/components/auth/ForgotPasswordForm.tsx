"use client";

import Link from "next/link";
import { type FormEvent, useState } from "react";

import { PixelButton, PixelInput } from "@/components/pixel";
import { friendlyError } from "@/lib/api";
import { requestPasswordReset } from "@/lib/auth";
import { FormError, FormNotice } from "./FormError";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-5">
        <FormNotice>
          If {email.trim()} has an account, a reset link is on its way. It works for 30 minutes.
        </FormNotice>
        <p className="font-sans text-sm text-muted-onPaper">
          Nothing in your inbox? Check spam, or{" "}
          <button type="button" onClick={() => setSent(false)} className="pixel-focus font-semibold text-brand-black underline underline-offset-2">
            try another email
          </button>
          .
        </p>
        <Link href="/signin" className="pixel-focus font-sans text-sm font-semibold underline underline-offset-2">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      <PixelInput
        label="Email"
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="you@university.edu"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <PixelButton type="submit" size="lg" disabled={busy || !email.trim()} className="w-full">
        {busy ? "Sending…" : "Send reset link"}
      </PixelButton>
      <Link href="/signin" className="pixel-focus font-sans text-sm font-semibold underline underline-offset-2">
        Back to sign in
      </Link>
    </form>
  );
}
