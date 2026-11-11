"use client";

import UpgradeButton from "./UpgradeButton";
import { useAuth } from "@/app/context/AuthContext";
import { CheckCircle } from "@phosphor-icons/react";

export default function HomePricingSection() {
  const { plan, portalUrl } = useAuth();
  return (
    <section className="pricing-section" id="pricing">
      <div className="launch-container pricing-layout">
        <div className="pricing-intro">
          <p className="launch-eyebrow">Pricing</p>
          <h2>Simple pricing for every team size.</h2>
          <p>Start free, upgrade when you need deeper insights and full site coverage.</p>
          <p className="pricing-sample-link">Not sure what to expect? <a href="/sample-report">View a sample full report.</a></p>
        </div>

        <div className="pricing-cards">
          <article className="pricing-panel">
            <span className="pricing-badge pricing-badge-muted">Free forever</span>
            <span className="price">$0</span>
            <h3>Free</h3>
            <p className="pricing-subline">Try AEO scanning on your most important pages - no commitment.</p>
            <ul>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 3 scans per month</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 5-page audit runs</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 1 monitored URL</li>
            </ul>
            <a href="#scanner" className="btn btn-secondary">Start free scan</a>
          </article>

          <article className="pricing-panel">
            {plan === "onetime"
              ? <span className="pricing-badge pricing-badge-blue">Current plan</span>
              : <span className="pricing-badge pricing-badge-blue">One-time</span>}
            <span className="price">$9 <small>one-time</small></span>
            <h3>Starter</h3>
            <p className="pricing-subline">A single deep-dive audit - great for one-off projects or clients.</p>
            <ul>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 1 full report URL · preview on all others</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 50-page audit runs</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 1 monitored URL</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 3 re-scan snapshots</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> PDF export included</li>
            </ul>
            <UpgradeButton
              plan="onetime"
              className="btn btn-outline-white"
              isCurrentPlan={plan === "onetime" || plan === "pro" || plan === "agency"}
              includedInPlan={plan === "pro" || plan === "agency"}
            >
              {plan === "onetime" ? "Active plan" : "Buy once - $9"}
            </UpgradeButton>
          </article>

          <article className="pricing-panel pricing-panel-featured">
            {plan === "pro"
              ? <span className="pricing-badge pricing-badge-purple">Current plan</span>
              : <span className="pricing-badge pricing-badge-purple">Best value</span>}
            <span className="price">$19 <small>/month</small></span>
            <h3>Pro</h3>
            <p className="pricing-subline">Ongoing monitoring and reports for growing businesses.</p>
            <ul>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> Unlimited scans</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 100-page audit runs</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 10 monitored URLs</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 10 re-scan snapshots</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> PDF export + priority support</li>
            </ul>
            <UpgradeButton plan="pro" className="btn btn-primary" isCurrentPlan={plan === "pro" || plan === "agency"}>
              {plan === "pro" ? "Active plan" : plan === "agency" ? "Included" : "Start Pro"}
            </UpgradeButton>
            {(plan === "pro" || plan === "agency") && portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "block", textAlign: "center", marginTop: 10, fontSize: 13, color: "rgba(255,255,255,0.5)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}
              >
                Manage subscription
              </a>
            )}
          </article>

          <article className="pricing-panel">
            {plan === "agency"
              ? <span className="pricing-badge pricing-badge-agency">Current plan</span>
              : <span className="pricing-badge pricing-badge-agency">Agency</span>}
            <span className="price">$49 <small>/month</small></span>
            <h3>Agency</h3>
            <p className="pricing-subline">Unlimited scale for agencies managing multiple clients.</p>
            <ul>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> Unlimited scans</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 500-page audit runs</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> Unlimited monitored URLs</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> 20 re-scan snapshots</li>
              <li><CheckCircle weight="fill" className="h-4 w-4" /> PDF export + priority support</li>
            </ul>
            <UpgradeButton plan="agency" className="btn btn-outline-agency" isCurrentPlan={plan === "agency"}>
              {plan === "agency" ? "Active plan" : "Start Agency"}
            </UpgradeButton>
          </article>
        </div>
      </div>
    </section>
  );
}
