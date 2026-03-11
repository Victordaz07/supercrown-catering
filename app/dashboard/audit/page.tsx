import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import Link from "next/link";
import { Shield, ChevronLeft, ChevronRight, SearchX } from "lucide-react";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-olive/20 text-olive",
  UPDATE: "bg-blue-100 text-blue-700",
  DELETE: "bg-red-100 text-red-700",
  STATUS_CHANGE: "bg-amber-100 text-amber-700",
  PAYMENT: "bg-emerald-100 text-emerald-700",
  ADJUSTMENT: "bg-purple-100 text-purple-700",
  DELIVERY_REPORT: "bg-stone/20 text-stone",
  LOGIN: "bg-gray-200 text-gray-600",
};

const ENTITY_LABELS: Record<string, string> = {
  User: "Usuario", Order: "Orden", Invoice: "Factura", OrderItem: "Artículo",
  DeliveryReport: "Reporte Entrega", InvoiceAdjustment: "Ajuste",
};

const PER_PAGE = 50;

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || !["MASTER", "ADMIN"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const sp = await searchParams;
  const entity = sp.entity ?? "";
  const action = sp.action ?? "";
  const from = sp.from ?? "";
  const to = sp.to ?? "";
  const page = Math.max(1, parseInt(sp.page ?? "1"));

  const where: Record<string, unknown> = {};
  if (entity) where.entity = entity;
  if (action) where.action = action;
  if (from || to) {
    where.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59") } : {}),
    };
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

  const totalPages = Math.ceil(total / PER_PAGE);

  function buildUrl(overrides: Record<string, string>) {
    const p = new URLSearchParams();
    if (entity) p.set("entity", entity);
    if (action) p.set("action", action);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    p.set("page", "1");
    for (const [k, v] of Object.entries(overrides)) {
      if (v) p.set(k, v); else p.delete(k);
    }
    return `/dashboard/audit?${p.toString()}`;
  }

  const fmt = new Intl.DateTimeFormat("es", {
    dateStyle: "short",
    timeStyle: "medium",
  });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-6 h-6 text-terracotta" />
        <h1 className="font-display text-3xl text-dark">Registro de Auditoría</h1>
      </div>
      <p className="text-muted text-sm mb-8">Historial inmutable de todos los cambios en el sistema</p>

      {/* Filters */}
      <form method="GET" action="/dashboard/audit" className="flex flex-wrap gap-3 mb-6">
        <select name="entity" defaultValue={entity}
          className="px-4 py-2.5 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30">
          <option value="">Todas las entidades</option>
          {Object.entries(ENTITY_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="action" defaultValue={action}
          className="px-4 py-2.5 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30">
          <option value="">Todas las acciones</option>
          {Object.keys(ACTION_COLORS).map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={from}
          className="px-3 py-2.5 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
        <input type="date" name="to" defaultValue={to}
          className="px-3 py-2.5 bg-cream border border-stone/40 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-terracotta/30" />
        <button type="submit"
          className="px-4 py-2.5 bg-dark text-cream rounded-xl text-sm hover:bg-dark/90 transition-all">
          Aplicar
        </button>
        <Link href="/dashboard/audit"
          className="px-4 py-2.5 bg-warm text-muted rounded-xl text-sm hover:text-dark transition-all">
          Limpiar
        </Link>
      </form>

      {/* Table */}
      {logs.length === 0 ? (
        <div className="text-center py-20 text-muted">
          <SearchX className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No se encontraron registros</p>
        </div>
      ) : (
        <div className="bg-white border border-stone/20 rounded-xl overflow-hidden shadow-sm mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: "900px" }}>
              <thead>
                <tr className="bg-warm/60 border-b border-stone/20">
                  <th className="text-left px-4 py-3 font-medium text-muted">Fecha/Hora</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Usuario</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Acción</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Entidad</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Campo</th>
                  <th className="text-left px-4 py-3 font-medium text-muted">Anterior → Nuevo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id} className={`border-b border-stone/10 ${i % 2 === 0 ? "" : "bg-warm/20"}`}>
                    <td className="px-4 py-3 text-muted whitespace-nowrap text-xs">{fmt.format(new Date(log.createdAt))}</td>
                    <td className="px-4 py-3 text-dark text-xs">{log.user.name || log.user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-medium ${ACTION_COLORS[log.action] ?? "bg-warm text-dark"}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="text-dark">{ENTITY_LABELS[log.entity] ?? log.entity}</span>
                      <span className="text-muted ml-1">({log.entityId.slice(0, 8)})</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted">{log.field ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">
                      {log.oldValue || log.newValue ? (
                        <span>
                          {log.oldValue && <span className="line-through text-red-500 mr-1">{log.oldValue.length > 36 ? log.oldValue.slice(0, 36) + "…" : log.oldValue}</span>}
                          {log.oldValue && log.newValue && <span className="text-muted">→ </span>}
                          {log.newValue && <span className="text-olive">{log.newValue.length > 36 ? log.newValue.slice(0, 36) + "…" : log.newValue}</span>}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">{total} registros · Página {page} de {totalPages}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildUrl({ page: String(page - 1) })}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-stone/30 rounded-xl text-sm hover:bg-warm transition-all">
                <ChevronLeft className="w-4 h-4" /> Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildUrl({ page: String(page + 1) })}
                className="flex items-center gap-1 px-3 py-2 bg-white border border-stone/30 rounded-xl text-sm hover:bg-warm transition-all">
                Siguiente <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
