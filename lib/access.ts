export type UserPlan = "guest" | "free" | "pro" | "agency";

export type AccessProfile = {
  plan?: UserPlan | string | null;
  isAdmin?: boolean | null;
};

export function normalizeUserPlan(plan: unknown): UserPlan {
  if (plan === "agency" || plan === "pro" || plan === "free" || plan === "guest") return plan;
  return "free";
}

export function isMasterAdmin(profile: AccessProfile | UserPlan) {
  if (typeof profile === "string") return profile === "agency";
  return normalizeUserPlan(profile.plan) === "agency" || Boolean(profile.isAdmin);
}

export function isProUser(profile: AccessProfile | UserPlan) {
  if (typeof profile === "string") return profile === "pro" || profile === "agency";
  const plan = normalizeUserPlan(profile.plan);
  return plan === "pro" || plan === "agency" || Boolean(profile.isAdmin);
}

export function canRunScan(profile: AccessProfile | UserPlan, remaining: number | null) {
  if (isMasterAdmin(profile) || isProUser(profile)) return true;
  if (typeof remaining !== "number") return true;
  return remaining > 0;
}

export function canViewFullReport(profile: AccessProfile | UserPlan) {
  return isProUser(profile);
}

export function canDownloadPdf(profile: AccessProfile | UserPlan) {
  return isProUser(profile);
}
