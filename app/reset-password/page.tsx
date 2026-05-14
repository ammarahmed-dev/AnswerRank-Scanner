"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const GENERIC_AUTH_ERROR = "Something went wrong. Please try again.";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) {
      setMessage("Supabase auth is not configured.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({ password });
      setLoading(false);

      if (error) {
        setMessage(GENERIC_AUTH_ERROR);
        return;
      }

      setMessage("Password updated. Redirecting to your dashboard...");
      setTimeout(() => router.replace("/dashboard"), 900);
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
            <span className="launch-eyebrow">New password</span>
            <h1>Create a new password.</h1>
            <p>Choose a new password for your AEOCheck account.</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              New password
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
              <small>Minimum 8 characters</small>
            </label>
            <label>
              Confirm password
              <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />
            </label>

            {message && <p className="auth-message">{message}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? "Working" : "Update password"}
            </button>
          </form>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
