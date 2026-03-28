"use client";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";

function EyeIcon({ open }: { open: boolean }) {
    return open ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
    ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}

function CheckIcon() {
    return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3ECF8E" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>;
}

function passwordStrength(pw: string) {
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score; // 0-4
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Good", "Strong"];
const STRENGTH_COLOR = ["", "#EF4444", "#F97316", "#FACC15", "#3ECF8E"];

export default function SignupPage() {
    const { signup } = useAuth();
    const { theme, toggle } = useTheme();
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPw] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const strength = passwordStrength(password);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        if (!name.trim()) return setError("Please enter your full name.");
        if (!email) return setError("Please enter your email.");
        if (password.length < 6) return setError("Password must be at least 6 characters.");
        if (password !== confirm) return setError("Passwords do not match.");
        if (!agreed) return setError("Please agree to the Terms & Privacy Policy.");
        setLoading(true);
        await new Promise((r) => setTimeout(r, 900));
        const { ok, error: err } = signup(name.trim(), email, password);
        if (ok) router.push("/dashboard");
        else { setError(err || "Signup failed"); setLoading(false); }
    };

    const inputStyle = {
        width: "100%", padding: "11px 14px", borderRadius: "8px",
        background: "var(--color-subtle)", border: "1px solid var(--color-border)",
        color: "var(--color-text-primary)", fontSize: "0.9rem", outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = "#00D1FF";
        e.target.style.boxShadow = "0 0 0 3px rgba(0,209,255,0.1)";
    };
    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = "var(--color-border)";
        e.target.style.boxShadow = "none";
    };

    return (
        <div style={{
            minHeight: "100vh", background: "var(--color-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "80px 24px 40px", position: "relative", overflow: "hidden",
        }}>
            {/* Glows */}
            <div style={{ position: "absolute", top: "-20%", right: "-10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
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
            <button onClick={toggle} className="theme-toggle" style={{ position: "absolute", top: "20px", right: "24px" }} title="Toggle theme">
                {theme === "dark"
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                }
            </button>

            <div style={{ width: "100%", maxWidth: "460px", position: "relative", zIndex: 1 }}>
                <div className="glass-card" style={{ padding: "44px 40px", boxShadow: "var(--shadow-card)" }}>
                    <div style={{ textAlign: "center", marginBottom: "32px" }}>
                        <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", marginBottom: "8px" }}>
                            Create your account
                        </h1>
                        <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
                            Start for free — no credit card required
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        {/* Name */}
                        <div style={{ marginBottom: "14px" }}>
                            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Full Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Johnson" autoComplete="name" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                        </div>

                        {/* Email */}
                        <div style={{ marginBottom: "14px" }}>
                            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" style={inputStyle} onFocus={handleFocus} onBlur={handleBlur} />
                        </div>

                        {/* Password + strength */}
                        <div style={{ marginBottom: "14px" }}>
                            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Password</label>
                            <div style={{ position: "relative" }}>
                                <input type={showPw ? "text" : "password"} value={password} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" autoComplete="new-password" style={{ ...inputStyle, paddingRight: "44px" }} onFocus={handleFocus} onBlur={handleBlur} />
                                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}>
                                    <EyeIcon open={showPw} />
                                </button>
                            </div>
                            {/* Strength bar */}
                            {password && (
                                <div style={{ marginTop: "8px" }}>
                                    <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
                                        {[1, 2, 3, 4].map((i) => (
                                            <div key={i} style={{ flex: 1, height: "3px", borderRadius: "2px", background: i <= strength ? STRENGTH_COLOR[strength] : "var(--color-border)", transition: "background 0.3s" }} />
                                        ))}
                                    </div>
                                    <div style={{ fontSize: "0.72rem", color: STRENGTH_COLOR[strength] }}>{STRENGTH_LABEL[strength]} password</div>
                                </div>
                            )}
                        </div>

                        {/* Confirm */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Confirm Password</label>
                            <div style={{ position: "relative" }}>
                                <input type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" autoComplete="new-password" style={{ ...inputStyle, paddingRight: "40px", borderColor: confirm && password !== confirm ? "#EF4444" : "var(--color-border)" }} onFocus={handleFocus} onBlur={handleBlur} />
                                {confirm && password === confirm && (
                                    <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)" }}><CheckIcon /></span>
                                )}
                            </div>
                        </div>

                        {/* Terms */}
                        <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", marginBottom: "20px", cursor: "pointer" }}>
                            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                                style={{ width: "16px", height: "16px", marginTop: "2px", accentColor: "#00D1FF", flexShrink: 0 }} />
                            <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                                I agree to the{" "}
                                <a href="#" style={{ color: "#00D1FF", textDecoration: "none" }}>Terms of Service</a>{" "}and{" "}
                                <a href="#" style={{ color: "#00D1FF", textDecoration: "none" }}>Privacy Policy</a>
                            </span>
                        </label>

                        {/* Error */}
                        {error && (
                            <div style={{ padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#F87171", fontSize: "0.82rem" }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button type="submit" disabled={loading} className="cta-btn" style={{ width: "100%", padding: "13px", borderRadius: "10px", fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                            <span>{loading ? "Creating account..." : "Create Free Account"}</span>
                        </button>
                    </form>

                    <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                        Already have an account?{" "}
                        <a href="/login" style={{ color: "#00D1FF", textDecoration: "none", fontWeight: 600 }}>Sign in</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
