"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { heroImage } from "@/lib/data";

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1800;
          const steps = 60;
          const increment = target / steps;
          let current = 0;
          const interval = setInterval(() => {
            current += increment;
            if (current >= target) {
              setCount(target);
              clearInterval(interval);
            } else {
              setCount(Math.floor(current));
            }
          }, duration / steps);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref} className="font-display text-4xl font-semibold text-dark tabular-nums">
      {count}{suffix}
    </span>
  );
}

export function Hero() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="min-h-screen grid grid-cols-1 lg:grid-cols-2 w-full">
      {/* Left column */}
      <div className="bg-cream flex flex-col justify-center px-6 lg:px-16 pt-28 lg:pt-0 pb-12 lg:pb-0">
        <div className="max-w-xl space-y-6">
          <div
            className="animate-fade-up"
            style={{ animationDelay: "0.1s", animationFillMode: "backwards" }}
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-px bg-terracotta" />
              <span className="text-terracotta text-sm uppercase tracking-widest">
                Family-owned · Est. 2018
              </span>
            </div>
          </div>

          <h1
            className="font-display text-5xl md:text-6xl lg:text-7xl font-light text-dark mb-6 animate-fade-up leading-[1.1]"
            style={{ animationDelay: "0.25s", animationFillMode: "backwards" }}
          >
            Fresh meals for every{" "}
            <span className="italic text-olive">occasion</span>
          </h1>

          <div
            className="flex items-center gap-3 animate-fade-up"
            style={{ animationDelay: "0.35s", animationFillMode: "backwards" }}
          >
            <div className="w-1 h-12 bg-terracotta/30 rounded-full" />
            <p className="text-muted text-lg">
              Box lunches, grab-and-go items, and full catering for corporate
              events, schools, and private gatherings. Made fresh, delivered with care.
            </p>
          </div>

          <div
            className="flex flex-wrap gap-4 pt-2 animate-fade-up"
            style={{ animationDelay: "0.5s", animationFillMode: "backwards" }}
          >
            <Link href="#quote">
              <Button variant="secondary" size="lg" className="group gap-2">
                Request a Quote
                <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/menu">
              <Button variant="outline" size="lg">
                View Menu
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="lg">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Right column - hero image */}
      <div className="relative min-h-[50vh] lg:min-h-screen overflow-hidden w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImage}
          alt="Fresh catering - box lunches and grab-and-go meals"
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-100 will-change-transform"
          style={{ transform: `translateY(${scrollY * 0.08}px) scale(1.05)` }}
          fetchPriority="high"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-cream/50 via-cream/20 to-transparent"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-dark/20 to-transparent"
          aria-hidden
        />

        {/* Floating badge */}
        <div className="absolute bottom-8 left-8 glass rounded-2xl shadow-xl px-7 py-5 border border-white/30">
          <AnimatedCounter target={500} suffix="+" />
          <p className="text-muted text-sm mt-0.5">Events served</p>
        </div>
      </div>
    </section>
  );
}
