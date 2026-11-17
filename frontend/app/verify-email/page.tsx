import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { VerifyEmailForm } from "@/components/auth/VerifyEmailForm";

export const metadata: Metadata = { title: "Confirm your email", description: "Confirm your email address for Campus AI.", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell panel="objects" eyebrow="Confirm email" title="Confirming your email" subtitle="One moment while we check your link.">
      <Suspense>
        <VerifyEmailForm />
      </Suspense>
    </AuthShell>
  );
}
