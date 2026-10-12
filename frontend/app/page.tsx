import type { Metadata } from "next";
import { SITE_DESCRIPTION } from "@/lib/site";
import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { AgentCards } from "@/components/landing/AgentCards";
import { ChatDemo } from "@/components/landing/ChatDemo";
import { Planner } from "@/components/landing/Planner";
import { VoiceDocs } from "@/components/landing/VoiceDocs";
import { Faq } from "@/components/landing/Faq";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";
import { MobileStickyCta } from "@/components/landing/MobileStickyCta";

// Section order and backgrounds (the rhythm): Navbar white, Hero yellow, Problem
// graph, How it works soft, Agents graph, Chat demo yellow, Planner graph,
// Voice + Docs soft, FAQ faint graph, CTA yellow, Footer black.
export const metadata: Metadata = {
  // Absolute title: the landing page is the brand page, so no "· Campus AI" suffix.
  title: { absolute: "Campus AI: study help that reads your coursework" },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
};

export default function LandingPage() {
  return (
    // pb-20: room under the footer so the phone-only sticky CTA never covers its last line.
    <main className="bg-brand-black pb-20 md:pb-0">
      <Navbar />
      <Hero />
      <Problem />
      <HowItWorks />
      <AgentCards />
      <ChatDemo />
      <Planner />
      <VoiceDocs />
      <Faq />
      <CtaSection />
      <Footer />
      <MobileStickyCta />
    </main>
  );
}
