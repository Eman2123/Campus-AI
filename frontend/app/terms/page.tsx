import type { Metadata } from "next";

import { LegalPage } from "@/components/site/LegalPage";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The rules for using Campus AI: your account, your content, and what to expect from AI answers.",
  alternates: { canonical: "/terms" },
};

// NOTE: a plain-language starting point, not legal advice. Have it reviewed
// before launch (governing law, liability limits and age rules in particular).
export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="2026-10-12">
      <p>By creating an account or using Campus AI you agree to these terms. If you do not agree, please do not use the service.</p>

      <h2>Your account</h2>
      <p>
        Keep your password private and use accurate details. You are responsible for what happens under your account. Tell us
        if you think someone else has access to it.
      </p>

      <h2>Your content</h2>
      <p>
        The notes, documents and messages you add are yours. You give us permission to store and process them only to provide
        Campus AI to you, as described in the privacy policy. Only upload material you have the right to use.
      </p>

      <h2>What you agree not to do</h2>
      <ul>
        <li>Break the law, or upload content that infringes someone else&rsquo;s rights.</li>
        <li>Try to break, overload or get around the security or rate limits of the service.</li>
        <li>Use Campus AI to cheat in a way your school forbids. You are responsible for following your institution&rsquo;s academic-integrity rules.</li>
        <li>Share your account or use automated tools to access it at scale.</li>
      </ul>

      <h2>AI answers can be wrong</h2>
      <p>
        Campus AI uses AI models. Answers, quizzes and study plans may contain mistakes or miss context. They are study aids,
        not professional advice and not a substitute for your course materials, teachers or your own judgement. Please check
        anything important.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We work to keep Campus AI running but cannot promise it will always be available or error-free. We may change or stop
        features, and we may suspend accounts that break these terms.
      </p>

      <h2>Ending your use</h2>
      <p>You can delete your account in Settings at any time. That removes your data as explained in the privacy policy.</p>

      <h2>Liability</h2>
      <p>
        To the extent the law allows, Campus AI is provided &ldquo;as is&rdquo; and we are not liable for indirect or
        consequential losses arising from its use. Nothing here limits rights you have by law that cannot be limited.
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. If a change matters, we will update the date above; continuing to use Campus AI means you accept the new version.</p>
    </LegalPage>
  );
}
