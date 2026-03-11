"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, X, Plus, Minus, ArrowRight, CheckCircle, AlertCircle, UserPlus, Eye, EyeOff, Star, Bell, Clock, Gift } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useCart } from "@/lib/cartStore";
import { signIn } from "next-auth/react";

function FloatingInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  required = false,
  placeholder,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  placeholder?: string;
  min?: string;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        placeholder={placeholder || " "}
        min={min}
        className="peer w-full bg-cream border border-stone/40 rounded-xl px-4 pt-6 pb-2 text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all duration-300 placeholder-transparent"
      />
      <label
        className="absolute left-4 top-2 text-[11px] uppercase tracking-wider text-muted transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-terracotta"
      >
        {label}
      </label>
    </div>
  );
}

function FloatingSelect({
  label,
  name,
  value,
  onChange,
  children,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="peer w-full bg-cream border border-stone/40 rounded-xl px-4 pt-6 pb-2 text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all duration-300 appearance-none cursor-pointer"
      >
        {children}
      </select>
      <label className="absolute left-4 top-2 text-[11px] uppercase tracking-wider text-muted pointer-events-none">
        {label}
      </label>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
        <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export function QuoteForm() {
  const { items, removeItem, updateQuantity, clearCart, totalItems } = useCart();
  const [submitted, setSubmitted] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountStep, setAccountStep] = useState<"prompt" | "form" | "done" | null>(null);
  const [accountPassword, setAccountPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    deliveryAddress: "",
    eventDate: "",
    numberOfPeople: "",
    typeOfService: "",
    eventDetails: "",
    budget: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        contactInfo: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          deliveryAddress: formData.deliveryAddress,
          eventDate: formData.eventDate,
          guestCount: formData.numberOfPeople,
          eventDetails: formData.eventDetails,
        },
        cartItems: items,
        budget: formData.budget || undefined,
        typeOfService: formData.typeOfService || undefined,
      };
      const res = await fetch("/api/send-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to send");
      setSubmitted(true);
      setSimulated(data.simulated ?? false);
      setAccountStep("prompt");
      clearCart();
    } catch {
      setError("Something went wrong. Please try again or contact us directly.");
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountError(null);
    setAccountLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: accountPassword,
          marketingConsent,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not create account");

      await signIn("credentials", {
        email: formData.email,
        password: accountPassword,
        redirect: false,
      });

      setAccountStep("done");
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Error creating account");
    } finally {
      setAccountLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <section id="quote" className="bg-warm py-20 md:py-28 px-4 sm:px-6 md:px-20 scroll-mt-24 w-full">
      <div className="max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left column */}
          <div className="min-w-0">
            <SectionHeader
              label="Ready to order?"
              title="Get a free quote"
            />
            <p className="text-muted mb-8 text-lg leading-relaxed">
              Tell us about your event and we&apos;ll get back to you within 24 hours
              with a custom quote. No obligation.
            </p>
            <div className="bg-cream border-l-4 border-terracotta p-6 rounded-r-xl">
              <p className="font-display italic text-dark text-xl leading-relaxed">
                &ldquo;We believe every event deserves fresh, delicious food made with care.&rdquo;
              </p>
              <p className="text-muted text-sm mt-3">— Super Crown Team</p>
            </div>
          </div>

          {/* Right column - Form */}
          <div className="min-w-0">
            {items.length > 0 ? (
              <div className="bg-cream border border-stone/30 rounded-2xl p-6 mb-8 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl text-dark">Your selected items</h3>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-muted hover:text-terracotta transition-colors underline"
                  >
                    Clear all
                  </button>
                </div>
                <div className="divide-y divide-stone/15">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="py-3 flex flex-wrap items-center gap-3 justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-dark">{item.name}</p>
                        <p className="text-terracotta text-xs uppercase">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-warm hover:text-dark transition-all"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-medium text-dark min-w-[2rem] text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-warm hover:text-dark transition-all"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-terracotta ml-1 transition-all"
                          aria-label="Remove item"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted mt-3 pt-3 border-t border-stone/15">
                  {totalItems} items selected
                </p>
              </div>
            ) : (
              <div className="bg-cream/50 border-2 border-dashed border-stone/30 rounded-2xl p-12 text-center mb-8">
                <div className="w-16 h-16 rounded-full bg-stone/10 flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag className="w-7 h-7 text-stone" />
                </div>
                <h3 className="font-display text-dark text-lg mb-2">No items yet</h3>
                <p className="text-muted text-sm mb-5">
                  Browse our menu to add items to your quote
                </p>
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-2 text-terracotta hover:text-terracotta/80 text-sm font-medium transition-colors"
                >
                  Browse Menu
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FloatingInput
                  label="Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <FloatingInput
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>

              <FloatingInput
                label="Delivery Address"
                name="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={handleChange}
                placeholder="Street, City, State, ZIP"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FloatingInput
                  label="Phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                />
                <FloatingInput
                  label="Event Date"
                  name="eventDate"
                  type="date"
                  value={formData.eventDate}
                  onChange={handleChange}
                  required
                />
                <FloatingInput
                  label="Number of People"
                  name="numberOfPeople"
                  type="number"
                  value={formData.numberOfPeople}
                  onChange={handleChange}
                  min="1"
                />
              </div>

              <FloatingSelect
                label="Budget per person (optional)"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
              >
                <option value="">Select a range...</option>
                <option value="under-10">Under $10 per person</option>
                <option value="10-15">$10 - $15 per person</option>
                <option value="15-20">$15 - $20 per person</option>
                <option value="20-plus">$20+ per person</option>
              </FloatingSelect>

              <FloatingSelect
                label="Type of Service"
                name="typeOfService"
                value={formData.typeOfService}
                onChange={handleChange}
              >
                <option value="">Select...</option>
                <option value="box-lunches">Box Lunches</option>
                <option value="grab-n-go">Grab-n-Go</option>
                <option value="both">Both</option>
                <option value="not-sure">Not sure</option>
              </FloatingSelect>

              <div className="relative">
                <textarea
                  name="eventDetails"
                  value={formData.eventDetails}
                  onChange={handleChange}
                  className="peer w-full bg-cream border border-stone/40 rounded-xl px-4 pt-6 pb-3 text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all duration-300 min-h-[120px] resize-y placeholder-transparent"
                  placeholder=" "
                />
                <label className="absolute left-4 top-2 text-[11px] uppercase tracking-wider text-muted transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-terracotta pointer-events-none">
                  Event Details
                </label>
              </div>

              {error && (
                <div className="flex items-center gap-3 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm animate-fade-in">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              {submitted ? (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-3 bg-olive/15 text-olive px-5 py-4 rounded-xl">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <span>
                      Thanks! We&apos;ll review your quote and get back to you within 24 hours
                      with personalized pricing.
                    </span>
                  </div>
                  {simulated && (
                    <p className="text-xs text-muted pl-1">
                      (Beta: simulated request — email was not sent)
                    </p>
                  )}

                  {accountStep === "prompt" && (
                    <div className="bg-cream border border-stone/30 rounded-2xl p-6 shadow-sm animate-fade-in">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-terracotta/10 flex items-center justify-center">
                          <UserPlus className="w-5 h-5 text-terracotta" />
                        </div>
                        <div>
                          <h3 className="font-display text-lg text-dark">Create a free account?</h3>
                          <p className="text-muted text-xs">Optional — no obligation</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                        <div className="flex items-start gap-2.5 p-3 bg-warm rounded-xl">
                          <Clock className="w-4 h-4 text-terracotta mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-dark">Track your orders</p>
                            <p className="text-xs text-muted">Real-time status updates</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-3 bg-warm rounded-xl">
                          <Star className="w-4 h-4 text-terracotta mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-dark">Faster reorders</p>
                            <p className="text-xs text-muted">Your info saved for next time</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-3 bg-warm rounded-xl">
                          <Gift className="w-4 h-4 text-terracotta mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-dark">Exclusive deals</p>
                            <p className="text-xs text-muted">Early access to promotions</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-3 bg-warm rounded-xl">
                          <Bell className="w-4 h-4 text-terracotta mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-dark">Quote history</p>
                            <p className="text-xs text-muted">Access all your past requests</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setAccountStep("form")}
                          className="flex-1 bg-terracotta text-cream py-3 px-4 font-medium rounded-xl hover:bg-terracotta/90 transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Yes, create my account
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountStep(null)}
                          className="px-4 py-3 text-muted hover:text-dark text-sm rounded-xl border border-stone/30 hover:border-stone/50 transition-all duration-300"
                        >
                          No thanks
                        </button>
                      </div>
                    </div>
                  )}

                  {accountStep === "form" && (
                    <form onSubmit={handleCreateAccount} className="bg-cream border border-stone/30 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
                      <h3 className="font-display text-lg text-dark">Set up your account</h3>
                      <p className="text-muted text-sm -mt-2">
                        We&apos;ll use <strong className="text-dark">{formData.email}</strong> as your login email.
                      </p>

                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={accountPassword}
                          onChange={(e) => setAccountPassword(e.target.value)}
                          required
                          minLength={6}
                          placeholder=" "
                          className="peer w-full bg-cream border border-stone/40 rounded-xl px-4 pt-6 pb-2 pr-12 text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all duration-300 placeholder-transparent"
                        />
                        <label className="absolute left-4 top-2 text-[11px] uppercase tracking-wider text-muted transition-all duration-200 peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[11px] peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-terracotta pointer-events-none">
                          Choose a password
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-dark transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted -mt-2">Minimum 6 characters</p>

                      <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={marketingConsent}
                          onChange={(e) => setMarketingConsent(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-stone/40 text-terracotta focus:ring-terracotta/30 cursor-pointer"
                        />
                        <span className="text-sm text-muted group-hover:text-dark transition-colors">
                          Send me special offers, seasonal menus, and exclusive deals via email. You can unsubscribe anytime.
                        </span>
                      </label>

                      {accountError && (
                        <div className="flex items-center gap-3 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
                          <AlertCircle className="w-4 h-4 flex-shrink-0" />
                          {accountError}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={accountLoading}
                          className="flex-1 bg-terracotta text-cream py-3 px-4 font-medium rounded-xl hover:bg-terracotta/90 disabled:opacity-70 transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          {accountLoading ? "Creating..." : "Create account"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountStep(null)}
                          className="px-4 py-3 text-muted hover:text-dark text-sm rounded-xl border border-stone/30 hover:border-stone/50 transition-all duration-300"
                        >
                          Skip
                        </button>
                      </div>
                    </form>
                  )}

                  {accountStep === "done" && (
                    <div className="bg-cream border border-olive/30 rounded-2xl p-6 shadow-sm animate-fade-in">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-olive" />
                        <h3 className="font-display text-lg text-dark">Account created!</h3>
                      </div>
                      <p className="text-muted text-sm mb-4">
                        You&apos;re all set. You can now track your orders and manage your account.
                      </p>
                      <Link
                        href="/"
                        className="inline-flex items-center gap-2 text-terracotta hover:text-terracotta/80 text-sm font-medium transition-colors"
                      >
                        Go to my dashboard
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="submit"
                  className="w-full bg-terracotta text-cream py-4 px-6 font-medium rounded-xl hover:bg-terracotta/90 hover:shadow-lg active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  Request My Free Quote
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
