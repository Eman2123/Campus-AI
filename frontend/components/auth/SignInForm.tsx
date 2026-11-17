"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { PixelButton, PixelCheckbox, PixelInput } from "@/components/pixel";
import { friendlyError } from "@/lib/api";
import { getRememberDefault, isEmailNotVerified, resendVerification, signIn, signInWithGoogle } from "@/lib/auth";
import { useRedirectIfSignedIn } from "@/lib/useAuthGuard";
import { FormError, FormNotice } from "./FormError";
import { GoogleButton } from "./GoogleButton";
import { PasswordField } from "./PasswordField";

export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const justReset = params.get("reset") === "1";
  const expired = params.get("expired") === "1";
  useRedirectIfSignedIn();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  useEffect(() => setRemember(getRememberDefault()), []); // Settings -> "Keep me signed in"
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // The password was right but the address was never confirmed: offer a new link.
  const [unverified, setUnverified] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setUnverified(false);
    setResendState("idle");
    setBusy(true);
    try {
      await action();
      router.replace("/dashboard/home");
    } catch (err) {
      setUnverified(isEmailNotVerified(err));
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  async function resend() {
    setResendState("sending");
    try {
      await resendVerification(email.trim());
      setResendState("sent");
    } catch (err) {
      setError(friendlyError(err));
      setResendState("idle");
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void run(() => signIn(email.trim(), password, remember));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      {justReset && <FormNotice>Password updated. Sign in with your new password.</FormNotice>}
      {expired && !justReset && <FormNotice>Your session expired. Please sign in again.</FormNotice>}
      {params.get("verified") === "1" && !error && <FormNotice>Email confirmed. You can sign in now.</FormNotice>}
      <FormError message={error} />
      {unverified && (
        <div className="flex flex-col gap-2">
          {resendState === "sent" ? (
            <FormNotice>A new link is on its way. Check your inbox (and spam).</FormNotice>
          ) : (
            <button
              type="button"
              onClick={() => void resend()}
              disabled={resendState === "sending"}
              className="pixel-focus self-start font-sans text-sm font-semibold underline underline-offset-2"
            >
              {resendState === "sending" ? "Sending…" : "Send the confirmation link again"}
            </button>
          )}
        </div>
      )}
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
      <PasswordField
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        labelAside={
          <Link href="/forgot-password" className="pixel-focus font-sans text-sm font-semibold underline underline-offset-2">
            Forgot password?
          </Link>
        }
      />
      <PixelCheckbox checked={remember} onChange={(e) => setRemember(e.target.checked)}>
        Keep me signed in for 30 days
      </PixelCheckbox>
      <PixelButton type="submit" size="lg" disabled={busy || !email.trim() || !password} className="w-full">
        {busy ? "Signing in…" : "Sign in"}
      </PixelButton>
      <GoogleButton text="signin_with" onCredential={(c) => void run(() => signInWithGoogle(c, true))} />
      <p className="font-sans text-xs text-muted-onPaper">
        Continuing with Google creates an account if you do not have one, and means you agree to the{" "}
        <Link href="/terms" className="pixel-focus font-semibold underline underline-offset-2">
          Terms of use
        </Link>{" "}
        and have read the{" "}
        <Link href="/privacy" className="pixel-focus font-semibold underline underline-offset-2">
          Privacy policy
        </Link>
        .
      </p>
      <p className="font-sans text-sm">
        New here?{" "}
        <Link href="/signup" className="pixel-focus font-semibold underline underline-offset-2">
          Create an account
        </Link>
      </p>
    </form>
  );
}
