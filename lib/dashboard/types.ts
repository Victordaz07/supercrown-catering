export type TrendPoint = {
  label: string;
  value: number;
};

export type BreakdownPoint = {
  label: string;
  value: number;
};

export type DashboardTask = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
  priority: "high" | "medium" | "low";
};

export type ExecutiveDashboardData = {
  revenueKpis: {
    invoiced: number;
    paid: number;
    pending: number;
    overdue: number;
  };
  operationsKpis: {
    activeOrdersToday: number;
    deliveryIssues: number;
    pendingStatusApprovals: number;
    pendingDeliveryReviews: number;
    activeTeamMembers: number;
  };
  revenueTrend: TrendPoint[];
  orderStatusBreakdown: BreakdownPoint[];
  invoiceStatusBreakdown: BreakdownPoint[];
  pendingTasks: DashboardTask[];
};

export type SalesDashboardData = {
  kpis: {
    ordersToday: number;
    activeOrders: number;
    pendingInvoicesAmount: number;
    overdueInvoicesAmount: number;
    openStatusRequests: number;
  };
  orderPipeline: BreakdownPoint[];
  collectionsTrend: TrendPoint[];
  pendingTasks: DashboardTask[];
};

export type DeliveryStopSummary = {
  routeId: string;
  stopId: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  deliveryAddress: string;
  status: string;
};

export type DeliveryDashboardData = {
  kpis: {
    routesToday: number;
    deliveredStops: number;
    pendingStops: number;
    inTransitStops: number;
    skippedStops: number;
    incidentReports: number;
  };
  routeProgress: BreakdownPoint[];
  incidentBreakdown: BreakdownPoint[];
  todaysStops: DeliveryStopSummary[];
  pendingTasks: DashboardTask[];
};

export type DashboardOverview = {
  role: string;
  generatedAt: string;
  executive?: ExecutiveDashboardData;
  sales?: SalesDashboardData;
  delivery?: DeliveryDashboardData;
};
