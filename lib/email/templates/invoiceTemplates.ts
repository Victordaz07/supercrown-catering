import { baseLayout, ctaButton, escapeHtml } from "./_shared";

function money(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function invoiceSent(data: {
  customerName: string;
  orderNumber: string;
  invoiceNumber: string;
  total: number;
  dueDate?: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const orderUrl = `${data.portalUrl}/client/orders/${data.orderNumber}`;
  const dueNote = data.dueDate
    ? `<p style="margin:0 0 20px;color:#2A2520;">Vencimiento: ${escapeHtml(data.dueDate)}</p>`
    : "";
  const content = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#2A2520;">Hola ${escapeHtml(data.customerName)}, tu factura está lista</h1>
    <p style="margin:0 0 12px;color:#8A8070;line-height:1.6;">Factura <strong>${escapeHtml(data.invoiceNumber)}</strong> para la orden <strong>${escapeHtml(data.orderNumber)}</strong>.</p>
    <p style="margin:0 0 12px;color:#2A2520;font-weight:600;">Total: ${money(data.total)}</p>
    ${dueNote}
    <p style="margin:0;">${ctaButton(orderUrl, "Ver mi orden")}</p>`;
  return {
    subject: `Factura ${data.invoiceNumber} — Super Crown Catering`,
    html: baseLayout(content),
  };
}

export function invoicePaid(data: {
  customerName: string;
  invoiceNumber: string;
  total: number;
  portalUrl: string;
}): { subject: string; html: string } {
  const content = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#2A2520;">Hola ${escapeHtml(data.customerName)}, pago recibido</h1>
    <p style="margin:0 0 12px;color:#8A8070;line-height:1.6;">Hemos recibido el pago de la factura <strong>${escapeHtml(data.invoiceNumber)}</strong>.</p>
    <p style="margin:0;color:#2A2520;font-weight:600;">Monto: ${money(data.total)}</p>
    <p style="margin-top:20px;color:#8A8070;">¡Gracias por tu negocio!</p>`;
  return {
    subject: `Pago recibido — Factura ${data.invoiceNumber}`,
    html: baseLayout(content),
  };
}

export function adjustmentApplied(data: {
  customerName: string;
  orderNumber: string;
  invoiceNumber: string;
  adjustmentAmount: number;
  newTotal: number;
  portalUrl: string;
}): { subject: string; html: string } {
  const orderUrl = `${data.portalUrl}/client/orders/${data.orderNumber}`;
  const content = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#2A2520;">Hola ${escapeHtml(data.customerName)}, se aplicó un ajuste a tu factura</h1>
    <p style="margin:0 0 12px;color:#8A8070;line-height:1.6;">Factura <strong>${escapeHtml(data.invoiceNumber)}</strong> (orden ${escapeHtml(data.orderNumber)}).</p>
    <p style="margin:0 0 8px;color:#2A2520;">Ajuste aplicado: ${money(data.adjustmentAmount)}</p>
    <p style="margin:0 0 20px;color:#2A2520;font-weight:600;">Nuevo total: ${money(data.newTotal)}</p>
    <p style="margin:0;">${ctaButton(orderUrl, "Ver mi orden")}</p>`;
  return {
    subject: `Ajuste aplicado — Factura ${data.invoiceNumber}`,
    html: baseLayout(content),
  };
}
