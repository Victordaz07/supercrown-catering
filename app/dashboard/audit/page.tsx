import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  SearchX,
  Filter,
} from "lucide-react";

const PER_PAGE = 50;

const ACTION_STYLES: Record<string, string> = {
  CREATE: "bg-olive/20 text-olive",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  STATUS_CHANGE: "bg-amber-100 text-amber-700",
  PAYMENT: "bg-green-100 text-green-700",
  ADJUSTMENT: "bg-purple-100 text-purple-700",
  DELIVERY_REPORT: "bg-stone/20 text-dark",
  LOGIN: "bg-gray-100 text-gray-500",
};

const ACTION_LABELS: Record<string, string> = {
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
  STATUS_CHANGE: "Status change",
  PAYMENT: "Payment",
  ADJUSTMENT: "Adjustment",
  DELIVERY_REPORT: "Delivery",
  LOGIN: "Session",
};

const ENTITY_OPTIONS = ["User", "Order", "Invoice", "DeliveryReport"] as const;
const ACTION_OPTIONS = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "PAYMENT",
  "ADJUSTMENT",
] as const;

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function truncate(text: string, max = 36): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function buildSearchParams(
  current: { entity?: string; action?: string; from?: string; to?: string; page?: string },
  overrides: Record<string, string | undefined>,
): string {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  return params.toString();
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  if (
    !session?.user ||
    !["MASTER", "ADMIN"].includes((session.user as Record<string, unknown>).role as string)
  ) {
    redirect("/dashboard");
  }

  const entity =
    typeof searchParams.entity === "string" ? searchParams.entity : undefined;
  const action =
    typeof searchParams.action === "string" ? searchParams.action : undefined;
  const from =
    typeof searchParams.from === "string" ? searchParams.from : undefined;
  const to =
    typeof searchParams.to === "string" ? searchParams.to : undefined;
  const page = Math.max(
    1,
    parseInt(
      typeof searchParams.page === "string" ? searchParams.page : "1",
      10,
    ) || 1,
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};
  if (entity) where.entityType = entity;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to + "T23:59:59.999Z");
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: PER_PAGE,
      skip: (page - 1) * PER_PAGE,
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const filterState = { entity, action, from, to, page: String(page) };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <ShieldAlert className="w-7 h-7 text-terracotta" />
          <h1 className="font-display text-3xl text-dark">
            Audit Log
          </h1>
        </div>
        <p className="text-muted text-sm pl-10">
          Immutable history of all system changes
        </p>
      </div>

      {/* ── Filters ── */}
      <form
        action="/dashboard/audit"
        method="GET"
        className="bg-warm border border-stone/30 rounded-xl p-4 sm:p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-muted" />
          <span className="text-sm font-medium text-dark">Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label
              htmlFor="entity"
              className="block text-xs font-medium text-muted mb-1"
            >
              Entity
            </label>
            <select
              id="entity"
              name="entity"
              defaultValue={entity ?? ""}
              className="w-full rounded-lg border border-stone/40 bg-cream px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            >
              <option value="">All</option>
              {ENTITY_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="action"
              className="block text-xs font-medium text-muted mb-1"
            >
              Action
            </label>
            <select
              id="action"
              name="action"
              defaultValue={action ?? ""}
              className="w-full rounded-lg border border-stone/40 bg-cream px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            >
              <option value="">All</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABELS[a] ?? a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="from"
              className="block text-xs font-medium text-muted mb-1"
            >
              From
            </label>
            <input
              id="from"
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="w-full rounded-lg border border-stone/40 bg-cream px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>

          <div>
            <label
              htmlFor="to"
              className="block text-xs font-medium text-muted mb-1"
            >
              To
            </label>
            <input
              id="to"
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="w-full rounded-lg border border-stone/40 bg-cream px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-terracotta/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-terracotta text-cream text-sm font-medium hover:bg-terracotta/90 transition-colors"
          >
            Apply filters
          </button>
          <Link
            href="/dashboard/audit"
            className="px-4 py-2 rounded-lg border border-stone/40 text-muted text-sm font-medium hover:bg-stone/10 transition-colors"
          >
            Clear
          </Link>
        </div>
      </form>

      {/* ── Results count ── */}
      <p className="text-sm text-muted">
        {total} record{total !== 1 && "s"} found
        {totalPages > 1 && (
          <span>
            {" "}
            — Page {page} of {totalPages}
          </span>
        )}
      </p>

      {/* ── Table / Empty state ── */}
      {logs.length === 0 ? (
        <div className="bg-warm border border-stone/30 rounded-xl p-12 flex flex-col items-center justify-center text-center">
          <SearchX className="w-12 h-12 text-stone/60 mb-4" />
          <p className="font-display text-xl text-dark mb-1">
            No records found
          </p>
          <p className="text-sm text-muted">
            Try adjusting the filters or selecting a different date range.
          </p>
        </div>
      ) : (
        <div className="bg-warm border border-stone/30 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[960px]">
              <thead>
                <tr className="bg-stone/20 border-b border-stone/30">
                  <th className="text-left px-4 py-3 font-medium text-dark whitespace-nowrap">
                    Date/Time
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-dark whitespace-nowrap">
                    User
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-dark whitespace-nowrap">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-dark whitespace-nowrap">
                    Entity
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-dark whitespace-nowrap">
                    Entity ID
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-dark whitespace-nowrap">
                    Field
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-dark whitespace-nowrap">
                    Old value → New
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-dark whitespace-nowrap">
                    Metadata
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(logs as any[]).map((log, i) => (
                  <tr
                    key={log.id}
                    className={`border-t border-stone/20 ${
                      i % 2 === 0 ? "bg-warm" : "bg-cream"
                    }`}
                  >
                    <td className="px-4 py-3 text-dark whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-dark whitespace-nowrap">
                      {log.user?.name ?? log.user?.email ?? "System"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          ACTION_STYLES[log.action] ??
                          "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {log.entityType}
                    </td>
                    <td className="px-4 py-3 text-muted font-mono text-xs whitespace-nowrap">
                      {log.entityId ? String(log.entityId).slice(0, 8) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {log.field ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-dark max-w-[260px]">
                      {log.oldValue || log.newValue ? (
                        <span className="flex items-center gap-1.5 flex-wrap">
                          {log.oldValue ? (
                            <span className="text-red-600/80 line-through text-xs">
                              {truncate(String(log.oldValue))}
                            </span>
                          ) : (
                            <span className="text-muted text-xs italic">
                              empty
                            </span>
                          )}
                          <span className="text-muted">→</span>
                          {log.newValue ? (
                            <span className="text-olive text-xs font-medium">
                              {truncate(String(log.newValue))}
                            </span>
                          ) : (
                            <span className="text-muted text-xs italic">
                              empty
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted text-xs max-w-[200px]">
                      {log.metadata ? (
                        <details className="cursor-pointer">
                          <summary className="text-terracotta hover:underline select-none">
                            View details
                          </summary>
                          <pre className="mt-2 text-[11px] bg-cream rounded-lg p-2 border border-stone/20 whitespace-pre-wrap break-all max-h-40 overflow-y-auto">
                            {typeof log.metadata === "string"
                              ? log.metadata
                              : JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        </details>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          {page > 1 ? (
            <Link
              href={`/dashboard/audit?${buildSearchParams(filterState, { page: String(page - 1) })}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone/40 text-sm font-medium text-dark hover:bg-stone/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone/20 text-sm font-medium text-stone/50 cursor-not-allowed">
              <ChevronLeft className="w-4 h-4" />
              Previous
            </span>
          )}

          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>

          {page < totalPages ? (
            <Link
              href={`/dashboard/audit?${buildSearchParams(filterState, { page: String(page + 1) })}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone/40 text-sm font-medium text-dark hover:bg-stone/10 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-stone/20 text-sm font-medium text-stone/50 cursor-not-allowed">
              Next
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </div>
      )}
    </div>
  );
}
