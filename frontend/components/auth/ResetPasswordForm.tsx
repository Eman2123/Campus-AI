"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";

import { PixelButton } from "@/components/pixel";
import { friendlyError } from "@/lib/api";
import { resetPassword } from "@/lib/auth";
import { isPasswordAcceptable } from "@/lib/password";
import { FormError } from "./FormError";
import { PasswordField } from "./PasswordField";

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <div className="flex flex-col gap-5">
        <FormError message="This reset link is incomplete. Open the link from your email again, or request a new one." />
        <PixelButton href="/forgot-password" size="lg" className="w-full">
          Request a new link
        </PixelButton>
      </div>
    );
  }

  const mismatch = confirm.length > 0 && confirm !== password;
  const tokenExpired = error?.includes("invalid or has expired") ?? false;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setError(null);
    setBusy(true);
    try {
      await resetPassword(token, password);
      router.replace("/signin?reset=1");
    } catch (err) {
      setError(friendlyError(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
      <FormError message={error} />
      {tokenExpired && (
        <Link href="/forgot-password" className="pixel-focus font-sans text-sm font-semibold underline underline-offset-2">
          Request a new link
        </Link>
      )}
      <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" showRules />
      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        error={mismatch ? "Passwords don't match" : null}
      />
      <PixelButton
        type="submit"
        size="lg"
        disabled={busy || !isPasswordAcceptable(password) || password !== confirm}
        className="w-full"
      >
        {busy ? "Saving…" : "Set new password"}
      </PixelButton>
    </form>
  );
}
