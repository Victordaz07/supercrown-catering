import { prisma } from "./db";

export async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `SC-${year}-`;
  const last = await prisma.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
  });
  const num = last
    ? parseInt(last.orderNumber.replace(prefix, ""), 10) + 1
    : 1;
  return `${prefix}${String(num).padStart(4, "0")}`;
}

export function buildMapsUrl(address: string): string {
  const encoded = encodeURIComponent(address);
  return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
}

export function buildMultiStopMapsUrl(
  stops: Array<{ address: string }>,
  startAddress?: string | null
): string {
  if (stops.length === 0) return "";

  const addresses = stops.map((s) => encodeURIComponent(s.address));

  if (startAddress) {
    const origin = encodeURIComponent(startAddress);
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(0, -1);
    return `https://www.google.com/maps/dir/${origin}/${waypoints.join("/")}${waypoints.length ? "/" : ""}${destination}`;
  }

  if (addresses.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${addresses[0]}`;
  }

  const origin = addresses[0];
  const destination = addresses[addresses.length - 1];
  const waypoints = addresses.slice(1, -1);
  return `https://www.google.com/maps/dir/${origin}/${waypoints.join("/")}${waypoints.length ? "/" : ""}${destination}`;
}
