"use client";

export default function PreviewSection() {
    return (
        <section id="preview" style={{ padding: "100px 24px", position: "relative" }}>
            <hr className="section-divider" style={{ maxWidth: "1280px", margin: "0 auto 100px" }} />

            <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
                <div style={{ textAlign: "center", marginBottom: "72px" }}>
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        background: "rgba(62, 207, 142, 0.08)", border: "1px solid rgba(62, 207, 142, 0.2)",
                        borderRadius: "100px", padding: "6px 14px", marginBottom: "20px",
                    }}>
                        <span style={{ fontSize: "0.8rem", color: "#3ECF8E", fontWeight: 500 }}>📊 Live Preview</span>
                    </div>
                    <h2 style={{
                        fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em",
                        color: "var(--color-text-primary)", marginBottom: "16px",
                    }}>
                        Your data, beautifully visualized
                    </h2>
                    <p style={{ fontSize: "1.05rem", color: "var(--color-text-secondary)", maxWidth: "520px", margin: "0 auto" }}>
                        Here&apos;s a teaser of what your dashboard looks like after Insight AI processes your file.
                    </p>
                </div>

                {/* Dashboard Mockup */}
                <div style={{
                    background: "var(--color-glass)",
                    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(0, 209, 255, 0.12)",
                    borderRadius: "20px", overflow: "hidden",
                    boxShadow: "var(--shadow-card)",
                }}>
                    {/* Browser Chrome */}
                    <div style={{
                        background: "var(--color-surface-alt, var(--color-surface))",
                        borderBottom: "1px solid var(--color-border)",
                        padding: "12px 20px",
                        display: "flex", alignItems: "center", gap: "8px",
                    }}>
                        <div style={{ display: "flex", gap: "6px" }}>
                            {["#FF5F57", "#FFBD2E", "#28CA42"].map((c, i) => (
                                <div key={i} style={{ width: "12px", height: "12px", borderRadius: "50%", background: c }} />
                            ))}
                        </div>
                        <div style={{
                            flex: 1, maxWidth: "400px", margin: "0 auto",
                            background: "var(--color-subtle)", border: "1px solid var(--color-border)",
                            borderRadius: "6px", padding: "4px 12px",
                            fontSize: "0.75rem", color: "var(--color-text-muted)", textAlign: "center",
                        }}>
                            app.insightai.io/dashboard
                        </div>
                    </div>

                    {/* Dashboard Content */}
                    <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "220px 1fr", gap: "20px" }} className="dash-grid">
                        {/* Sidebar */}
                        <div style={{
                            background: "var(--color-subtle)", border: "1px solid var(--color-border)",
                            borderRadius: "12px", padding: "16px",
                        }}>
                            <div style={{
                                fontSize: "0.7rem", color: "var(--color-text-muted)",
                                fontWeight: 600, letterSpacing: "0.08em", marginBottom: "12px",
                            }}>
                                NAVIGATION
                            </div>
                            {["📊 Overview", "📈 Trends", "🧹 Clean Data", "🤖 AI Models", "💬 Chat", "⚙️ Settings"].map((item, i) => (
                                <div key={item} style={{
                                    padding: "8px 12px", borderRadius: "8px", marginBottom: "4px",
                                    background: i === 0 ? "rgba(0,209,255,0.1)" : "transparent",
                                    border: i === 0 ? "1px solid rgba(0,209,255,0.15)" : "1px solid transparent",
                                    color: i === 0 ? "#00D1FF" : "var(--color-text-secondary)",
                                    fontSize: "0.8rem", fontWeight: i === 0 ? 600 : 400, cursor: "pointer",
                                }}>
                                    {item}
                                </div>
                            ))}
                        </div>

                        {/* Main */}
                        <div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }} className="kpi-grid">
                                {[
                                    { label: "Total Revenue", val: "$248,750", change: "+24.5%", color: "#00D1FF" },
                                    { label: "Active Users", val: "12,847", change: "+8.2%", color: "#8B5CF6" },
                                    { label: "Avg. Order", val: "$89.50", change: "-2.1%", color: "#F97316" },
                                    { label: "Growth Score", val: "94.2", change: "+12%", color: "#3ECF8E" },
                                ].map((kpi) => (
                                    <div key={kpi.label} style={{
                                        background: "var(--color-subtle)", border: "1px solid var(--color-border)",
                                        borderRadius: "10px", padding: "16px",
                                    }}>
                                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "6px" }}>{kpi.label}</div>
                                        <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>{kpi.val}</div>
                                        <div style={{ fontSize: "0.72rem", color: kpi.change.startsWith("+") ? "#3ECF8E" : "#F97316", fontWeight: 600 }}>
                                            {kpi.change} vs last month
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                                {/* Bar chart */}
                                <div style={{
                                    background: "var(--color-subtle)", border: "1px solid var(--color-border)",
                                    borderRadius: "10px", padding: "16px",
                                }}>
                                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "4px" }}>Monthly Revenue</div>
                                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "16px" }}>Jan — Dec 2025</div>
                                    <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "80px" }}>
                                        {[45, 62, 38, 75, 58, 90, 67, 84, 55, 78, 88, 100].map((h, i) => (
                                            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                                                <div style={{
                                                    height: `${h}%`, borderRadius: "3px 3px 0 0",
                                                    background: i >= 10 ? "linear-gradient(180deg, #00D1FF, #0099CC)" : `rgba(0,209,255,${0.15 + i * 0.03})`,
                                                    boxShadow: i >= 10 ? "0 0 8px rgba(0,209,255,0.5)" : "none",
                                                }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Chat interface */}
                                <div style={{
                                    background: "var(--color-subtle)", border: "1px solid var(--color-border)",
                                    borderRadius: "10px", padding: "16px",
                                }}>
                                    <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "16px" }}>AI Analysis Chat</div>
                                    {[
                                        { role: "user", msg: "What is my sales trend?" },
                                        { role: "ai", msg: "📈 Revenue grew 24.5% this month, driven by Electronics (+38%) and Q4 seasonality." },
                                        { role: "user", msg: "Which products underperform?" },
                                    ].map((m, i) => (
                                        <div key={i} style={{
                                            display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                                            marginBottom: "8px",
                                        }}>
                                            <div style={{
                                                maxWidth: "80%", padding: "8px 12px", borderRadius: "10px",
                                                background: m.role === "user" ? "rgba(0,209,255,0.1)" : "rgba(139,92,246,0.1)",
                                                border: `1px solid ${m.role === "user" ? "rgba(0,209,255,0.2)" : "rgba(139,92,246,0.2)"}`,
                                                fontSize: "0.75rem",
                                                color: m.role === "user" ? "#00D1FF" : "var(--color-text-primary)",
                                            }}>
                                                {m.msg}
                                            </div>
                                        </div>
                                    ))}
                                    <div style={{ display: "flex", justifyContent: "flex-start" }}>
                                        <div style={{
                                            padding: "8px 14px",
                                            background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                                            borderRadius: "10px", display: "flex", gap: "4px", alignItems: "center",
                                        }}>
                                            {[0, 1, 2].map((i) => (
                                                <div key={i} style={{
                                                    width: "5px", height: "5px", borderRadius: "50%", background: "#8B5CF6",
                                                    animation: `pulse-glow 1.2s ease-in-out ${i * 0.2}s infinite`,
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @media (max-width: 900px) {
          .dash-grid { grid-template-columns: 1fr !important; }
          .dash-grid > div:first-child { display: none; }
          .kpi-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 480px) {
          .kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </section>
    );
}
