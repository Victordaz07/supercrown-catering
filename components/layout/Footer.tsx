import Link from "next/link";
import { ArrowRight, BookOpen, Instagram, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Footer() {
  const menuLinks = [
    { href: "#menu", label: "Box Lunches" },
    { href: "#menu", label: "Grab-n-Go" },
    { href: "/menu", label: "Full Menu" },
  ];

  const companyLinks = [
    { href: "#", label: "About" },
    { href: "#", label: "Gallery" },
    { href: "#reviews", label: "Reviews" },
    { href: "#", label: "FAQ" },
  ];

  const contactLinks = [
    { href: "#quote", label: "Get a Quote" },
    { href: "/login", label: "Login" },
    { href: "mailto:hello@supercrown.com", label: "Email Us" },
  ];

  return (
    <footer className="bg-dark w-full">
      {/* CTA Banner */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-20 py-16">
          <div className="relative bg-terracotta/10 border border-terracotta/20 rounded-2xl p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
            <div>
              <h3 className="font-display text-3xl md:text-4xl text-cream font-light mb-2">
                Ready to place your order?
              </h3>
              <p className="text-stone text-base">
                Get a personalized quote within 24 hours. No obligation.
              </p>
            </div>
            <Link href="#quote" className="flex-shrink-0">
              <Button variant="secondary" size="lg" className="group gap-2">
                Get a Quote
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Gradient separator */}
      <div className="h-px bg-gradient-to-r from-transparent via-stone/25 to-transparent mx-8" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-20 w-full">
        {/* Link grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 py-16">
          {/* Col 1: Logo + tagline */}
          <div>
            <Link href="/" className="block mb-4 group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="Super Crown Catering"
                className="h-10 w-auto brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity duration-300"
              />
            </Link>
            <p className="text-stone text-sm leading-relaxed mb-6">
              Fresh catering for corporate events, schools, and private gatherings.
            </p>
            <div className="flex items-center gap-3">
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-stone hover:text-cream hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="mailto:hello@supercrown.com"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-stone hover:text-cream hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                aria-label="Email"
              >
                <Mail className="w-4 h-4" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-stone hover:text-cream hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                aria-label="Phone"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Col 2: Menu links */}
          <div>
            <h3 className="text-cream font-semibold mb-5 text-sm uppercase tracking-wider">
              Menu
            </h3>
            <ul className="space-y-3">
              {menuLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-stone hover:text-cream hover:translate-x-1 transition-all duration-300 text-sm inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Company links */}
          <div>
            <h3 className="text-cream font-semibold mb-5 text-sm uppercase tracking-wider">
              Company
            </h3>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-stone hover:text-cream hover:translate-x-1 transition-all duration-300 text-sm inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Contact links */}
          <div>
            <h3 className="text-cream font-semibold mb-5 text-sm uppercase tracking-wider">
              Contact
            </h3>
            <ul className="space-y-3">
              {contactLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-stone hover:text-cream hover:translate-x-1 transition-all duration-300 text-sm inline-block"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-stone/15 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-muted text-sm">
            &copy; {new Date().getFullYear()} Super Crown Catering. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/project"
              className="inline-flex items-center gap-1.5 text-muted/70 hover:text-cream text-sm transition-colors"
              aria-label="Project brief"
              title="Project brief"
            >
              <BookOpen className="w-4 h-4" />
              Project brief
            </Link>
            <p className="text-muted/70 text-sm">Made with care</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
