"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import AIProcessingModal from "@/components/AIProcessingModal";
import { dashboardService } from "@/services/dashboardService";
import { uploadService } from "@/services/uploadService";

/* ─────────── Types ─────────── */
interface Project {
    id: string;
    name: string;
    type: string;
    model: string;
    status: "Analysis Ready" | "Model Trained" | "Processing" | "Queued";
    rows: number;
    edited: string;
    starred: boolean;
}

/* ─────────── Dummy Data ─────────── */
const INITIAL_PROJECTS: Project[] = [
    { id: "1", name: "Sales_Q4_2025.xlsx", type: "xlsx", model: "Classification", status: "Model Trained", rows: 12480, edited: "2 min ago", starred: true },
    { id: "2", name: "Customer_Churn_Data.csv", type: "csv", model: "Regression", status: "Analysis Ready", rows: 5200, edited: "1 hr ago", starred: false },
    { id: "3", name: "Product_Inventory.xlsx", type: "xlsx", model: "Clustering", status: "Processing", rows: 3800, edited: "3 hr ago", starred: false },
    { id: "4", name: "Marketing_Campaign.json", type: "json", model: "Classification", status: "Model Trained", rows: 9100, edited: "Yesterday", starred: true },
    { id: "5", name: "Revenue_Forecast.xlsx", type: "xlsx", model: "Time Series", status: "Analysis Ready", rows: 2400, edited: "2 days ago", starred: false },
    { id: "6", name: "Employee_Survey.csv", type: "csv", model: "NLP", status: "Queued", rows: 840, edited: "3 days ago", starred: false },
    { id: "7", name: "Supply_Chain_2025.xlsx", type: "xlsx", model: "Anomaly Detect.", status: "Analysis Ready", rows: 18200, edited: "4 days ago", starred: false },
    { id: "8", name: "Customer_Segments.json", type: "json", model: "Clustering", status: "Model Trained", rows: 7650, edited: "1 week ago", starred: false },
];

const STATUS_STYLES: Record<Project["status"], { bg: string; border: string; color: string }> = {
    "Analysis Ready": { bg: "rgba(62,207,142,0.1)", border: "rgba(62,207,142,0.25)", color: "#3ECF8E" },
    "Model Trained": { bg: "rgba(0,209,255,0.1)", border: "rgba(0,209,255,0.25)", color: "#00D1FF" },
    "Processing": { bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.25)", color: "#F97316" },
    "Queued": { bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)", color: "#8B5CF6" },
};

const MODEL_COLOR: Record<string, string> = {
    "Classification": "#00D1FF", "Regression": "#8B5CF6", "Clustering": "#F97316",
    "Time Series": "#3ECF8E", "NLP": "#EC4899", "Anomaly Detect.": "#FACC15",
};

const FILTER_TAGS = ["All", "xlsx", "csv", "Starred"];

/* ─────────── Sub-components ─────────── */
function FileIcon({ type }: { type: string }) {
    const colors: Record<string, string> = { xlsx: "#217346", csv: "#00D1FF", json: "#F97316" };
    const c = colors[type] ?? "#8B949E";
    return (
        <svg width="28" height="34" viewBox="0 0 28 34" fill="none">
            <rect width="28" height="34" rx="5" fill={`${c}18`} stroke={`${c}40`} strokeWidth="1" />
            <path d="M17 1v8h8" stroke={`${c}80`} strokeWidth="1.5" fill="none" strokeLinecap="round" />
            <text x="14" y="25" textAnchor="middle" fontSize="8" fontWeight="700" fill={c} fontFamily="monospace">
                {type.toUpperCase()}
            </text>
        </svg>
    );
}

function ThreeDotMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);
    return (
        <div ref={ref} style={{ position: "relative" }}>
            <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "4px 6px", borderRadius: "6px", transition: "all 0.15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-subtle)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "var(--color-text-muted)"; }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg>
            </button>
            {open && (
                <div style={{ position: "absolute", right: 0, top: "32px", minWidth: "140px", background: "var(--color-glass)", backdropFilter: "blur(20px)", border: "1px solid var(--color-border)", borderRadius: "10px", padding: "6px", boxShadow: "var(--shadow-card)", zIndex: 50 }}>
                    {[
                        { icon: "✏️", label: "Rename", action: onRename },
                        { icon: "📥", label: "Download Report", action: () => { } },
                        { icon: "📤", label: "Share", action: () => { } },
                        { icon: "🗑️", label: "Delete", action: onDelete, danger: true },
                    ].map((item) => (
                        <button key={item.label} onClick={(e) => { e.stopPropagation(); item.action(); setOpen(false); }}
                            style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", padding: "7px 10px", borderRadius: "7px", background: "none", border: "none", cursor: "pointer", fontSize: "0.82rem", color: (item as { danger?: boolean }).danger ? "#F87171" : "var(--color-text-secondary)", textAlign: "left", transition: "all 0.15s" }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-subtle)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}>
                            <span>{item.icon}</span> {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─────────── Sidebar ─────────── */
const NAV_ITEMS = [
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>, label: "Home", id: "home" },
    { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><polyline points="13 2 13 9 20 9" /></svg>, label: "My Files", id: "files" },
];

const SETTINGS_ICON = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;

function Sidebar({ collapsed, activeNav, setActiveNav, user, logout, theme, toggleTheme, isMobile, closeMobile }:
    { collapsed: boolean; activeNav: string; setActiveNav: (id: string) => void; user: { name: string; avatar?: string; role: string } | null; logout: () => void; theme: string; toggleTheme: () => void; isMobile: boolean; closeMobile: () => void }) {
    const router = useRouter();
    return (
        <aside style={{
            width: collapsed ? "68px" : "240px",
            minHeight: "100vh", flexShrink: 0,
            background: "var(--color-glass-solid)",
            borderRight: "1px solid var(--color-border)",
            display: "flex", flexDirection: "column",
            transition: "width 0.25s ease",
            position: isMobile ? "fixed" : "sticky",
            top: 0, left: 0, zIndex: isMobile ? 200 : 1,
            height: "100vh", overflowY: "auto", overflowX: "hidden",
        }}>
            {/* Logo */}
            <div style={{ padding: collapsed ? "20px 0" : "20px 16px", display: "flex", alignItems: "center", gap: "10px", borderBottom: "1px solid var(--color-border)", height: "64px", justifyContent: collapsed ? "center" : "flex-start" }}>
                <img src="/logo.jpg" alt="Insight AI" style={{ width: "32px", height: "32px", borderRadius: "8px", objectFit: "cover", flexShrink: 0, display: "block" }} />
                {!collapsed && <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>Insight <span style={{ color: "#00D1FF" }}>AI</span></span>}
                {isMobile && (
                    <button onClick={closeMobile} style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                )}
            </div>

            {/* Nav items */}
            <nav className="ws-sidebar-nav" style={{ flex: 1, padding: "12px 8px", boxSizing: "border-box" }}>
                {NAV_ITEMS.map((item) => {
                    const active = activeNav === item.id;
                    return (
                        <button key={item.id} onClick={() => { setActiveNav(item.id); if (isMobile) closeMobile(); }}
                            title={collapsed ? item.label : ""}
                            style={{
                                display: "flex", alignItems: "center", gap: "12px",
                                width: "100%", padding: collapsed ? "10px 0" : "10px 12px",
                                justifyContent: collapsed ? "center" : "flex-start",
                                borderRadius: "10px", border: "none", cursor: "pointer",
                                background: active ? "rgba(0,209,255,0.1)" : "transparent",
                                color: active ? "#00D1FF" : "var(--color-text-secondary)",
                                fontSize: "0.875rem", fontWeight: active ? 600 : 400,
                                transition: "all 0.15s", marginBottom: "2px",
                                boxSizing: "border-box",
                                borderLeft: active ? "2px solid #00D1FF" : "2px solid transparent",
                            }}
                            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--color-subtle)"; e.currentTarget.style.color = "var(--color-text-primary)"; } }}
                            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; } }}
                        >
                            <span style={{ flexShrink: 0 }}>{item.icon}</span>
                            {!collapsed && <span style={{ whiteSpace: "nowrap" }}>{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            {/* Bottom: settings + theme + logout + user */}
            <div style={{ padding: "12px 8px", borderTop: "1px solid var(--color-border)" }}>
                {/* Settings */}
                <button onClick={() => { setActiveNav("settings"); if (isMobile) closeMobile(); }} title="Settings"
                    style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: collapsed ? "10px 0" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: "10px", border: "none", cursor: "pointer", background: "transparent", color: "var(--color-text-secondary)", fontSize: "0.875rem", transition: "all 0.15s", marginBottom: "4px" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-subtle)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                >
                    <span style={{ flexShrink: 0 }}>{SETTINGS_ICON}</span>
                    {!collapsed && <span style={{ whiteSpace: "nowrap" }}>Settings</span>}
                </button>

                {/* Theme toggle */}
                <button onClick={toggleTheme} title="Toggle theme"
                    style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: collapsed ? "10px 0" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: "10px", border: "none", cursor: "pointer", background: "transparent", color: "var(--color-text-secondary)", fontSize: "0.875rem", transition: "all 0.15s", marginBottom: "4px" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-subtle)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                >
                    {theme === "dark"
                        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                        : <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
                    }
                    {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
                </button>

                {/* Logout */}
                <button onClick={() => { logout(); router.push("/"); }}
                    title="Sign out"
                    style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%", padding: collapsed ? "10px 0" : "10px 12px", justifyContent: collapsed ? "center" : "flex-start", borderRadius: "10px", border: "none", cursor: "pointer", background: "transparent", color: "var(--color-text-secondary)", fontSize: "0.875rem", transition: "all 0.15s", marginBottom: "8px" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.color = "#F87171"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                    {!collapsed && <span>Sign Out</span>}
                </button>

                {/* User card */}
                {!collapsed && user && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "var(--color-subtle)", border: "1px solid var(--color-border)" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#00D1FF,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.7rem", color: "#000", flexShrink: 0 }}>{user.avatar}</div>
                        <div style={{ overflow: "hidden" }}>
                            <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{user.role}</div>
                        </div>
                    </div>
                )}
                {collapsed && user && (
                    <div style={{ display: "flex", justifyContent: "center", paddingTop: "4px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg,#00D1FF,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.7rem", color: "#000" }}>{user.avatar}</div>
                    </div>
                )}
            </div>
        </aside>
    );
}

/* ─────────── Main Page ─────────── */
export default function DashboardPage() {
    const { user, logout } = useAuth();
    const { theme, toggle } = useTheme();
    const router = useRouter();

    const [projects, setProjects] = useState<Project[]>([]);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dashboardStats, setDashboardStats] = useState({ total_datasets: 0, models_trained: 0, ready_reports: 0, processing: 0 });

    const loadDashboards = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await dashboardService.getDashboards();
            const mappedProjects: Project[] = data.dashboards.map((d: any) => ({
                id: d.id,
                name: d.dataset_filename,
                type: d.dataset_filename.split('.').pop()?.toLowerCase() || 'csv',
                model: d.problem_type === 'regression' ? 'Regression' : 'Classification',
                status: "Analysis Ready",
                rows: d.row_count,
                edited: new Date(d.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                starred: false
            }));
            setProjects(mappedProjects);
            
            try {
                const liveStats = await dashboardService.getStats();
                setDashboardStats(liveStats);
            } catch (statsErr) {
                console.error("Failed to fetch live stats", statsErr);
            }
            
        } catch (error) {
            console.error("Failed to load dashboards", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (user) loadDashboards();
    }, [user, loadDashboards]);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("All");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [activeNav, setActiveNav] = useState("home");
    const [collapsed, setCollapsed] = useState(false);
    const [mobileSidebar, setMobileSidebar] = useState(false);
    const [renameId, setRenameId] = useState<string | null>(null);
    const [renameVal, setRenameVal] = useState("");
    const [showUpload, setShowUpload] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);
    const [analysisFile, setAnalysisFile] = useState("dataset.csv");
    const [showSettings, setShowSettings] = useState(false);
    const [settingsTab, setSettingsTab] = useState("account");
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelected = useCallback((file: File) => {
        const allowed = [".csv", ".xlsx", ".xls", ".json"];
        const ext = "." + file.name.split(".").pop()!.toLowerCase();
        if (!allowed.includes(ext)) { alert("Please select a CSV, XLSX, or JSON file."); return; }
        setUploadFile(file);
        setShowUpload(false);
        setAnalysisFile(file.name);
        setShowAnalysis(true);
    }, []);

    const handleNavClick = (id: string) => {
        if (id === "settings") { setShowSettings(true); return; }
        setActiveNav(id);
    };

    /* Redirect if not logged in */
    useEffect(() => {
        const t = setTimeout(() => { if (!localStorage.getItem("insight_session")) router.push("/login"); }, 200);
        return () => clearTimeout(t);
    }, [router]);

    /* Responsive collapse */
    useEffect(() => {
        const handler = () => {
            if (window.innerWidth < 900) setCollapsed(true);
            else setCollapsed(false);
        };
        handler();
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    if (!user) return <div style={{ minHeight: "100vh", background: "var(--color-bg)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-secondary)" }}>Loading…</div>;

    /* Filtered projects */
    const filtered = projects.filter((p) => {
        const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.model.toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === "All" ? true : filter === "Starred" ? p.starred : p.type === filter;
        return matchSearch && matchFilter;
    });

    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

    const handleDelete = async (id: string) => {
        try {
            await dashboardService.deleteDashboard(id);
            setProjects((prev) => prev.filter((p) => p.id !== id));
            // Refresh stats locally without reloading full fetch payload!
            const newStats = await dashboardService.getStats();
            setDashboardStats(newStats);
        } catch (error) {
            console.error("Failed to delete dataset", error);
            alert("Failed to delete dataset. Please try again.");
        }
    };
    const handleRename = (id: string) => {
        setProjects((prev) => prev.map((p) => p.id === id ? { ...p, name: renameVal || p.name } : p));
        setRenameId(null);
    };
    const handleStar = (id: string) => setProjects((prev) => prev.map((p) => p.id === id ? { ...p, starred: !p.starred } : p));

    return (
        <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "var(--color-bg)", position: "relative" }}>

            {/* Mobile overlay */}
            {mobileSidebar && <div onClick={() => setMobileSidebar(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 199, backdropFilter: "blur(4px)" }} />}

            {/* ── Sidebar ── */}
            {/* Static sidebar (hidden on mobile via CSS) */}
            <div className="ws-sidebar-static" style={{ display: "contents" }}>
                <Sidebar
                    collapsed={collapsed}
                    activeNav={activeNav}
                    setActiveNav={handleNavClick}
                    user={user}
                    logout={logout}
                    theme={theme}
                    toggleTheme={toggle}
                    isMobile={false}
                    closeMobile={() => setMobileSidebar(false)}
                />
            </div>
            {/* Mobile overlay sidebar */}
            {mobileSidebar && (
                <Sidebar
                    collapsed={false}
                    activeNav={activeNav}
                    setActiveNav={handleNavClick}
                    user={user}
                    logout={logout}
                    theme={theme}
                    toggleTheme={toggle}
                    isMobile={true}
                    closeMobile={() => setMobileSidebar(false)}
                />
            )}
            {/* ── Main content ── */}
            <div className="ws-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", height: "100%" }}>

                {/* Top nav bar */}
                <header className="ws-header" style={{ height: "64px", borderBottom: "1px solid var(--color-border)", background: "var(--color-glass)", backdropFilter: "blur(20px)", display: "flex", alignItems: "center", padding: "0 24px", gap: "12px", position: "sticky", top: 0, zIndex: 10, flexShrink: 0 }}>
                    {/* Hamburger (mobile) */}
                    <button onClick={() => setMobileSidebar(true)} style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "4px", flexShrink: 0 }} className="hamburger-ws">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
                    </button>

                    {/* Collapse toggle (desktop) */}
                    <button onClick={() => setCollapsed(!collapsed)} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "34px", height: "34px", background: "var(--color-subtle)", border: "1px solid var(--color-border)", borderRadius: "8px", cursor: "pointer", color: "var(--color-text-secondary)", flexShrink: 0, transition: "all 0.2s" }} className="collapse-btn"
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00D1FF"; e.currentTarget.style.color = "#00D1FF"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {collapsed ? <path d="M13 17l5-5-5-5M6 17l5-5-5-5" /> : <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />}
                        </svg>
                    </button>

                    {/* Search bar */}
                    <div className="ws-search" style={{ flex: 1, maxWidth: "460px", position: "relative" }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", pointerEvents: "none" }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input
                            type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search datasets, models…"
                            style={{ width: "100%", padding: "9px 14px 9px 38px", borderRadius: "10px", background: "var(--color-subtle)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", fontSize: "0.875rem", outline: "none", transition: "all 0.2s" }}
                            onFocus={(e) => { e.target.style.borderColor = "#00D1FF"; e.target.style.boxShadow = "0 0 0 3px rgba(0,209,255,0.08)"; }}
                            onBlur={(e) => { e.target.style.borderColor = "var(--color-border)"; e.target.style.boxShadow = "none"; }}
                        />
                    </div>

                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "10px" }}>
                        {/* View toggle */}
                        <div className="ws-view-toggle" style={{ display: "flex", border: "1px solid var(--color-border)", borderRadius: "8px", overflow: "hidden" }}>
                            {(["grid", "list"] as const).map((v) => (
                                <button key={v} onClick={() => setViewMode(v)} style={{ padding: "7px 10px", background: viewMode === v ? "rgba(0,209,255,0.12)" : "transparent", border: "none", cursor: "pointer", color: viewMode === v ? "#00D1FF" : "var(--color-text-muted)", transition: "all 0.15s" }}>
                                    {v === "grid"
                                        ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
                                    }
                                </button>
                            ))}
                        </div>

                        {/* User avatar */}
                        <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg,#00D1FF,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.72rem", color: "#000", border: "2px solid rgba(0,209,255,0.3)", flexShrink: 0 }}>
                            {user.avatar}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="ws-main-content" style={{ flex: 1, padding: "32px", overflowY: "auto" }}>

                    {/* Welcome header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
                        <div>
                            {activeNav === "home" && (
                                <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "4px" }}>{greeting}, 👋</p>
                            )}
                            <h1 style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                                {activeNav === "files"
                                    ? <><span className="gradient-text">My Files</span></>
                                    : <>{activeNav === "settings" ? "Settings" : <>Welcome back, <span className="gradient-text">{user.name.split(" ")[0]}!</span></>}</>}
                            </h1>
                            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", marginTop: "6px" }}>
                                {activeNav === "files" ? `${projects.length} datasets · all your previous work` : activeNav === "home" ? "What are we analyzing today?" : ""}
                            </p>
                        </div>

                        {/* Upload CTA */}
                        <button onClick={() => setShowUpload(true)} className="cta-btn pulse-glow" style={{ padding: "12px 24px", borderRadius: "12px", fontSize: "0.925rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                Upload Dataset
                            </span>
                        </button>
                    </div>

                    {/* Stats bar */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "12px", marginBottom: "28px" }} className="stats-grid">
                        {[
                            { label: "Total Datasets", val: dashboardStats.total_datasets.toString(), icon: "📁", color: "#00D1FF" },
                            { label: "Models Trained", val: dashboardStats.models_trained.toString(), icon: "🤖", color: "#8B5CF6" },
                            { label: "Ready Reports", val: dashboardStats.ready_reports.toString(), icon: "📊", color: "#3ECF8E" },
                            { label: "Processing", val: dashboardStats.processing.toString(), icon: "⚡", color: "#F97316" },
                        ].map((s) => (
                            <div key={s.label} style={{ background: "var(--color-glass)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "16px", display: "flex", alignItems: "center", gap: "12px", backdropFilter: "blur(10px)" }}>
                                <div style={{ fontSize: "1.4rem", flexShrink: 0 }}>{s.icon}</div>
                                <div>
                                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "2px" }}>{s.label}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filter chips + count */}
                    <div className="ws-filter-bar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                            {FILTER_TAGS.map((tag) => (
                                <button key={tag} onClick={() => setFilter(tag)} style={{
                                    padding: "6px 14px", borderRadius: "100px", fontSize: "0.8rem", fontWeight: 500,
                                    cursor: "pointer", transition: "all 0.2s", border: "1px solid",
                                    background: filter === tag ? "rgba(0,209,255,0.12)" : "transparent",
                                    borderColor: filter === tag ? "rgba(0,209,255,0.4)" : "var(--color-border)",
                                    color: filter === tag ? "#00D1FF" : "var(--color-text-secondary)",
                                }}>
                                    {tag === "Starred" && "⭐ "}{tag}
                                </button>
                            ))}
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                            {filtered.length} dataset{filtered.length !== 1 ? "s" : ""}
                        </span>
                    </div>

                    {/* Project grid / list */}
                    {isLoading ? (
                        <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--color-text-muted)" }}>
                            <div style={{ width: "40px", height: "40px", border: "3px solid rgba(0,209,255,0.1)", borderTop: "3px solid #00D1FF", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
                            <div style={{ fontSize: "1rem", color: "var(--color-text-secondary)" }}>Loading your datasets...</div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--color-text-muted)" }}>
                            <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔍</div>
                            <div style={{ fontSize: "1rem", marginBottom: "6px", color: "var(--color-text-secondary)" }}>No datasets found</div>
                            <div style={{ fontSize: "0.85rem" }}>Try a different search or filter</div>
                        </div>
                    ) : viewMode === "grid" ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
                            {filtered.map((project) => (
                                <div key={project.id} className="glass-card" style={{ padding: "20px", cursor: "pointer", position: "relative", transition: "all 0.25s", overflow: "hidden" }}
                                    onClick={() => router.push('/analysis?id=' + project.id)}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(0,209,255,0.25)"; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 40px rgba(0,209,255,0.08)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>

                                    {/* Card header */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                                        <FileIcon type={project.type} />
                                        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                                            <button onClick={(e) => { e.stopPropagation(); handleStar(project.id); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem", opacity: project.starred ? 1 : 0.35, transition: "opacity 0.2s" }} title={project.starred ? "Unstar" : "Star"}>
                                                ⭐
                                            </button>
                                            <ThreeDotMenu
                                                onRename={() => { setRenameId(project.id); setRenameVal(project.name); }}
                                                onDelete={() => handleDelete(project.id)}
                                            />
                                        </div>
                                    </div>

                                    {/* File name */}
                                    {renameId === project.id ? (
                                        <form onSubmit={(e) => { e.preventDefault(); handleRename(project.id); }} style={{ marginBottom: "10px" }}>
                                            <input autoFocus value={renameVal} onChange={(e) => setRenameVal(e.target.value)} onBlur={() => handleRename(project.id)}
                                                style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #00D1FF", background: "var(--color-subtle)", color: "var(--color-text-primary)", fontSize: "0.875rem", outline: "none" }} />
                                        </form>
                                    ) : (
                                        <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text-primary)", marginBottom: "10px", wordBreak: "break-word" }}>{project.name}</div>
                                    )}

                                    {/* Mini chart preview */}
                                    <div style={{ height: "44px", marginBottom: "12px", display: "flex", alignItems: "flex-end", gap: "3px", padding: "0 2px" }}>
                                        {[55, 70, 45, 80, 60, 90, 50, 75, 65, 85].map((h, i) => (
                                            <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "2px 2px 0 0", background: i >= 8 ? MODEL_COLOR[project.model] ?? "#00D1FF" : `${MODEL_COLOR[project.model] ?? "#00D1FF"}30`, transition: "height 0.3s" }} />
                                        ))}
                                    </div>

                                    {/* Badges row */}
                                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                                        <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "3px 9px", borderRadius: "100px", background: `${MODEL_COLOR[project.model] ?? "#00D1FF"}14`, border: `1px solid ${MODEL_COLOR[project.model] ?? "#00D1FF"}30`, color: MODEL_COLOR[project.model] ?? "#00D1FF" }}>
                                            {project.model}
                                        </span>
                                        <span style={{ fontSize: "0.7rem", fontWeight: 500, padding: "3px 9px", borderRadius: "100px", background: STATUS_STYLES[project.status].bg, border: `1px solid ${STATUS_STYLES[project.status].border}`, color: STATUS_STYLES[project.status].color }}>
                                            {project.status}
                                        </span>
                                    </div>

                                    {/* Footer */}
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--color-border)", paddingTop: "12px" }}>
                                        <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{project.rows.toLocaleString()} rows</span>
                                        <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>📅 {project.edited}</span>
                                    </div>
                                </div>
                            ))}

                            {/* Add new card */}
                            <button onClick={() => setShowUpload(true)} style={{
                                border: "2px dashed var(--color-border)", borderRadius: "12px", padding: "20px",
                                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                                gap: "10px", cursor: "pointer", background: "transparent", transition: "all 0.2s",
                                minHeight: "200px",
                            }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00D1FF"; e.currentTarget.style.background = "rgba(0,209,255,0.04)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.background = "transparent"; }}>
                                <div style={{ width: "44px", height: "44px", borderRadius: "12px", background: "rgba(0,209,255,0.08)", border: "1px solid rgba(0,209,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                </div>
                                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#00D1FF" }}>New Dataset</div>
                                <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>Upload & analyze</div>
                            </button>
                        </div>
                    ) : (
                        /* List view */
                        <div style={{ background: "var(--color-glass)", border: "1px solid var(--color-border)", borderRadius: "12px", overflow: "hidden", backdropFilter: "blur(10px)" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                <thead>
                                    <tr style={{ background: "var(--color-subtle)" }}>
                                        {["File", "Model", "Status", "Rows", "Last Edited", ""].map((h) => (
                                            <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: "0.72rem", fontWeight: 600, color: "var(--color-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid var(--color-border)" }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((p, i) => (
                                        <tr key={p.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid var(--color-border)" : "none", transition: "background 0.15s", cursor: "pointer" }}
                                            onClick={() => router.push('/analysis?id=' + p.id)}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-subtle)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                                            <td style={{ padding: "13px 16px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                    <FileIcon type={p.type} />
                                                    <div>
                                                        <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "var(--color-text-primary)" }}>{p.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: "13px 16px" }}><span style={{ fontSize: "0.78rem", padding: "3px 9px", borderRadius: "100px", background: `${MODEL_COLOR[p.model] ?? '#00D1FF'}14`, color: MODEL_COLOR[p.model] ?? '#00D1FF', border: `1px solid ${MODEL_COLOR[p.model] ?? '#00D1FF'}30` }}>{p.model}</span></td>
                                            <td style={{ padding: "13px 16px" }}><span style={{ fontSize: "0.78rem", padding: "3px 9px", borderRadius: "100px", background: STATUS_STYLES[p.status].bg, color: STATUS_STYLES[p.status].color, border: `1px solid ${STATUS_STYLES[p.status].border}` }}>{p.status}</span></td>
                                            <td style={{ padding: "13px 16px", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{p.rows.toLocaleString()}</td>
                                            <td style={{ padding: "13px 16px", fontSize: "0.82rem", color: "var(--color-text-muted)" }}>{p.edited}</td>
                                            <td style={{ padding: "13px 16px" }}>
                                                <ThreeDotMenu onRename={() => { setRenameId(p.id); setRenameVal(p.name); }} onDelete={() => handleDelete(p.id)} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </div>

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.json"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f); e.target.value = ""; }}
            />

            {/* Upload Dataset Modal */}
            {showUpload && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={() => setShowUpload(false)}>
                    <div className="glass-card" style={{ maxWidth: "480px", width: "100%", padding: "40px", boxShadow: "var(--shadow-card)", animation: "fadeInUp 0.3s ease" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ textAlign: "center", marginBottom: "28px" }}>
                            <div style={{ width: "60px", height: "60px", borderRadius: "16px", background: "linear-gradient(135deg,#00D1FF,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 0 30px rgba(0,209,255,0.3)" }}>
                                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                            </div>
                            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "8px" }}>Upload Dataset</h2>
                            <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>Drag and drop your file, or click to browse</p>
                        </div>

                        {/* Drop zone */}
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={(e) => {
                                e.preventDefault(); setIsDragging(false);
                                const f = e.dataTransfer.files?.[0];
                                if (f) handleFileSelected(f);
                            }}
                            style={{
                                border: isDragging ? "2px dashed #00D1FF" : "2px dashed rgba(0,209,255,0.3)",
                                borderRadius: "12px", padding: "40px", textAlign: "center", marginBottom: "20px",
                                background: isDragging ? "rgba(0,209,255,0.1)" : "rgba(0,209,255,0.04)",
                                cursor: "pointer", transition: "all 0.2s",
                            }}
                            onMouseEnter={(e) => { if (!isDragging) { e.currentTarget.style.borderColor = "#00D1FF"; e.currentTarget.style.background = "rgba(0,209,255,0.07)"; } }}
                            onMouseLeave={(e) => { if (!isDragging) { e.currentTarget.style.borderColor = "rgba(0,209,255,0.3)"; e.currentTarget.style.background = "rgba(0,209,255,0.04)"; } }}
                        >
                            <div style={{ fontSize: "2rem", marginBottom: "8px" }}>{isDragging ? "⬇️" : "📂"}</div>
                            <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "4px" }}>
                                {isDragging ? "Release to upload" : "Drop your file here"}
                            </div>
                            <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>CSV, XLSX, JSON — up to 500 MB</div>
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={() => setShowUpload(false)} className="ghost-btn" style={{ flex: 1, padding: "11px", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer" }}>Cancel</button>
                            <button className="cta-btn" style={{ flex: 2, padding: "11px", borderRadius: "10px", fontSize: "0.9rem", cursor: "pointer" }}
                                onClick={() => fileInputRef.current?.click()}>
                                <span>Browse Files</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── AI Processing Modal ── */}
            {showAnalysis && (
                <AIProcessingModal
                    file={uploadFile}
                    onClose={() => setShowAnalysis(false)}
                    onGenerate={async ({ modelType, targetLabel }) => {
                        if (!uploadFile) return null;
                        try {
                            const problemType = (modelType === 'timeseries' || modelType === 'supervised') ? 'regression' : 'classification';
                            const finalTarget = (targetLabel === "No Target Label" || !targetLabel) ? "" : targetLabel;
                            
                            const response = await uploadService.createDashboard(
                                uploadFile,
                                uploadFile.name.replace(/\.[^/.]+$/, ""),
                                finalTarget,
                                problemType,
                                ""
                            );
                            // Do not close or navigate here! Return the payload to the modal for Stage E.
                            return response;
                        } catch (error: any) {
                            console.error("Upload failed:", error);
                            alert(error.message || "Failed to create dashboard");
                            throw error;
                        }
                    }}
                    onComplete={(dashboard_id: string) => {
                        setShowAnalysis(false);
                        router.push(`/analysis?id=${dashboard_id}`);
                    }}
                />
            )}

            {/* ── Settings Modal ── */}
            {showSettings && (
                <div onClick={() => { setShowSettings(false); setDeleteConfirm(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
                    <div onClick={(e) => e.stopPropagation()} className="settings-modal-inner" style={{ width: "100%", maxWidth: "760px", maxHeight: "88vh", background: "var(--color-glass-solid)", border: "1px solid var(--color-border)", borderRadius: "16px", display: "flex", overflow: "hidden", boxShadow: "0 32px 100px rgba(0,0,0,0.5)", animation: "fadeInUp 0.25s ease" }}>

                        {/* Left panel */}
                        <div className="settings-modal-left" style={{ width: "220px", flexShrink: 0, borderRight: "1px solid var(--color-border)", padding: "24px 12px", display: "flex", flexDirection: "column", background: "var(--color-subtle)" }}>
                            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 6px 8px" }}>Settings</h2>
                            <p style={{ fontSize: "0.75rem", color: "#00D1FF", margin: "0 0 20px 8px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</p>

                            {/* Account group */}
                            {[{ id: "account", label: "Account", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
                            { id: "billing", label: "Billing", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> },
                            ].map((tab) => (
                                <button key={tab.id} onClick={() => setSettingsTab(tab.id)} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "9px 12px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "0.875rem", fontWeight: settingsTab === tab.id ? 600 : 400, background: settingsTab === tab.id ? "rgba(0,209,255,0.1)" : "transparent", color: settingsTab === tab.id ? "#00D1FF" : "var(--color-text-secondary)", transition: "all 0.15s", textAlign: "left", marginBottom: "2px" }}
                                    onMouseEnter={(e) => { if (settingsTab !== tab.id) { e.currentTarget.style.background = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-primary)"; } }}
                                    onMouseLeave={(e) => { if (settingsTab !== tab.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; } }}>
                                    {tab.icon} {tab.label}
                                </button>
                            ))}


                        </div>

                        {/* Right panel */}
                        <div style={{ flex: 1, padding: "32px", overflowY: "auto", position: "relative" }}>
                            {/* Close button */}
                            <button onClick={() => { setShowSettings(false); setDeleteConfirm(false); }} style={{ position: "absolute", top: "20px", right: "20px", width: "32px", height: "32px", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-subtle)", color: "var(--color-text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F87171"; e.currentTarget.style.color = "#F87171"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                            </button>

                            {settingsTab === "account" && (
                                <>
                                    {/* Profile section */}
                                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>Profile</p>
                                    <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "32px" }}>
                                        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg,#00D1FF,#8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "1.1rem", color: "#000", flexShrink: 0, boxShadow: "0 0 24px rgba(0,209,255,0.35)" }}>
                                            {user.avatar}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{user.name}</div>
                                            <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "2px" }}>{user.role}</div>
                                        </div>
                                    </div>

                                    {/* Personal info */}
                                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "14px" }}>Personal Info</p>
                                    <div style={{ background: "var(--color-subtle)", border: "1px solid var(--color-border)", borderRadius: "12px", overflow: "hidden", marginBottom: "28px" }}>
                                        {[{ label: "Full Name", value: user.name }, { label: "Email", value: user.email }].map((row, i, arr) => (
                                            <div key={row.label} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: i < arr.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                                                <span style={{ width: "110px", fontSize: "0.82rem", color: "var(--color-text-muted)", flexShrink: 0 }}>{row.label}</span>
                                                <span style={{ fontSize: "0.875rem", color: "var(--color-text-primary)", fontWeight: 500 }}>{row.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Logout */}
                                    <button onClick={() => { logout(); setShowSettings(false); router.push("/"); }} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#F87171", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, transition: "all 0.2s", marginBottom: "32px" }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.5)"; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.3)"; }}>
                                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                        Log Out
                                    </button>

                                    {/* Deactivate */}
                                    <p style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>Deactivate</p>
                                    <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginBottom: "12px" }}>Permanently delete my account and all data.</p>
                                    {!deleteConfirm ? (
                                        <button onClick={() => setDeleteConfirm(true)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 18px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#F87171", cursor: "pointer", fontSize: "0.875rem", fontWeight: 600, transition: "all 0.2s" }}
                                            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.15)"; }}
                                            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(239,68,68,0.08)"; }}>
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></svg>
                                            Delete my account
                                        </button>
                                    ) : (
                                        <div style={{ padding: "14px 16px", borderRadius: "10px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                            <p style={{ fontSize: "0.85rem", color: "#F87171", marginBottom: "12px", fontWeight: 500 }}>⚠️ Are you sure? This cannot be undone.</p>
                                            <div style={{ display: "flex", gap: "8px" }}>
                                                <button onClick={() => setDeleteConfirm(false)} style={{ padding: "8px 14px", borderRadius: "7px", border: "1px solid var(--color-border)", background: "transparent", color: "var(--color-text-secondary)", cursor: "pointer", fontSize: "0.82rem" }}>Cancel</button>
                                                <button onClick={() => { logout(); setShowSettings(false); router.push("/"); }} style={{ padding: "8px 14px", borderRadius: "7px", border: "none", background: "#EF4444", color: "#fff", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>Yes, delete</button>
                                            </div>
                                        </div>
                                    )}

                                    <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "32px" }}>v1.0.0 · Insight AI</p>
                                </>
                            )}

                            {settingsTab === "billing" && (
                                <div style={{ textAlign: "center", padding: "48px 0" }}>
                                    <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>💳</div>
                                    <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "6px" }}>Free Plan</p>
                                    <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>You are on the free tier. Upgrade for unlimited datasets and priority AI processing.</p>
                                    <button className="cta-btn" style={{ marginTop: "20px", padding: "11px 28px", borderRadius: "10px", cursor: "pointer" }}><span>Upgrade to Pro</span></button>
                                </div>
                            )}

                            {settingsTab === "org" && (
                                <div style={{ textAlign: "center", padding: "48px 0" }}>
                                    <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🏢</div>
                                    <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "6px" }}>Organization Settings</p>
                                    <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Invite team members and manage roles. Available on the Pro plan.</p>
                                </div>
                            )}

                            {settingsTab === "connectors" && (
                                <div style={{ textAlign: "center", padding: "48px 0" }}>
                                    <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🔗</div>
                                    <p style={{ fontSize: "1rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "6px" }}>Data Connectors</p>
                                    <p style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>Connect Google Sheets, BigQuery, Snowflake, and more. Coming soon.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        /* ── Sidebar nav: lock padding so it always matches bottom section ── */
        .ws-sidebar-nav {
          padding: 12px 8px !important;
          box-sizing: border-box !important;
        }

        /* ── Tablet (iPad): collapse sidebar to icons, 2-col grid ── */
        @media (max-width: 1024px) {
          .collapse-btn { display: none !important; }
        }

        /* ── Mobile (768px): hamburger, sidebar as overlay ── */
        @media (max-width: 768px) {
          .hamburger-ws  { display: flex !important; }
          .collapse-btn  { display: none !important; }

          /* Don't hide sidebar entirely — it's a fixed overlay when mobileSidebar=true */
          aside.ws-sidebar-static { display: none !important; }

          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .ws-main-content { padding: 20px 16px !important; }
          .ws-header { padding: 0 16px !important; }
          .ws-search { max-width: 180px !important; }
          .ws-view-toggle { display: none !important; }
          .ws-welcome-title { font-size: 1.4rem !important; }
          .ws-upload-btn span { font-size: 0 !important; }
          .ws-upload-btn svg { margin: 0 !important; }
          .ws-upload-btn { padding: 10px 14px !important; border-radius: 10px !important; }
        }

        /* ── Small mobile (480px): 1-col grid ── */
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr !important; }
          .ws-main-content { padding: 16px 12px !important; }
          .ws-search { display: none !important; }
          .ws-filter-bar { gap: 6px !important; }
          .ws-filter-chip { padding: 5px 10px !important; font-size: 0.75rem !important; }
          .ws-project-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
        </div>
    );
}
