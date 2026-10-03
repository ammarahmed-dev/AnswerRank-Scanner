"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Menu, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { useAuth } from "@/app/context/AuthContext";
import { FEATURES } from "./FeaturesDropdown";

const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/blog", label: "Blog" },
  { href: "/pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
];

export default function AuthButton() {
  const supabase = getSupabaseBrowserClient();
  const { user, isAdmin, plan } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
    if (supabase) await supabase.auth.signOut();
    sessionStorage.clear();
  };

  const close = () => setMenuOpen(false);
  const masterAdmin = isAdmin || plan === "agency";
  const isPro = plan === "pro" || plan === "agency" || isAdmin;

  return (
    <div ref={wrapperRef}>
      {/* Desktop auth items, hidden below md */}
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

      {/* Hamburger button, hidden above md via CSS */}
      <button
        type="button"
        className="nav-hamburger"
        onClick={() => setMenuOpen((o) => !o)}
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile dropdown, always rendered and toggled with is-open */}
      <div className={`nav-mobile-menu${menuOpen ? " is-open" : ""}`}>
        <div className="nav-mobile-section">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="nav-mobile-link" onClick={close}>
              {link.label}
            </a>
          ))}
          <button
            type="button"
            className={`nav-mobile-link nav-mobile-features-toggle${featuresOpen ? " is-open" : ""}`}
            onClick={() => setFeaturesOpen(o => !o)}
          >
            Features
            <ChevronDown className="nav-mobile-features-chevron" aria-hidden="true" />
          </button>
          {featuresOpen && (
            <div className="nav-mobile-features-list">
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
              <a href="/login" className="nav-mobile-link" onClick={close}>Login</a>
              <a href="/signup" className="nav-mobile-link" onClick={close}>Register</a>
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
      </div>
    </div>
  );
}

