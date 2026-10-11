import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Get started · Campus AI" };

export default function Page() {
  return (
    <AuthShell panel="photo" eyebrow="Get started" title="Create your account" subtitle="Free while you're a student. Takes under a minute.">
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
