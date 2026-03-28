"use client";
import { useAuth } from "@/context/AuthContext";

export default function CTASection() {
    const { user } = useAuth();
    return (
        <section id="pricing" style={{ padding: "100px 24px", position: "relative" }}>
            <hr className="section-divider" style={{ maxWidth: "1280px", width: "100%", margin: "0 auto 100px" }} />

            <div style={{ maxWidth: "1280px", width: "100%", margin: "0 auto" }}>
                <div style={{
                    position: "relative", borderRadius: "24px", padding: "80px 48px",
                    textAlign: "center", overflow: "hidden",
                    background: "linear-gradient(135deg, rgba(0, 209, 255, 0.06) 0%, rgba(139, 92, 246, 0.06) 100%)",
                    border: "1px solid rgba(0, 209, 255, 0.15)",
                    boxShadow: "var(--shadow-card)",
                }}>
                    {/* Overlays */}
                    <div style={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        background: "radial-gradient(ellipse 50% 60% at 50% 0%, rgba(0, 209, 255, 0.08) 0%, transparent 60%)",
                    }} />
                    <div style={{
                        position: "absolute", bottom: "-40px", left: "50%", transform: "translateX(-50%)",
                        width: "600px", height: "200px",
                        background: "radial-gradient(ellipse, rgba(139, 92, 246, 0.1) 0%, transparent 70%)",
                        pointerEvents: "none",
                    }} />
                    <div style={{
                        position: "absolute", inset: 0, pointerEvents: "none",
                        backgroundImage: `linear-gradient(var(--color-grid) 1px, transparent 1px),
                              linear-gradient(90deg, var(--color-grid) 1px, transparent 1px)`,
                        backgroundSize: "40px 40px",
                    }} />

                    <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{
                            display: "inline-flex", alignItems: "center", gap: "8px",
                            background: "rgba(0, 209, 255, 0.08)", border: "1px solid rgba(0, 209, 255, 0.2)",
                            borderRadius: "100px", padding: "6px 14px", marginBottom: "24px",
                        }}>
                            <span style={{ fontSize: "0.8rem", color: "#00D1FF", fontWeight: 500 }}>🎉 Free to Start — No Credit Card</span>
                        </div>

                        <h2 style={{
                            fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, letterSpacing: "-0.03em",
                            color: "var(--color-text-primary)", lineHeight: 1.1, marginBottom: "20px",
                        }}>
                            Ready to unlock{" "}
                            <span className="gradient-text">your data?</span>
                        </h2>

                        <p style={{
                            fontSize: "1.1rem", color: "var(--color-text-secondary)",
                            maxWidth: "560px", margin: "0 auto 40px", lineHeight: 1.7,
                        }}>
                            Join 2,400+ analysts, managers, and educators who are already turning
                            raw spreadsheets into instant business intelligence.
                        </p>

                        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
                            <a href={user ? "/dashboard" : "/login"} className="cta-btn" style={{
                                padding: "16px 36px", borderRadius: "12px",
                                fontSize: "1.05rem", textDecoration: "none", display: "inline-block",
                            }}>
                                <span>🚀 Join Now — It&apos;s Free</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
        @media (max-width: 768px) {
          #pricing > div > div { padding: 48px 24px !important; }
        }
        @media (max-width: 500px) {
          #pricing > div > div { padding: 36px 20px !important; }
          #pricing { padding: 60px 16px !important; }
        }
      `}</style>
        </section>
    );
}
