"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { PixelButton } from "@/components/pixel";
import { friendlyError } from "@/lib/api";
import { verifyEmail } from "@/lib/auth";
import { FormError, FormNotice } from "./FormError";

type State = { status: "working" } | { status: "done" } | { status: "failed"; message: string };

/**
 * The page the emailed link opens. It confirms the address on arrival (the
 * token is single-use, so it runs exactly once even though React strict mode
 * mounts effects twice in development), then points at sign-in.
 */
export function VerifyEmailForm() {
  const token = useSearchParams().get("token");
  const [state, setState] = useState<State>(token ? { status: "working" } : { status: "failed", message: "" });
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    verifyEmail(token)
      .then(() => setState({ status: "done" }))
      .catch((err) => setState({ status: "failed", message: friendlyError(err) }));
  }, [token]);

  if (state.status === "working") {
    return <p className="font-sans text-sm">Confirming your email…</p>;
  }

  if (state.status === "done") {
    return (
      <div className="flex flex-col gap-5">
        <FormNotice>Your email is confirmed.</FormNotice>
        <PixelButton href="/signin?verified=1" size="lg" className="w-full">
          Sign in
        </PixelButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <FormError
        message={
          state.message ||
          "This confirmation link is incomplete. Open the link from your email again, or sign in to get a new one."
        }
      />
      <PixelButton href="/signin" size="lg" className="w-full">
        Go to sign in
      </PixelButton>
      <p className="font-sans text-sm text-muted-onPaper">
        On the sign-in page, enter your email and password and choose “Send the confirmation link again”.
      </p>
    </div>
  );
}
