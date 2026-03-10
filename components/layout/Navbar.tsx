"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useCart } from "@/lib/cartStore";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems } = useCart();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "/menu", label: "Menu" },
    { href: "#", label: "Gallery" },
    { href: "#", label: "About" },
    { href: "#", label: "FAQ" },
  ];

  return (
    <nav
      className={`fixed left-0 right-0 top-0 z-[100] w-full bg-cream/95 backdrop-blur-sm border-b border-stone/30 transition-all duration-300 ${
        scrolled ? "py-2" : "py-4"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-20 w-full flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center px-2 py-1.5 -ml-2 rounded-md bg-cream"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/logo.png"
            alt="Super Crown Catering"
            className="h-8 sm:h-10 w-auto max-h-12 object-contain"
            style={{ mixBlendMode: "multiply" }}
          />
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-dark hover:text-terracotta transition-colors text-sm font-medium ${link.label === "Menu" ? "relative" : ""}`}
            >
              {link.label}
              {link.label === "Menu" && totalItems > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-terracotta transform translate-x-1/2 -translate-y-1/2" />
              )}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 rounded-lg border border-terracotta/50 text-terracotta hover:bg-terracotta/10 text-sm font-medium transition-colors"
          >
            Login
          </Link>
          <Link href="#quote">
            <Button variant="primary" size="sm">
              Get a Quote
            </Button>
          </Link>
        </div>

        {/* Mobile: Staff Login visible + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <Link
            href="/login"
            className="px-3 py-2 rounded-lg border border-terracotta/50 text-terracotta text-sm font-medium hover:bg-terracotta/10 transition-colors"
          >
            Login
          </Link>
          <button
            className="p-2 text-dark hover:text-terracotta transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-cream border-b border-stone/30 shadow-lg">
          <div className="px-6 py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-dark hover:text-terracotta transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="py-3 px-4 rounded-lg border border-terracotta/50 text-terracotta hover:bg-terracotta/10 font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              href="#quote"
              onClick={() => setMobileMenuOpen(false)}
              className="pt-2"
            >
              <Button variant="primary" className="w-full">
                Get a Quote
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
