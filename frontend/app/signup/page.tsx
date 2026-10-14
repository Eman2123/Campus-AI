import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignUpForm } from "@/components/auth/SignUpForm";

export const metadata: Metadata = { title: "Create your account", description: "Create a free Campus AI account and start studying with your own notes.", alternates: { canonical: "/signup" } };

export default function Page() {
  return (
    <AuthShell panel="steps" eyebrow="Get started" title="Create your account" subtitle="Free while you're a student. Takes under a minute.">
      <Suspense>
        <SignUpForm />
      </Suspense>
    </AuthShell>
  );
}
