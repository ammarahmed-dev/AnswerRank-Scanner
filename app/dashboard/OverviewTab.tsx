import Link from "next/link";
import {
  card,
  cardDesc,
  cardLabel,
  cardLink,
  cardValue,
  grid3,
  planLabel,
  type AccountData,
} from "./dashboard-shared";

type OverviewTabProps = {
  account: AccountData;
  isMobile: boolean;
  masterAdmin: boolean;
  shouldShowUpgradeCard: boolean;
  usagePercent: number;
};

export default function OverviewTab({
  account,
  isMobile,
  masterAdmin,
  shouldShowUpgradeCard,
  usagePercent,
}: OverviewTabProps) {
  const portalUrl = account.profile.portalUrl;
  const recentScans = account.reports;
  const recentAudits = account.recentAudits;
  const currentPlan = account.profile.plan;
  const auditCountThisMonth = account.auditCountThisMonth ?? 0;
  const auditLimit = currentPlan === "free" ? 1 : currentPlan === "onetime" ? 1 : -1;
  const auditPagesPerRunText =
    currentPlan === "free" ? "5 pages/audit" :
    currentPlan === "onetime" ? "50 pages/audit" :
    currentPlan === "pro" ? "100 pages/audit" :
    "500 pages/audit";
  const auditProgress = auditLimit === -1 ? 0 : Math.min((auditCountThisMonth / auditLimit) * 100, 100);
  const auditRemaining = auditLimit === -1 ? null : Math.max(0, auditLimit - auditCountThisMonth);
  const monitorLimitValue = currentPlan === "free" ? 1 : currentPlan === "onetime" ? 1 : currentPlan === "pro" ? 10 : -1;
  const monitorProgress = monitorLimitValue === -1 ? 0 : Math.min((account.monitorCount / monitorLimitValue) * 100, 100);
  const monitorRemaining = monitorLimitValue === -1 ? null : Math.max(0, monitorLimitValue - account.monitorCount);
  const onetimeScanCount = account.profile.onetimeScanCount ?? 0;
  const onetimeRetestsRemaining = Math.max(0, 4 - onetimeScanCount);
  const compareLimitText =
    currentPlan === "free"
      ? "Scores only · upgrade for full breakdown"
      : currentPlan === "onetime"
        ? "1 per month · for your locked URL"
        : "Full breakdown · history saved";

  return (
    <>
      {recentScans.length === 0 && recentAudits.length === 0 && (
        <div
          className="onboarding-banner"
          style={{
            background: "linear-gradient(135deg, rgba(0,229,160,0.08), rgba(0,229,160,0.03))",
            border: "1px solid rgba(0,229,160,0.2)",
            borderRadius: "12px",
            padding: "24px 28px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "24px",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "11px",
                fontWeight: 600,
                color: "#00e5a0",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              Get started
            </div>
            <div
              style={{
                fontSize: "18px",
                fontWeight: 700,
                color: "#ffffff",
                marginBottom: "6px",
              }}
            >
              Scan your first URL to see your AI visibility score
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "rgba(255,255,255,0.5)",
                lineHeight: "1.5",
              }}
            >
              Find out if ChatGPT and Perplexity can find your website - takes 60 seconds.
            </div>
          </div>
          <a
            href="/scan"
            style={{
              background: "#00e5a0",
              color: "#000",
              fontWeight: 700,
              fontSize: "14px",
              padding: "12px 24px",
              borderRadius: "8px",
              textDecoration: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
              width: isMobile ? "100%" : undefined,
              textAlign: isMobile ? ("center" as const) : undefined,
            }}
          >
            Scan a URL &rarr;
          </a>
        </div>
      )}

      <div className="db-grid-3" style={grid3}>
        <div style={card}>
          <p style={cardLabel}>Profile</p>
          <div style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)", wordBreak: "break-all" }}>{account.profile.email}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span>Account ID</span>
            <strong style={{ fontFamily: "monospace" }}>{account.profile.id.slice(0, 8)}</strong>
          </div>
        </div>

        <div style={card}>
          <p style={cardLabel}>Plan</p>
          <p style={cardValue}>{planLabel(account.profile.plan)}</p>
          <p style={cardDesc}>{masterAdmin ? "Master Admin · Unlimited access." : currentPlan === "onetime" ? "1 full report URL · free preview on all others." : account.usage.unlimited ? "Unlimited scans active." : "3 scans per month included."}</p>
          {portalUrl
            ? <a href={portalUrl} target="_blank" rel="noopener noreferrer" style={{ ...cardLink, marginTop: 4 }}>Manage subscription →</a>
            : shouldShowUpgradeCard && <a href="/pricing" style={{ ...cardLink, marginTop: 4 }}>View pricing →</a>}
        </div>

        {currentPlan === "onetime" ? (
          <div style={card}>
            <p style={cardLabel}>Retests remaining</p>
            <p style={cardValue}>
              <span>{onetimeRetestsRemaining}</span>
            </p>
            <div className="dashboard-progress" style={{ marginTop: 4 }} aria-hidden="true">
              <span style={{
                width: `${Math.min((onetimeRetestsRemaining / 3) * 100, 100)}%`,
                background: onetimeRetestsRemaining === 0 ? "#ef4444" : "#00e5a0",
              }} />
            </div>
            <p style={{ ...cardDesc, marginTop: 4 }}>of 3 total · on your locked URL</p>
            {account.reports[0] && (
              <a href={`/report?id=${account.reports[0].id}`} style={{ ...cardLink, marginTop: 4 }}>View report →</a>
            )}
          </div>
        ) : (
          <div style={card}>
            <p style={cardLabel}>Scans this month</p>
            <p style={cardValue}>
              {account.usage.unlimited ? "∞" : account.usage.count}
              {!account.usage.unlimited && <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}>{` / ${account.usage.limit}`}</span>}
            </p>
            {!account.usage.unlimited && (
              <div className="dashboard-progress" style={{ marginTop: 4 }} aria-hidden="true">
                <span style={{ width: `${usagePercent}%` }} />
              </div>
            )}
            <a href="/scan" style={{ ...cardLink, marginTop: 4 }}>View all scans →</a>
          </div>
        )}
      </div>

      <div className="db-grid-3" style={{ ...grid3, marginTop: 16 }}>
        <div style={card}>
          <p style={cardLabel}>Audits</p>
          <p style={cardValue}>
            {auditLimit === -1 ? (
              <span>∞</span>
            ) : (
              <span>
                {auditCountThisMonth}
                <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}> / {auditLimit}</span>
              </span>
            )}
          </p>
          {auditLimit !== -1 && (
            <div className="dashboard-progress" style={{ marginTop: 4 }} aria-hidden="true">
              <span
                style={{
                  width: `${auditProgress}%`,
                  background: auditCountThisMonth >= auditLimit ? "#ef4444" : "#00e5a0",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          )}
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
            {auditLimit === -1
              ? "Unlimited audits this month"
              : auditCountThisMonth >= auditLimit
                ? currentPlan === "onetime" ? "Audit used · upgrade for more" : "Limit reached · resets next month"
                : currentPlan === "onetime" ? "1 included · 50 pages max" : `${auditRemaining} remaining · resets monthly`}
          </div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginTop: "4px" }}>
            {auditPagesPerRunText.replace("/audit", " per audit")}
          </div>
          {auditLimit !== -1 && auditCountThisMonth >= auditLimit ? (
            <button disabled className="btn btn-secondary" style={{ marginTop: 8, opacity: 0.45, cursor: "not-allowed" }}>Audit used</button>
          ) : (
            <Link href="/audit" className="btn btn-secondary" style={{ marginTop: 8 }}>New audit →</Link>
          )}
        </div>

        <div style={card}>
          <p style={cardLabel}>Monitor</p>
          <p style={cardValue}>
            {monitorLimitValue === -1 ? (
              <span>∞</span>
            ) : (
              <span>
                {account.monitorCount}
                <span style={{ fontSize: 16, fontWeight: 500, color: "rgba(255,255,255,0.4)" }}> / {monitorLimitValue}</span>
              </span>
            )}
          </p>
          {monitorLimitValue !== -1 && (
            <div className="dashboard-progress" style={{ marginTop: 4 }} aria-hidden="true">
              <span
                style={{
                  width: `${monitorProgress}%`,
                  background: account.monitorCount >= monitorLimitValue ? "#ef4444" : "#00e5a0",
                }}
              />
            </div>
          )}
          <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
            {monitorLimitValue === -1 ? "Unlimited URLs" :
              account.monitorCount >= monitorLimitValue ? "Limit reached · upgrade for more" :
              `${monitorRemaining} slot${monitorRemaining === 1 ? "" : "s"} remaining`}
          </div>
          <a href="/monitor" className="btn btn-secondary" style={{ marginTop: 8 }}>Open Monitor →</a>
        </div>

        <div style={card}>
          <p style={cardLabel}>Compare</p>
          <p style={{ ...cardDesc, marginTop: 8 }}>{compareLimitText}</p>
          {currentPlan === "onetime" && (
            <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
              {account.compareCountThisMonth} / 1 used this month
            </p>
          )}
          <a href="/compare" className="btn btn-secondary" style={{ marginTop: 8 }}>Compare URLs →</a>
        </div>
      </div>

      {currentPlan === "onetime" && (
        <div style={{ ...card, marginTop: 16, borderColor: "rgba(0,229,160,0.2)" }}>
          <p style={cardLabel}>Your full report URL</p>
          {account.profile.onetimeUrl ? (
            <>
              <p style={{ fontSize: 14, color: "rgba(255,255,255,0.85)", wordBreak: "break-all", margin: "4px 0" }}>
                <a href={`/report?url=${encodeURIComponent(account.profile.onetimeUrl)}`} style={{ color: "#00e5a0", textDecoration: "none" }}>
                  {account.profile.onetimeUrl}
                </a>
              </p>
            </>
          ) : (
            <p style={{ ...cardDesc, marginTop: 4 }}>
              No URL locked yet. Scan any site to get your full report - that site becomes your locked URL.
            </p>
          )}
          {onetimeRetestsRemaining === 0 && account.profile.onetimeUrl ? (
            <a href="/pricing" style={{ ...cardLink, marginTop: 8, display: "inline-block" }}>Upgrade to Pro →</a>
          ) : (
            <Link href="/" style={{ ...cardLink, marginTop: 8, display: "inline-block" }}>Scan a URL →</Link>
          )}
        </div>
      )}
    </>
  );
}
