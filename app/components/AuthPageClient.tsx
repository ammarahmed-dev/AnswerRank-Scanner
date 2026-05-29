"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

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
    <main className="min-h-screen">
      <SiteHeader />
      <section className="auth-page">
        <div className="surface auth-page-card">
          <div className="auth-page-copy">
            <span className="launch-eyebrow">{isLogin ? "Welcome back" : "Free account"}</span>
            <h1>{isLogin ? "Log in to continue scanning." : "Create your AEOCheck account."}</h1>
            <p>{isLogin ? "Access your free account scans and save reports to your workspace." : "Free accounts get 3 scans per month and saved report links."}</p>
          </div>

          <div className="auth-form">
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
                background: googleLoading ? "#f5f5f5" : "#ffffff",
                color: "#111111",
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 8,
                fontSize: 15,
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

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", whiteSpace: "nowrap" }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.15)" }} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              {!isLogin && <small>Minimum 8 characters</small>}
            </label>
            {!isLogin && (
              <label>
                Confirm password
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} />
              </label>
            )}
            {isLogin && (
              <p className="auth-form-switch">
                <a href="/forgot-password">Forgot password?</a>
              </p>
            )}

            {message && <p className="auth-message">{message}</p>}

            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? "Working" : isLogin ? "Log in" : "Create account"}
            </button>

            <p className="auth-form-switch">
              {isLogin ? "No account yet?" : "Already have an account?"} <a href={switchHref}>{isLogin ? "Sign up" : "Log in"}</a>
            </p>
          </form>
        </div>
        <p className="auth-back-link"><a href="/">Back to home</a></p>
      </section>
      <SiteFooter />
    </main>
  );
}


