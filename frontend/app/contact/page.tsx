import type { Metadata } from "next";

import { ContactForm } from "@/components/site/ContactForm";
import { LegalPage } from "@/components/site/LegalPage";
import { LEGAL_UPDATED } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Contact",
  description: "Ask a question, make a privacy request, or report a problem with Campus AI.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage({ searchParams }: { searchParams: { topic?: string } }) {
  return (
    <LegalPage title="Contact us" updated={LEGAL_UPDATED} showContact={false} showDate={false}>
      <p>
        Use this form for questions, to use your data rights (a copy, a correction, deletion), to report a problem, or to
        tell us about content that infringes your rights. We reply to the email address you give.
      </p>
      <p>
        You can already download or delete your own data yourself in Settings after you sign in. The form is for everything
        else.
      </p>
      <ContactForm initialTopic={searchParams.topic} />
    </LegalPage>
  );
}
