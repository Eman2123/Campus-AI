import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset password · Campus AI" };

export default function Page() {
  return (
    <AuthShell panel="objects" eyebrow="Reset password" title="Forgot your password?" subtitle="Enter your email and we'll send you a link to choose a new one.">
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
