import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

const statusColors: Record<string, string> = {
  REQUESTED: "bg-amber-100 text-amber-800",
  PRICING: "bg-blue-100 text-blue-800",
  SENT: "bg-purple-100 text-purple-800",
  CLIENT_PROPOSED_CHANGES: "bg-terracotta/20 text-terracotta",
  CLIENT_APPROVED: "bg-olive/30 text-olive",
  CLIENT_REJECTED: "bg-red-100 text-red-800",
  CONVERTED: "bg-stone/30 text-muted",
  EXPIRED: "bg-red-200 text-red-900",
};

export default async function QuotesListPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (!["MASTER", "ADMIN", "SALES"].includes(session.user.role)) redirect("/dashboard");

  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      revisions: { orderBy: { revisionNumber: "desc" }, take: 1 },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-dark">Quotes</h1>

      <div className="grid gap-4">
        {quotes.length === 0 ? (
          <div className="bg-warm border border-stone/40 rounded-sm p-12 text-center text-muted">
            No quotes found
          </div>
        ) : (
          quotes.map((q) => {
            const lastRev = q.revisions[0];
            const itemCount = lastRev ? safeCountItems(lastRev.itemsJson) : 0;
            return (
              <Link
                key={q.id}
                href={`/dashboard/sales/quotes/${q.id}`}
                className="block bg-warm border border-stone/40 rounded-sm p-4 hover:border-terracotta/50 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-dark">{q.clientName}</p>
                    <p className="text-sm text-muted">{q.clientEmail}</p>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted">
                      Event: {q.eventDate ? new Date(q.eventDate).toLocaleDateString() : "TBD"}
                    </span>
                    <span className="text-muted">{itemCount} items</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        statusColors[q.status] ?? "bg-stone/30 text-muted"
                      }`}
                    >
                      {q.status}
                    </span>
                    <span className="text-terracotta font-medium">Review →</span>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

function safeCountItems(itemsJson: string): number {
  try {
    const parsed = JSON.parse(itemsJson);
    if (!Array.isArray(parsed)) return 0;
    return parsed.reduce((s, x) => s + (Number(x?.quantity) || 0), 0);
  } catch {
    return 0;
  }
}