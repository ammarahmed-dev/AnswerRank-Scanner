"use client";

// OAuth callback handler for Google (and any other provider).
// @supabase/ssr is not used in this project — the PKCE code exchange
// happens client-side using the standard @supabase/supabase-js client.

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const rawNext = searchParams.get("next") ?? "";
    const next = rawNext.startsWith("/") && !rawNext.startsWith("//") && !rawNext.startsWith("/\\")
      ? rawNext
      : "/dashboard";

    if (!supabase) {
      router.replace("/login?error=oauth");
      return;
    }

    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      router.replace("/login?error=oauth");
      return;
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          console.error("[auth-callback]", error.message);
          router.replace("/login?error=oauth");
        } else {
          router.replace(next);
        }
      });
      return;
    }

    // Fallback: session may already be set (hash-based implicit flow)
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace(next);
      } else {
        router.replace("/login?error=oauth");
      }
    });
  }, [router, searchParams]);

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#06090d",
      color: "rgba(255,255,255,0.5)",
      fontSize: 15,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      Signing you in…
    </div>
  );
}
