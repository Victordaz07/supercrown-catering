import { ChartCard } from "@/components/dashboard/ui/ChartCard";
import { PendingList } from "@/components/dashboard/ui/PendingList";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { StatCard } from "@/components/dashboard/ui/StatCard";
import { BreakdownBarChart, TrendLineChart } from "@/app/dashboard/_components/RoleCharts";
import type { SalesDashboardData } from "@/lib/dashboard/types";

function usd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );
}

export function SalesDashboardView({ data }: { data: SalesDashboardData }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Sales Command Center"
        subtitle="Pipeline comercial, cobranza y prioridades del equipo de ventas."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Ordenes hoy" value={String(data.kpis.ordersToday)} />
        <StatCard label="Ordenes activas" value={String(data.kpis.activeOrders)} />
        <StatCard label="Pendiente por cobrar" value={usd(data.kpis.pendingInvoicesAmount)} tone="warning" />
        <StatCard label="Overdue" value={usd(data.kpis.overdueInvoicesAmount)} tone="danger" />
        <StatCard label="Solicitudes abiertas" value={String(data.kpis.openStatusRequests)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Embudo por estado de orden" subtitle="Distribucion actual del pipeline">
          <BreakdownBarChart data={data.orderPipeline} />
        </ChartCard>
        <ChartCard title="Tendencia de cobro (7 dias)" subtitle="Facturacion ajustada para seguimiento de caja">
          <TrendLineChart data={data.collectionsTrend} />
        </ChartCard>
      </div>

      <div>
        <SectionHeader title="Pendientes comerciales" subtitle="Acciones recomendadas para hoy" />
        <div className="mt-3">
          <PendingList tasks={data.pendingTasks} />
        </div>
      </div>
    </div>
  );
}
