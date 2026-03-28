"use client";

export default function FeaturesSection() {
    const features = [
        {
            icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>, title: "Auto-Clean", subtitle: "Smart Data Cleaning",
            description: "Drop your messy Excel or CSV file. Insight AI automatically detects duplicates, fills missing values, fixes formatting issues, and normalizes schema — all in seconds.",
            highlights: ["Remove duplicates", "Fix null values", "Normalize formats", "Smart type detection"],
            color: "#00D1FF",
        },
        {
            icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"></path><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"></path></svg>, title: "Smart Modeling", subtitle: "AI Picks the Best Algorithm",
            description: "No data science degree required. Our AI benchmarks dozens of machine learning models on your dataset and selects the one that delivers the highest accuracy for your goal.",
            highlights: ["Auto model selection", "Cross-validation", "Accuracy scoring", "Explainability reports"],
            color: "#8B5CF6",
        },
        {
            icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>, title: "Ask Anything", subtitle: "Chat with Your Data",
            description: "Use plain English to query your data. Ask 'What were my top 5 products last quarter?' and instantly receive a chart, table, and insight — no SQL, no code.",
            highlights: ["Natural language queries", "Auto chart generation", "PDF export", "Multi-dataset join"],
            color: "#3ECF8E",
        },
    ];

    return (
        <section id="features" style={{ padding: "100px 24px", position: "relative" }}>
            <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "radial-gradient(ellipse 60% 40% at 50% 50%, rgba(139, 92, 246, 0.05) 0%, transparent 70%)",
            }} />

            <div style={{ maxWidth: "1280px", margin: "0 auto", position: "relative", zIndex: 1 }}>
                <div style={{ textAlign: "center", marginBottom: "72px" }}>
                    <div style={{
                        display: "inline-flex", alignItems: "center", gap: "8px",
                        background: "rgba(139, 92, 246, 0.08)", border: "1px solid rgba(139, 92, 246, 0.2)",
                        borderRadius: "100px", padding: "6px 14px", marginBottom: "20px",
                    }}>
                        <span style={{ fontSize: "0.8rem", color: "#8B5CF6", fontWeight: 500 }}>✦ Core Features</span>
                    </div>
                    <h2 style={{
                        fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 800, letterSpacing: "-0.03em",
                        color: "var(--color-text-primary)", marginBottom: "16px",
                    }}>
                        Everything you need to{" "}
                        <span className="gradient-text">understand your data</span>
                    </h2>
                    <p style={{ fontSize: "1.1rem", color: "var(--color-text-secondary)", maxWidth: "560px", margin: "0 auto" }}>
                        Three powerful tools that turn raw data into clear, actionable business intelligence.
                    </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }} className="features-grid">
                    {features.map((f) => (
                        <div key={f.title} className="glass-card glass-card-hover" style={{ padding: "36px 28px" }}>
                            <div style={{
                                width: "56px", height: "56px", borderRadius: "14px",
                                background: `${f.color}18`, border: `1px solid ${f.color}30`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: "1.6rem", marginBottom: "20px",
                                boxShadow: `0 0 20px ${f.color}15`,
                            }}>
                                {f.icon}
                            </div>

                            <div style={{ marginBottom: "12px" }}>
                                <div style={{
                                    fontSize: "0.72rem", color: f.color, fontWeight: 600,
                                    letterSpacing: "0.08em", marginBottom: "4px", textTransform: "uppercase",
                                }}>
                                    {f.subtitle}
                                </div>
                                <h3 style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
                                    {f.title}
                                </h3>
                            </div>

                            <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "24px" }}>
                                {f.description}
                            </p>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                                {f.highlights.map((h) => (
                                    <span key={h} style={{
                                        fontSize: "0.72rem", padding: "4px 10px",
                                        background: `${f.color}10`, border: `1px solid ${f.color}25`,
                                        borderRadius: "6px", color: f.color, fontWeight: 500,
                                    }}>
                                        {h}
                                    </span>
                                ))}
                            </div>

                            <div style={{ marginTop: "28px", display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ fontSize: "0.875rem", color: f.color, fontWeight: 600 }}>Learn more</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="2">
                                    <path d="M5 12h14M12 5l7 7-7 7" />
                                </svg>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        @media (min-width: 600px) and (max-width: 900px) {
          .features-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 599px) {
          .features-grid { grid-template-columns: 1fr !important; }
          #features { padding: 60px 20px !important; }
        }
      `}</style>
        </section>
    );
}
