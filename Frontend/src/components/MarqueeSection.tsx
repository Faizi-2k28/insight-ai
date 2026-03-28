"use client";

const items = [
    "CSV", "XLSX", "JSON", "Parquet", "SQLite", "Google Sheets",
    "Managers", "Educators", "Analysts", "Researchers", "Startups",
    "CSV", "XLSX", "JSON", "Parquet", "SQLite", "Google Sheets",
    "Managers", "Educators", "Analysts", "Researchers", "Startups",
];

const logos = [
    { name: "Microsoft Excel", color: "#217346" },
    { name: "Google Sheets", color: "#34A853" },
    { name: "Tableau", color: "#E97627" },
    { name: "Power BI", color: "#F2C811" },
    { name: "Snowflake", color: "#29B5E8" },
    { name: "BigQuery", color: "#4285F4" },
    { name: "Pandas", color: "#150458" },
    { name: "Jupyter", color: "#F37726" },
    { name: "Microsoft Excel", color: "#217346" },
    { name: "Google Sheets", color: "#34A853" },
    { name: "Tableau", color: "#E97627" },
    { name: "Power BI", color: "#F2C811" },
    { name: "Snowflake", color: "#29B5E8" },
    { name: "BigQuery", color: "#4285F4" },
];

export default function MarqueeSection() {
    return (
        <section style={{ padding: "80px 0", overflow: "hidden", position: "relative" }}>
            <hr className="section-divider" style={{ maxWidth: "1280px", margin: "0 auto 80px" }} />

            <div style={{ maxWidth: "1280px", margin: "0 auto 48px", padding: "0 24px", textAlign: "center" }}>
                <p style={{
                    fontSize: "0.85rem", color: "var(--color-text-muted)",
                    fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase",
                }}>
                    Trusted by managers, educators & analysts — supports all major formats
                </p>
            </div>

            {/* Marquee row 1 */}
            <div style={{ position: "relative", overflow: "hidden", marginBottom: "20px" }}>
                <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: "120px", zIndex: 2,
                    background: "linear-gradient(90deg, var(--color-bg), transparent)", pointerEvents: "none",
                }} />
                <div style={{
                    position: "absolute", right: 0, top: 0, bottom: 0, width: "120px", zIndex: 2,
                    background: "linear-gradient(-90deg, var(--color-bg), transparent)", pointerEvents: "none",
                }} />
                <div style={{ display: "flex", width: "max-content" }} className="marquee-track">
                    {items.map((item, i) => (
                        <div key={i} style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "8px 20px", margin: "0 6px",
                            background: "var(--color-subtle)", border: "1px solid var(--color-border)",
                            borderRadius: "100px", whiteSpace: "nowrap",
                            fontSize: "0.875rem", color: "var(--color-text-secondary)", fontWeight: 500,
                        }}>
                            <span style={{ color: "#00D1FF", fontSize: "0.7rem" }}>◆</span>
                            {item}
                        </div>
                    ))}
                </div>
            </div>

            {/* Marquee row 2 */}
            <div style={{ position: "relative", overflow: "hidden" }}>
                <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: "120px", zIndex: 2,
                    background: "linear-gradient(90deg, var(--color-bg), transparent)", pointerEvents: "none",
                }} />
                <div style={{
                    position: "absolute", right: 0, top: 0, bottom: 0, width: "120px", zIndex: 2,
                    background: "linear-gradient(-90deg, var(--color-bg), transparent)", pointerEvents: "none",
                }} />
                <div style={{
                    display: "flex", width: "max-content",
                    animation: "marquee 25s linear infinite reverse",
                }}>
                    {logos.map((logo, i) => (
                        <div key={i} style={{
                            display: "flex", alignItems: "center", gap: "8px",
                            padding: "8px 24px", margin: "0 6px",
                            background: "var(--color-subtle)", border: "1px solid var(--color-border)",
                            borderRadius: "100px", whiteSpace: "nowrap",
                            fontSize: "0.85rem", color: "var(--color-text-secondary)", fontWeight: 600,
                        }}>
                            <span style={{
                                width: "10px", height: "10px", borderRadius: "2px",
                                background: logo.color, display: "inline-block", flexShrink: 0,
                            }} />
                            {logo.name}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
