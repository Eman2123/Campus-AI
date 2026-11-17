"use client";

import { useState } from "react";

import { PixelButton } from "@/components/pixel";
import { friendlyError } from "@/lib/api";
import { resendVerification } from "@/lib/auth";
import { FormError, FormNotice } from "./FormError";

/**
 * Shown after sign-up: the account can't be used until the person opens the
 * link we emailed. Offers a "send it again" for the case where it never
 * arrived (the server rate-limits it, so spamming the button is harmless).
 */
export function CheckEmailNotice({ email }: { email: string }) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      await resendVerification(email);
      setSent(true);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <FormNotice>
        We sent a confirmation link to <strong>{email}</strong>. Open it to finish creating your account.
      </FormNotice>
      <p className="font-sans text-sm text-muted-onPaper">
        It can take a minute, and it may land in spam. The link works once and expires in 24 hours. Typed the wrong
        address? Sign up again with the right one.
      </p>
      <FormError message={error} />
      {sent && <FormNotice>If that address is waiting for confirmation, a new link is on its way.</FormNotice>}
      <PixelButton type="button" size="lg" onClick={() => void resend()} disabled={busy} className="w-full">
        {busy ? "Sending…" : "Send the link again"}
      </PixelButton>
      <PixelButton href="/signin" size="lg" variant="secondary" className="w-full">
        Back to sign in
      </PixelButton>
    </div>
  );
}
