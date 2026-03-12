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

export function footer(): string {
  return `
    <tr>
      <td style="background:#2A2520;padding:16px 32px;color:#8A8070;font-size:12px;">
        Super Crown Catering | supercrowncatering.com
      </td>
    </tr>`;
}

export function ctaButton(url: string, label: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#B5612A;color:#fff;padding:12px 24px;text-decoration:none;font-weight:600;border-radius:6px;">${escapeHtml(label)}</a>`;
}

export function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;">
    <tr>
      <td style="background:#2A2520;padding:24px 32px;">
        <p style="margin:0;font-family:Georgia,serif;font-size:24px;font-weight:bold;color:#fff;">SUPER CROWN</p>
        <p style="margin:8px 0 0;color:#C9BFA8;font-size:14px;">Fresh meals for every occasion</p>
      </td>
    </tr>
    <tr>
      <td style="padding:24px 32px;">
        ${content}
      </td>
    </tr>
    ${footer()}
  </table>
</body>
</html>`;
}

export { escapeHtml };
