import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const statusLabel: Record<string, string> = {
  REQUESTED: "Requested",
  PRICING: "Pricing",
  SENT: "Waiting for your response",
  CLIENT_PROPOSED_CHANGES: "Changes sent",
  CLIENT_APPROVED: "Approved",
  CLIENT_REJECTED: "Rejected",
  CONVERTED: "Converted to order",
  EXPIRED: "Expired",
};

const statusStyles: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-800",
  PRICING: "bg-blue-100 text-blue-800",
  SENT: "bg-purple-100 text-purple-800",
  CLIENT_PROPOSED_CHANGES: "bg-terracotta/20 text-terracotta",
  CLIENT_APPROVED: "bg-olive/30 text-olive",
  CLIENT_REJECTED: "bg-red-100 text-red-800",
  CONVERTED: "bg-stone/30 text-muted",
  EXPIRED: "bg-red-200 text-red-900",
};

export default async function ClientQuotesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const quotes = await prisma.quote.findMany({
    where: {
      OR: [
        { clientId: session.user.id },
        { clientEmail: session.user.email.toLowerCase() },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-dark">Your quotes</h1>
        <p className="text-muted text-sm mt-1">Review approvals, request changes, or reject.</p>
      </div>

      {quotes.length === 0 ? (
        <div className="bg-warm border border-stone/30 rounded-xl p-10 text-center text-muted">
          No quotes yet.
        </div>
      ) : (
        <div className="grid gap-3">
          {quotes.map((q) => (
            <Link
              key={q.id}
              href={`/client/quotes/${q.id}`}
              className="bg-white border border-stone/30 rounded-xl p-4 hover:border-terracotta/40 transition-colors"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-dark">{q.quoteNumber}</p>
                  <p className="text-xs text-muted">
                    Event: {new Date(q.eventDate).toLocaleDateString()}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyles[q.status] ?? "bg-stone/30 text-muted"}`}>
                  {statusLabel[q.status] ?? q.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

