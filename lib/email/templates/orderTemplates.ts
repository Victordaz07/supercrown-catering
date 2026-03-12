import { baseLayout, ctaButton, escapeHtml } from "./_shared";

export function orderConfirmed(data: {
  customerName: string;
  orderNumber: string;
  eventDate: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const orderUrl = `${data.portalUrl}/client/orders/${data.orderNumber}`;
  const content = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#2A2520;">Hola ${escapeHtml(data.customerName)}, tu orden está confirmada</h1>
    <p style="margin:0 0 12px;color:#8A8070;line-height:1.6;">Tu orden <strong>${escapeHtml(data.orderNumber)}</strong> ha sido confirmada.</p>
    <p style="margin:0 0 20px;color:#2A2520;">Fecha del evento: ${escapeHtml(data.eventDate)}</p>
    <p style="margin:0;">${ctaButton(orderUrl, "Ver mi orden")}</p>`;
  return {
    subject: `Orden ${data.orderNumber} confirmada — Super Crown Catering`,
    html: baseLayout(content),
  };
}

export function orderInPreparation(data: {
  customerName: string;
  orderNumber: string;
  eventDate: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const orderUrl = `${data.portalUrl}/client/orders/${data.orderNumber}`;
  const content = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#2A2520;">Hola ${escapeHtml(data.customerName)}, estamos preparando tu orden</h1>
    <p style="margin:0 0 12px;color:#8A8070;line-height:1.6;">Tu orden <strong>${escapeHtml(data.orderNumber)}</strong> está en preparación.</p>
    <p style="margin:0 0 20px;color:#2A2520;">Fecha del evento: ${escapeHtml(data.eventDate)}</p>
    <p style="margin:0;">${ctaButton(orderUrl, "Ver mi orden")}</p>`;
  return {
    subject: `Orden ${data.orderNumber} en preparación — Super Crown Catering`,
    html: baseLayout(content),
  };
}

export function orderInTransit(data: {
  customerName: string;
  orderNumber: string;
  driverName?: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const orderUrl = `${data.portalUrl}/client/orders/${data.orderNumber}`;
  const driverNote = data.driverName
    ? `<p style="margin:0 0 20px;color:#2A2520;">Tu conductor: ${escapeHtml(data.driverName)}</p>`
    : "";
  const content = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#2A2520;">Hola ${escapeHtml(data.customerName)}, tu orden está en camino</h1>
    <p style="margin:0 0 12px;color:#8A8070;line-height:1.6;">Tu orden <strong>${escapeHtml(data.orderNumber)}</strong> ya está en ruta hacia ti.</p>
    ${driverNote}
    <p style="margin:0;">${ctaButton(orderUrl, "Ver mi orden")}</p>`;
  return {
    subject: `Orden ${data.orderNumber} en camino — Super Crown Catering`,
    html: baseLayout(content),
  };
}

export function orderDelivered(data: {
  customerName: string;
  orderNumber: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const orderUrl = `${data.portalUrl}/client/orders/${data.orderNumber}`;
  const content = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#2A2520;">Hola ${escapeHtml(data.customerName)}, tu orden fue entregada</h1>
    <p style="margin:0 0 12px;color:#8A8070;line-height:1.6;">Tu orden <strong>${escapeHtml(data.orderNumber)}</strong> ha sido entregada correctamente.</p>
    <p style="margin:0 0 20px;color:#2A2520;">¡Gracias por elegir Super Crown Catering!</p>
    <p style="margin:0;">${ctaButton(orderUrl, "Ver mi orden")}</p>`;
  return {
    subject: `Orden ${data.orderNumber} entregada — Super Crown Catering`,
    html: baseLayout(content),
  };
}

export function orderCompleted(data: {
  customerName: string;
  orderNumber: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const orderUrl = `${data.portalUrl}/client/orders/${data.orderNumber}`;
  const content = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#2A2520;">Hola ${escapeHtml(data.customerName)}, tu orden está completada</h1>
    <p style="margin:0 0 12px;color:#8A8070;line-height:1.6;">Tu orden <strong>${escapeHtml(data.orderNumber)}</strong> ha sido completada. ¡Gracias por tu confianza!</p>
    <p style="margin:0;">${ctaButton(orderUrl, "Ver mi orden")}</p>`;
  return {
    subject: `Orden ${data.orderNumber} completada — Super Crown Catering`,
    html: baseLayout(content),
  };
}

export function orderDisputed(data: {
  customerName: string;
  orderNumber: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const orderUrl = `${data.portalUrl}/client/orders/${data.orderNumber}`;
  const content = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#2A2520;">Hola ${escapeHtml(data.customerName)}, actualización de tu orden</h1>
    <p style="margin:0 0 12px;color:#8A8070;line-height:1.6;">Tu orden <strong>${escapeHtml(data.orderNumber)}</strong> tiene una discrepancia reportada. Estamos trabajando para resolverla.</p>
    <p style="margin:0;">${ctaButton(orderUrl, "Ver mi orden")}</p>`;
  return {
    subject: `Actualización orden ${data.orderNumber} — Super Crown Catering`,
    html: baseLayout(content),
  };
}

export function orderCancelled(data: {
  customerName: string;
  orderNumber: string;
  reason?: string;
  portalUrl: string;
}): { subject: string; html: string } {
  const orderUrl = `${data.portalUrl}/client/orders/${data.orderNumber}`;
  const reasonNote = data.reason
    ? `<p style="margin:0 0 20px;color:#2A2520;">Motivo: ${escapeHtml(data.reason)}</p>`
    : "";
  const content = `
    <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:24px;color:#2A2520;">Hola ${escapeHtml(data.customerName)}, tu orden fue cancelada</h1>
    <p style="margin:0 0 12px;color:#8A8070;line-height:1.6;">Tu orden <strong>${escapeHtml(data.orderNumber)}</strong> ha sido cancelada.</p>
    ${reasonNote}
    <p style="margin:0;">${ctaButton(orderUrl, "Ver detalles")}</p>`;
  return {
    subject: `Orden ${data.orderNumber} cancelada — Super Crown Catering`,
    html: baseLayout(content),
  };
}
