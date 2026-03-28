"use client";
import React from "react";

export default function HowItWorksSection() {
    const steps = [
        {
            number: "01", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>, title: "Upload",
            description: "Drag & drop your CSV, XLSX, or JSON file. Insight AI securely ingests your data with zero configuration.",
            detail: "Supports files up to 500MB",
        },
        {
            number: "02", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line></svg>, title: "AI Analyzes",
            description: "Our engine auto-detects data types, runs statistical analysis, selects the best ML model, and generates insights.",
            detail: "Takes ~10 seconds average",
        },
        {
            number: "03", icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>, title: "Get Insights",
            description: "Receive an interactive dashboard with charts, trend analysis, predictions, and natural language explanations.",
            detail: "Export as PDF, PNG, or CSV",
        },
    ];

    return (
        <section id="how-it-works" style={{ padding: "100px 24px", position: "relative" }}>
            <hr className="section-divider" style={{ maxWidth: "1280px", margin: "0 auto 100px" }} />

            <div style={{
                position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
                width: "600px", height: "300px",
                background: "radial-gradient(ellipse, rgba(0, 209, 255, 0.04) 0%, transparent 70%)",
                pointerEvents: "none",
            }} />

            <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
                <div style={{ textAlign: "center", marginBottom: "72px" }}>
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        background: "rgba(0, 209, 255, 0.08)", border: "1px solid rgba(0, 209, 255, 0.2)",
                        borderRadius: "100px", padding: "6px 14px", marginBottom: "20px",
                    }}>
                        <span style={{ fontSize: "0.8rem", color: "#00D1FF", fontWeight: 500 }}>⚡ Simple 3-Step Process</span>
                    </div>
                    <h2 style={{
                        fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em",
                        color: "var(--color-text-primary)", marginBottom: "16px",
                    }}>
                        How Insight AI Works
                    </h2>
                    <p style={{ fontSize: "1.1rem", color: "var(--color-text-secondary)", maxWidth: "500px", margin: "0 auto" }}>
                        From raw file to actionable intelligence, all in under 30 seconds.
                    </p>
                </div>

                <div style={{
                    display: "grid", gridTemplateColumns: "1fr auto 1fr auto 1fr",
                    gap: "0", alignItems: "center",
                }} className="steps-grid">
                    {steps.map((step, idx) => (
                        <React.Fragment key={step.number}>
                            <div className="glass-card" style={{
                                padding: "36px 28px", textAlign: "center",
                                position: "relative", overflow: "hidden",
                            }}>
                                <div style={{
                                    position: "absolute", top: "12px", right: "16px",
                                    fontSize: "3rem", fontWeight: 900, color: "var(--color-watermark)",
                                    lineHeight: 1, pointerEvents: "none", userSelect: "none",
                                }}>
                                    {step.number}
                                </div>
                                <div className="step-dot" style={{ margin: "0 auto 20px" }}>{step.icon}</div>
                                <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "12px" }}>
                                    {step.title}
                                </h3>
                                <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "16px" }}>
                                    {step.description}
                                </p>
                                <div style={{
                                    fontSize: "0.75rem", color: "#00D1FF", fontWeight: 500,
                                    background: "rgba(0,209,255,0.08)", border: "1px solid rgba(0,209,255,0.15)",
                                    borderRadius: "6px", padding: "4px 10px", display: "inline-block",
                                }}>
                                    {step.detail}
                                </div>
                            </div>

                            {idx < steps.length - 1 && (
                                <div style={{
                                    display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px",
                                }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        {[0, 1, 2, 3, 4].map((i) => (
                                            <div key={i} style={{
                                                width: i === 2 ? "8px" : "4px", height: i === 2 ? "8px" : "4px",
                                                borderRadius: "50%",
                                                background: i === 2 ? "#00D1FF" : "rgba(0,209,255,0.3)",
                                                boxShadow: i === 2 ? "0 0 8px #00D1FF" : "none",
                                            }} />
                                        ))}
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="2">
                                            <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            )}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <style>{`
        @media (max-width: 900px) {
          .steps-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .steps-grid > div:not(.glass-card) { display: none !important; }
        }
        @media (max-width: 600px) {
          #how-it-works { padding: 60px 20px !important; }
        }
      `}</style>
        </section>
    );
}
