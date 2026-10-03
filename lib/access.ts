export type UserPlan = "guest" | "free" | "onetime" | "pro" | "agency";

export const PLAN_LIMITS = {
  free:    { auditPages: 5,   auditPerDay: 1,   monitorUrls: 1,  scanPerMonth: 3 },
  onetime: { auditPages: 50,  auditRescans: 3,  monitorUrls: 1,  fullReport: true },
  pro:     { auditPages: 100, auditRescans: 10, monitorUrls: 10, scanUnlimited: true },
  agency:  { auditPages: 500, auditRescans: 20, monitorUrls: -1, scanUnlimited: true },
} as const;

export type AccessProfile = {
  plan?: UserPlan | string | null;
  isAdmin?: boolean | null;
};

export function normalizeUserPlan(plan: unknown): UserPlan {
  if (
    plan === "agency" ||
    plan === "pro" ||
    plan === "onetime" ||
    plan === "free" ||
    plan === "guest"
  ) return plan;
  return "free";
}

/** Admin status comes only from the server (`isAdmin`, from MASTER_ADMIN_EMAILS), never from the plan. */
export function isMasterAdmin(profile: AccessProfile | UserPlan) {
  if (typeof profile === "string") return false;
  return Boolean(profile.isAdmin);
}

export function isProUser(profile: AccessProfile | UserPlan) {
  if (typeof profile === "string") {
    return profile === "pro" || profile === "agency" || profile === "onetime";
  }
  const plan = normalizeUserPlan(profile.plan);
  return plan === "pro" || plan === "agency" || plan === "onetime" || Boolean(profile.isAdmin);
}

export function canRunScan(profile: AccessProfile | UserPlan, remaining: number | null) {
  if (isMasterAdmin(profile) || isProUser(profile)) return true;
  if (typeof remaining !== "number") return true;
  return remaining > 0;
}

export function canViewFullReport(profile: AccessProfile | UserPlan) {
  if (typeof profile === "string") {
    return profile === "pro" || profile === "agency";
  }
  const plan = normalizeUserPlan(profile.plan);
  return plan === "pro" || plan === "agency" || Boolean(profile.isAdmin);
}

export function canDownloadPdf(profile: AccessProfile | UserPlan) {
  return isProUser(profile);
}

export function canMonitor(profile: AccessProfile | UserPlan) {
  return isProUser(profile);
}
