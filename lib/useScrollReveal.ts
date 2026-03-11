"use client";

import { useEffect, useCallback, useRef } from "react";

interface ScrollRevealOptions {
  once?: boolean;
}

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: ScrollRevealOptions = {},
) {
  const { once = true } = options;
  const nodeRef = useRef<T | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const setupObserver = useCallback((node: T) => {
    const reveal = () => {
      node.classList.add("revealed");
      if (once && cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          reveal();
        } else if (!once) {
          node.classList.remove("revealed");
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px -20px 0px" },
    );

    const onScroll = () => {
      if (node.classList.contains("revealed")) return;
      const r = node.getBoundingClientRect();
      if (r.top < window.innerHeight + 20 && r.bottom > -20) reveal();
    };

    observer.observe(node);
    window.addEventListener("scroll", onScroll, { passive: true });

    cleanupRef.current = () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };

    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight + 20 && rect.bottom > -20) {
      requestAnimationFrame(reveal);
    }
  }, [once]);

  const ref = useCallback(
    (node: T | null) => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      nodeRef.current = node;
      if (!node) return;

      node.classList.add("reveal");
      setupObserver(node);
    },
    [setupObserver],
  );

  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, []);

  return ref;
}
