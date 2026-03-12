interface AuthorityTier {
  maxDelta: number;
  approverRoles: string[];
}

function getAuthorityTiers(): AuthorityTier[] {
  return [
    {
      maxDelta: parseFloat(process.env.ADJUSTMENT_TIER_SMALL ?? "50"),
      approverRoles: ["ADMIN", "MASTER"],
    },
    {
      maxDelta: parseFloat(process.env.ADJUSTMENT_TIER_MEDIUM ?? "200"),
      approverRoles: ["MASTER"],
    },
    {
      maxDelta: parseFloat(process.env.ADJUSTMENT_TIER_LARGE ?? "500"),
      approverRoles: ["MASTER"],
    },
    {
      maxDelta: Infinity,
      approverRoles: ["MASTER"],
    },
  ];
}

export function getRequiredApprovers(delta: number): string[] {
  const tiers = getAuthorityTiers();
  const tier = tiers.find((t) => Math.abs(delta) <= t.maxDelta);
  return tier?.approverRoles ?? ["MASTER"];
}

export function canApproveAdjustment(userRole: string, delta: number): boolean {
  const required = getRequiredApprovers(delta);
  return required.includes(userRole);
}

export function getAutoApprovalThreshold(): number {
  return parseFloat(process.env.ADJUSTMENT_AUTO_APPROVE_THRESHOLD ?? "0");
}

export function shouldAutoApprove(delta: number): boolean {
  const threshold = getAutoApprovalThreshold();
  return threshold > 0 && Math.abs(delta) <= threshold;
}
