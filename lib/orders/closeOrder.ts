import { prisma } from "@/lib/db";
import { logAudit } from "@/lib/audit";

export interface ClosureCheckResult {
  canClose: boolean;
  blockers: string[];
  checks: {
    key: string;
    passed: boolean;
    label: string;
  }[];
}

export async function checkOrderClosure(
  orderId: string,
): Promise<ClosureCheckResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      invoices: true,
      deliveryReports: {
        include: { items: true },
      },
      adjustmentRequests: true,
    },
  });

  if (!order) {
    return {
      canClose: false,
      blockers: ["Orden no encontrada"],
      checks: [],
    };
  }

  const checks: { key: string; passed: boolean; label: string }[] = [];

  const validCloseStatuses = ["DELIVERED", "UNDER_REVIEW", "DISPUTED"];
  const statusOk =
    validCloseStatuses.includes(order.status) ||
    order.status === "COMPLETED";
  checks.push({
    key: "ORDER_STATUS",
    passed: statusOk,
    label: "Orden en estado cerrable",
  });

  const report = order.deliveryReports?.[0];
  const reportOk = !!report && report.status === "APPROVED";
  checks.push({
    key: "DELIVERY_REPORT",
    passed: reportOk,
    label: "Reporte de entrega aprobado",
  });

  const pendingItems =
    report?.items.filter(
      (i) => i.deliveredQty !== i.expectedQty && !i.issue,
    ) ?? [];
  const itemsOk = pendingItems.length === 0;
  checks.push({
    key: "REPORT_ITEMS",
    passed: itemsOk,
    label: "Todos los items del reporte revisados",
  });

  const hasDiscrepancy =
    report?.items.some(
      (i) => i.deliveredQty !== i.expectedQty || !!i.issue,
    ) ?? false;
  const pendingAdjustments = order.adjustmentRequests.filter(
    (a) => a.status === "PENDING" || a.status === "UNDER_REVIEW",
  );
  const adjustmentsOk =
    !hasDiscrepancy ||
    (hasDiscrepancy && pendingAdjustments.length === 0);
  checks.push({
    key: "ADJUSTMENTS",
    passed: adjustmentsOk,
    label: hasDiscrepancy
      ? "Ajustes por discrepancias resueltos"
      : "Sin discrepancias pendientes",
  });

  const invoice = order.invoices?.[0];
  const invoiceOk = !!invoice && invoice.status === "PAID";
  checks.push({
    key: "INVOICE_PAID",
    passed: invoiceOk,
    label: "Factura pagada",
  });

  const blockers = checks.filter((c) => !c.passed).map((c) => c.label);

  return {
    canClose: blockers.length === 0,
    blockers,
    checks,
  };
}

export async function attemptOrderClosure(
  orderId: string,
  triggeredBy: string = "system",
): Promise<{ closed: boolean; reason?: string }> {
  const result = await checkOrderClosure(orderId);

  if (!result.canClose) {
    return { closed: false, reason: result.blockers.join(", ") };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return { closed: false, reason: "Orden no encontrada" };
  }

  if (order.status === "COMPLETED") {
    return { closed: true, reason: "Ya estaba cerrada" };
  }

  const { executeTransition } = await import("./stateMachine");
  const transition = await executeTransition(
    orderId,
    "COMPLETED",
    triggeredBy,
    "MASTER",
    "Cierre automático: todos los requisitos cumplidos",
    { skipApprovalCheck: true },
  );

  if (!transition.success) {
    return { closed: false, reason: transition.error };
  }

  await logAudit({
    userId: triggeredBy,
    action: "ORDER_AUTO_CLOSED",
    entity: "Order",
    entityId: orderId,
    metadata: { triggeredBy, checks: result.checks },
  }).catch(console.error);

  return { closed: true };
}
