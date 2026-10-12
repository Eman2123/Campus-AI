import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignInForm } from "@/components/auth/SignInForm";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to Campus AI to pick up your notes, quizzes and study plan.", alternates: { canonical: "/signin" } };

export default function Page() {
  return (
    <AuthShell panel="chat" eyebrow="Welcome back" title="Sign in" subtitle="Pick up your notes, quizzes and plan where you left them.">
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}
