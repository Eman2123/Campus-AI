import type { Metadata } from "next";

import { AuthForm } from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Sign up \u2014 Campus AI",
};

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-6 py-16">
      <AuthForm mode="signup" />
    </main>
  );
}
