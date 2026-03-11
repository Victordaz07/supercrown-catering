import { ChartCard } from "@/components/dashboard/ui/ChartCard";
import { PendingList } from "@/components/dashboard/ui/PendingList";
import { SectionHeader } from "@/components/dashboard/ui/SectionHeader";
import { StatCard } from "@/components/dashboard/ui/StatCard";
import { BreakdownBarChart, BreakdownDonutChart, TrendLineChart } from "@/app/dashboard/_components/RoleCharts";
import type { ExecutiveDashboardData } from "@/lib/dashboard/types";

function usd(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );
}

export function ExecutiveDashboardView({ data }: { data: ExecutiveDashboardData }) {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Executive Dashboard"
        subtitle="KPIs financieros, operativos y acciones prioritarias para direccion."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Facturado" value={usd(data.revenueKpis.invoiced)} />
        <StatCard label="Cobrado" value={usd(data.revenueKpis.paid)} tone="success" />
        <StatCard label="Pendiente" value={usd(data.revenueKpis.pending)} tone="warning" />
        <StatCard label="Overdue" value={usd(data.revenueKpis.overdue)} tone="danger" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatCard label="Ordenes activas hoy" value={String(data.operationsKpis.activeOrdersToday)} />
        <StatCard label="Incidencias delivery" value={String(data.operationsKpis.deliveryIssues)} tone="warning" />
        <StatCard label="Status approvals" value={String(data.operationsKpis.pendingStatusApprovals)} />
        <StatCard label="Delivery reviews" value={String(data.operationsKpis.pendingDeliveryReviews)} />
        <StatCard label="Team activo" value={String(data.operationsKpis.activeTeamMembers)} tone="success" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Tendencia de ingresos (7 dias)" subtitle="Facturacion ajustada por dia">
          <TrendLineChart data={data.revenueTrend} />
        </ChartCard>
        <ChartCard title="Estado de facturas" subtitle="Distribucion por estatus">
          <BreakdownDonutChart data={data.invoiceStatusBreakdown} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Pipeline de ordenes" subtitle="Volumen por estado operativo">
          <BreakdownBarChart data={data.orderStatusBreakdown} />
        </ChartCard>
        <div>
          <SectionHeader title="Pendientes clave" subtitle="Acciones ejecutivas sugeridas" />
          <div className="mt-3">
            <PendingList tasks={data.pendingTasks} />
          </div>
        </div>
      </div>
    </div>
  );
}
