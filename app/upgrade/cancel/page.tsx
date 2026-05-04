import SiteFooter from "../../components/SiteFooter";
import SiteHeader from "../../components/SiteHeader";

export default function UpgradeCancelPage() {
  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="auth-page">
        <div className="surface dashboard-error">
          <strong>Checkout canceled</strong>
          <p>No charge was made. You can continue using the free scanner or upgrade whenever you are ready.</p>
          <a href="/dashboard" className="btn btn-secondary">Back to dashboard</a>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
