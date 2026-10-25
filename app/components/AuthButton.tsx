"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { loadSupabaseBrowserClient, supabaseConfigured } from "@/lib/supabase-browser-lazy";
import { useAuth } from "@/app/context/AuthContext";
import { SERVICES_PATH } from "@/lib/service-enquiry";
import { FEATURES } from "./FeaturesDropdown";

const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/blog", label: "Blog" },
  { href: SERVICES_PATH, label: "Implementation services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export default function AuthButton() {
  const { user, isAdmin, plan } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const menuId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: PointerEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { setMenuOpen(false); triggerRef.current?.focus(); }
    }
    const desktop = window.matchMedia("(min-width: 1201px)");
    const onResize = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener("pointerdown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.removeEventListener("pointerdown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    const supabase = await loadSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    sessionStorage.clear();
  };

  const close = () => setMenuOpen(false);
  const masterAdmin = isAdmin || plan === "agency";
  const isPro = plan === "pro" || plan === "agency" || isAdmin;

  return (
    <div ref={wrapperRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false); }}>
      {/* Desktop auth items, hidden at the shared navigation breakpoint */}
      {supabaseConfigured && (user ? (
        <div className="header-auth-desktop">
          <div className="auth-account">
            {masterAdmin && (
              <a href="/admin" title="Master Admin · Unlimited Access">
                <ShieldCheck className="h-4 w-4" /> Admin
              </a>
            )}
            <a href="/dashboard" title={user.email ?? "Account"}>
              <UserRound className="h-4 w-4" />
            </a>
            <button type="button" onClick={handleLogout} aria-label="Log out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="header-auth-desktop">
          <div className="auth-guest-actions">
            <a href="/login" className="btn btn-secondary auth-open-button">Login</a>
            <a href="/signup" className="btn btn-secondary auth-open-button">Register</a>
          </div>
        </div>
      ))}

      {/* Public navigation toggle, independent of auth configuration */}
      <button
        type="button"
        ref={triggerRef}
        className="nav-hamburger"
        aria-controls={menuId}
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Closed navigation is removed from keyboard and accessibility navigation */}
      <nav id={menuId} aria-label="Mobile navigation" hidden={!menuOpen} className={`nav-mobile-menu${menuOpen ? " is-open" : ""}`}>
        <div className="nav-mobile-section">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="nav-mobile-link" onClick={close}>
              {link.label}
            </a>
          ))}
          <button
            type="button"
            className={`nav-mobile-link nav-mobile-features-toggle${featuresOpen ? " is-open" : ""}`}
            aria-expanded={featuresOpen}
            aria-controls={`${menuId}-features`}
            onClick={() => setFeaturesOpen(o => !o)}
          >
            Features
            <ChevronDown className="nav-mobile-features-chevron" aria-hidden="true" />
          </button>
          {featuresOpen && (
            <div id={`${menuId}-features`} className="nav-mobile-features-list">
              {FEATURES.map(({ href, label, desc }) => (
                <a key={href} href={href} className="nav-mobile-feature-item" onClick={close}>
                  <span className="nav-mobile-feature-label">{label}</span>
                  <span className="nav-mobile-feature-desc">{desc}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="nav-mobile-divider" />

        <div className="nav-mobile-section">
          {!user ? (
            <>
              {supabaseConfigured && <>
                <a href="/login" className="nav-mobile-link" onClick={close}>Login</a>
                <a href="/signup" className="nav-mobile-link" onClick={close}>Register</a>
              </>}
              <Link href="/#scanner" className="nav-mobile-cta" onClick={close}>
                <Sparkles className="h-4 w-4" /> Scan My Website
              </Link>
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
              <Link href="/#scanner" className="nav-mobile-cta" onClick={close}>
                <Sparkles className="h-4 w-4" /> Scan My Website
              </Link>
            </>
          )}
        </div>
      </nav>
    </div>
  );
}

