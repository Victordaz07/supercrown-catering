import { prisma } from "@/lib/db";
import type {
  BreakdownPoint,
  DashboardOverview,
  DashboardTask,
  DeliveryDashboardData,
  ExecutiveDashboardData,
  SalesDashboardData,
  TrendPoint,
} from "@/lib/dashboard/types";

const DAY = 24 * 60 * 60 * 1000;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(start: Date) {
  return new Date(start.getTime() + DAY);
}

function toTrendPoints(values: Map<string, number>): TrendPoint[] {
  return Array.from(values.entries()).map(([label, value]) => ({ label, value }));
}

function sum(values: number[]) {
  return values.reduce((acc, v) => acc + v, 0);
}

function asBreakdown(entries: [string, number][]): BreakdownPoint[] {
  return entries
    .filter(([, value]) => value > 0)
    .map(([label, value]) => ({ label, value }));
}

function priorityFromCount(count: number): DashboardTask["priority"] {
  if (count >= 10) return "high";
  if (count >= 4) return "medium";
  return "low";
}

async function buildFinancialSnapshot() {
  const invoices = await prisma.invoice.findMany({
    select: {
      status: true,
      total: true,
      createdAt: true,
      adjustments: { select: { amount: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const invoiced = sum(
    invoices.map((inv) => inv.total + inv.adjustments.reduce((acc, a) => acc + a.amount, 0)),
  );
  const paid = sum(
    invoices
      .filter((inv) => inv.status === "PAID")
      .map((inv) => inv.total + inv.adjustments.reduce((acc, a) => acc + a.amount, 0)),
  );
  const pending = sum(
    invoices
      .filter((inv) => ["DRAFT", "SENT", "DELIVERED", "ADJUSTED"].includes(inv.status))
      .map((inv) => inv.total + inv.adjustments.reduce((acc, a) => acc + a.amount, 0)),
  );
  const overdue = sum(
    invoices
      .filter((inv) => inv.status === "OVERDUE")
      .map((inv) => inv.total + inv.adjustments.reduce((acc, a) => acc + a.amount, 0)),
  );

  const trendStart = new Date(startOfToday().getTime() - 6 * DAY);
  const trendMap = new Map<string, number>();
  for (let i = 0; i < 7; i += 1) {
    const day = new Date(trendStart.getTime() + i * DAY);
    trendMap.set(day.toLocaleDateString("en-US", { month: "short", day: "numeric" }), 0);
  }
  invoices.forEach((inv) => {
    if (inv.createdAt < trendStart) return;
    const key = inv.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    trendMap.set(
      key,
      (trendMap.get(key) ?? 0) + inv.total + inv.adjustments.reduce((acc, a) => acc + a.amount, 0),
    );
  });

  const invoiceByStatus = invoices.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.status] = (acc[inv.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    kpis: { invoiced, paid, pending, overdue },
    trend: toTrendPoints(trendMap),
    statusBreakdown: asBreakdown(Object.entries(invoiceByStatus)),
  };
}

async function buildOrdersSnapshot(todayStart: Date, todayEnd: Date) {
  const orders = await prisma.order.findMany({
    select: { id: true, status: true, eventDate: true, orderNumber: true, customerName: true },
    orderBy: { eventDate: "asc" },
  });
  const todayOrders = orders.filter((o) => o.eventDate >= todayStart && o.eventDate < todayEnd);
  const orderByStatus = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});
  const activeOrders = orders.filter((o) =>
    ["PENDING", "CONFIRMED", "READY", "IN_TRANSIT"].includes(o.status),
  ).length;

  return {
    orders,
    activeOrders,
    todayOrders,
    statusBreakdown: asBreakdown(Object.entries(orderByStatus)),
  };
}

async function buildExecutiveData(role: string): Promise<ExecutiveDashboardData | undefined> {
  if (!["MASTER", "ADMIN"].includes(role)) return undefined;
  const todayStart = startOfToday();
  const todayEnd = endOfToday(todayStart);

  const [financial, ordersSnapshot, statusReqPending, deliveryReviews, issueReports, users] =
    await Promise.all([
      buildFinancialSnapshot(),
      buildOrdersSnapshot(todayStart, todayEnd),
      prisma.orderStatusRequest.count({ where: { status: "PENDING" } }),
      prisma.deliveryReport.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.deliveryReport.count({ where: { hasIssues: true } }),
      prisma.user.count({ where: { active: true } }),
    ]);

  const pendingTasks: DashboardTask[] = [
    {
      id: "status-approvals",
      title: `${statusReqPending} status requests pendientes`,
      subtitle: "Revisar aprobaciones de cambios operativos",
      href: "/dashboard/status-requests",
      priority: priorityFromCount(statusReqPending),
    },
    {
      id: "delivery-reviews",
      title: `${deliveryReviews} reportes pendientes de revision`,
      subtitle: "Validar incidencias y aprobar ajustes",
      href: "/dashboard/deliveries",
      priority: priorityFromCount(deliveryReviews),
    },
    {
      id: "collections",
      title: `${Math.round(financial.kpis.overdue)} USD en overdue`,
      subtitle: "Monitorear facturas vencidas y cobranza",
      href: "/dashboard/invoices",
      priority: financial.kpis.overdue > 0 ? "high" : "low",
    },
  ];

  return {
    revenueKpis: financial.kpis,
    operationsKpis: {
      activeOrdersToday: ordersSnapshot.todayOrders.length,
      deliveryIssues: issueReports,
      pendingStatusApprovals: statusReqPending,
      pendingDeliveryReviews: deliveryReviews,
      activeTeamMembers: users,
    },
    revenueTrend: financial.trend,
    orderStatusBreakdown: ordersSnapshot.statusBreakdown,
    invoiceStatusBreakdown: financial.statusBreakdown,
    pendingTasks,
  };
}

async function buildSalesData(role: string): Promise<SalesDashboardData | undefined> {
  if (!["MASTER", "ADMIN", "SALES"].includes(role)) return undefined;
  const todayStart = startOfToday();
  const todayEnd = endOfToday(todayStart);

  const [financial, ordersSnapshot, statusReqPending] = await Promise.all([
    buildFinancialSnapshot(),
    buildOrdersSnapshot(todayStart, todayEnd),
    prisma.orderStatusRequest.count({ where: { status: "PENDING" } }),
  ]);

  const pendingTasks: DashboardTask[] = [
    {
      id: "today-orders",
      title: `${ordersSnapshot.todayOrders.length} ordenes para hoy`,
      subtitle: "Priorizar confirmacion y seguimiento comercial",
      href: "/dashboard/orders",
      priority: priorityFromCount(ordersSnapshot.todayOrders.length),
    },
    {
      id: "open-status-requests",
      title: `${statusReqPending} solicitudes de estado abiertas`,
      subtitle: "Escalar o cerrar solicitudes activas",
      href: "/dashboard/status-requests",
      priority: priorityFromCount(statusReqPending),
    },
    {
      id: "invoices-overdue",
      title: `${Math.round(financial.kpis.overdue)} USD vencidos`,
      subtitle: "Gestionar cobranza de facturas vencidas",
      href: "/dashboard/invoices",
      priority: financial.kpis.overdue > 0 ? "high" : "low",
    },
  ];

  return {
    kpis: {
      ordersToday: ordersSnapshot.todayOrders.length,
      activeOrders: ordersSnapshot.activeOrders,
      pendingInvoicesAmount: financial.kpis.pending,
      overdueInvoicesAmount: financial.kpis.overdue,
      openStatusRequests: statusReqPending,
    },
    orderPipeline: ordersSnapshot.statusBreakdown,
    collectionsTrend: financial.trend,
    pendingTasks,
  };
}

async function buildDeliveryData(role: string, userId: string): Promise<DeliveryDashboardData | undefined> {
  if (role !== "DELIVERY") return undefined;
  const todayStart = startOfToday();
  const todayEnd = endOfToday(todayStart);

  const routes = await prisma.deliveryRoute.findMany({
    where: { driverId: userId, date: { gte: todayStart, lt: todayEnd } },
    include: {
      stops: {
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              customerName: true,
              deliveryAddress: true,
            },
          },
        },
        orderBy: { stopOrder: "asc" },
      },
    },
  });

  const routeIds = routes.map((r) => r.id);
  const reports = await prisma.deliveryReport.findMany({
    where: { driverId: userId, createdAt: { gte: todayStart, lt: todayEnd } },
    select: { hasIssues: true, items: { select: { issue: true } } },
  });

  const stops = routes.flatMap((route) =>
    route.stops.map((stop) => ({
      routeId: route.id,
      stopId: stop.id,
      orderId: stop.orderId,
      orderNumber: stop.order.orderNumber,
      customerName: stop.order.customerName,
      deliveryAddress: stop.order.deliveryAddress,
      status: stop.status,
    })),
  );

  const statusCount = stops.reduce<Record<string, number>>((acc, stop) => {
    acc[stop.status] = (acc[stop.status] ?? 0) + 1;
    return acc;
  }, {});

  const incidentCount = reports.reduce<Record<string, number>>((acc, report) => {
    if (report.hasIssues) acc.ISSUES = (acc.ISSUES ?? 0) + 1;
    report.items.forEach((item) => {
      if (!item.issue) return;
      acc[item.issue] = (acc[item.issue] ?? 0) + 1;
    });
    return acc;
  }, {});

  const pendingStops = statusCount.PENDING ?? 0;
  const inTransitStops = statusCount.EN_ROUTE ?? 0;
  const deliveredStops = statusCount.DELIVERED ?? 0;
  const skippedStops = statusCount.SKIPPED ?? 0;
  const incidentReports = reports.filter((r) => r.hasIssues).length;

  const pendingTasks: DashboardTask[] = [
    {
      id: "todays-route",
      title: `${routes.length} rutas de hoy`,
      subtitle: "Abrir ruta y confirmar progreso por parada",
      href: "/dashboard/delivery",
      priority: routes.length === 0 ? "low" : "medium",
    },
    {
      id: "pending-stops",
      title: `${pendingStops + inTransitStops} paradas activas`,
      subtitle: "Completar entregas pendientes del dia",
      href: "/dashboard/delivery",
      priority: priorityFromCount(pendingStops + inTransitStops),
    },
    {
      id: "incident-reports",
      title: `${incidentReports} reportes con incidencia`,
      subtitle: "Revisar fotos y notas de entrega",
      href: "/dashboard/deliveries",
      priority: incidentReports > 0 ? "high" : "low",
    },
  ];

  return {
    kpis: {
      routesToday: routeIds.length,
      deliveredStops,
      pendingStops,
      inTransitStops,
      skippedStops,
      incidentReports,
    },
    routeProgress: asBreakdown(Object.entries(statusCount)),
    incidentBreakdown: asBreakdown(Object.entries(incidentCount)),
    todaysStops: stops.filter((stop) => ["PENDING", "EN_ROUTE"].includes(stop.status)),
    pendingTasks,
  };
}

export async function getDashboardOverview(role: string, userId: string): Promise<DashboardOverview> {
  const [executive, sales, delivery] = await Promise.all([
    buildExecutiveData(role),
    buildSalesData(role),
    buildDeliveryData(role, userId),
  ]);

  return {
    role,
    generatedAt: new Date().toISOString(),
    executive,
    sales,
    delivery,
  };
}
