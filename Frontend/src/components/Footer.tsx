"use client";

const footerLinks = {
    Product: ["Features", "Pricing", "Changelog", "Roadmap"],
    Company: ["About", "Blog", "Careers", "Press"],
    Resources: ["Docs", "API Reference", "Community", "Status"],
    Legal: ["Privacy", "Terms", "Security", "Cookies"],
};

export default function Footer() {
    return (
        <footer style={{ padding: "40px 24px 32px", position: "relative" }}>
            <hr className="section-divider" style={{ maxWidth: "1280px", width: "100%", margin: "0 auto 48px" }} />

            <div style={{ maxWidth: "1280px", width: "100%", margin: "0 auto" }}>
                <div style={{
                    display: "flex", justifyContent: "space-between", flexWrap: "wrap",
                    gap: "48px", marginBottom: "60px",
                }} className="footer-flex">

                    {/* Brand */}
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                            <div style={{
                                width: "36px", height: "36px", borderRadius: "10px",
                                background: "linear-gradient(135deg, #00D1FF, #8B5CF6)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                boxShadow: "0 0 16px rgba(0,209,255,0.3)",
                            }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                                        stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                            <span style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                                Insight <span style={{ color: "#00D1FF" }}>AI</span>
                            </span>
                        </div>
                        <p style={{
                            fontSize: "0.875rem", color: "var(--color-text-secondary)",
                            lineHeight: 1.7, marginBottom: "24px", maxWidth: "260px",
                        }}>
                            Turn raw data into instant decisions. The automated analytics platform built for modern teams.
                        </p>
                        <div style={{ display: "flex", gap: "10px" }}>
                            {[{ icon: "𝕏", label: "Twitter" }, { icon: "in", label: "LinkedIn" }, { icon: "gh", label: "GitHub" }].map((s) => (
                                <a key={s.label} href="#" title={s.label} style={{
                                    width: "36px", height: "36px", borderRadius: "8px",
                                    background: "var(--color-subtle)", border: "1px solid var(--color-border)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "var(--color-text-secondary)", textDecoration: "none",
                                    fontSize: "0.8rem", fontWeight: 700, transition: "all 0.2s",
                                }}
                                    onMouseEnter={(e) => {
                                        (e.currentTarget as HTMLAnchorElement).style.borderColor = "#00D1FF";
                                        (e.currentTarget as HTMLAnchorElement).style.color = "#00D1FF";
                                    }}
                                    onMouseLeave={(e) => {
                                        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--color-border)";
                                        (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-text-secondary)";
                                    }}
                                >
                                    {s.icon}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Link columns */}
                    {Object.entries(footerLinks).map(([group, links]) => (
                        <div key={group}>
                            <div style={{
                                fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-primary)",
                                letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px",
                            }}>
                                {group}
                            </div>
                            {links.map((link) => (
                                <a key={link} href="#" style={{
                                    display: "block", padding: "4px 0",
                                    color: "var(--color-text-secondary)", textDecoration: "none",
                                    fontSize: "0.875rem", transition: "color 0.2s",
                                }}
                                    onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "var(--color-text-primary)")}
                                    onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "var(--color-text-secondary)")}
                                >
                                    {link}
                                </a>
                            ))}
                        </div>
                    ))}
                </div>

                <hr className="section-divider" style={{ marginBottom: "24px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                        © {new Date().getFullYear()} Insight AI. All rights reserved. Built with ❤️ and 🤖
                    </div>
                    <div style={{ display: "flex", gap: "16px" }}>
                        {["Privacy", "Terms", "Cookies"].map((l) => (
                            <a key={l} href="#" style={{
                                fontSize: "0.8rem", color: "var(--color-text-muted)",
                                textDecoration: "none", transition: "color 0.2s",
                            }}
                                onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "var(--color-text-secondary)")}
                                onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "var(--color-text-muted)")}
                            >
                                {l}
                            </a>
                        ))}
                    </div>
                </div>
            </div>

            <style>{`
        @media (max-width: 900px) { .footer-flex > div { flex: 1 1 40%; } }
        @media (max-width: 480px) { .footer-flex > div { flex: 1 1 100%; } }
      `}</style>
        </footer>
    );
}
