"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Gift, Star, Users, Copy, Check, ArrowRight, Loader2, Trophy } from "lucide-react";

type LoyaltyData = {
  loyaltyPoints: number;
  loyaltyTier: string;
  totalSpent: number;
  totalOrders: number;
  leadScore: number;
  referralCode: string | null;
  nextTier: string | null;
  pointsToNext: number;
  tiers: Record<string, number>;
  tierBenefits: Record<string, string[]>;
};

type ReferralEntry = {
  id: string;
  status: string;
  rewardPoints: number;
  createdAt: string;
  referred: { name: string; email: string; createdAt: string };
};

const TIER_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  BRONZE: { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-300" },
  SILVER: { bg: "bg-gray-100", text: "text-gray-700", ring: "ring-gray-300" },
  GOLD: { bg: "bg-yellow-100", text: "text-yellow-800", ring: "ring-yellow-400" },
  PLATINUM: { bg: "bg-purple-100", text: "text-purple-800", ring: "ring-purple-400" },
};

export default function LoyaltyPage() {
  const { data: session } = useSession();
  const [loyalty, setLoyalty] = useState<LoyaltyData | null>(null);
  const [referrals, setReferrals] = useState<ReferralEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState("");
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [loyaltyRes, refRes] = await Promise.all([
        fetch("/api/loyalty"),
        fetch("/api/referrals"),
      ]);
      if (loyaltyRes.ok) setLoyalty(await loyaltyRes.json());
      if (refRes.ok) {
        const data = await refRes.json();
        setReferrals(data.referrals || []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!session) return null;

  const generateCode = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-code" }),
      });
      const data = await res.json();
      if (res.ok && data.code) load();
    } catch { /* ignore */ }
    setGenerating(false);
  };

  const applyCode = async () => {
    setMsg("");
    if (!codeInput.trim()) return;
    try {
      const res = await fetch("/api/referrals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply-code", code: codeInput }),
      });
      const data = await res.json();
      if (res.ok) {
        setMsg(data.message || "Referral applied!");
        setCodeInput("");
        load();
      } else {
        setMsg(data.error || "Error");
      }
    } catch {
      setMsg("Network error");
    }
  };

  const copyCode = () => {
    if (loyalty?.referralCode) {
      navigator.clipboard.writeText(loyalty.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-muted py-12"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>;
  }

  if (!loyalty) {
    return <div className="text-muted py-8">Could not load loyalty data.</div>;
  }

  const tc = TIER_COLORS[loyalty.loyaltyTier] || TIER_COLORS.BRONZE;
  const progress = loyalty.nextTier && loyalty.tiers[loyalty.nextTier]
    ? Math.min(100, (loyalty.loyaltyPoints / loyalty.tiers[loyalty.nextTier]) * 100)
    : 100;

  return (
    <div className="max-w-4xl space-y-6">
      <h1 className="font-display text-2xl text-dark">Loyalty & Referrals</h1>

      {/* Tier Card */}
      <div className={`${tc.bg} rounded-2xl p-6 ring-1 ${tc.ring}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Trophy className={`w-8 h-8 ${tc.text}`} />
            <div>
              <p className={`text-sm uppercase tracking-wider font-medium ${tc.text}`}>{loyalty.loyaltyTier} Tier</p>
              <p className="text-2xl font-display text-dark">{loyalty.loyaltyPoints.toLocaleString()} points</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted">{loyalty.totalOrders} orders</p>
            <p className="text-sm font-medium text-dark">${loyalty.totalSpent.toFixed(2)} spent</p>
          </div>
        </div>

        {loyalty.nextTier && (
          <div>
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>{loyalty.loyaltyTier}</span>
              <span>{loyalty.nextTier} ({loyalty.pointsToNext} points to go)</span>
            </div>
            <div className="w-full h-2 bg-white/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${
                loyalty.loyaltyTier === "BRONZE" ? "bg-amber-500" :
                loyalty.loyaltyTier === "SILVER" ? "bg-gray-500" :
                loyalty.loyaltyTier === "GOLD" ? "bg-yellow-500" : "bg-purple-500"
              }`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Benefits */}
      <div className="bg-white border border-stone/30 rounded-lg p-5">
        <h3 className="font-display text-lg text-dark mb-4 flex items-center gap-2">
          <Star className="w-5 h-5 text-terracotta" /> Tier Benefits
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(loyalty.tierBenefits).map(([tier, benefits]) => {
            const isActive = loyalty.loyaltyTier === tier;
            const tierC = TIER_COLORS[tier] || TIER_COLORS.BRONZE;
            return (
              <div key={tier} className={`rounded-lg p-4 border ${isActive ? `${tierC.bg} border-current ring-2 ${tierC.ring}` : "bg-warm border-stone/20"}`}>
                <p className={`text-sm font-medium uppercase tracking-wider mb-2 ${isActive ? tierC.text : "text-muted"}`}>{tier}</p>
                <ul className="space-y-1">
                  {benefits.map((b, i) => (
                    <li key={i} className={`text-xs ${isActive ? "text-dark" : "text-muted"}`}>
                      {isActive ? "✓" : "·"} {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      {/* Referral Section */}
      <div className="bg-white border border-stone/30 rounded-lg p-5">
        <h3 className="font-display text-lg text-dark mb-4 flex items-center gap-2">
          <Gift className="w-5 h-5 text-terracotta" /> Referral Program
        </h3>
        <p className="text-sm text-muted mb-4">
          Share your code with friends. You earn <strong className="text-dark">100 points</strong> when they sign up, 
          and they get <strong className="text-dark">50 points</strong> as a welcome bonus.
        </p>

        {loyalty.referralCode ? (
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 bg-warm rounded-lg px-4 py-3 font-mono text-lg text-dark tracking-wider text-center">
              {loyalty.referralCode}
            </div>
            <button onClick={copyCode}
              className="p-3 bg-dark text-cream rounded-lg hover:bg-dark/90 transition-all" title="Copy code">
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        ) : (
          <button onClick={generateCode} disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-terracotta text-cream rounded-lg hover:bg-terracotta/90 disabled:opacity-50 text-sm mb-4">
            <Gift className="w-4 h-4" /> {generating ? "Generating..." : "Generate My Referral Code"}
          </button>
        )}

        {/* Apply a code */}
        <div className="border-t border-stone/20 pt-4 mt-4">
          <p className="text-sm text-muted mb-2">Have a referral code from someone?</p>
          <div className="flex gap-2">
            <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter code (e.g. SC-ABC123)"
              className="flex-1 bg-cream border border-stone/40 rounded-lg px-3 py-2 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
            <button onClick={applyCode}
              className="flex items-center gap-1.5 px-4 py-2 bg-olive text-cream rounded-lg hover:bg-olive/90 text-sm">
              Apply <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {msg && <p className={`text-sm mt-2 ${msg.includes("!") ? "text-olive" : "text-red-600"}`}>{msg}</p>}
        </div>
      </div>

      {/* Referral History */}
      {referrals.length > 0 && (
        <div className="bg-white border border-stone/30 rounded-lg p-5">
          <h3 className="font-display text-lg text-dark mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-terracotta" /> Your Referrals
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone/20">
                <th className="text-left p-2 font-medium">Referred</th>
                <th className="text-left p-2 font-medium">Status</th>
                <th className="text-right p-2 font-medium">Points Earned</th>
                <th className="text-left p-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id} className="border-b border-stone/10">
                  <td className="p-2">
                    <p className="font-medium text-dark">{r.referred.name}</p>
                    <p className="text-xs text-muted">{r.referred.email}</p>
                  </td>
                  <td className="p-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === "REWARDED" ? "bg-olive/15 text-olive" :
                      r.status === "COMPLETED" ? "bg-blue-100 text-blue-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>{r.status}</span>
                  </td>
                  <td className="p-2 text-right font-medium">+{r.rewardPoints}</td>
                  <td className="p-2 text-muted">{new Date(r.createdAt).toLocaleDateString("en-US")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
