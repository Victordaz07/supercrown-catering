import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Gauge,
  Gift,
  Layers,
  ShieldCheck,
  Truck,
  Users,
} from "lucide-react";

const kpiImpact = [
  "15% - 35% lower order processing friction",
  "20% - 50% faster internal status handoffs",
  "10% - 30% fewer post-delivery billing disputes",
  "5% - 15% improvement in average order value",
];

const rolloutPhases = [
  {
    phase: "Phase 1",
    title: "Core Control",
    points: ["Orders", "Statuses", "Invoices", "Role access"],
  },
  {
    phase: "Phase 2",
    title: "Operational Excellence",
    points: ["Routing", "Delivery verification", "Evidence workflows"],
  },
  {
    phase: "Phase 3",
    title: "Growth Optimization",
    points: ["Pricing tiers", "Coupons", "Upsells", "Loyalty & referrals"],
  },
  {
    phase: "Phase 4",
    title: "Executive Intelligence",
    points: ["Advanced reporting", "Integrations", "Multi-branch standards"],
  },
];

const liveNow = [
  "Unified login flow with role-aware redirects using NextAuth + Prisma.",
  "Internal operation hub for Master, Admin, Sales, and Delivery roles.",
  "Client portal at /client with protected routes for orders, loyalty, and offers.",
  "Role hardening between internal dashboard and client area.",
  "Customer email normalization (trim + lowercase) for cleaner order matching.",
];

const businessModules = [
  {
    title: "Sales and Orders",
    icon: ClipboardCheck,
    points: [
      "Order intake and editing",
      "Status transitions across fulfillment",
      "Controlled rollback and approval trail",
    ],
  },
  {
    title: "Pricing and Revenue Growth",
    icon: CircleDollarSign,
    points: [
      "Quantity-based price tiers",
      "Suggested pricing and discount logic",
      "Coupon and upsell recommendations",
    ],
  },
  {
    title: "Delivery and Route Operations",
    icon: Truck,
    points: [
      "Multi-stop planning and driver assignment",
      "Google Maps links for single and multi-stop routes",
      "Vehicle recommendation with cooling rules",
    ],
  },
  {
    title: "Audit and Governance",
    icon: ShieldCheck,
    points: [
      "Role hierarchy and permissions",
      "Immutable business action traceability",
      "Approval and rejection history",
    ],
  },
];

const workflowSteps = [
  "Quote or order is created or updated",
  "Pricing is validated (tiers, rules, discounts, coupons)",
  "Order is confirmed and prepared",
  "Route and vehicle recommendation are generated",
  "Driver executes stops and records outcomes",
  "Delivery review and adjustments if needed",
  "Finance tracks invoice lifecycle and payment",
  "Leadership audits key actions in one timeline",
];

const investmentRanges = [
  {
    scope: "Process Discovery + Functional Blueprint",
    range: "$4,000 - $15,000",
    timeline: "2 - 6 weeks",
  },
  {
    scope: "MVP (Sales + Orders + Basic Delivery + Invoicing)",
    range: "$25,000 - $80,000",
    timeline: "8 - 16 weeks",
  },
  {
    scope: "Full Platform (roles, routes, audits, approvals, pricing)",
    range: "$80,000 - $220,000+",
    timeline: "4 - 9+ months",
  },
  {
    scope: "Enterprise Version (multi-branch + deep integrations)",
    range: "$220,000 - $600,000+",
    timeline: "9 - 18+ months",
  },
];

const budgetDrivers = [
  "Module count and workflow complexity",
  "Approval and governance requirements",
  "ERP / accounting / CRM / payment integrations",
  "Reporting depth and analytics requirements",
  "Security, compliance, and deployment standards",
];

