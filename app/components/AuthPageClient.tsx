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
  const redirectTo = searchParams.get("next") || "/#scanner";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
      </section>
      <SiteFooter />
    </main>
  );
}


