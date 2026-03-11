import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { TrustBar } from "@/components/sections/TrustBar";
import { Services } from "@/components/sections/Services";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { MenuPreviewWithModal } from "@/components/sections/MenuPreviewWithModal";
import { Reviews } from "@/components/sections/Reviews";
import { QuoteForm } from "@/components/sections/QuoteForm";

export default function Home() {
  return (
    <main className="min-h-screen bg-cream w-full">
      <Navbar />
      <Hero />
      <TrustBar />
      <Services />
      <HowItWorks />
      <MenuPreviewWithModal />
      <Reviews />
      <QuoteForm />
      <Footer />
    </main>
  );
}
