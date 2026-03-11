"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/cartStore";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const navLinks = [
    { href: "/menu", label: "Menu" },
    { href: "#", label: "Gallery" },
    { href: "#", label: "About" },
    { href: "#", label: "FAQ" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-[100] w-full transition-all duration-500 border-b ${
        scrolled
          ? "py-2 glass border-stone/20 shadow-sm"
          : "py-4 bg-cream/95 backdrop-blur-sm border-stone/30"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-20 w-full flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center px-2 py-1.5 -ml-2 rounded-md"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="Super Crown Catering"
            className={`w-auto max-h-12 object-contain transition-all duration-500 ${
              scrolled ? "h-7 sm:h-8" : "h-8 sm:h-10"
            }`}
            style={{ mixBlendMode: "multiply" }}
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-warm/60 ${
                isActive(link.href) ? "text-terracotta" : "text-dark hover:text-terracotta"
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-terracotta rounded-full" />
              )}
              {link.label === "Menu" && totalItems > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-terracotta animate-pulse-subtle" />
              )}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2.5 rounded-lg border border-stone/40 text-dark hover:border-terracotta hover:text-terracotta text-sm font-medium transition-all duration-300"
          >
            Login
          </Link>
          <Link href="#quote">
            <Button variant="secondary" size="sm">
              Get a Quote
            </Button>
          </Link>
        </div>

        {/* Mobile controls */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-2 rounded-lg border border-stone/40 text-dark text-sm font-medium hover:border-terracotta hover:text-terracotta transition-all duration-300"
          >
            Login
          </Link>
          <button
            className="relative w-10 h-10 flex items-center justify-center text-dark hover:text-terracotta transition-colors rounded-lg hover:bg-warm/60"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span className="sr-only">Menu</span>
            <div className="w-5 h-4 relative flex flex-col justify-between">
              <span
                className={`block h-0.5 w-5 bg-current rounded-full transition-all duration-300 origin-center ${
                  mobileMenuOpen ? "rotate-45 translate-y-[7px]" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-current rounded-full transition-all duration-300 ${
                  mobileMenuOpen ? "opacity-0 scale-0" : "opacity-100"
                }`}
              />
              <span
                className={`block h-0.5 w-5 bg-current rounded-full transition-all duration-300 origin-center ${
                  mobileMenuOpen ? "-rotate-45 -translate-y-[7px]" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-out ${
          mobileMenuOpen
            ? "max-h-[400px] opacity-100 border-t border-stone/20"
            : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-6 py-5 flex flex-col gap-1 glass">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`px-4 py-3 rounded-lg text-base font-medium transition-all duration-200 ${
                isActive(link.href)
                  ? "text-terracotta bg-terracotta/5"
                  : "text-dark hover:text-terracotta hover:bg-warm/60"
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 pt-3 border-t border-stone/20">
            <Link
              href="#quote"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button variant="secondary" className="w-full">
                Get a Quote
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
