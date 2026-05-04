import { CheckCircle2 } from "lucide-react";
import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export default function UpgradeSuccessPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="auth-page">
        <div className="surface dashboard-error">
          <CheckCircle2 className="h-8 w-8 text-emerald-300" />
          <strong>Upgrade successful</strong>
          <p>Your Pro plan is being activated. If the dashboard does not update immediately, refresh in a few seconds.</p>
          <a href="/dashboard" className="btn btn-primary">Go to dashboard</a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
