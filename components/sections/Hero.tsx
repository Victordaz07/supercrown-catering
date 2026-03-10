"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { heroImage } from "@/lib/data";

export function Hero() {
  return (
    <section className="min-h-screen grid grid-cols-1 lg:grid-cols-2 w-full">
      {/* Left column */}
      <div className="bg-cream flex flex-col justify-center px-6 lg:px-16 pt-24 lg:pt-0 pb-12 lg:pb-0">
        <div className="max-w-xl space-y-6">
          <div
            className="animate-fade-up"
            style={{ animationDelay: "0.1s", animationFillMode: "backwards" }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-8 h-px bg-terracotta" />
              <span className="text-terracotta text-sm uppercase tracking-widest">
                Family-owned · Est. 2018
              </span>
            </div>
          </div>
          <div
            className="flex flex-wrap gap-3 animate-fade-up"
            style={{ animationDelay: "0.15s", animationFillMode: "backwards" }}
          >
            <Link href="#quote">
              <Button variant="primary" size="lg">
                Request a Quote
              </Button>
            </Link>
            <Link href="/menu">
              <Button variant="ghost" size="lg">
                View Menu
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="lg">
                Login
              </Button>
            </Link>
          </div>
          <h1
            className="font-display text-5xl md:text-6xl lg:text-7xl font-light text-dark mb-6 animate-fade-up"
            style={{ animationDelay: "0.2s", animationFillMode: "backwards" }}
          >
            Fresh meals for every{" "}
            <span className="italic text-olive">occasion</span>
          </h1>
          <p
            className="text-muted text-lg mb-8 animate-fade-up"
            style={{ animationDelay: "0.3s", animationFillMode: "backwards" }}
          >
            Box lunches, grab-and-go items, and full catering for corporate
            events, schools, and private gatherings. Made fresh, delivered with care.
          </p>
        </div>
      </div>

      {/* Right column - hero image */}
      <div className="relative min-h-[50vh] lg:min-h-screen overflow-hidden w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt="Fresh catering - box lunches and grab-and-go meals"
          className="absolute inset-0 w-full h-full object-cover object-center"
          fetchPriority="high"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-cream/40 to-transparent"
          aria-hidden
        />
        {/* Floating badge */}
        <div className="absolute bottom-8 left-8 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg px-6 py-4">
          <p className="font-display text-4xl font-semibold text-dark">500+</p>
          <p className="text-muted text-sm">Events served</p>
        </div>
      </div>
    </section>
  );
}
