import { Suspense } from "react";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";
import UpgradeSuccessClient from "./UpgradeSuccessClient";

export default function UpgradeSuccessPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <Suspense fallback={
        <section className="auth-page">
          <div className="surface dashboard-error">
            <strong>Upgrade successful</strong>
            <p>We are confirming your payment and unlocking your report.</p>
          </div>
        </section>
      }
      >
        <UpgradeSuccessClient />
      </Suspense>
      <SiteFooter />
    </main>
  );
}

