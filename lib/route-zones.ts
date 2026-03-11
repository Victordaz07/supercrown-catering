export type ZoneId =
  | "north_bay"
  | "south_bay"
  | "oakland_east_bay"
  | "sausalito_north"
  | "san_francisco_core"
  | "peninsula"
  | "unknown";

type ZoneRule = {
  id: ZoneId;
  label: string;
  cityKeywords: string[];
  defaultMilesFromHub: number;
};

const ZONE_RULES: ZoneRule[] = [
  {
    id: "north_bay",
    label: "North Bay",
    cityKeywords: ["san rafael", "novato", "petaluma", "mill valley"],
    defaultMilesFromHub: 18,
  },
  {
    id: "south_bay",
    label: "South Bay",
    cityKeywords: ["san jose", "santa clara", "sunnyvale", "milpitas", "cupertino"],
    defaultMilesFromHub: 32,
  },
  {
    id: "oakland_east_bay",
    label: "Oakland / East Bay",
    cityKeywords: ["oakland", "berkeley", "alameda", "hayward", "fremont", "richmond"],
    defaultMilesFromHub: 14,
  },
  {
    id: "sausalito_north",
    label: "Sausalito / North Coast",
    cityKeywords: ["sausalito", "tiburon", "larkspur", "corte madera"],
    defaultMilesFromHub: 16,
  },
  {
    id: "san_francisco_core",
    label: "San Francisco",
    cityKeywords: ["san francisco", "sf"],
    defaultMilesFromHub: 9,
  },
  {
    id: "peninsula",
    label: "Peninsula",
    cityKeywords: ["daly city", "san mateo", "redwood city", "burlingame"],
    defaultMilesFromHub: 17,
  },
];

export function classifyZoneByAddress(address: string): ZoneRule {
  const normalized = address.toLowerCase();
  const rule = ZONE_RULES.find((zone) =>
    zone.cityKeywords.some((keyword) => normalized.includes(keyword))
  );
  if (rule) return rule;
  return {
    id: "unknown",
    label: "Unknown",
    cityKeywords: [],
    defaultMilesFromHub: 15,
  };
}

export function inferRouteMiles(
  addresses: string[],
  estimatedMiles?: number | null
): number {
  if (typeof estimatedMiles === "number" && estimatedMiles > 0) {
    return Number(estimatedMiles.toFixed(1));
  }

  if (addresses.length === 0) return 0;

  const zones = addresses.map((address) => classifyZoneByAddress(address));
  const maxBaseMiles = Math.max(...zones.map((zone) => zone.defaultMilesFromHub));
  const stopFactor = Math.max(0, addresses.length - 1) * 1.5;

  return Number((maxBaseMiles + stopFactor).toFixed(1));
}
