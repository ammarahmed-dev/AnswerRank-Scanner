"use client";

import { useAuth } from "../context/AuthContext";

export default function AuditNavLink() {
  const { plan, isAdmin, loading } = useAuth();
  const canAudit = isAdmin || plan === "pro" || plan === "agency";
  if (loading || !canAudit) return null;
  return <a href="/audit">Audit</a>;
}
