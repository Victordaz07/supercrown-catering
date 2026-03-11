import { FLEET_CONFIG, type VehicleProfile } from "@/lib/fleet-config";
import { classifyZoneByAddress, inferRouteMiles, type ZoneId } from "@/lib/route-zones";

export type DeliveryItemInput = {
  name: string;
  category?: string;
  quantity: number;
};

export type SuggestRouteInput = {
  primaryAddress: string;
  additionalStops?: string[];
  stopsCountHint?: number;
  estimatedMiles?: number | null;
  items: DeliveryItemInput[];
};

export type SuggestRouteOutput = {
  zoneId: ZoneId;
  zoneLabel: string;
  milesEstimated: number;
  stopsCount: number;
  trayEquivalent: number;
  refrigerationRequired: boolean;
  suggestedVehicleId: VehicleProfile["id"];
  suggestedVehicleLabel: string;
  suggestedStops: number;
  estimatedLoadLevel: "low" | "medium" | "high";
  confidence: "low" | "medium" | "high";
  reasonCodes: string[];
};

const REFRIGERATED_KEYWORDS = [
  "yogurt",
  "avena",
  "oatmeal",
  "salad",
  "ensalada",
  "fruit",
  "parfait",
];

function estimateTrayEquivalent(items: DeliveryItemInput[]): number {
  const totalUnits = items.reduce((sum, item) => sum + Math.max(0, Number(item.quantity) || 0), 0);
  if (totalUnits === 0) return 1;

  // Business baseline: tray usually carries around 15-20 items.
  const trays = Math.ceil(totalUnits / 18);
  return Math.max(1, trays);
}

function hasColdSensitiveItems(items: DeliveryItemInput[]): boolean {
  return items.some((item) => {
    const combined = `${item.name} ${item.category ?? ""}`.toLowerCase();
    return REFRIGERATED_KEYWORDS.some((keyword) => combined.includes(keyword));
  });
}

function detectLoadLevel(
  trayEquivalent: number,
  vehicle: VehicleProfile
): "low" | "medium" | "high" {
  const ratio = trayEquivalent / vehicle.maxTrayEquivalent;
  if (ratio < 0.4) return "low";
  if (ratio < 0.8) return "medium";
  return "high";
}

function computeSuggestedStops(vehicle: VehicleProfile, stopsCount: number): number {
  return Math.min(vehicle.maxSuggestedStops, Math.max(1, stopsCount));
}

export function suggestDeliveryRoute(input: SuggestRouteInput): SuggestRouteOutput {
  const addresses = [input.primaryAddress, ...(input.additionalStops ?? [])].filter(Boolean);
  const hintedStops = Math.max(0, Number(input.stopsCountHint) || 0);
  const stopsCount = Math.max(addresses.length || 1, hintedStops || 1);
  const milesEstimated = inferRouteMiles(addresses, input.estimatedMiles);

  const zone = classifyZoneByAddress(input.primaryAddress);
  const trayEquivalent = estimateTrayEquivalent(input.items);
  const coldSensitiveItems = hasColdSensitiveItems(input.items);

  const nearAndFast = stopsCount <= 4 && milesEstimated <= 10;
  const longDistance = milesEstimated > 10;

  // Rule requested by operations:
  // <= 4 nearby stops can run non-refrigerated; > 10 miles must be refrigerated.
  const refrigerationRequired = longDistance || (!nearAndFast && coldSensitiveItems);

  const reasonCodes: string[] = [];
  if (nearAndFast) reasonCodes.push("short_route_up_to_4_stops");
  if (longDistance) reasonCodes.push("distance_over_10_miles_requires_refrigeration");
  if (coldSensitiveItems) reasonCodes.push("cold_sensitive_items_detected");
  if (trayEquivalent > 24) reasonCodes.push("high_tray_load");

  const candidateFleet = refrigerationRequired
    ? FLEET_CONFIG.filter((vehicle) => vehicle.refrigerated)
    : FLEET_CONFIG;

  const byCapacity = [...candidateFleet].sort(
    (a, b) => a.maxTrayEquivalent - b.maxTrayEquivalent
  );

  const selected =
    byCapacity.find((vehicle) => trayEquivalent <= vehicle.maxTrayEquivalent) ??
    byCapacity[byCapacity.length - 1];

  const estimatedLoadLevel = detectLoadLevel(trayEquivalent, selected);
  const confidence: "low" | "medium" | "high" =
    reasonCodes.length >= 2 ? "high" : reasonCodes.length === 1 ? "medium" : "low";

  return {
    zoneId: zone.id,
    zoneLabel: zone.label,
    milesEstimated,
    stopsCount,
    trayEquivalent,
    refrigerationRequired,
    suggestedVehicleId: selected.id,
    suggestedVehicleLabel: selected.label,
    suggestedStops: computeSuggestedStops(selected, stopsCount),
    estimatedLoadLevel,
    confidence,
    reasonCodes,
  };
}
