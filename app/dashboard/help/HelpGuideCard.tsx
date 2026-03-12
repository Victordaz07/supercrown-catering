"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Check,
  X,
  User,
  Truck,
  ShoppingBag,
  Shield,
  Crown,
  LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  user: User,
  truck: Truck,
  "shopping-bag": ShoppingBag,
  shield: Shield,
  crown: Crown,
};

type Props = {
  title: string;
  iconName: string;
  isCurrentUser: boolean;
  canDo: readonly string[];
  cannotDo: readonly string[];
  menu: string;
  path: string;
};

export function HelpGuideCard({ title, iconName, isCurrentUser, canDo, cannotDo, menu, path }: Props) {
  const Icon = ICON_MAP[iconName] ?? User;
  const [expanded, setExpanded] = useState(isCurrentUser);

  return (
    <div
      className={`rounded-xl border-2 transition-all overflow-hidden ${
        isCurrentUser
          ? "border-terracotta bg-terracotta/5 shadow-md"
          : "border-stone/20 bg-white hover:border-stone/30"
      }`}
    >
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full p-4 flex items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isCurrentUser ? "bg-terracotta text-cream" : "bg-stone/20 text-dark"
            }`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className={`font-display font-medium ${isCurrentUser ? "text-terracotta" : "text-dark"}`}>{title}</p>
            <p className="text-xs text-muted">Main area: {path}</p>
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-muted shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-stone/20 p-4 space-y-4 bg-white/80">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-2">Menu access</p>
            <p className="text-sm text-dark">{menu}</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-olive" /> Can do
            </p>
            <ul className="space-y-1.5">
              {canDo.map((item, i) => (
                <li key={i} className="text-sm text-dark flex items-start gap-2">
                  <Check className="w-4 h-4 text-olive shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {cannotDo.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted mb-2 flex items-center gap-1.5">
                <X className="w-3.5 h-3.5 text-stone" /> Cannot do
              </p>
              <ul className="space-y-1.5">
                {cannotDo.map((item, i) => (
                  <li key={i} className="text-sm text-muted flex items-start gap-2">
                    <X className="w-4 h-4 text-stone shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
