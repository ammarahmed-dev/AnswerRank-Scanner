"use client";

import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import UpgradeButton from "@/app/components/UpgradeButton";
import { PLAN_LIMITS } from "@/lib/access";

type PaidPlan = "onetime" | "pro" | "agency";
type PlanKey = "free" | PaidPlan;

const PLAN_RANK: Record<string, number> = {
  guest: 0,
  free: 0,
  onetime: 1,
  pro: 2,
  agency: 3,
};

type PlanDef = {
  key: PlanKey;
  name: string;
  price: string;
  period: string;
  description: string;
  highlights: string[];
  popular?: true;
};

const PLANS: PlanDef[] = [
  {
    key: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Try AEO scanning on your most important pages - no commitment.",
    highlights: [
      `${PLAN_LIMITS.free.scanPerMonth} scans per month`,
      `${PLAN_LIMITS.free.auditPages}-page audit runs`,
      `${PLAN_LIMITS.free.monitorUrls} monitored URL`,
    ],
  },
  {
    key: "onetime",
    name: "Starter",
    price: "$9",
    period: "one-time",
    description: "A single deep-dive audit - great for one-off projects or clients.",
    highlights: [
      "1 full report URL · preview on all others",
      `${PLAN_LIMITS.onetime.auditPages}-page audit runs`,
      `${PLAN_LIMITS.onetime.monitorUrls} monitored URLs`,
      `${PLAN_LIMITS.onetime.auditRescans} re-scan snapshots`,
      "PDF export included",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    price: "$19",
    period: "/ month",
    description: "Ongoing monitoring and reports for growing businesses.",
    popular: true,
    highlights: [
      "Unlimited scans",
      `${PLAN_LIMITS.pro.auditPages}-page audit runs`,
      `${PLAN_LIMITS.pro.monitorUrls} monitored URLs`,
      `${PLAN_LIMITS.pro.auditRescans} re-scan snapshots`,
      "PDF export + priority support",
    ],
  },
  {
    key: "agency",
    name: "Agency",
    price: "$49",
    period: "/ month",
    description: "Unlimited scale for agencies managing multiple clients.",
    highlights: [
      "Unlimited scans",
      `${PLAN_LIMITS.agency.auditPages}-page audit runs`,
      "Unlimited monitored URLs",
      `${PLAN_LIMITS.agency.auditRescans} re-scan snapshots`,
      "PDF export + priority support",
    ],
  },
];

type FeatureRow = {
  label: string;
  values: [string | boolean, string | boolean, string | boolean, string | boolean];
};

const FEATURE_ROWS: FeatureRow[] = [
  {
    label: "Scans per month",
    values: [
      String(PLAN_LIMITS.free.scanPerMonth),
      "1 full report URL",
      "Unlimited",
      "Unlimited",
    ],
  },
  {
    label: "Audit pages per run",
    values: [
      String(PLAN_LIMITS.free.auditPages),
      String(PLAN_LIMITS.onetime.auditPages),
      String(PLAN_LIMITS.pro.auditPages),
      String(PLAN_LIMITS.agency.auditPages),
    ],
  },
  {
    label: "Monitored URLs",
    values: [
      String(PLAN_LIMITS.free.monitorUrls),
      String(PLAN_LIMITS.onetime.monitorUrls),
      String(PLAN_LIMITS.pro.monitorUrls),
      "Unlimited",
    ],
  },
  {
    label: "Audit snapshots",
    values: [
      "1 per day",
      `${PLAN_LIMITS.onetime.auditRescans} rescans`,
      `${PLAN_LIMITS.pro.auditRescans} rescans`,
      `${PLAN_LIMITS.agency.auditRescans} rescans`,
    ],
  },
  {
    label: "PDF export",
    values: [false, true, true, true],
  },
  {
    label: "Priority support",
    values: [false, false, true, true],
  },
];

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: "Is there really a free plan?",
    a: `Yes - no credit card required. You get ${PLAN_LIMITS.free.scanPerMonth} scans per month and can audit up to ${PLAN_LIMITS.free.auditPages} pages per run. Limits reset at the start of each calendar month.`,
  },
  {
    q: "What is the Starter one-time plan?",
    a: `A single payment of $9 that gives you ${PLAN_LIMITS.onetime.auditPages}-page audit runs, ${PLAN_LIMITS.onetime.monitorUrls} monitored URLs, and ${PLAN_LIMITS.onetime.auditRescans} re-scan snapshots - no subscription, no recurring charges.`,
  },
  {
    q: "Can I cancel my subscription at any time?",
    a: "Absolutely. Pro and Agency plans are billed monthly and you can cancel from your account settings at any time. You keep full access until the end of your current billing period.",
  },
  {
    q: "What's the difference between a scan and an audit?",
    a: "A scan checks a single URL for AI search visibility signals. An audit is a deeper crawl that checks multiple pages of a site in one run and produces a full-site score with recommendations.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes - if you're not satisfied, contact us within 14 days of purchase and we'll issue a full refund, no questions asked.",
  },
  {
    q: "What happens when I hit my free scan limit?",
    a: `Free accounts get ${PLAN_LIMITS.free.scanPerMonth} scans per month. When you hit the limit you'll be prompted to upgrade. Your count resets at the start of each calendar month.`,
  },
];

