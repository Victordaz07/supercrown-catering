export const FEATURE_FLAGS = {
  ORDER_STATE_MACHINE_V2: process.env.FEATURE_ORDER_STATE_MACHINE_V2 === "true",
  QUOTE_V2: process.env.FEATURE_QUOTE_V2 === "true",
  PRICE_LOCK: process.env.FEATURE_PRICE_LOCK === "true",
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}
