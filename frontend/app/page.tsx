import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { AgentCards } from "@/components/landing/AgentCards";
import { PlannerCallout } from "@/components/landing/PlannerCallout";
import { CtaSection } from "@/components/landing/CtaSection";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <AgentCards />
      <PlannerCallout />
      <CtaSection />
      <Footer />
    </main>
  );
}
