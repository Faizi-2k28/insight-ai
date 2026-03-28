"use client";
import { useState, FormEvent } from "react";
import { useTheme } from "@/context/ThemeContext";

/* Check if email matches a demo user and return a masked password hint */
const DEMO_HINTS: Record<string, string> = {
    "demo@insightai.io": "demo••••",
    "sarah@insightai.io": "sarah•••",
    "omar@insightai.io": "omar••••",
};

type Step = "email" | "sent";

export default function ForgotPasswordPage() {
    const { theme, toggle } = useTheme();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        const val = email.trim().toLowerCase();
        if (!val) return setError("Please enter your email address.");
        if (!val.includes("@")) return setError("Please enter a valid email address.");
        setLoading(true);
        await new Promise((r) => setTimeout(r, 900));
        setLoading(false);
        setStep("sent"); // Always show "sent" regardless (security best practice)
    };

    const hint = DEMO_HINTS[email.trim().toLowerCase()];

    return (
        <div style={{
            minHeight: "100vh", background: "var(--color-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px", position: "relative", overflow: "hidden",
        }}>
            {/* Glows */}
            <div style={{ position: "absolute", top: "-15%", right: "-10%", width: "450px", height: "450px", background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(0,209,255,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(var(--color-grid) 1px, transparent 1px), linear-gradient(90deg, var(--color-grid) 1px, transparent 1px)`, backgroundSize: "50px 50px", pointerEvents: "none" }} />

            {/* Top bar */}
            <div style={{ position: "absolute", top: "20px", left: "24px" }}>
                <a href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,#00D1FF,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(0,209,255,0.4)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <span style={{ fontWeight: 700, color: "var(--color-text-primary)", fontSize: "1rem" }}>Insight <span style={{ color: "#00D1FF" }}>AI</span></span>
                </a>
            </div>
            <button onClick={toggle} className="theme-toggle" style={{ position: "absolute", top: "20px", right: "24px" }}>
                {theme === "dark"
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                }
            </button>

            <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
                <div className="glass-card" style={{ padding: "48px 40px", boxShadow: "var(--shadow-card)" }}>

                    {step === "email" ? (
                        <>
                            {/* Back arrow */}
                            <a href="/login" style={{ display: "inline-flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)", textDecoration: "none", fontSize: "0.83rem", marginBottom: "28px", transition: "color 0.2s" }}
                                onMouseEnter={(e) => ((e.target as HTMLElement).closest("a")!.style.color = "#00D1FF")}
                                onMouseLeave={(e) => ((e.target as HTMLElement).closest("a")!.style.color = "var(--color-text-secondary)")}
                            >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
                                Back to login
                            </a>

                            {/* Icon */}
                            <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: "rgba(0,209,255,0.1)", border: "1px solid rgba(0,209,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="1.8">
                                    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
                                </svg>
                            </div>

                            <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", marginBottom: "8px" }}>
                                Forgot password?
                            </h1>
                            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.6, marginBottom: "32px" }}>
                                No worries — enter your email and we&apos;ll send reset instructions right away.
                            </p>

                            <form onSubmit={handleSubmit} noValidate>
                                <div style={{ marginBottom: "20px" }}>
                                    <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "7px" }}>Email address</label>
                                    <input
                                        type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                        placeholder="you@example.com" autoComplete="email" autoFocus
                                        style={{
                                            width: "100%", padding: "12px 14px", borderRadius: "10px",
                                            background: "var(--color-subtle)", border: "1px solid var(--color-border)",
                                            color: "var(--color-text-primary)", fontSize: "0.925rem", outline: "none",
                                            transition: "border-color 0.2s, box-shadow 0.2s",
                                        }}
                                        onFocus={(e) => { e.target.style.borderColor = "#00D1FF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,209,255,0.1)"; }}
                                        onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }}
                                    />
                                </div>

                                {error && (
                                    <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171", fontSize: "0.83rem", display: "flex", gap: "8px" }}>
                                        ⚠️ {error}
                                    </div>
                                )}

                                <button type="submit" disabled={loading} className="cta-btn" style={{ width: "100%", padding: "13px", borderRadius: "10px", fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                                    <span>{loading ? "Sending…" : "Send Reset Link"}</span>
                                </button>
                            </form>
                        </>
                    ) : (
                        /* ---- Sent state ---- */
                        <div style={{ textAlign: "center" }}>
                            {/* Animated checkmark circle */}
                            <div style={{
                                width: "72px", height: "72px", borderRadius: "50%",
                                background: "rgba(62,207,142,0.12)", border: "2px solid rgba(62,207,142,0.3)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                margin: "0 auto 24px", boxShadow: "0 0 30px rgba(62,207,142,0.2)",
                            }}>
                                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3ECF8E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>

                            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "10px", letterSpacing: "-0.02em" }}>
                                Email sent!
                            </h2>
                            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "8px" }}>
                                If <strong style={{ color: "var(--color-text-primary)" }}>{email}</strong> is registered, you&apos;ll receive a password reset link shortly.
                            </p>
                            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "28px" }}>
                                Check your spam folder if you don&apos;t see it within a few minutes.
                            </p>

                            {/* Demo hint (only for known accounts) */}
                            {hint && (
                                <div style={{ padding: "14px 16px", borderRadius: "10px", background: "rgba(0,209,255,0.06)", border: "1px solid rgba(0,209,255,0.18)", marginBottom: "24px", textAlign: "left" }}>
                                    <div style={{ fontSize: "0.75rem", color: "#00D1FF", fontWeight: 700, marginBottom: "4px", letterSpacing: "0.04em" }}>⚡ DEMO HINT</div>
                                    <div style={{ fontSize: "0.83rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
                                        Since this is a demo, your password starts with <span style={{ fontFamily: "monospace", color: "var(--color-text-primary)", fontWeight: 600 }}>{hint}</span>
                                    </div>
                                </div>
                            )}

                            <a href="/login" className="cta-btn" style={{ display: "block", padding: "13px", borderRadius: "10px", textDecoration: "none", fontSize: "0.95rem", textAlign: "center" }}>
                                <span>Back to Sign In</span>
                            </a>

                            <button onClick={() => { setStep("email"); setEmail(""); }} style={{ marginTop: "14px", background: "none", border: "none", color: "var(--color-text-secondary)", fontSize: "0.83rem", cursor: "pointer", textDecoration: "underline" }}>
                                Try a different email
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
