export type UserPlan = "guest" | "free" | "pro" | "agency";

export function isMasterAdmin(plan: UserPlan) {
  return plan === "agency";
}

export function isProUser(plan: UserPlan) {
  return plan === "pro" || plan === "agency";
}

export function canRunScan(plan: UserPlan, remaining: number | null) {
  if (isMasterAdmin(plan) || isProUser(plan)) return true;
  if (typeof remaining !== "number") return true;
  return remaining > 0;
}

export function canViewFullReport(plan: UserPlan) {
  return isProUser(plan);
}

export function canDownloadPdf(plan: UserPlan) {
  return isProUser(plan);
}
