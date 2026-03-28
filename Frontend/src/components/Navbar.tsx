"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "./Logo";

const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
    { label: "Preview", href: "#preview" },
];

function SunIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>; }
function MoonIcon() { return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>; }

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [avatarOpen, setAvatarOpen] = useState(false);
    const { theme, toggle } = useTheme();
    const { user, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <nav style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
            transition: "all 0.4s ease",
            background: scrolled ? "var(--color-nav-bg)" : "transparent",
            backdropFilter: scrolled ? "blur(20px)" : "none",
            WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
            borderBottom: scrolled ? "1px solid var(--color-border)" : "none",
            boxShadow: scrolled ? "var(--shadow-nav)" : "none",
            padding: "0 24px",
        }}>
            <div style={{ position: "relative", width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", height: "72px" }}>

                {/* Logo */}
                <div style={{ display: "flex", alignItems: "center", zIndex: 1 }}>
                    <a href="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
                        <Logo width={36} height={36} />
                        <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }} className="nav-logo-text">
                            Insight <span style={{ color: "#00D1FF" }}>AI</span>
                        </span>
                    </a>
                </div>

                {/* Desktop Nav Links */}
                <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: "32px", zIndex: 0 }} className="desktop-nav">
                    {navLinks.map((link) => (
                        <a key={link.href} href={link.href} style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500, transition: "color 0.2s" }}
                            onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "var(--color-text-primary)")}
                            onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "var(--color-text-secondary)")}>
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* Right actions */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", zIndex: 1 }}>
                    {/* Theme toggle */}
                    <button onClick={toggle} className="theme-toggle" title={theme === "dark" ? "Switch to Light" : "Switch to Dark"} aria-label="Toggle theme">
                        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
                    </button>

                    {user ? (
                        /* ---- Logged in ---- */
                        <div className="nav-profile" style={{ position: "relative" }}>
                            <button onClick={() => setAvatarOpen(!avatarOpen)} style={{
                                width: "38px", height: "38px", borderRadius: "50%",
                                background: "linear-gradient(135deg,#00D1FF,#8B5CF6)",
                                border: "2px solid rgba(0,209,255,0.35)",
                                color: "#000", fontWeight: 700, fontSize: "0.75rem",
                                cursor: "pointer", flexShrink: 0,
                            }}>
                                {user.avatar}
                            </button>
                            {avatarOpen && (
                                <div style={{
                                    position: "absolute", right: 0, top: "52px", minWidth: "220px",
                                    background: "var(--color-glass)", backdropFilter: "blur(20px)",
                                    border: "1px solid var(--color-border)", borderRadius: "12px",
                                    padding: "8px", boxShadow: "var(--shadow-card)",
                                }}>
                                    <div style={{ padding: "10px 12px 12px", borderBottom: "1px solid var(--color-border)", marginBottom: "8px" }}>
                                        <div style={{ fontWeight: 600, color: "var(--color-text-primary)", fontSize: "0.875rem" }}>{user.name}</div>
                                    </div>
                                    <button onClick={() => { logout(); router.push("/"); setAvatarOpen(false); }} style={{
                                        display: "block", width: "100%", padding: "8px 12px",
                                        borderRadius: "8px", background: "none", border: "none",
                                        cursor: "pointer", textAlign: "left",
                                        fontSize: "0.85rem", color: "#F87171",
                                    }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                                        🚪 Sign Out
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* ---- Logged out ---- */
                        <div className="nav-auth-btns" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <a href="/login" style={{ color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.9rem", fontWeight: 500, padding: "8px 16px", transition: "color 0.2s" }}
                                onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "var(--color-text-primary)")}
                                onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "var(--color-text-secondary)")}>
                                Login
                            </a>
                            <a href="/signup" className="cta-btn" style={{ padding: "9px 20px", borderRadius: "8px", fontSize: "0.875rem", textDecoration: "none", display: "inline-block" }}>
                                <span>Get Started</span>
                            </a>
                        </div>
                    )}

                    {/* Hamburger */}
                    <button onClick={() => setMenuOpen(!menuOpen)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-primary)", padding: "4px" }} className="hamburger" aria-label="Toggle menu">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {menuOpen ? <path d="M18 6L6 18M6 6l12 12" /> : <path d="M3 12h18M3 6h18M3 18h18" />}
                        </svg>
                    </button>
                </div>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div style={{ position: "absolute", top: "72px", left: 0, right: 0, background: "var(--color-nav-bg)", backdropFilter: "blur(20px)", borderBottom: "1px solid var(--color-border)", padding: "16px 24px 24px", zIndex: 99 }}>
                    {navLinks.map((link) => (
                        <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} style={{ display: "block", color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "1rem", fontWeight: 500, padding: "12px 0", borderBottom: "1px solid var(--color-border)" }}>
                            {link.label}
                        </a>
                    ))}
                    {!user && <a href="/login" style={{ display: "block", color: "#00D1FF", textDecoration: "none", fontSize: "1rem", fontWeight: 600, padding: "16px 0" }}>Login →</a>}
                    {user && <button onClick={() => { logout(); router.push("/"); }} style={{ display: "block", background: "none", border: "none", cursor: "pointer", color: "#F87171", fontSize: "1rem", fontWeight: 600, padding: "16px 0", textAlign: "left" }}>Sign Out</button>}
                </div>
            )}

            <style>{`
        /* ── Tablet / Mobile: hide desktop nav links ── */
        @media (max-width: 768px) {
          .desktop-nav  { display: none !important; }
          .hamburger    { display: block !important; }
          .nav-auth-btns { display: none !important; }
          .nav-profile   { display: none !important; }
        }
        @media (max-width: 480px) {
          .nav-logo-text { display: none !important; }
        }
      `}</style>
        </nav>
    );
}