export default function ProjectBriefPage() {
  return (
    <main className="min-h-screen bg-cream text-dark">
      <section className="max-w-6xl mx-auto px-4 sm:px-6 md:px-12 py-12 md:py-16 space-y-8">
        <header className="bg-white border border-stone/30 rounded-3xl p-8 md:p-10 shadow-sm">
          <div className="inline-flex items-center gap-3 mb-4 px-3 py-1.5 rounded-full border border-stone/40 bg-warm/70">
            <BookOpenText className="w-4 h-4 text-terracotta" />
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted">Executive project brief</p>
          </div>
          <h1 className="font-display text-4xl md:text-6xl leading-tight">
            Super Crown Catering Platform
          </h1>
          <p className="text-muted mt-5 max-w-3xl text-lg">
            An end-to-end business platform that aligns sales, operations, delivery, finance, and
            leadership in one system to scale with control and protect margin.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-3">
            {kpiImpact.map((kpi) => (
              <div key={kpi} className="rounded-xl border border-stone/30 bg-cream/80 p-4">
                <div className="flex items-start gap-2">
                  <Gauge className="w-4 h-4 mt-0.5 text-terracotta" />
                  <p className="text-sm text-muted leading-relaxed">{kpi}</p>
                </div>
              </div>
            ))}
          </div>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <article className="bg-white border border-stone/30 rounded-2xl p-6 md:p-7">
            <h2 className="font-display text-3xl mb-4">Business problem</h2>
            <ul className="space-y-3 text-muted text-sm md:text-base">
              <li>- Sales, operations, delivery, and finance often run in disconnected tools.</li>
              <li>- Status changes and pricing adjustments can create confusion and margin leakage.</li>
              <li>- Leadership lacks one trusted source of truth for performance and accountability.</li>
            </ul>
          </article>
          <article className="bg-dark text-cream rounded-2xl p-6 md:p-7 border border-dark/80">
            <h2 className="font-display text-3xl mb-4">Business outcome</h2>
            <ul className="space-y-3 text-stone text-sm md:text-base">
              <li>- Unified workflow from order intake to verified delivery and billing closure.</li>
              <li>- Faster decisions through role-based visibility and approval controls.</li>
              <li>- Better margin protection via discipline, auditability, and fewer disputes.</li>
            </ul>
            <div className="mt-5 rounded-xl bg-white/5 border border-white/10 p-4">
              <p className="text-sm">
                Strategic value:
                <span className="text-white font-medium">
                  {" "}
                  turns catering operations into a scalable, controllable,
                  revenue-protecting system.
                </span>
              </p>
            </div>
          </article>
        </section>

        <section className="bg-white border border-stone/30 rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-terracotta" />
            <h3 className="font-display text-3xl">Recommended rollout</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {rolloutPhases.map((phase) => (
              <article
                key={phase.phase}
                className="rounded-xl border border-stone/30 bg-warm/40 p-4 min-h-[180px]"
              >
                <p className="text-xs uppercase tracking-widest text-muted">{phase.phase}</p>
                <h4 className="font-display text-2xl mt-1 mb-3">{phase.title}</h4>
                <ul className="space-y-1.5 text-sm text-muted">
                  {phase.points.map((point) => (
                    <li key={point}>- {point}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-dark text-cream rounded-2xl p-6 md:p-8">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-terracotta" />
            <h3 className="font-display text-3xl">Current implementation status (March 2026)</h3>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ul className="space-y-3 text-stone">
              {liveNow.map((item) => (
                <li key={item} className="flex gap-2">
                  <ArrowRight className="w-4 h-4 text-terracotta mt-1 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-xl bg-white/5 border border-white/10 p-5">
              <p className="text-sm uppercase tracking-wider text-stone mb-2">Presentation-ready story</p>
              <p className="text-base leading-relaxed">
                This release enables a full customer-facing experience while preserving strict internal
                controls, allowing decision-makers to evaluate both operational command and client
                self-service in one demo.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-terracotta" />
            <h3 className="font-display text-3xl">Core business modules</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businessModules.map((module) => {
              const Icon = module.icon;
              return (
                <article key={module.title} className="bg-white border border-stone/30 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="w-5 h-5 text-terracotta" />
                    <h4 className="font-display text-2xl">{module.title}</h4>
                  </div>
                  <ul className="space-y-2 text-muted text-sm">
                    {module.points.map((point) => (
                      <li key={point}>- {point}</li>
                    ))}
                  </ul>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bg-white border border-stone/30 rounded-2xl p-6 md:p-8">
          <h3 className="font-display text-3xl mb-4">Typical workflow (business view)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {workflowSteps.map((step, index) => (
              <div key={step} className="rounded-xl border border-stone/30 bg-cream/70 p-4">
                <p className="text-xs uppercase tracking-widest text-muted mb-2">Step {index + 1}</p>
                <p className="text-sm text-dark">{step}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-2 text-sm text-muted">
            <Gift className="w-4 h-4 text-terracotta" />
            Clients follow orders, loyalty, and offers directly from the portal.
          </div>
        </section>

        <section className="bg-white border border-stone/30 rounded-2xl p-6 md:p-8 space-y-5">
          <h3 className="font-display text-3xl">Typical market investment ranges (reference)</h3>
          <p className="text-muted text-sm">
            These values are directional market references for similar custom platforms and not a formal quote.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-stone/40 text-muted text-sm">
                  <th className="py-2 pr-4 font-medium">Project scope</th>
                  <th className="py-2 pr-4 font-medium">Typical range (USD)</th>
                  <th className="py-2 font-medium">Timeline</th>
                </tr>
              </thead>
              <tbody>
                {investmentRanges.map((row) => (
                  <tr key={row.scope} className="border-b border-stone/20 text-sm">
                    <td className="py-3 pr-4">{row.scope}</td>
                    <td className="py-3 pr-4 text-dark font-medium">{row.range}</td>
                    <td className="py-3">{row.timeline}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rounded-xl bg-warm/45 border border-stone/30 p-4">
            <p className="text-sm uppercase tracking-wider text-muted mb-2">Main budget drivers</p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-dark">
              {budgetDrivers.map((driver) => (
                <li key={driver}>- {driver}</li>
              ))}
            </ul>
          </div>
        </section>

        <footer className="rounded-2xl border border-stone/30 bg-dark text-stone p-6 md:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-terracotta" />
            <p className="text-xs uppercase tracking-[0.2em]">Commercial positioning note</p>
          </div>
          <p className="text-sm leading-relaxed max-w-4xl">
            Position the platform as an operations and margin-protection system. Emphasize control,
            speed, accountability, and scalability. Recommend phased execution (MVP first, then
            expansions) and tie each module to measurable business outcomes.
          </p>
        </footer>
      </section>
    </main>
  );
}
