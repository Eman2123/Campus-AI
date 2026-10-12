import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = { title: "Choose a new password", description: "Choose a new password for your Campus AI account.", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <AuthShell panel="objects" eyebrow="Reset password" title="Choose a new password" subtitle="Pick something you haven't used here before.">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