const cardBase: React.CSSProperties = {
  padding: "28px 24px 24px",
  display: "flex",
  flexDirection: "column",
  gap: 20,
  position: "relative",
  borderRadius: 18,
  background: "#111116",
};

export default function PricingClient() {
  const { plan: userPlan, loading } = useAuth();

  function getPlanCta(planKey: PlanKey, popular: boolean | undefined) {
    const planDef = PLANS.find((p) => p.key === planKey)!;
    const userRank = PLAN_RANK[userPlan] ?? 0;
    const planRankValue = PLAN_RANK[planKey] ?? 0;

    if (planKey === "free") {
      if (!loading && userPlan !== "guest") {
        if (userPlan === "free") {
          return (
            <button
              className="btn btn-secondary"
              disabled
              style={{ width: "100%", justifyContent: "center" }}
            >
              Current plan
            </button>
          );
        }
        return (
          <button
            className="btn btn-secondary"
            disabled
            style={{ width: "100%", justifyContent: "center", opacity: 0.4 }}
          >
            Downgrade
          </button>
        );
      }
      return (
        <Link
          href="/login"
          className="btn btn-secondary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Get started free
        </Link>
      );
    }

    if (loading) {
      return (
        <button
          className={popular ? "btn btn-primary" : "btn btn-secondary"}
          disabled
          style={{ width: "100%", justifyContent: "center" }}
        >
          {planDef.price}
        </button>
      );
    }

    if (userPlan === planKey) {
      return (
        <UpgradeButton
          plan={planKey as PaidPlan}
          isCurrentPlan
          className="btn btn-secondary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          Current plan
        </UpgradeButton>
      );
    }

    if (userRank > planRankValue) {
      return (
        <button
          className="btn btn-secondary"
          disabled
          style={{ width: "100%", justifyContent: "center", opacity: 0.4 }}
        >
          Downgrade
        </button>
      );
    }

    const ctaLabel =
      planKey === "onetime"
        ? "Buy once - $9"
        : planKey === "pro"
        ? "Start Pro"
        : "Start Agency";

    return (
      <UpgradeButton
        plan={planKey as PaidPlan}
        className={popular ? "btn btn-primary" : "btn btn-secondary"}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {ctaLabel}
      </UpgradeButton>
    );
  }

  return (
    <div className="page-transition">
      {/* ── Hero ──────────────────────────────────────────────── */}
      <section style={{ padding: "80px 0 52px", textAlign: "center" }}>
        <div
          className="launch-container"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}
        >
          <span className="eyebrow">Pricing</span>
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 900,
              lineHeight: 1.1,
              maxWidth: 560,
              color: "var(--color-ink)",
            }}
          >
            Simple, transparent pricing
          </h1>
          <p
            style={{
              color: "var(--color-ink-muted)",
              fontSize: "1.05rem",
              maxWidth: 460,
              lineHeight: 1.65,
              marginTop: 4,
            }}
          >
            Start for free - no credit card required. Upgrade when you need
            deeper audits, monitoring, or PDF reports.
          </p>
        </div>
      </section>

      {/* ── Pricing cards ─────────────────────────────────────── */}
      <section style={{ paddingBottom: 72 }}>
        <div className="launch-container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 264px), 1fr))",
              gap: 16,
            }}
          >
            {PLANS.map((p) => {
              const isPro = Boolean(p.popular);
              return (
                <div
                  key={p.key}
                  style={{
                    ...cardBase,
                    border: isPro
                      ? "1px solid rgba(0, 240, 180, 0.38)"
                      : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: isPro
                      ? "0 0 0 1px rgba(0,240,180,0.08), 0 20px 48px rgba(0,0,0,0.38)"
                      : "0 18px 48px rgba(0,0,0,0.24)",
                  }}
                >
                  {isPro && (
                    <span
                      style={{
                        position: "absolute",
                        top: -14,
                        left: "50%",
                        transform: "translateX(-50%)",
                        background: "linear-gradient(135deg, #00c896, #00f0b4)",
                        color: "#0a0a0f",
                        fontSize: "0.68rem",
                        fontWeight: 900,
                        letterSpacing: "0.07em",
                        textTransform: "uppercase",
                        padding: "4px 14px",
                        borderRadius: 999,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Most popular
                    </span>
                  )}

                  {/* Plan header */}
                  <div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: 850,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: isPro ? "var(--color-primary)" : "var(--color-ink-muted)",
                        marginBottom: 10,
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
                      <span
                        style={{
                          fontSize: "2.4rem",
                          fontWeight: 900,
                          lineHeight: 1,
                          color: "var(--color-ink)",
                        }}
                      >
                        {p.price}
                      </span>
                      <span style={{ fontSize: "0.85rem", color: "var(--color-ink-muted)" }}>
                        {p.period}
                      </span>
                    </div>
                    <p
                      style={{
                        marginTop: 10,
                        fontSize: "0.875rem",
                        color: "var(--color-ink-muted)",
                        lineHeight: 1.55,
                      }}
                    >
                      {p.description}
                    </p>
                  </div>

                  {/* CTA */}
                  {getPlanCta(p.key, p.popular)}

                  {/* Feature highlights */}
                  <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10 }}>
                    {p.highlights.map((h) => (
                      <li
                        key={h}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          fontSize: "0.875rem",
                          color: "var(--color-ink-soft)",
                        }}
                      >
                        <Check
                          size={14}
                          style={{ color: "var(--color-primary)", flexShrink: 0 }}
                        />
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Feature comparison table ──────────────────────────── */}
      <section style={{ paddingBottom: 88 }}>
        <div className="launch-container">
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: 850,
              color: "var(--color-ink)",
              marginBottom: 24,
            }}
          >
            Compare plans
          </h2>
          <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" }}>
            <table
              style={{
                width: "100%",
                minWidth: 580,
                borderCollapse: "collapse",
                fontSize: "0.9rem",
                background: "#111116",
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      padding: "14px 20px",
                      textAlign: "left",
                      color: "var(--color-ink-muted)",
                      fontWeight: 700,
                      fontSize: "0.82rem",
                      borderBottom: "1px solid rgba(255,255,255,0.08)",
                      width: "28%",
                    }}
                  >
                    Feature
                  </th>
                  {PLANS.map((p) => (
                    <th
                      key={p.key}
                      style={{
                        padding: "14px 16px",
                        textAlign: "center",
                        fontWeight: 850,
                        borderBottom: "1px solid rgba(255,255,255,0.08)",
                        background: p.popular ? "rgba(0,240,180,0.05)" : undefined,
                        color: p.popular ? "var(--color-primary)" : "var(--color-ink)",
                        fontSize: "0.88rem",
                      }}
                    >
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row, ri) => (
                  <tr
                    key={row.label}
                    style={{
                      borderBottom:
                        ri < FEATURE_ROWS.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : undefined,
                    }}
                  >
                    <td
                      style={{
                        padding: "14px 20px",
                        color: "var(--color-ink-soft)",
                        fontWeight: 600,
                        fontSize: "0.875rem",
                      }}
                    >
                      {row.label}
                    </td>
                    {row.values.map((val, ci) => {
                      const isPro = PLANS[ci].popular;
                      return (
                        <td
                          key={ci}
                          style={{
                            padding: "14px 16px",
                            textAlign: "center",
                            background: isPro ? "rgba(0,240,180,0.03)" : undefined,
                            fontSize: "0.875rem",
                            color:
                              val === false
                                ? "rgba(255,255,255,0.2)"
                                : "var(--color-ink-soft)",
                          }}
                        >
                          {val === true ? (
                            <Check
                              size={16}
                              style={{
                                color: "var(--color-primary)",
                                display: "block",
                                margin: "0 auto",
                              }}
                            />
                          ) : val === false ? (
                            <Minus
                              size={16}
                              style={{
                                color: "rgba(255,255,255,0.18)",
                                display: "block",
                                margin: "0 auto",
                              }}
                            />
                          ) : (
                            val
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section style={{ paddingBottom: 88 }}>
        <div
          className="launch-container"
          style={{ maxWidth: 760, marginInline: "auto" }}
        >
          <h2
            style={{
              fontSize: "1.35rem",
              fontWeight: 850,
              color: "var(--color-ink)",
              marginBottom: 32,
            }}
          >
            Frequently asked questions
          </h2>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={item.q}
                style={{
                  padding: "22px 0",
                  borderBottom:
                    i < FAQ_ITEMS.length - 1
                      ? "1px solid rgba(255,255,255,0.07)"
                      : undefined,
                }}
              >
                <p
                  style={{
                    fontSize: "1rem",
                    fontWeight: 750,
                    color: "var(--color-ink)",
                    marginBottom: 8,
                    lineHeight: 1.4,
                  }}
                >
                  {item.q}
                </p>
                <p
                  style={{
                    fontSize: "0.9rem",
                    color: "var(--color-ink-muted)",
                    lineHeight: 1.7,
                  }}
                >
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────── */}
      <section
        style={{
          paddingBottom: 110,
          paddingTop: 16,
          textAlign: "center",
        }}
      >
        <div
          className="launch-container"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}
        >
          <h2
            style={{
              fontSize: "clamp(1.7rem, 4vw, 2.3rem)",
              fontWeight: 900,
              color: "var(--color-ink)",
              lineHeight: 1.15,
            }}
          >
            Start free, upgrade anytime
          </h2>
          <p
            style={{
              color: "var(--color-ink-muted)",
              fontSize: "1rem",
              maxWidth: 400,
              lineHeight: 1.65,
            }}
          >
            No credit card required. Full access to free features immediately after sign-up.
          </p>
          <Link href="/login" className="btn btn-primary" style={{ minWidth: 200 }}>
            Get started free
          </Link>
        </div>
      </section>
    </div>
  );
}
