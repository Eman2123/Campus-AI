"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { ApiError } from "@/lib/api";
import { signIn, signUp } from "@/lib/auth";

type AuthFormProps = {
  mode: "signup" | "signin";
};

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isSignup = mode === "signup";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isSignup) {
        await signUp(email, password);
      } else {
        await signIn(email, password);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong \u2014 please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-sm bg-paper p-8 text-ink">
      <h1 className="font-display text-2xl">{isSignup ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-2 font-sans text-sm text-muted-onPaper">
        {isSignup
          ? "Start studying with your own material in a couple minutes."
          : "Sign in to pick up where you left off."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="block font-sans text-sm text-muted-onPaper">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-sm border border-ink/15 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-ink/40"
          />
        </div>

        <div>
          <label htmlFor="password" className="block font-sans text-sm text-muted-onPaper">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            required
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-sm border border-ink/15 bg-white px-3 py-2 font-sans text-sm text-ink outline-none focus:border-ink/40"
          />
          {isSignup && <p className="mt-1 font-sans text-xs text-muted-onPaper">At least 8 characters.</p>}
        </div>

        {error && (
          <p className="font-sans text-sm text-noteDark-coral" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-sm bg-highlighter px-4 py-3 font-sans text-sm font-medium text-ink transition-colors hover:bg-[#f7c563] disabled:opacity-60"
        >
          {submitting ? "Please wait\u2026" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 font-sans text-sm text-muted-onPaper">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/signin" className="text-noteDark-periwinkle underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="text-noteDark-periwinkle underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
