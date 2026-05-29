import { AccessProfile, UserPlan, isMasterAdmin, normalizeUserPlan } from "./access";

export type AuditTier = {
  canAudit: boolean;
  pageLimit: number;
  auditLimit: number;
  windowHours: number;
};

export function getAuditTier(profile: AccessProfile | UserPlan): AuditTier {
  if (isMasterAdmin(profile)) {
    return { canAudit: true, pageLimit: 500, auditLimit: 999, windowHours: 24 };
  }
  const plan = typeof profile === "string" ? profile : normalizeUserPlan(profile.plan);
  if (plan === "agency") {
    return { canAudit: true, pageLimit: 500, auditLimit: 999, windowHours: 24 };
  }
  if (plan === "pro") {
    return { canAudit: true, pageLimit: 100, auditLimit: 999, windowHours: 24 };
  }
  if (plan === "onetime") {
    return { canAudit: true, pageLimit: 50, auditLimit: 10, windowHours: 24 };
  }
  if (plan === "free") {
    return { canAudit: true, pageLimit: 10, auditLimit: 3, windowHours: 24 };
  }
  // guest
  return { canAudit: true, pageLimit: 5, auditLimit: 1, windowHours: 24 };
}
