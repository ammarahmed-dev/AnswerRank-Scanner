"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, LogOut, Menu, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { getSafeSupabaseUser, getSupabaseBrowserClient } from "@/lib/supabase-browser";

type Plan = "guest" | "free" | "pro" | "agency";

const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#report", label: "Report" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export default function AuthButton() {
  const supabase = getSupabaseBrowserClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [plan, setPlan] = useState<Plan>("guest");
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;

    async function loadAccountState() {
      try {
        const activeUser = await getSafeSupabaseUser(client);
        setUser(activeUser);
        setIsAdmin(false);
        setPlan("guest");

        if (!activeUser) return;

        const session = await client.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;

        const res = await fetch("/api/account", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (!res.ok) return;
        const data = (await res.json()) as { profile?: { isAdmin?: boolean; plan?: string } };
        const admin = Boolean(data.profile?.isAdmin);
        const p = data.profile?.plan;
        setIsAdmin(admin);
        setPlan(p === "pro" || p === "agency" || p === "free" ? p : "free");
      } catch {
        setUser(null);
        setIsAdmin(false);
        setPlan("guest");
      }
    }

    loadAccountState();

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setIsAdmin(false);
      setPlan("guest");
      if (session?.user) loadAccountState();
    });

    return () => data.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  if (!supabase) return null;

  const handleLogout = async () => {
    setMenuOpen(false);
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setPlan("guest");
  };

  const close = () => setMenuOpen(false);
  const masterAdmin = isAdmin || plan === "agency";
  const isPro = plan === "pro" || plan === "agency" || isAdmin;

  return (
    <div ref={wrapperRef}>
      {/* ── Desktop auth items — hidden below md ── */}
      {user ? (
        <div className="hidden md:inline-flex">
          <div className="auth-account">
            {masterAdmin && (
              <a href="/admin" title="Master Admin · Unlimited Access">
                <ShieldCheck className="h-4 w-4" /> Admin
              </a>
            )}
            <a href="/dashboard" title={user.email ?? "Account"}>
              <UserRound className="h-4 w-4" />
            </a>
            <a href="/dashboard" title={user.email ?? "Reports"}>
              <LayoutDashboard className="h-4 w-4" />
            </a>
            <button type="button" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="hidden md:inline-flex">
          <div className="auth-guest-actions">
            <a href="/login" className="btn btn-secondary auth-open-button">Login</a>
            <a href="/signup" className="btn btn-secondary auth-open-button">Register</a>
          </div>
        </div>
      )}

      {/* ── Hamburger button — hidden above md via CSS ── */}
      <button
        type="button"
        className="nav-hamburger"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* ── Mobile dropdown — always rendered, toggled with is-open ── */}
      <div className={`nav-mobile-menu${menuOpen ? " is-open" : ""}`}>
        <div className="nav-mobile-section">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="nav-mobile-link" onClick={close}>
              {link.label}
            </a>
          ))}
        </div>

        <div className="nav-mobile-divider" />

        <div className="nav-mobile-section">
          {!user ? (
            <>
              <a href="/login" className="nav-mobile-link" onClick={close}>Login</a>
              <a href="/signup" className="nav-mobile-link" onClick={close}>Register</a>
              <a href="/#scanner" className="nav-mobile-cta" onClick={close}>
                <Sparkles className="h-4 w-4" /> Scan My Website
              </a>
            </>
          ) : (
            <>
              <div className="nav-mobile-button-row">
                <a href="/dashboard" className="nav-mobile-btn-outline" onClick={close}>My Reports</a>
                <a href="/dashboard" className="nav-mobile-btn-outline" onClick={close}>Account</a>
              </div>
              {!isPro && (
                <a href="/pricing" className="nav-mobile-upgrade" onClick={close}>Upgrade Plan</a>
              )}
              <button type="button" className="nav-mobile-signout" onClick={handleLogout}>
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
              <a href="/#scanner" className="nav-mobile-cta" onClick={close}>
                <Sparkles className="h-4 w-4" /> Scan My Website
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
