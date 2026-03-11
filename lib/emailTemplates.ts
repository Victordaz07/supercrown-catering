import type { CartItem } from "@/lib/cartStore";

export interface EmailData {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  deliveryAddress?: string;
  eventDate: string;
  guestCount: string;
  budget: string;
  eventDetails: string;
  items: CartItem[];
  totalItems: number;
  orderNumber?: string;
  dashboardUrl?: string;
}

const BUDGET_LABELS: Record<string, string> = {
  "under-10": "Under $10 per person",
  "10-15": "$10 – $15 per person",
  "15-20": "$15 – $20 per person",
  "20-plus": "$20+ per person",
};

function formatBudget(value: string): string {
  return BUDGET_LABELS[value] || value || "Not specified";
}

export function generateOwnerEmail(data: EmailData): string {
  const itemsRows = data.items
    .map(
      (item, i) => `
      <tr style="background-color: ${i % 2 === 0 ? "#F7F4EE" : "#EDE8DF"};">
        <td style="padding: 10px 12px; border-bottom: 1px solid #C9BFA8;">${escapeHtml(item.name)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #C9BFA8;">${escapeHtml(item.category)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #C9BFA8;">${item.quantity}</td>
      </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
    <tr>
      <td style="background:#2A2520;padding:24px 32px;">
        <p style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#fff;">SUPER CROWN</p>
        <p style="margin:8px 0 0;color:#C9BFA8;font-size:14px;">New Quote Request</p>
      </td>
    </tr>
    <tr>
      <td style="background:#B5612A;padding:12px 32px;text-align:center;">
        <p style="margin:0;color:#fff;font-size:16px;font-weight:600;">You have a new catering quote request</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #C9BFA8;background:#fff;">
          <tr>
            <td style="padding:12px 16px;color:#8A8070;font-size:11px;text-transform:uppercase;width:120px;">Name</td>
            <td style="padding:12px 16px;color:#2A2520;font-weight:bold;">${escapeHtml(data.customerName)}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#8A8070;font-size:11px;text-transform:uppercase;">Email</td>
            <td style="padding:12px 16px;color:#2A2520;font-weight:bold;">${escapeHtml(data.customerEmail)}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#8A8070;font-size:11px;text-transform:uppercase;">Date</td>
            <td style="padding:12px 16px;color:#2A2520;font-weight:bold;">${escapeHtml(data.eventDate) || "—"}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#8A8070;font-size:11px;text-transform:uppercase;">Phone</td>
            <td style="padding:12px 16px;color:#2A2520;font-weight:bold;">${escapeHtml(data.customerPhone || "") || "—"}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#8A8070;font-size:11px;text-transform:uppercase;">Delivery Address</td>
            <td style="padding:12px 16px;color:#2A2520;font-weight:bold;">${escapeHtml(data.deliveryAddress || "") || "—"}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#8A8070;font-size:11px;text-transform:uppercase;">Guests</td>
            <td style="padding:12px 16px;color:#2A2520;font-weight:bold;">${escapeHtml(data.guestCount) || "—"}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#8A8070;font-size:11px;text-transform:uppercase;">Budget</td>
            <td style="padding:12px 16px;color:#2A2520;font-weight:bold;">${escapeHtml(formatBudget(data.budget))}</td>
          </tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #C9BFA8;">
          <tr>
            <th style="background:#2A2520;color:#fff;padding:10px 12px;text-align:left;">Item</th>
            <th style="background:#2A2520;color:#fff;padding:10px 12px;text-align:left;">Category</th>
            <th style="background:#2A2520;color:#fff;padding:10px 12px;text-align:left;">Quantity</th>
          </tr>
          ${itemsRows}
          <tr>
            <td colspan="2" style="padding:10px 12px;text-align:right;color:#B5612A;font-weight:bold;">Total items:</td>
            <td style="padding:10px 12px;color:#B5612A;font-weight:bold;">${data.totalItems}</td>
          </tr>
        </table>

        ${data.eventDetails ? `
        <div style="margin-top:20px;background:#EDE8DF;border-left:3px solid #B5612A;padding:16px;">
          <p style="margin:0 0 8px;color:#8A8070;font-size:11px;text-transform:uppercase;">Event Details</p>
          <p style="margin:0;color:#2A2520;white-space:pre-wrap;">${escapeHtml(data.eventDetails)}</p>
        </div>
        ` : ""}

        <p style="margin-top:24px;">
          <a href="mailto:${escapeHtml(data.customerEmail)}" style="display:inline-block;background:#B5612A;color:#fff;padding:12px 24px;text-decoration:none;font-weight:600;margin-right:12px;">Reply to Customer</a>
          ${data.dashboardUrl ? `<a href="${escapeHtml(data.dashboardUrl)}" style="display:inline-block;background:#2A2520;color:#fff;padding:12px 24px;text-decoration:none;font-weight:600;">View in Dashboard →</a>` : ""}
        </p>
      </td>
    </tr>
    <tr>
      <td style="background:#2A2520;padding:16px 32px;color:#8A8070;font-size:12px;">
        Super Crown Catering — Fresh meals for every occasion
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function generateCustomerEmail(data: EmailData): string {
  const itemsList = data.items
    .map((i) => `• ${i.name} (${i.category}) — ${i.quantity}`)
    .join("<br>");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
    <tr>
      <td style="background:#2A2520;padding:24px 32px;">
        <p style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#fff;">SUPER CROWN</p>
        <p style="margin:8px 0 0;color:#C9BFA8;font-size:14px;font-style:italic;">Fresh meals for every occasion</p>
      </td>
    </tr>
    <tr>
      <td style="background:#F7F4EE;padding:32px;">
        <h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;color:#2A2520;">Thanks, ${escapeHtml(data.customerName)}! We&apos;ll be in touch soon.</h1>
        <p style="margin:0;color:#8A8070;line-height:1.6;">We received your quote request and will review it within 24 hours. You&apos;ll get a personalized quote with pricing based on your selections.</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;">
        <div style="border:1px solid #C9BFA8;border-radius:4px;padding:20px;background:#fff;">
          <p style="margin:0 0 12px;color:#8A8070;font-size:11px;text-transform:uppercase;">Your request summary</p>
          <p style="margin:0 0 8px;color:#2A2520;"><strong>Event date:</strong> ${escapeHtml(data.eventDate) || "—"}</p>
          <p style="margin:0 0 8px;color:#2A2520;"><strong>Guests:</strong> ${escapeHtml(data.guestCount) || "—"}</p>
          <p style="margin:0 0 12px;color:#2A2520;"><strong>Items:</strong></p>
          <p style="margin:0;color:#2A2520;line-height:1.6;">${itemsList}</p>
        </div>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
          <tr>
            <td style="padding:12px;text-align:center;width:33%;">
              <p style="margin:0;color:#B5612A;font-weight:600;">Request received ✓</p>
              <p style="margin:4px 0 0;font-size:12px;color:#8A8070;">Step 1</p>
            </td>
            <td style="padding:12px;text-align:center;width:33%;">
              <p style="margin:0;color:#8A8070;font-weight:600;">We review & price</p>
              <p style="margin:4px 0 0;font-size:12px;color:#8A8070;">Step 2</p>
            </td>
            <td style="padding:12px;text-align:center;width:33%;">
              <p style="margin:0;color:#C9BFA8;">You get your quote</p>
              <p style="margin:4px 0 0;font-size:12px;color:#8A8070;">Step 3</p>
            </td>
          </tr>
        </table>

        <div style="margin-top:24px;background:#EDE8DF;border-left:3px solid #B5612A;padding:16px;">
          <p style="margin:0;font-family:Georgia,serif;font-style:italic;color:#2A2520;">&ldquo;We believe every event deserves fresh, delicious food made with care.&rdquo;</p>
          <p style="margin:8px 0 0;color:#8A8070;font-size:12px;">— Super Crown Team</p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#2A2520;padding:16px 32px;color:#8A8070;font-size:12px;">
        Super Crown Catering — Fresh meals for every occasion
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  if (!text) return "";
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return String(text).replace(/[&<>"']/g, (m) => map[m]);
}
