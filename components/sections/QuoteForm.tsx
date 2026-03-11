"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, X, Plus, Minus } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useCart } from "@/lib/cartStore";
import { onAuthChange, getUserRole } from "@/lib/firebase/auth";
import type { User } from "firebase/auth";

const QUOTE_FORM_STORAGE_KEY = "supercrown-quote-form";

export function QuoteForm() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, totalItems } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<{ user: User; role: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const loadFormFromStorage = () => {
    if (typeof window === "undefined") return null;
    try {
      const raw = sessionStorage.getItem(QUOTE_FORM_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") return parsed;
      }
    } catch {
      /* ignore */
    }
    return null;
  };

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    eventDate: "",
    deliveryAddress: "",
    numberOfPeople: "",
    typeOfService: "",
    eventDetails: "",
    budget: "",
  });

  useEffect(() => {
    const saved = loadFormFromStorage();
    if (saved) setFormData(saved);
  }, []);

  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (!user) {
        setAuthUser(null);
        setAuthLoading(false);
        return;
      }
      const role = await getUserRole(user);
      if (role === "client") {
        setAuthUser({ user, role });
        setFormData((prev) => ({
          ...prev,
          name: prev.name || (user.displayName ?? ""),
          email: prev.email || (user.email ?? ""),
        }));
      } else {
        setAuthUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const isClientLoggedIn = authUser?.role === "client";

  const handleSubmit = async (e: React.FormEvent) => {
    if (!isClientLoggedIn) {
      router.push("/login?from=%2F%23quote");
      return;
    }
    setError(null);
    try {
      const payload = {
        contactInfo: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          eventDate: formData.eventDate,
          deliveryAddress: formData.deliveryAddress,
          guestCount: formData.numberOfPeople,
          eventDetails: formData.eventDetails,
          typeOfService: formData.typeOfService || undefined,
        },
        cartItems: items,
        budget: formData.budget || undefined,
      };
      const res = await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSubmitted(true);
      setSimulated(data.simulated ?? false);
      clearCart();
      sessionStorage.removeItem(QUOTE_FORM_STORAGE_KEY);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again or contact us.");
    }
  };

  useEffect(() => {
    if (Object.values(formData).some(Boolean)) {
      sessionStorage.setItem(QUOTE_FORM_STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const inputStyles =
    "w-full bg-cream border border-stone rounded-sm px-4 py-3 focus:outline-none focus:border-terracotta transition-colors";

  return (
    <section id="quote" className="bg-warm py-16 md:py-24 px-4 sm:px-6 md:px-20 scroll-mt-24 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left column */}
          <div className="min-w-0">
            <SectionHeader
              label="Ready to order?"
              title="Get a free quote"
            />
            <p className="text-muted mb-8">
              Tell us about your event and we&apos;ll get back to you within 24 hours
              with a custom quote. No obligation.
            </p>
            <div className="bg-cream border-l-4 border-terracotta p-6 rounded-r">
              <p className="font-display italic text-dark text-lg">
                &ldquo;We believe every event deserves fresh, delicious food made with care.&rdquo;
              </p>
              <p className="text-muted text-sm mt-2">— Super Crown Team</p>
            </div>
          </div>

          {/* Right column - Form */}
          <div className="min-w-0">
            {items.length > 0 ? (
              <div className="bg-cream border border-stone/40 rounded-sm p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl text-dark">Your selected items</h3>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-muted underline hover:text-dark"
                  >
                    Clear all
                  </button>
                </div>
                <div className="divide-y divide-stone/20">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="py-4 flex flex-wrap items-center gap-3 justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-dark">{item.name}</p>
                        <p className="text-terracotta text-xs uppercase">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 text-muted hover:text-dark"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-medium text-dark min-w-[1.5rem] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 text-muted hover:text-dark"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1.5 text-muted hover:text-terracotta ml-2"
                          aria-label="Remove item"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted mt-3">Total items: {totalItems}</p>
              </div>
            ) : (
              <div className="bg-warm border border-dashed border-stone rounded-sm p-10 text-center mb-8">
                <ShoppingBag className="w-12 h-12 text-stone mx-auto mb-3" />
                <h3 className="font-display text-dark mb-2">No items yet</h3>
                <p className="text-muted text-sm mb-4">
                  Browse our menu to add items to your quote
                </p>
                <Link
                  href="/menu"
                  className="inline-block text-terracotta hover:underline text-sm"
                >
                  Browse Menu →
                </Link>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(e);
              }}
              action="#"
              className="space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={inputStyles}
                    required
                  />
                </div>
                <div>
                  <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={inputStyles}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className={inputStyles}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                    Event Date
                  </label>
                  <input
                    type="date"
                    name="eventDate"
                    value={formData.eventDate}
                    onChange={handleChange}
                    className={inputStyles}
                  />
                </div>
                <div>
                  <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    name="deliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={handleChange}
                    className={inputStyles}
                    placeholder="Full delivery address including city and zip"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                  Number of People
                </label>
                <input
                  type="number"
                  name="numberOfPeople"
                  value={formData.numberOfPeople}
                  onChange={handleChange}
                  className={inputStyles}
                  min="1"
                />
              </div>

              <div>
                <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                  Approximate budget per person (optional)
                </label>
                <select
                  name="budget"
                  value={formData.budget}
                  onChange={handleChange}
                  className={inputStyles}
                >
                  <option value="">Select a range...</option>
                  <option value="under-10">Under $10 per person</option>
                  <option value="10-15">$10 – $15 per person</option>
                  <option value="15-20">$15 – $20 per person</option>
                  <option value="20-plus">$20+ per person</option>
                </select>
              </div>

              <div>
                <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                  Type of Service
                </label>
                <select
                  name="typeOfService"
                  value={formData.typeOfService}
                  onChange={handleChange}
                  className={inputStyles}
                >
                  <option value="">Select...</option>
                  <option value="box-lunches">Box Lunches</option>
                  <option value="grab-n-go">Grab-n-Go</option>
                  <option value="both">Both</option>
                  <option value="not-sure">Not sure</option>
                </select>
              </div>

              <div>
                <label className="block text-muted text-xs uppercase tracking-wider mb-2">
                  Event Details
                </label>
                <textarea
                  name="eventDetails"
                  value={formData.eventDetails}
                  onChange={handleChange}
                  className={`${inputStyles} min-h-[100px] resize-y`}
                  placeholder="Tell us about your event..."
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-sm text-sm">
                  {error}
                </div>
              )}
              {submitted ? (
                <div className="space-y-2">
                  <div className="bg-olive/20 text-olive px-4 py-3 rounded-sm">
                    Thanks! We&apos;ll review your quote and get back to you within 24 hours
                    with personalized pricing.
                  </div>
                  {simulated && (
                    <p className="text-xs text-muted">
                      (Beta: simulated request — email was not sent)
                    </p>
                  )}
                </div>
              ) : (
                <>
                  {!isClientLoggedIn && !authLoading && (
                    <p className="text-muted text-sm mb-3">
                      Sign in or create your account to submit your quote.
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full bg-terracotta text-cream py-4 px-6 font-medium hover:bg-terracotta/90 active:scale-[0.98] transition-all rounded-sm disabled:opacity-70"
                  >
                    {authLoading
                      ? "Loading..."
                      : isClientLoggedIn
                        ? "Request My Free Quote →"
                        : "Login to submit"}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
