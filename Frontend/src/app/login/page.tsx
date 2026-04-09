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

export default function LoginPage() {
    const { login } = useAuth();
    const { theme, toggle } = useTheme();
    const router = useRouter();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        if (!username.trim()) return setError("Please enter your email or username.");
        if (!password) return setError("Please enter your password.");
        setLoading(true);
        await new Promise((r) => setTimeout(r, 700));
        const { ok, error: err } = await login(username.trim(), password);
        if (ok) router.push("/dashboard");
        else { setError(err || "Invalid credentials."); setLoading(false); }
    };

    const inputBase: React.CSSProperties = {
        width: "100%", padding: "12px 14px", borderRadius: "10px",
        background: "var(--color-subtle)", border: "1px solid var(--color-border)",
        color: "var(--color-text-primary)", fontSize: "0.925rem", outline: "none",
        transition: "border-color 0.2s, box-shadow 0.2s",
    };
    const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = "#00D1FF";
        e.target.style.boxShadow = "0 0 0 3px rgba(0,209,255,0.1)";
    };
    const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        e.target.style.borderColor = "var(--color-border)";
        e.target.style.boxShadow = "none";
    };

    return (
        <div style={{
            minHeight: "100vh", background: "var(--color-bg)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px", position: "relative", overflow: "hidden",
        }}>
            {/* Background glows */}
            <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(0,209,255,0.07) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: `linear-gradient(var(--color-grid) 1px, transparent 1px), linear-gradient(90deg, var(--color-grid) 1px, transparent 1px)`, backgroundSize: "50px 50px", pointerEvents: "none" }} />

            {/* Top bar */}
            <div style={{ position: "absolute", top: "20px", left: "24px" }}>
                <a href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
                    <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg,#00D1FF,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 14px rgba(0,209,255,0.4)" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </div>
                    <span style={{ fontWeight: 700, color: "var(--color-text-primary)", fontSize: "1rem" }}>
                        Insight <span style={{ color: "#00D1FF" }}>AI</span>
                    </span>
                </a>
            </div>
            <button onClick={toggle} className="theme-toggle" style={{ position: "absolute", top: "20px", right: "24px" }} title="Toggle theme">
                {theme === "dark"
                    ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                    : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                }
            </button>

            {/* Card */}
            <div style={{ width: "100%", maxWidth: "420px", position: "relative", zIndex: 1 }}>
                <div className="glass-card" style={{ padding: "48px 40px", boxShadow: "var(--shadow-card)" }}>

                    {/* Logo + title */}
                    <div style={{ textAlign: "center", marginBottom: "36px" }}>
                        <img src="/logo.jpg" alt="Insight AI" style={{
                            width: "56px", height: "56px", borderRadius: "16px",
                            objectFit: "cover", display: "block",
                            margin: "0 auto 20px",
                            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                        }} />
                        <h1 style={{ fontSize: "1.7rem", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", marginBottom: "6px" }}>
                            Welcome back
                        </h1>
                        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                            Sign in to continue to Insight AI
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} noValidate>
                        {/* Email / Username */}
                        <div style={{ marginBottom: "16px" }}>
                            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "7px" }}>
                                Email or Username
                            </label>
                            <input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="you@example.com"
                                autoComplete="username"
                                autoFocus
                                style={inputBase}
                                onFocus={onFocus}
                                onBlur={onBlur}
                            />
                        </div>

                        {/* Password */}
                        <div style={{ marginBottom: "8px" }}>
                            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "7px" }}>
                                Password
                            </label>
                            <div style={{ position: "relative" }}>
                                <input
                                    id="password"
                                    type={showPw ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    style={{ ...inputBase, paddingRight: "46px" }}
                                    onFocus={onFocus}
                                    onBlur={onBlur}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(!showPw)}
                                    title={showPw ? "Hide password" : "Show password"}
                                    style={{ position: "absolute", right: "13px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", padding: "2px" }}
                                >
                                    <EyeIcon open={showPw} />
                                </button>
                            </div>
                        </div>

                        {/* Forgot password link */}
                        <div style={{ textAlign: "right", marginBottom: "24px" }}>
                            <a href="/forgot-password" style={{ fontSize: "0.82rem", color: "#00D1FF", textDecoration: "none", fontWeight: 500 }}>
                                Forgot password?
                            </a>
                        </div>

                        {/* Error */}
                        {error && (
                            <div style={{ padding: "11px 14px", borderRadius: "8px", marginBottom: "16px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171", fontSize: "0.83rem", display: "flex", gap: "8px", alignItems: "flex-start" }}>
                                <span style={{ flexShrink: 0 }}>⚠️</span> {error}
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="cta-btn"
                            style={{ width: "100%", padding: "13px", borderRadius: "10px", fontSize: "0.95rem", cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
                        >
                            <span>{loading ? "Signing in…" : "Sign In"}</span>
                        </button>
                    </form>

                    {/* OR divider */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
                        <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 500, letterSpacing: "0.04em" }}>OR</span>
                        <div style={{ flex: 1, height: "1px", background: "var(--color-border)" }} />
                    </div>

                    {/* Google button */}
                    <button
                        type="button"
                        onClick={() => alert("Google sign-in coming soon! Use the form above for now.")}
                        style={{
                            width: "100%", padding: "12px", borderRadius: "10px",
                            border: "1px solid var(--color-border)",
                            background: "var(--color-subtle)",
                            color: "var(--color-text-primary)",
                            fontSize: "0.925rem", fontWeight: 500,
                            cursor: "pointer", display: "flex", alignItems: "center",
                            justifyContent: "center", gap: "10px",
                            transition: "all 0.2s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#4285F4"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(66,133,244,0.1)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.boxShadow = "none"; }}
                    >
                        {/* Google "G" logo */}
                        <svg width="18" height="18" viewBox="0 0 48 48">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                        </svg>
                        Continue with Google
                    </button>

                    <p style={{ textAlign: "center", marginTop: "24px", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                        Don&apos;t have an account?{" "}
                        <a href="/signup" style={{ color: "#00D1FF", textDecoration: "none", fontWeight: 600 }}>Create one free</a>
                    </p>
                </div>
            </div>
        </div>
    );
}
