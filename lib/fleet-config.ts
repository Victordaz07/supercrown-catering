export type VehicleId =
  | "ford_transit_large_1"
  | "ford_transit_large_2"
  | "ford_connect_small_1"
  | "ford_connect_small_2";

export type VehicleProfile = {
  id: VehicleId;
  label: string;
  refrigerated: boolean;
  capacityClass: "high" | "medium" | "medium_low";
  maxTrayEquivalent: number;
  maxSuggestedStops: number;
};

export const FLEET_CONFIG: VehicleProfile[] = [
  {
    id: "ford_transit_large_1",
    label: "Ford Transit Large #1",
    refrigerated: true,
    capacityClass: "high",
    maxTrayEquivalent: 48,
    maxSuggestedStops: 10,
  },
  {
    id: "ford_transit_large_2",
    label: "Ford Transit Large #2",
    refrigerated: true,
    capacityClass: "high",
    maxTrayEquivalent: 48,
    maxSuggestedStops: 10,
  },
  {
    id: "ford_connect_small_1",
    label: "Ford Connect Small #1",
    refrigerated: true,
    capacityClass: "medium",
    maxTrayEquivalent: 24,
    maxSuggestedStops: 6,
  },
  {
    id: "ford_connect_small_2",
    label: "Ford Connect Small #2",
    refrigerated: false,
    capacityClass: "medium_low",
    maxTrayEquivalent: 18,
    maxSuggestedStops: 4,
  },
];

export const VEHICLE_BY_ID = Object.fromEntries(
  FLEET_CONFIG.map((vehicle) => [vehicle.id, vehicle])
) as Record<VehicleId, VehicleProfile>;
