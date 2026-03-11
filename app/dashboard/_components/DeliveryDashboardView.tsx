import Link from "next/link";
import { ChartCard } from "@/components/dashboard/ui/ChartCard";
import { PendingList } from "@/components/dashboard/ui/PendingList";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { StatCard } from "@/components/dashboard/ui/StatCard";
import { StatusBadge } from "@/components/dashboard/ui/StatusBadge";
import { BreakdownBarChart, BreakdownDonutChart } from "@/app/dashboard/_components/RoleCharts";
import type { DeliveryDashboardData } from "@/lib/dashboard/types";

function getTone(status: string): "default" | "success" | "warning" | "danger" | "info" {
  if (status === "DELIVERED") return "success";
  if (status === "EN_ROUTE") return "info";
  if (status === "PENDING") return "warning";
  if (status === "SKIPPED") return "danger";
  return "default";
}

export function DeliveryDashboardView({ data }: { data: DeliveryDashboardData }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Delivery Operations"
        subtitle="Rutas de hoy, progreso de paradas e incidencias para ejecucion diaria."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Rutas hoy" value={String(data.kpis.routesToday)} />
        <StatCard label="Entregadas" value={String(data.kpis.deliveredStops)} tone="success" />
        <StatCard label="Pendientes" value={String(data.kpis.pendingStops)} tone="warning" />
        <StatCard label="En ruta" value={String(data.kpis.inTransitStops)} />
        <StatCard label="Skipped" value={String(data.kpis.skippedStops)} tone="danger" />
        <StatCard label="Incidencias" value={String(data.kpis.incidentReports)} tone="danger" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Progreso de paradas" subtitle="Distribucion de estado de la ruta">
          <BreakdownDonutChart data={data.routeProgress} />
        </ChartCard>
        <ChartCard title="Incidencias reportadas" subtitle="Tipos de issues detectados hoy">
          <BreakdownBarChart data={data.incidentBreakdown} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div>
          <SectionHeader title="Paradas activas" subtitle="Prioridad de ejecucion actual" />
          <div className="mt-3 bg-white rounded-xl border border-stone/20 divide-y divide-stone/10">
            {data.todaysStops.length === 0 ? (
              <p className="p-4 text-sm text-muted">No hay paradas activas. Excelente trabajo.</p>
            ) : (
              data.todaysStops.slice(0, 8).map((stop) => (
                <Link
                  key={stop.stopId}
                  href={`/dashboard/delivery/${stop.orderId}/report`}
                  className="block p-4 hover:bg-warm/40 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-dark">
                      {stop.orderNumber} · {stop.customerName}
                    </p>
                    <StatusBadge label={stop.status} tone={getTone(stop.status)} />
                  </div>
                  <p className="text-sm text-muted mt-1">{stop.deliveryAddress}</p>
                </Link>
              ))
            )}
          </div>
        </div>

        <div>
          <SectionHeader title="Pendientes de hoy" subtitle="Acciones operativas recomendadas" />
          <div className="mt-3">
            <PendingList tasks={data.pendingTasks} />
          </div>
        </div>
      </div>
    </div>
  );
}
