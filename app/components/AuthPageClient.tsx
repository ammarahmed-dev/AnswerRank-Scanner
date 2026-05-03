"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import SiteFooter from "./SiteFooter";
import SiteHeader from "./SiteHeader";

type Props = {
  mode: "login" | "signup";
};

export default function AuthPageClient({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const redirectTo = searchParams.get("next") || "/#scanner";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const isLogin = mode === "login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setMessage("Supabase auth is not configured.");
      return;
    }

    setLoading(true);
    setMessage("");

    const res = isLogin
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });

    setLoading(false);

    if (res.error) {
      setMessage(res.error.message);
      return;
    }

    if (!isLogin && !res.data.session) {
      setMessage("Account created. Check your email to confirm your account.");
      setPassword("");
      return;
    }

    router.push(redirectTo);
  };

  const switchHref = `${isLogin ? "/signup" : "/login"}?next=${encodeURIComponent(redirectTo)}`;

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <section className="auth-page">
        <div className="surface auth-page-card">
          <div className="auth-page-copy">
            <span className="launch-eyebrow">{isLogin ? "Welcome back" : "Free account"}</span>
            <h1>{isLogin ? "Log in to continue scanning." : "Create your AnswerRank account."}</h1>
            <p>{isLogin ? "Access your free account scans and save reports to your workspace." : "Free accounts get 10 scans per day and saved report links."}</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </label>
            <label>
              Password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            </label>

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
