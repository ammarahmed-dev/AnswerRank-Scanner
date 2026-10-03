"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";

type Props = {
  mode: "login" | "signup";
};

const GENERIC_AUTH_ERROR = "Something went wrong. Please try again.";

function friendlyAuthError(message?: string) {
  const normalized = (message ?? "").toLowerCase();
  if (
    normalized.includes("already registered") ||
    normalized.includes("already exists") ||
    normalized.includes("user already")
  ) {
    return "An account with this email already exists. Try logging in instead.";
  }
  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid credentials") ||
    normalized.includes("wrong password")
  ) {
    return "Incorrect password. Please try again.";
  }
  if (
    normalized.includes("email not confirmed") ||
    normalized.includes("not confirmed") ||
    normalized.includes("confirm your email")
  ) {
    return "Please verify your email before logging in. Check your inbox.";
  }
  return GENERIC_AUTH_ERROR;
}

export default function AuthPageClient({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const rawNext = searchParams.get("next") ?? "";
  const redirectTo = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")
    ? rawNext
    : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const isLogin = mode === "login";

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;

    async function redirectIfSignedIn() {
      try {
        const { data } = await client.auth.getSession();
        if (active && data.session) {
          router.replace("/dashboard");
        }
      } catch {
        // Stay on the auth page if the session check fails.
      }
    }

    redirectIfSignedIn();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  const handleGoogleSignIn = async () => {
    if (!supabase || googleLoading) return;
    setGoogleLoading(true);
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      console.error("[google-auth]", error.message);
      setMessage("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setMessage("Supabase auth is not configured.");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = isLogin
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      setLoading(false);

      if (res.error) {
        setMessage(friendlyAuthError(res.error.message));
        return;
      }

      if (!isLogin && res.data.user && Array.isArray(res.data.user.identities) && res.data.user.identities.length === 0) {
        setMessage("An account with this email already exists. Try logging in instead.");
        return;
      }

      if (!isLogin && !res.data.session) {
        setMessage("Account created. Check your email to confirm your account.");
        setPassword("");
        setConfirmPassword("");
        return;
      }

      router.push(redirectTo);
    } catch {
      setLoading(false);
      setMessage(GENERIC_AUTH_ERROR);
    }
  };

  const switchHref = `${isLogin ? "/signup" : "/login"}?next=${encodeURIComponent(redirectTo)}`;

  return (
    <main className="min-h-screen" style={{ display: "flex", flexDirection: "column" }}>
      <SiteHeader />
      <div className="auth-wrap">
        <div className="auth-split">

      {/* ── Left branding panel ───────────────────────── */}
      <div className="auth-split-left">
        <div className="auth-split-brand">
          <Link href="/" className="auth-split-brand-name">AEOCheck</Link>
          <p className="auth-split-tagline">Know how AI sees your website.</p>
        </div>

        <div className="auth-split-features">
          <div className="auth-split-feature">
            <div className="auth-split-feature-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M9 1L2 9h5l-1 6 7-8H8l1-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="auth-split-feature-text">
              <strong>Scan any URL in 60 seconds</strong>
              <span>Full AI visibility breakdown - schema, content, metadata.</span>
            </div>
          </div>

          <div className="auth-split-feature">
            <div className="auth-split-feature-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <polyline points="1,11 5,7 9,9 15,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="11,3 15,3 15,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="auth-split-feature-text">
              <strong>Track AI visibility over time</strong>
              <span>Monitor score changes across weekly and monthly rescans.</span>
            </div>
          </div>

          <div className="auth-split-feature">
            <div className="auth-split-feature-icon">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/>
                <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="8" y1="1" x2="8" y2="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="8" y1="13.5" x2="8" y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="1" y1="8" x2="2.5" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <line x1="13.5" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="auth-split-feature-text">
              <strong>Beat competitors to AI search</strong>
              <span>Side-by-side comparison shows exactly where you lead or lag.</span>
            </div>
          </div>
        </div>

        <div className="auth-split-deco">
          <div className="auth-split-deco-score">87</div>
          <div className="auth-split-deco-text">
            Average AEO score<br />for optimised pages
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────── */}
      <div className="auth-split-right">
        <div className="auth-split-form">

          <div className="auth-mobile-logo">
            <Link href="/">AEOCheck</Link>
          </div>

          <div className="auth-split-heading">
            <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
            <p>{isLogin ? "Log in to access your scans and reports." : "Free accounts get 3 scans per month."}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                width: "100%",
                padding: "12px 20px",
                background: googleLoading ? "#f0f0f0" : "#ffffff",
                color: "#111111",
                border: "1px solid rgba(0,0,0,0.14)",
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: googleLoading ? "wait" : "pointer",
                transition: "background 0.15s ease",
              }}
              onMouseEnter={e => { if (!googleLoading) (e.currentTarget as HTMLButtonElement).style.background = "#f5f5f5"; }}
              onMouseLeave={e => { if (!googleLoading) (e.currentTarget as HTMLButtonElement).style.background = "#ffffff"; }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.1)" }} />
            </div>

            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isLogin ? "Enter your password" : "Min. 8 characters"} required minLength={8} />
            </label>
            {!isLogin && (
              <label>
                Confirm password
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat password" required minLength={8} />
              </label>
            )}
            {isLogin && (
              <p className="auth-form-switch" style={{ textAlign: "right" }}>
                <a href="/forgot-password">Forgot password?</a>
              </p>
            )}

            {message && <p className="auth-message">{message}</p>}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px 20px",
                background: loading ? "rgba(0,229,160,0.6)" : "#00e5a0",
                color: "#000000",
                border: "none",
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "wait" : "pointer",
                transition: "background 0.15s ease",
              }}
            >
              {loading ? "Working…" : isLogin ? "Log in" : "Create account"}
            </button>

            <p className="auth-form-switch">
              {isLogin ? "No account yet?" : "Already have an account?"}{" "}
              <a href={switchHref}>{isLogin ? "Sign up" : "Log in"}</a>
            </p>

          </form>

          <p className="auth-back-link"><Link href="/">← Back to home</Link></p>

        </div>
      </div>

        </div>
      </div>
      <SiteFooter />
    </main>
  );
}


