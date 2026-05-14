"use client";

import { useState } from "react";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const GENERIC_AUTH_ERROR = "Something went wrong. Please try again.";

export default function ForgotPasswordPage() {
  const supabase = getSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase auth is not configured.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);

      if (error) {
        setMessage(GENERIC_AUTH_ERROR);
        return;
      }

      setMessage("Check your email for a password reset link.");
    } catch {
      setLoading(false);
      setMessage(GENERIC_AUTH_ERROR);
    }
  };

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="auth-page">
        <div className="surface auth-page-card">
          <div className="auth-page-copy">
            <span className="launch-eyebrow">Password reset</span>
            <h1>Reset your password.</h1>
            <p>Enter your account email and we&apos;ll send a secure reset link.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Email
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>

            {message && <p className="auth-message">{message}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? "Working" : "Send reset link"}
            </button>

            <p className="auth-form-switch">
              Remembered it? <a href="/login">Log in</a>
            </p>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
