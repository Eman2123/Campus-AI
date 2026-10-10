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

// Section order and backgrounds (the rhythm): Navbar white, Hero yellow, Problem
// graph, How it works soft, Agents graph, Chat demo yellow, Planner graph,
// Voice + Docs soft, FAQ faint graph, CTA yellow, Footer black.
export default function LandingPage() {
  return (
    <main>
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
    </main>
  );
}
