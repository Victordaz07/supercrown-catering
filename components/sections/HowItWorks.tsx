import { steps } from "@/lib/data";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function HowItWorks() {
  return (
    <section className="bg-warm py-16 md:py-24 px-4 sm:px-6 md:px-20 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <SectionHeader label="Simple process" title="How it works" />
        <div className="grid grid-cols-1 md:grid-cols-3 border border-stone divide-y md:divide-y-0 md:divide-x divide-stone rounded-lg overflow-hidden">
          {steps.map((step) => (
            <div
              key={step.number}
              className="p-12 first:md:rounded-l last:md:rounded-r"
            >
              <p className="font-display text-6xl text-stone mb-4">
                {step.number}
              </p>
              <h3 className="font-display text-xl font-semibold text-dark mb-2">
                {step.title}
              </h3>
              <p className="text-muted text-sm">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
