import { Button } from "@/components/ui/Button";

export function CtaSection() {
  return (
    <section className="rule-lines border-t border-paper/10 px-6 py-24 text-center sm:px-10 lg:px-16">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-display text-3xl text-paper sm:text-4xl">
          Bring your next assignment. See what it does with it.
        </h2>
        <p className="mt-4 font-sans text-base text-muted-onDark">
          Free to start. No credit card, no calendar account required.
        </p>
        <div className="mt-8 flex justify-center">
          <Button href="/signup">Start studying</Button>
        </div>
      </div>
    </section>
  );
}
