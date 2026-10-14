"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { PixelButton, PixelCheckbox, PixelInput } from "@/components/pixel";
import { ApiError, friendlyError } from "@/lib/api";
import { signInWithGoogle, signUp } from "@/lib/auth";
import { isPasswordAcceptable } from "@/lib/password";
import { useRedirectIfSignedIn } from "@/lib/useAuthGuard";
import { FormError } from "./FormError";
import { GoogleButton } from "./GoogleButton";
import { PasswordField } from "./PasswordField";

export function SignUpForm() {
  const router = useRouter();
  useRedirectIfSignedIn();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [exists, setExists] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    setExists(false);
    setBusy(true);
    try {
      await action();
      router.replace("/dashboard/home");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setExists(true);
      else setError(friendlyError(err));
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("Please tick the box to agree to the Terms of use and Privacy policy.");
      return;
    }
    void run(() => signUp(name, email.trim(), password, true));
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      {exists && (
        <div role="alert" className="border-pixel border-brand-black bg-[#FFF1F2] px-3.5 py-2.5 font-sans text-sm font-semibold text-noteDark-coral">
          That email already has an account.{" "}
          <Link href="/signin" className="underline underline-offset-2">
            Sign in instead
          </Link>
        </div>
      )}
      <PixelInput
        label="Name"
        autoComplete="name"
        placeholder="What should we call you?"
        value={name}
        maxLength={100}
        onChange={(e) => setName(e.target.value)}
        hint="Optional"
      />
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
      <PasswordField value={password} onChange={setPassword} autoComplete="new-password" showRules />
      <PixelCheckbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)}>
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank" className="pixel-focus font-semibold underline underline-offset-2">
            Terms of use
          </Link>{" "}
          and have read the{" "}
          <Link href="/privacy" target="_blank" className="pixel-focus font-semibold underline underline-offset-2">
            Privacy policy
          </Link>
        </span>
      </PixelCheckbox>
      <PixelButton type="submit" size="lg" disabled={busy || !email.trim() || !isPasswordAcceptable(password) || !agreed} className="w-full">
        {busy ? "Creating account…" : "Create account"}
      </PixelButton>
      <GoogleButton
        text="signup_with"
        onCredential={(c) => {
          if (!agreed) {
            setError("Please tick the box to agree to the Terms of use and Privacy policy first.");
            return;
          }
          void run(() => signInWithGoogle(c, true));
        }}
      />
      <p className="font-sans text-sm">
        Already have an account?{" "}
        <Link href="/signin" className="pixel-focus font-semibold underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </form>
  );
}
