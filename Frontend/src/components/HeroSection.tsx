"use client";
import { useAuth } from "@/context/AuthContext";

export default function HeroSection() {
    const { user } = useAuth();
    return (
        <section id="hero" style={{
            minHeight: "100vh", display: "flex", alignItems: "center",
            position: "relative", overflow: "hidden", padding: "120px 24px 80px",
        }}>
            {/* Background glows */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(0, 209, 255, 0.07) 0%, transparent 60%)",
            }} />
            <div style={{
                position: "absolute", top: "20%", left: "-10%", width: "500px", height: "500px",
                background: "radial-gradient(circle, rgba(139, 92, 246, 0.06) 0%, transparent 70%)",
                pointerEvents: "none",
            }} />
            <div style={{
                position: "absolute", top: "30%", right: "-5%", width: "400px", height: "400px",
                background: "radial-gradient(circle, rgba(0, 209, 255, 0.05) 0%, transparent 70%)",
                pointerEvents: "none",
            }} />

            {/* Grid lines */}
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                backgroundImage: `linear-gradient(var(--color-grid) 1px, transparent 1px),
                          linear-gradient(90deg, var(--color-grid) 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
            }} />

            <div style={{
                maxWidth: "1280px", margin: "0 auto", width: "100%",
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px",
                alignItems: "center", position: "relative", zIndex: 1,
            }} className="hero-grid">
                {/* Left */}
                <div style={{ animation: "fadeInUp 0.8s ease forwards" }}>
                    {/* Badge */}
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        background: "rgba(0, 209, 255, 0.08)", border: "1px solid rgba(0, 209, 255, 0.2)",
                        borderRadius: "100px", padding: "6px 14px", marginBottom: "28px",
                    }}>
                        <div style={{
                            width: "6px", height: "6px", borderRadius: "50%",
                            background: "#00D1FF", boxShadow: "0 0 8px #00D1FF",
                            animation: "pulse-glow 2s ease-in-out infinite",
                        }} />
                        <span style={{ fontSize: "0.8rem", color: "#00D1FF", fontWeight: 500 }}>
                            AI-Powered Analytics Platform
                        </span>
                    </div>

                    <h1 style={{
                        fontSize: "clamp(2.2rem, 5vw, 3.8rem)",
                        fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em",
                        marginBottom: "24px", color: "var(--color-text-primary)",
                    }}>
                        Turn Raw Data into{" "}
                        <span className="gradient-text">Instant Decisions.</span>
                    </h1>

                    <p style={{
                        fontSize: "clamp(1rem, 1.5vw, 1.2rem)",
                        color: "var(--color-text-secondary)", lineHeight: 1.7,
                        marginBottom: "40px", maxWidth: "520px",
                    }}>
                        No SQL. No Complex Dashboards. Just upload and let AI do the work.
                        Get beautiful insights, charts, and predictions in seconds.
                    </p>

                    <div className="hero-cta-row" style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
                        <a href={user ? "/dashboard" : "/login"} className="cta-btn" style={{
                            padding: "14px 28px", borderRadius: "10px",
                            fontSize: "1rem", textDecoration: "none", display: "inline-block",
                        }}>
                            <span>🚀 Get Started for Free</span>
                        </a>
                        <a href="#how-it-works" className="ghost-btn" style={{
                            padding: "14px 28px", borderRadius: "10px",
                            fontSize: "1rem", textDecoration: "none",
                            display: "inline-flex", alignItems: "center", gap: "8px",
                        }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10" /><polygon points="10 8 16 12 10 16 10 8" />
                            </svg>
                            See how it works
                        </a>
                    </div>

                    {/* Trust bar */}
                    <div style={{ marginTop: "48px", display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
                        <div style={{ display: "flex" }}>
                            {["👩‍💼", "👨‍🏫", "👩‍🔬", "👨‍💻"].map((e, i) => (
                                <div key={i} style={{
                                    width: "32px", height: "32px", borderRadius: "50%",
                                    background: `linear-gradient(${135 + i * 30}deg, #00D1FF, #8B5CF6)`,
                                    border: "2px solid var(--color-bg)", marginLeft: i === 0 ? 0 : "-8px",
                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.85rem",
                                }}>
                                    {e}
                                </div>
                            ))}
                        </div>
                        <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-primary)" }}>2,400+ Analysts</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>Already saving hours every week</div>
                        </div>
                    </div>
                </div>

                {/* Right: Floating Glass Card */}
                <div style={{
                    display: "flex", justifyContent: "center", alignItems: "center",
                    animation: "fadeInUp 0.8s 0.2s ease both",
                }}>
                    <div className="float-anim" style={{
                        width: "100%", maxWidth: "460px",
                        background: "var(--color-glass)",
                        backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
                        border: "1px solid rgba(0, 209, 255, 0.15)",
                        borderRadius: "20px", padding: "28px",
                        boxShadow: "var(--shadow-card), 0 0 0 1px var(--color-border)",
                    }}>
                        {/* Card header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                            <div>
                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "2px" }}>Sales Dashboard</div>
                                <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--color-text-primary)" }}>$124,500</div>
                            </div>
                            <div style={{
                                background: "rgba(0, 209, 255, 0.1)", border: "1px solid rgba(0,209,255,0.2)",
                                borderRadius: "8px", padding: "6px 12px",
                                fontSize: "0.75rem", color: "#00D1FF", fontWeight: 600,
                            }}>↑ 24.5%</div>
                        </div>

                        {/* Bar chart */}
                        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", height: "100px", marginBottom: "16px" }}>
                            {[40, 65, 45, 80, 60, 90, 70, 100, 75, 85, 55, 95].map((h, i) => (
                                <div key={i} style={{ flex: 1 }}>
                                    <div style={{
                                        height: `${h}%`, borderRadius: "4px 4px 0 0",
                                        background: i === 11
                                            ? "linear-gradient(180deg, #00D1FF, #0099CC)"
                                            : `rgba(0,209,255,${0.1 + i * 0.02})`,
                                        boxShadow: i === 11 ? "0 0 12px rgba(0,209,255,0.5)" : "none",
                                    }} />
                                </div>
                            ))}
                        </div>

                        {/* KPIs */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                            {[
                                { label: "Revenue", val: "$124K", color: "#00D1FF" },
                                { label: "Users", val: "8,240", color: "#8B5CF6" },
                                { label: "Growth", val: "+24%", color: "#3ECF8E" },
                            ].map((kpi) => (
                                <div key={kpi.label} style={{
                                    background: "var(--color-subtle)", border: "1px solid var(--color-border)",
                                    borderRadius: "10px", padding: "12px", textAlign: "center",
                                }}>
                                    <div style={{ fontSize: "1rem", fontWeight: 700, color: kpi.color }}>{kpi.val}</div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>{kpi.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* AI chat bubble */}
                        <div style={{
                            marginTop: "16px", background: "rgba(139, 92, 246, 0.08)",
                            border: "1px solid rgba(139, 92, 246, 0.2)",
                            borderRadius: "10px", padding: "12px",
                            display: "flex", gap: "10px", alignItems: "flex-start",
                        }}>
                            <div style={{
                                width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                                background: "linear-gradient(135deg, #8B5CF6, #00D1FF)",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem",
                            }}>✨</div>
                            <div>
                                <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", marginBottom: "2px" }}>AI Insight</div>
                                <div style={{ fontSize: "0.82rem", color: "var(--color-text-primary)" }}>
                                    What is my sales trend?{" "}
                                    <span style={{ color: "#00D1FF" }}>→ Up 24.5% this month</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        /* ── iPad (≤900px): stack columns, center text ── */
        @media (max-width: 900px) {
          .hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
            gap: 40px !important;
          }
          .hero-grid > div:first-child div[style*="display: flex"] { justify-content: center; }
          .hero-grid > div:first-child div[style*="marginTop: 48px"] { justify-content: center; }
        }

        /* ── Mobile (≤600px): reduce padding, hide float card ── */
        @media (max-width: 600px) {
          #hero { padding: 100px 20px 60px !important; }
          .hero-grid > div:last-child { display: none !important; }
          .hero-cta-row { flex-direction: column !important; align-items: center !important; width: 100% !important; }
          .hero-cta-row a { width: 100% !important; text-align: center !important; }
        }
      `}</style>
        </section>
    );
}
