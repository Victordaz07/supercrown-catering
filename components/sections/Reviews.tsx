import { reviews } from "@/lib/data";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function Reviews() {
  return (
    <section id="reviews" className="bg-dark py-16 md:py-24 px-4 sm:px-6 md:px-20 scroll-mt-24 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <SectionHeader
          label="What clients say"
          title="Loved by hundreds of events"
          variant="dark"
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white/5 border border-white/15 rounded-lg p-6"
            >
              <p
                className="text-terracotta text-xl tracking-[0.25em] mb-4"
                aria-label={`${review.rating} out of 5 stars`}
              >
                ★★★★★
              </p>
              <blockquote className="font-display text-warm italic text-lg mb-4">
                &ldquo;{review.text}&rdquo;
              </blockquote>
              <p className="text-stone text-xs uppercase tracking-wider">
                {review.author} · {review.role}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
