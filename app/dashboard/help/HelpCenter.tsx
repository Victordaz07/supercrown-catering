"use client";

import { useState, useMemo } from "react";
import {
  User,
  Truck,
  ShoppingBag,
  Shield,
  Crown,
  Info,
  GitBranch,
  ListOrdered,
  BookOpen,
  HelpCircle,
  Wrench,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Search,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import {
  GUIDES,
  ROLE_VISIBILITY,
  type RoleGuide,
  type Tutorial,
  type GlossaryTerm,
  type FAQItem,
  type TroubleshootItem,
  type ProcessNode,
} from "./guideData";

// ── Icon Maps ──────────────────────────────────────────────────────

const ROLE_ICON: Record<string, LucideIcon> = {
  user: User,
  truck: Truck,
  "shopping-bag": ShoppingBag,
  shield: Shield,
  crown: Crown,
};

const SECTION_ICON: Record<string, LucideIcon> = {
  overview: Info,
  process: GitBranch,
  tutorials: ListOrdered,
  glossary: BookOpen,
  faq: HelpCircle,
  troubleshooting: Wrench,
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "process", label: "Process Flow" },
  { id: "tutorials", label: "Step-by-Step" },
  { id: "glossary", label: "Glossary" },
  { id: "faq", label: "FAQ" },
  { id: "troubleshooting", label: "Troubleshooting" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ── Props ──────────────────────────────────────────────────────────

type Props = {
  userRole: string;
  userName: string;
};

// ── Main Component ─────────────────────────────────────────────────

export function HelpCenter({ userRole, userName }: Props) {
  const visibleRoles = ROLE_VISIBILITY[userRole] ?? [userRole];
  const [activeRole, setActiveRole] = useState(userRole);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");

  const guide = GUIDES[activeRole] ?? null;

  const mergedTutorials = useMemo(() => {
    if (!guide) return [];
    const tutorials: { section: string; items: Tutorial[] }[] = [];
    if (guide.inheritsFrom) {
      for (const parentRole of guide.inheritsFrom) {
        const parentGuide = GUIDES[parentRole];
        if (parentGuide?.tutorials.length) {
          tutorials.push({
            section: `${parentGuide.label} Operations`,
            items: parentGuide.tutorials,
          });
        }
      }
    }
    if (guide.tutorials.length) {
      tutorials.push({
        section: guide.inheritsFrom ? `${guide.label}-Specific Operations` : "Tutorials",
        items: guide.tutorials,
      });
    }
    return tutorials;
  }, [guide]);

  const mergedGlossary = useMemo(() => {
    if (!guide) return [];
    const seen = new Set<string>();
    const terms: GlossaryTerm[] = [];
    for (const t of guide.glossary) {
      if (!seen.has(t.term)) {
        seen.add(t.term);
        terms.push(t);
      }
    }
    return terms.sort((a, b) => a.term.localeCompare(b.term));
  }, [guide]);

  if (!guide) return null;

  return (
    <div className="space-y-4">
      {/* Role info bar */}
      <div className="bg-white rounded-xl border border-stone/20 px-4 py-3 shadow-sm flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted">Logged in as</span>
        <span className="font-medium text-dark">{userName}</span>
        <span className="text-muted">·</span>
        <span className="font-medium text-terracotta">{GUIDES[userRole]?.label ?? userRole}</span>
        {visibleRoles.length > 1 && (
          <>
            <span className="text-muted">·</span>
            <span className="text-muted">You can view {visibleRoles.length} role guides</span>
          </>
        )}
      </div>

      {/* Role Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {visibleRoles.map((r) => {
          const g = GUIDES[r];
          if (!g) return null;
          const Icon = ROLE_ICON[g.iconName] ?? User;
          const isActive = r === activeRole;
          const isCurrent = r === userRole;
          return (
            <button
              key={r}
              onClick={() => { setActiveRole(r); setActiveSection("overview"); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all border-2 ${
                isActive
                  ? "bg-terracotta text-cream border-terracotta shadow-md"
                  : isCurrent
                    ? "bg-terracotta/10 text-terracotta border-terracotta/30 hover:bg-terracotta/20"
                    : "bg-white text-dark border-stone/20 hover:border-stone/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              {g.label}
              {isCurrent && !isActive && (
                <span className="text-[10px] bg-terracotta/20 text-terracotta px-1.5 py-0.5 rounded-full">You</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {SECTIONS.map((s) => {
          const Icon = SECTION_ICON[s.id];
          const isActive = s.id === activeSection;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? "bg-dark text-cream"
                  : "bg-stone/10 text-muted hover:bg-stone/20 hover:text-dark"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-xl border border-stone/20 shadow-sm overflow-hidden">
        {activeSection === "overview" && <OverviewSection guide={guide} />}
        {activeSection === "process" && <ProcessFlowSection nodes={guide.processFlow} />}
        {activeSection === "tutorials" && <TutorialsSection groups={mergedTutorials} />}
        {activeSection === "glossary" && <GlossarySection terms={mergedGlossary} />}
        {activeSection === "faq" && <FAQSection items={guide.faq} />}
        {activeSection === "troubleshooting" && <TroubleshootSection items={guide.troubleshooting} />}
      </div>
    </div>
  );
}

// ── Overview Section ───────────────────────────────────────────────

function OverviewSection({ guide }: { guide: RoleGuide }) {
  const Icon = ROLE_ICON[guide.iconName] ?? User;
  return (
    <div className="p-5 md:p-6 space-y-6">
      {/* Role header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-terracotta/10 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-terracotta" />
        </div>
        <div>
          <h2 className="font-display text-xl text-dark">{guide.label}</h2>
          <p className="text-sm text-muted mt-1">{guide.summary}</p>
        </div>
      </div>

      {/* Main area + inherits */}
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="bg-stone/10 text-dark px-3 py-1.5 rounded-lg">
          Main area: <code className="text-terracotta">{guide.mainArea}</code>
        </span>
        {guide.inheritsFrom && (
          <span className="bg-olive/10 text-olive px-3 py-1.5 rounded-lg">
            Includes all {guide.inheritsFrom.map(r => GUIDES[r]?.label).join(" + ")} capabilities
          </span>
        )}
      </div>

      {/* Menu Access */}
      <div>
        <h3 className="text-xs uppercase tracking-wider text-muted mb-2">Menu Access</h3>
        <div className="flex flex-wrap gap-2">
          {guide.menuItems.map((item) => (
            <span key={item} className="text-sm bg-cream text-dark px-3 py-1.5 rounded-lg border border-stone/15">
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* Capabilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-olive" /> What you can do
          </h3>
          <ul className="space-y-2">
            {guide.capabilities.map((c, i) => (
              <li key={i} className="text-sm text-dark flex items-start gap-2">
                <Check className="w-4 h-4 text-olive shrink-0 mt-0.5" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>

        {guide.restrictions.length > 0 && (
          <div>
            <h3 className="text-xs uppercase tracking-wider text-muted mb-3 flex items-center gap-1.5">
              <X className="w-3.5 h-3.5 text-stone" /> Restrictions
            </h3>
            <ul className="space-y-2">
              {guide.restrictions.map((r, i) => (
                <li key={i} className="text-sm text-muted flex items-start gap-2">
                  <X className="w-4 h-4 text-stone shrink-0 mt-0.5" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Process Flow Section ───────────────────────────────────────────

function ProcessFlowSection({ nodes }: { nodes: ProcessNode[] }) {
  return (
    <div className="p-5 md:p-6">
      <h2 className="font-display text-lg text-dark mb-1">Process Flow</h2>
      <p className="text-sm text-muted mb-6">Visual overview of your main workflow from start to finish.</p>

      {/* Desktop: horizontal flow */}
      <div className="hidden md:flex flex-wrap items-start gap-1">
        {nodes.map((node, i) => (
          <div key={node.status} className="flex items-start">
            <div className="w-40 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-full bg-terracotta text-cream flex items-center justify-center text-sm font-bold">
                {i + 1}
              </div>
              <div className="mt-2 w-full">
                <p className="text-xs font-bold text-dark leading-tight">{node.label}</p>
                <p className="text-[10px] text-terracotta font-medium mt-0.5">{node.actor}</p>
                <p className="text-[11px] text-muted mt-1 leading-snug">{node.description}</p>
              </div>
            </div>
            {i < nodes.length - 1 && (
              <div className="flex items-center pt-4 px-0.5">
                <ArrowRight className="w-4 h-4 text-stone/50" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile: vertical flow */}
      <div className="md:hidden space-y-1">
        {nodes.map((node, i) => (
          <div key={node.status}>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-terracotta text-cream flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                {i < nodes.length - 1 && (
                  <div className="w-px h-6 bg-stone/30 mt-1" />
                )}
              </div>
              <div className="pb-2">
                <p className="text-sm font-bold text-dark">{node.label}</p>
                <p className="text-xs text-terracotta font-medium">{node.actor}</p>
                <p className="text-xs text-muted mt-0.5">{node.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Order Status Diagram (extra reference) */}
      <div className="mt-8 pt-6 border-t border-stone/15">
        <h3 className="font-display text-sm text-dark mb-3">Order Status Lifecycle (Reference)</h3>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { s: "PENDING", c: "bg-stone/15 text-dark" },
            { s: "CONFIRMED", c: "bg-blue-100 text-blue-700" },
            { s: "READY", c: "bg-amber-100 text-amber-700" },
            { s: "IN_TRANSIT", c: "bg-orange-100 text-orange-700" },
            { s: "DELIVERED", c: "bg-olive/15 text-olive" },
            { s: "UNDER_REVIEW", c: "bg-purple-100 text-purple-700" },
            { s: "COMPLETED", c: "bg-green-100 text-green-700" },
          ].map((item, i, arr) => (
            <div key={item.s} className="flex items-center gap-1.5">
              <span className={`px-2.5 py-1 rounded-md font-medium ${item.c}`}>{item.s}</span>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-stone/40" />}
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs mt-2">
          <span className="text-muted">Also:</span>
          <span className="px-2.5 py-1 rounded-md font-medium bg-red-100 text-red-700">CANCELLED</span>
          <span className="text-muted">(from most states)</span>
          <span className="text-muted ml-2">|</span>
          <span className="px-2.5 py-1 rounded-md font-medium bg-red-50 text-red-600 ml-2">DISPUTED</span>
          <span className="text-muted">(from UNDER_REVIEW if discrepancies)</span>
        </div>
      </div>
    </div>
  );
}

// ── Tutorials Section ──────────────────────────────────────────────

function TutorialsSection({ groups }: { groups: { section: string; items: Tutorial[] }[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  return (
    <div className="p-5 md:p-6">
      <h2 className="font-display text-lg text-dark mb-1">Step-by-Step Tutorials</h2>
      <p className="text-sm text-muted mb-6">Detailed walkthroughs for every workflow. Click a tutorial to expand.</p>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.section}>
            {groups.length > 1 && (
              <h3 className="text-xs uppercase tracking-wider text-terracotta font-medium mb-3 pb-2 border-b border-stone/15">
                {group.section}
              </h3>
            )}
            <div className="space-y-2">
              {group.items.map((tutorial) => (
                <TutorialCard
                  key={tutorial.id}
                  tutorial={tutorial}
                  isExpanded={expandedId === tutorial.id}
                  onToggle={() => setExpandedId(expandedId === tutorial.id ? null : tutorial.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TutorialCard({
  tutorial,
  isExpanded,
  onToggle,
}: {
  tutorial: Tutorial;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`rounded-xl border transition-all ${isExpanded ? "border-terracotta/30 bg-terracotta/3" : "border-stone/20"}`}>
      <button onClick={onToggle} className="w-full p-4 flex items-start justify-between gap-3 text-left">
        <div className="flex items-start gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isExpanded ? "bg-terracotta text-cream" : "bg-stone/15 text-dark"}`}>
            {tutorial.steps.length}
          </div>
          <div>
            <p className="text-sm font-medium text-dark">{tutorial.title}</p>
            <p className="text-xs text-muted mt-0.5">{tutorial.description}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted shrink-0 mt-1" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted shrink-0 mt-1" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          {tutorial.steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-stone/10">
              <div className="w-6 h-6 rounded-full bg-dark text-cream flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-dark">{step.action}</p>
                <p className="text-xs text-terracotta mt-0.5">
                  <span className="font-medium">Where:</span> {step.where}
                </p>
                <p className="text-xs text-muted mt-1">{step.detail}</p>
                {step.tip && (
                  <p className="text-xs text-olive mt-1.5 bg-olive/8 px-2 py-1 rounded-md">
                    <span className="font-medium">Tip:</span> {step.tip}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Glossary Section ───────────────────────────────────────────────

function GlossarySection({ terms }: { terms: GlossaryTerm[] }) {
  const [search, setSearch] = useState("");
  const filtered = terms.filter(
    (t) =>
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-5 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-lg text-dark">Glossary</h2>
          <p className="text-sm text-muted">Definitions of key terms used in the system.</p>
        </div>
        <div className="relative">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms..."
            className="pl-9 pr-4 py-2 border border-stone/20 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta/50"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No terms found matching &ldquo;{search}&rdquo;</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((t) => (
            <div key={t.term} className="p-3 rounded-lg border border-stone/10 bg-cream/30">
              <p className="text-sm font-bold text-dark">{t.term}</p>
              <p className="text-xs text-muted mt-1 leading-relaxed">{t.definition}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── FAQ Section ────────────────────────────────────────────────────

function FAQSection({ items }: { items: FAQItem[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  return (
    <div className="p-5 md:p-6">
      <h2 className="font-display text-lg text-dark mb-1">Frequently Asked Questions</h2>
      <p className="text-sm text-muted mb-6">Common questions and answers for this role.</p>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className={`rounded-xl border transition-all ${expandedIdx === i ? "border-terracotta/30" : "border-stone/15"}`}>
            <button
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className="w-full p-4 flex items-start justify-between gap-3 text-left"
            >
              <p className="text-sm font-medium text-dark">{item.question}</p>
              {expandedIdx === i ? (
                <ChevronDown className="w-4 h-4 text-muted shrink-0 mt-0.5" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted shrink-0 mt-0.5" />
              )}
            </button>
            {expandedIdx === i && (
              <div className="px-4 pb-4">
                <p className="text-sm text-muted leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Troubleshooting Section ────────────────────────────────────────

function TroubleshootSection({ items }: { items: TroubleshootItem[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  return (
    <div className="p-5 md:p-6">
      <h2 className="font-display text-lg text-dark mb-1">Troubleshooting</h2>
      <p className="text-sm text-muted mb-6">Common problems and how to solve them.</p>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className={`rounded-xl border transition-all ${expandedIdx === i ? "border-terracotta/30" : "border-stone/15"}`}>
            <button
              onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
              className="w-full p-4 flex items-start justify-between gap-3 text-left"
            >
              <div className="flex items-start gap-2">
                <Wrench className="w-4 h-4 text-stone shrink-0 mt-0.5" />
                <p className="text-sm font-medium text-dark">{item.problem}</p>
              </div>
              {expandedIdx === i ? (
                <ChevronDown className="w-4 h-4 text-muted shrink-0 mt-0.5" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted shrink-0 mt-0.5" />
              )}
            </button>
            {expandedIdx === i && (
              <div className="px-4 pb-4 space-y-2">
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-xs font-medium text-red-700 mb-1">Cause</p>
                  <p className="text-sm text-red-600">{item.cause}</p>
                </div>
                <div className="p-3 bg-olive/8 rounded-lg">
                  <p className="text-xs font-medium text-olive mb-1">Solution</p>
                  <p className="text-sm text-dark">{item.solution}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
