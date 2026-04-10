"use client";
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../../context/ThemeContext";
import DynamicChartRenderer from '@/components/DynamicChartRenderer';
import { analysisService } from '@/services/analysisService';
import { queryService } from '@/services/queryService';
import { useSearchParams } from 'next/navigation';

import { BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, AreaChart, Area, Cell, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, ComposedChart, Sector, LabelList } from 'recharts';

/* ════════════════════════════════════
   THEME PREVIEWS (for design menu)
════════════════════════════════════ */
const THEME_PREVIEWS: Record<string, { bg: string, color: string, dots: string[] }> = {
    default: { bg: "#DCDDFA", color: "#637BF2", dots: ["#FFFFFF", "#637BF2", "#A3D39C"] },
    energetic: { bg: "#51E1A3", color: "#0B2638", dots: ["#FFFFFF", "#D2F4E8", "#0B2638"] },
    professional: { bg: "#023467", color: "#FFFFFF", dots: ["#FFFFFF", "#B89679", "#007AB8"] },
    dark: { bg: "#1B2E42", color: "#4A90E2", dots: ["#3E658C", "#F5A623", "#FFFFFF"] },
    business: { bg: "#507A7C", color: "#FDEBBA", dots: ["#FFFFFF", "#E8DFCA", "#80A89A"] },
    minimalist: { bg: "#E3E0DE", color: "#2B3A4A", dots: ["#C0C0C0", "#808080", "#4D4D4D"] },
    corporate: { bg: "#232323", color: "#FFFFFF", dots: ["#FFFFFF", "#BAE2FF", "#85BAE5"] },
    creative: { bg: "#CFBFFF", color: "#FFFFFF", dots: ["#E2DAFF", "#C5E6FF", "#A7F6E9"] },
};

/* ════════════════════════════════════
   COLOR THEMES (for charts)
════════════════════════════════════ */
const COLOR_THEMES: Record<string, { primary: string; secondary: string; positive: string; negative: string; label: string; bg: string }> = {
    default: { label: "Default", bg: "#EFF6FF", primary: "#3B82F6", secondary: "#93C5FD", positive: "#06B6D4", negative: "#F87171" },
    energetic: { label: "Energetic", bg: "#ECFDF5", primary: "#10B981", secondary: "#6EE7B7", positive: "#34D399", negative: "#F87171" },
    professional: { label: "Professional", bg: "#1E293B", primary: "#4A90D9", secondary: "#1E3A5F", positive: "#38BDF8", negative: "#F97316" },
    dark: { label: "Dark", bg: "#0F172A", primary: "#F97316", secondary: "#7C3AED", positive: "#FB923C", negative: "#818CF8" },
    business: { label: "Business", bg: "#FFFBEB", primary: "#D97706", secondary: "#F59E0B", positive: "#10B981", negative: "#EF4444" },
    minimalist: { label: "Minimalist", bg: "#F9FAFB", primary: "#6B7280", secondary: "#D1D5DB", positive: "#4B5563", negative: "#9CA3AF" },
    corporate: { label: "Corporate", bg: "#FAF5FF", primary: "#7C3AED", secondary: "#A78BFA", positive: "#2DD4BF", negative: "#F87171" },
    creative: { label: "Creative", bg: "#FDF2F8", primary: "#EC4899", secondary: "#8B5CF6", positive: "#06B6D4", negative: "#F97316" },
};
type ThemeKey = keyof typeof COLOR_THEMES;

/* ════════════════════════════════════
   DATA
════════════════════════════════════ */
const REGIONS = [
    { name: "North", revenue: 397400, units: 3900 },
    { name: "East", revenue: 361100, units: 3610 },
    { name: "West", revenue: 336800, units: 3410 },
    { name: "South", revenue: 317800, units: 3190 },
];

const MOM = [
    { m: "Jan", delta: 125000 }, { m: "Feb", delta: -27000 }, { m: "Mar", delta: -8200 },
    { m: "Apr", delta: 28100 }, { m: "May", delta: -30900 }, { m: "Jun", delta: 15700 },
    { m: "Jul", delta: -6300 }, { m: "Aug", delta: 33100 }, { m: "Sep", delta: 15100 },
    { m: "Oct", delta: -9800 }, { m: "Nov", delta: -600 }, { m: "Dec", delta: 126200 },
];

const MONTHLY_TABLE = [
    { month: "1/1/2025", rev: 125000, units: 1200, revN: "61.0%", unitsN: "52.0%", callout: 0 },
    { month: "2/1/2025", rev: 98000, units: 980, revN: "0.0%", unitsN: "0.0%", callout: 1 },
    { month: "3/1/2025", rev: 110500, units: 1100, revN: "28.0%", unitsN: "29.0%", callout: 1 },
    { month: "4/1/2025", rev: 102300, units: 1050, revN: "10.0%", unitsN: "17.0%", callout: 1 },
    { month: "5/1/2025", rev: 130400, units: 1300, revN: "74.0%", unitsN: "76.0%", callout: 0 },
    { month: "6/1/2025", rev: 99500, units: 1000, revN: "3.0%", unitsN: "5.0%", callout: 1 },
    { month: "7/1/2025", rev: 115200, units: 1150, revN: "39.0%", unitsN: "40.0%", callout: 0 },
    { month: "8/1/2025", rev: 108900, units: 1090, revN: "20.0%", unitsN: "26.0%", callout: 0 },
    { month: "9/1/2025", rev: 142000, units: 1400, revN: "100.0%", unitsN: "100.0%", callout: 1 },
    { month: "10/1/2025", rev: 120300, units: 1210, revN: "51.0%", unitsN: "55.0%", callout: 0 },
    { month: "11/1/2025", rev: 133400, units: 1360, revN: "83.0%", unitsN: "90.0%", callout: 1 },
    { month: "12/1/2025", rev: 125600, units: 1270, revN: "63.0%", unitsN: "69.0%", callout: 0 },
];

const KPI_CARDS = [
    { label: "Model Accuracy", value: "92.4%", sub: "+3.1% from baseline", icon: "🎯" },
    { label: "Total Records", value: "45,000", sub: "Processed & cleaned", icon: "📦" },
    { label: "Avg Confidence", value: "88.7%", sub: "Per prediction", icon: "✅" },
    { label: "Detected Task", value: "Regression", sub: "Supervised learning", icon: "🤖" },
];

const KEY_INSIGHTS = [
    "Revenue is dominated by North and East, with North alone contributing about $397K.",
    "Units Sold correlate strongly with Revenue (r ≈ 0.99) across all regions.",
    "Revenue peaks in September ($142K) and troughs in February ($98K).",
    "Several months show Revenue Callout = 1, signaling statistical outliers.",
    "Month-over-month variance swings between −$30.9K (May) and +$126.2K (Dec).",
];

const PRODUCTS = [
    { name: "Widget Pro", revenue: 285000, units: 2800 },
    { name: "Gadget X", revenue: 215000, units: 2100 },
    { name: "Sensor V2", revenue: 198000, units: 1950 },
    { name: "Module Z", revenue: 168000, units: 1700 },
    { name: "Adapter Q", revenue: 142000, units: 1400 },
    { name: "Cable Plus", revenue: 105000, units: 1050 },
];

const LOCATIONS = [
    { name: "North America", value: 38, color: "#7C3AED" },
    { name: "Europe", value: 27, color: "#3B82F6" },
    { name: "Asia Pacific", value: 22, color: "#10B981" },
    { name: "Other", value: 13, color: "#F59E0B" },
];

const CATEGORIES = [
    { name: "Electronics", revenue: 420000, returns: 18200 },
    { name: "Hardware", revenue: 345000, returns: 12800 },
    { name: "Accessories", revenue: 278000, returns: 22100 },
    { name: "Software", revenue: 198000, returns: 5200 },
];

const MONTHLY_MIX = [
    { month: "Jan", north: 38, east: 28, west: 20, south: 14 },
    { month: "Feb", north: 35, east: 30, west: 21, south: 14 },
    { month: "Mar", north: 40, east: 26, west: 19, south: 15 },
    { month: "Apr", north: 37, east: 29, west: 22, south: 12 },
    { month: "May", north: 33, east: 31, west: 23, south: 13 },
    { month: "Jun", north: 36, east: 27, west: 24, south: 13 },
    { month: "Jul", north: 39, east: 25, west: 20, south: 16 },
    { month: "Aug", north: 34, east: 30, west: 22, south: 14 },
    { month: "Sep", north: 41, east: 26, west: 18, south: 15 },
    { month: "Oct", north: 36, east: 28, west: 23, south: 13 },
    { month: "Nov", north: 38, east: 27, west: 21, south: 14 },
    { month: "Dec", north: 42, east: 24, west: 19, south: 15 },
];

const CUSTOMER_SEGMENTS = [
    { segment: "Enterprise", customers: 245, avgValue: "$12,400", ltv: "$186,000", growth: "+14.2%" },
    { segment: "Mid-Market", customers: 890, avgValue: "$4,200", ltv: "$50,400", growth: "+8.7%" },
    { segment: "SMB", customers: 2340, avgValue: "$1,100", ltv: "$13,200", growth: "+22.1%" },
    { segment: "Startup", customers: 1560, avgValue: "$680", ltv: "$8,160", growth: "+31.5%" },
];

const OVERVIEW_TEXT = "This report analyzes key sales, product, and customer metrics to provide actionable insights. The dataset covers 45,000 records across multiple regions, product lines, and customer segments. Key performance indicators reveal strong revenue growth with a model accuracy of 92.4%.";

const BRAND_INSIGHTS = [
    "Revenue growth is strongest in Q4, driven by holiday demand and enterprise contract renewals.",
    "North region consistently outperforms other segments, contributing 28% of total revenue.",
    "Electronics category shows the highest revenue ($420K) but Accessories has the highest return rate.",
    "Customer acquisition is accelerating, with Startup segment growing at 31.5% YoY.",
    "Month-over-month variance shows seasonal patterns with December as the strongest month (+$126.2K).",
];

const fmtDollar = (n: number) => `$${n.toLocaleString()}.00`;
const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);

/* ════════════════════════════════════
   UNIVERSAL TOOLTIP FOR RECHARTS
════════════════════════════════════ */
const UniversalTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
        return (
            <div style={{ background: "rgba(15,15,35,0.95)", backdropFilter: "blur(8px)", border: `1.5px solid ${(payload[0].payload?.fill || payload[0].color || "#fff")}55`, borderRadius: "10px", padding: "10px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 1000 }}>
                {label && <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", fontFamily: "Inter,sans-serif", marginBottom: "6px", fontWeight: 600 }}>{label}</div>}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {payload.map((p: any, i: number) => {
                        let valStr = String(p.value);
                        if (formatter) {
                            valStr = formatter(p.value, p.name, p);
                        } else {
                            if (typeof p.value === "number") {
                                if (p.value > 1000) valStr = (p.name.toLowerCase().includes("revenue") || p.name.toLowerCase().includes("returns") || String(p.formatter).includes("$")) ? `$${(p.value/1000).toFixed(1)}K` : p.value.toLocaleString();
                                else valStr = p.value.toLocaleString();
                            }
                        }
                        
                        return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: p.color || p.payload?.fill || "#fff", flexShrink: 0 }} />
                                <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.8)", fontFamily: "Inter,sans-serif", flex: 1 }}>{p.name}</span>
                                <span style={{ fontSize: "0.95rem", color: "#fff", fontWeight: 700, fontFamily: "Inter,sans-serif", marginLeft: "10px" }}>{valStr}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }
    return null;
};

/* ════════════════════════════════════
   CHART TYPE TOGGLE OVERLAY
════════════════════════════════════ */
function ChartTypeToggle({ currentType, types, onChange }: { currentType: string, types: string[], onChange: (type: string) => void }) {
    if (types.length <= 1) return null;
    return (
        <div style={{ position: "absolute", top: 0, right: 0, zIndex: 50, display: "flex", alignItems: "center", gap: "2px", background: "var(--color-surface)", borderRadius: "6px", padding: "2px", border: "1px solid var(--color-border)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <button onClick={() => onChange(types[(types.indexOf(currentType) - 1 + types.length) % types.length])} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "2px 4px", borderRadius: "4px", display: "flex" }} onMouseEnter={e => e.currentTarget.style.color = "var(--color-text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-secondary)"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-primary)", textTransform: "capitalize", minWidth: "40px", textAlign: "center", display: "inline-block", userSelect: "none" }}>{currentType}</span>
            <button onClick={() => onChange(types[(types.indexOf(currentType) + 1) % types.length])} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "2px 4px", borderRadius: "4px", display: "flex" }} onMouseEnter={e => e.currentTarget.style.color = "var(--color-text-primary)"} onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-secondary)"}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
        </div>
    );
}

/* ════════════════════════════════════
   GROUPED BAR CHART
════════════════════════════════════ */
function GroupedBarChart({ theme }: { theme: typeof COLOR_THEMES[ThemeKey] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar");

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "0" }}>
            <ChartTypeToggle currentType={chartType} types={["bar", "line", "area"]} onChange={(t) => setChartType(t as any)} />
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={REGIONS} margin={{ top: 28, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} dy={10} />
                    <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.45 }} tickFormatter={v => v===0 ? "0" : `${v/1000}K`} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: theme.secondary, opacity: 0.8 }} tickFormatter={v => v===0 ? "0" : `${v/1000}K`} />
                    <RechartsTooltip content={<UniversalTooltip />} cursor={{ fill: "rgba(128,128,128,0.05)" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", opacity: 0.8 }} />
                    
                    {chartType === "bar" && (
                        <>
                            <Bar yAxisId="left" dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} barSize={24} onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
                                {REGIONS.map((_, index) => <Cell key={`cell-${index}`} fill={theme.primary} fillOpacity={activeIndex === index || activeIndex === null ? 1 : 0.3} style={{ transition: "all 0.3s" }} cursor="pointer" />)}
                            </Bar>
                            <Bar yAxisId="right" dataKey="units" name="Units Sold" radius={[4, 4, 0, 0]} barSize={24} onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
                                {REGIONS.map((_, index) => <Cell key={`cell-${index}`} fill={theme.secondary} fillOpacity={activeIndex === index || activeIndex === null ? 1 : 0.3} style={{ transition: "all 0.3s" }} cursor="pointer" />)}
                            </Bar>
                        </>
                    )}
                    {chartType === "line" && (
                        <>
                            <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke={theme.primary} strokeWidth={3} dot={{ r: 4, fill: theme.primary }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            <Line yAxisId="right" type="monotone" dataKey="units" name="Units Sold" stroke={theme.secondary} strokeWidth={3} dot={{ r: 4, fill: theme.secondary }} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </>
                    )}
                    {chartType === "area" && (
                        <>
                            <Area yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" fill={theme.primary} stroke={theme.primary} fillOpacity={0.4} strokeWidth={2} />
                            <Area yAxisId="right" type="monotone" dataKey="units" name="Units Sold" fill={theme.secondary} stroke={theme.secondary} fillOpacity={0.4} strokeWidth={2} />
                        </>
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ════════════════════════════════════
   WATERFALL CHART
════════════════════════════════════ */
function WaterfallChart({ theme }: { theme: typeof COLOR_THEMES[ThemeKey] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const cumulative = MOM.reduce((acc, m, i) => { acc.push((acc[i - 1] ?? 120000) + m.delta); return acc; }, [] as number[]);
    const waterfallData = MOM.map((m, i) => {
        const prev = i === 0 ? 120000 : cumulative[i - 1];
        const curr = prev + m.delta;
        const base = Math.min(prev, curr);
        const value = Math.abs(m.delta);
        const isPos = m.delta >= 0;
        return { name: m.m, base, value, isPos, rawDelta: m.delta };
    });

    return (
        <div style={{ width: "100%", height: "100%", minHeight: "0" }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={waterfallData} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.45 }} tickFormatter={v => `${v/1000}K`} domain={["auto", "auto"]} />
                    <RechartsTooltip content={<UniversalTooltip formatter={(val: any, name: any, props: any) => `${props.payload.isPos ? "+" : ""}${fmt(props.payload.rawDelta)}`} />} cursor={{ fill: "rgba(128,128,128,0.05)" }} />
                    <Bar dataKey="base" stackId="a" fill="transparent" />
                    <Bar dataKey="value" name="Delta" stackId="a" radius={3} barSize={34}
                         onMouseEnter={(_, index) => setActiveIndex(index)} 
                         onMouseLeave={() => setActiveIndex(null)}>
                        {waterfallData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.isPos ? theme.positive : theme.negative} fillOpacity={activeIndex === index || activeIndex === null ? 1 : 0.4} style={{ transition: "all 0.3s" }} cursor="pointer" />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
            <div style={{ position: "absolute", bottom: 4, left: 0, right: 0, display: "flex", justifyContent: "center", gap: "16px", zIndex: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: theme.positive }} />
                    <span style={{ fontSize: "11px", color: "currentColor", opacity: 0.6, fontFamily: "Inter,sans-serif" }}>Positive</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "10px", height: "10px", borderRadius: "2px", background: theme.negative }} />
                    <span style={{ fontSize: "11px", color: "currentColor", opacity: 0.6, fontFamily: "Inter,sans-serif" }}>Negative</span>
                </div>
            </div>
        </div>
    );
}


/* ════════════════════════════════════
   PIE / DONUT CHART — Customer Distribution
════════════════════════════════════ */
function PieChart() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [chartType, setChartType] = useState<"donut" | "pie">("donut");

    return (
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", minHeight: "0" }}>
            <ChartTypeToggle currentType={chartType} types={["donut", "pie"]} onChange={(t) => setChartType(t as any)} />
            <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart margin={{ top: 20, right: 10, left: 10, bottom: 10 }}>
                    <Pie data={LOCATIONS} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={chartType === "donut" ? 50 : 0} outerRadius={80} paddingAngle={2}
                         onMouseEnter={(_, index) => setActiveIndex(index)} 
                         onMouseLeave={() => setActiveIndex(null)}>
                        {LOCATIONS.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" fillOpacity={activeIndex === index || activeIndex === null ? 1 : 0.3} style={{ transition: "all 0.3s", filter: activeIndex === index ? `drop-shadow(0 4px 12px ${entry.color}88)` : "none" }} cursor="pointer" />
                        ))}
                    </Pie>
                    <RechartsTooltip content={<UniversalTooltip formatter={(v: any) => v + "%"} />} />
                    <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: "11px", opacity: 0.8 }} iconType="rect" />
                </RechartsPieChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ════════════════════════════════════
   PRODUCT BAR CHART — Revenue Share By Product
════════════════════════════════════ */
function ProductBarChart({ theme }: { theme: typeof COLOR_THEMES[ThemeKey] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [chartType, setChartType] = useState<"horizontal bar" | "line" | "area">("horizontal bar");

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "0", minWidth: 200 }}>
            <ChartTypeToggle currentType={chartType} types={["horizontal bar", "line", "area"]} onChange={(t) => setChartType(t as any)} />
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart layout="vertical" data={PRODUCTS} margin={{ top: 28, right: 30, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(128,128,128,0.15)" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }} width={80} />
                    <RechartsTooltip content={<UniversalTooltip />} cursor={{ fill: "rgba(128,128,128,0.05)" }} />
                    {chartType === "horizontal bar" && (
                        <Bar dataKey="revenue" name="Revenue" radius={[0, 4, 4, 0]} barSize={16} onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
                            {PRODUCTS.map((_, index) => <Cell key={`cell-${index}`} fill={theme.primary} fillOpacity={activeIndex === index || activeIndex === null ? 1 : 0.3} style={{ transition: "all 0.3s" }} cursor="pointer" />)}
                        </Bar>
                    )}
                    {chartType === "line" && (
                        <Line type="monotone" dataKey="revenue" name="Revenue" stroke={theme.primary} strokeWidth={3} dot={{ r: 4, fill: theme.primary }} activeDot={{ r: 6, strokeWidth: 0 }} />
                    )}
                    {chartType === "area" && (
                        <Area type="monotone" dataKey="revenue" name="Revenue" fill={theme.primary} stroke={theme.primary} fillOpacity={0.4} strokeWidth={2} />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ════════════════════════════════════
   PRICE CHART — Individual Price By Product
════════════════════════════════════ */
function PriceChart({ theme }: { theme: typeof COLOR_THEMES[ThemeKey] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [chartType, setChartType] = useState<"horizontal bar" | "line" | "area">("horizontal bar");
    const data = PRODUCTS.map(p => ({
        name: p.name,
        price: Number((p.revenue / p.units).toFixed(0))
    }));

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "0", minWidth: 200 }}>
            <ChartTypeToggle currentType={chartType} types={["horizontal bar", "line", "area"]} onChange={(t) => setChartType(t as any)} />
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart layout="vertical" data={data} margin={{ top: 28, right: 50, left: 20, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(128,128,128,0.15)" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.7 }} width={80} />
                    <RechartsTooltip content={<UniversalTooltip formatter={(val: any) => `$${val}`} />} cursor={{ fill: "rgba(128,128,128,0.05)" }} />
                    {chartType === "horizontal bar" && (
                        <Bar dataKey="price" name="Avg Price" radius={[0, 4, 4, 0]} barSize={16} onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
                            {data.map((_, index) => <Cell key={`cell-${index}`} fill={theme.secondary} fillOpacity={activeIndex === index || activeIndex === null ? 1 : 0.3} style={{ transition: "all 0.3s" }} cursor="pointer" />)}
                            <LabelList dataKey="price" position="right" formatter={(v: any) => `$${v}`} style={{ fontSize: "11px", fontWeight: 700, fill: theme.secondary }} />
                        </Bar>
                    )}
                    {chartType === "line" && (
                        <Line type="monotone" dataKey="price" name="Avg Price" stroke={theme.secondary} strokeWidth={3} dot={{ r: 4, fill: theme.secondary }} activeDot={{ r: 6, strokeWidth: 0 }}>
                            <LabelList dataKey="price" position="top" formatter={(v: any) => `$${v}`} style={{ fontSize: "11px", fontWeight: 700, fill: theme.secondary }} />
                        </Line>
                    )}
                    {chartType === "area" && (
                        <Area type="monotone" dataKey="price" name="Avg Price" fill={theme.secondary} stroke={theme.secondary} fillOpacity={0.4} strokeWidth={2}>
                            <LabelList dataKey="price" position="top" formatter={(v: any) => `$${v}`} style={{ fontSize: "11px", fontWeight: 700, fill: theme.secondary }} />
                        </Area>
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ════════════════════════════════════
   CATEGORY REVENUE & RETURNS CHART
════════════════════════════════════ */
function CategoryChart({ theme }: { theme: typeof COLOR_THEMES[ThemeKey] }) {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [chartType, setChartType] = useState<"bar" | "line" | "area">("bar");

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "0" }}>
            <ChartTypeToggle currentType={chartType} types={["bar", "line", "area"]} onChange={(t) => setChartType(t as any)} />
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={CATEGORIES} margin={{ top: 28, right: 20, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.45 }} tickFormatter={v => v===0 ? "0" : `${v/1000}K`} />
                    <RechartsTooltip content={<UniversalTooltip />} cursor={{ fill: "rgba(128,128,128,0.05)" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", opacity: 0.8 }} />
                    
                    {chartType === "bar" && (
                        <>
                            <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]} barSize={28} onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
                                {CATEGORIES.map((_, index) => <Cell key={`cell-${index}`} fill={theme.primary} fillOpacity={activeIndex === index || activeIndex === null ? 1 : 0.3} style={{ transition: "all 0.3s" }} cursor="pointer" />)}
                            </Bar>
                            <Bar dataKey="returns" name="Returns" radius={[4, 4, 0, 0]} barSize={28} onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
                                {CATEGORIES.map((_, index) => <Cell key={`cell-${index}`} fill={theme.negative} fillOpacity={activeIndex === index || activeIndex === null ? 1 : 0.3} style={{ transition: "all 0.3s" }} cursor="pointer" />)}
                            </Bar>
                        </>
                    )}
                    {chartType === "line" && (
                        <>
                            <Line type="monotone" dataKey="revenue" name="Revenue" stroke={theme.primary} strokeWidth={3} dot={{ r: 4, fill: theme.primary }} activeDot={{ r: 6, strokeWidth: 0 }} />
                            <Line type="monotone" dataKey="returns" name="Returns" stroke={theme.negative} strokeWidth={3} dot={{ r: 4, fill: theme.negative }} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </>
                    )}
                    {chartType === "area" && (
                        <>
                            <Area type="monotone" dataKey="revenue" name="Revenue" fill={theme.primary} stroke={theme.primary} fillOpacity={0.4} strokeWidth={2} />
                            <Area type="monotone" dataKey="returns" name="Returns" fill={theme.negative} stroke={theme.negative} fillOpacity={0.4} strokeWidth={2} />
                        </>
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
}

/* ════════════════════════════════════
   STACKED BAR CHART — Monthly Revenue Mix By Region
════════════════════════════════════ */
function StackedBarChart() {
    const [activeIndex, setActiveIndex] = useState<number | null>(null);
    const [chartType, setChartType] = useState<"stacked bar" | "stacked area">("stacked bar");
    const colors = ["#7C3AED", "#3B82F6", "#10B981", "#F59E0B"];
    const labels = ["North", "East", "West", "South"];

    return (
        <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "0" }}>
            <ChartTypeToggle currentType={chartType} types={["stacked bar", "stacked area"]} onChange={(t) => setChartType(t as any)} />
            <ResponsiveContainer width="100%" height="100%">
                {chartType === "stacked bar" ? (
                    <BarChart data={MONTHLY_MIX} margin={{ top: 28, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.45 }} tickFormatter={v => `${v}%`} />
                        <RechartsTooltip content={<UniversalTooltip formatter={(v: any) => String(v) + "%"} />} cursor={{ fill: "rgba(128,128,128,0.05)" }} />
                        <Legend wrapperStyle={{ fontSize: "11px", opacity: 0.8 }} />
                        {["north", "east", "west", "south"].map((reg, i) => (
                            <Bar key={reg} dataKey={reg} name={labels[i]} stackId="a" fill={colors[i]} barSize={34} onMouseEnter={(_, index) => setActiveIndex(index)} onMouseLeave={() => setActiveIndex(null)}>
                                {MONTHLY_MIX.map((_, index) => <Cell key={`cell-${index}`} fillOpacity={activeIndex === index || activeIndex === null ? 1 : 0.4} style={{ transition: "all 0.3s" }} cursor="pointer" />)}
                            </Bar>
                        ))}
                    </BarChart>
                ) : (
                    <AreaChart data={MONTHLY_MIX} margin={{ top: 28, right: 20, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.55 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "currentColor", opacity: 0.45 }} tickFormatter={v => `${v}%`} />
                        <RechartsTooltip content={<UniversalTooltip formatter={(v: any) => String(v) + "%"} />} cursor={{ fill: "rgba(128,128,128,0.05)" }} />
                        <Legend wrapperStyle={{ fontSize: "11px", opacity: 0.8 }} />
                        {["north", "east", "west", "south"].map((reg, i) => (
                            <Area type="monotone" key={reg} dataKey={reg} name={labels[i]} stackId="a" fill={colors[i]} stroke={colors[i]} fillOpacity={0.6} strokeWidth={2} />
                        ))}
                    </AreaChart>
                )}
            </ResponsiveContainer>
        </div>
    );
}

/* ════════════════════════════════════
   KEY INSIGHTS BOX — reusable side panel
════════════════════════════════════ */
function InsightsBox({ insights, theme }: { insights: string[]; theme: typeof COLOR_THEMES[ThemeKey] }) {
    return (
        <div style={{
            background: `${theme.primary}06`,
            border: `1px solid ${theme.primary}18`,
            borderRadius: "10px", padding: "14px 16px",
        }}>
            <div style={{ fontSize: "0.78rem", fontWeight: 700, color: theme.primary, marginBottom: "10px" }}>Key Insights</div>
            <ul style={{ padding: "0", margin: 0, display: "flex", flexDirection: "column", gap: "7px", listStyle: "none" }}>
                {insights.map((ins, i) => {
                    if (ins.startsWith("Recommendation: ")) {
                        return (
                            <li key={i} style={{ 
                                background: `${theme.primary}15`, 
                                padding: '10px 12px', 
                                borderRadius: '6px', 
                                marginTop: '4px',
                                borderLeft: `3px solid ${theme.primary}`
                            }}>
                                <div style={{ fontWeight: 700, color: theme.primary, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2v1"/><path d="M12 7a5 5 0 1 0 5 5 1 1 0 0 1 1 1 1 1 0 0 1-1 1v1a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-1a1 1 0 0 1-1-1 1 1 0 0 1 1-1 5 5 0 1 0 5-5z"/></svg>
                                    Actionable Recommendation
                                </div>
                                <div style={{ fontSize: "0.76rem", color: "var(--color-text-primary)", lineHeight: 1.55 }}>
                                    {ins.replace("Recommendation: ", "").trim()}
                                </div>
                            </li>
                        );
                    }
                    return (
                        <li key={i} style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)", lineHeight: 1.55, position: "relative", paddingLeft: "14px" }}>
                            <span style={{ position: "absolute", left: 0, top: "6px", width: "4px", height: "4px", borderRadius: "50%", background: theme.primary }} />
                            {ins}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

/* ════════════════════════════════════
   DRAG WIDGET WRAPPER
════════════════════════════════════ */
interface WidgetStyles {
    background?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: "left" | "center" | "right" | "justify";
    color?: string;
}

function Widget({ id, title, subtitle, explanation, onDragStart, onDrop, onDelete, onEditTitle, onEditSubtitle, onEditExplanation, layout = "Blocks", isSelected, onClick, customStyles, size = "full", themeColor, hideHeader = false, widgetHeight = 360, onHeightChange, onWidthChange, onResizeStart, onResizeEnd, onAddAbove, children }: {
    id: number; title: string; subtitle?: string; explanation?: string;
    onDragStart: () => void; onDrop: () => void; onDelete?: () => void; 
    onEditTitle?: (newTitle: string) => void; onEditSubtitle?: (newText: string) => void; onEditExplanation?: (newText: string) => void;
    layout?: string; isSelected?: boolean; onClick?: () => void; customStyles?: WidgetStyles; size?: number | "narrow" | "medium" | "full"; themeColor: string; hideHeader?: boolean;
    widgetHeight?: number; onHeightChange?: (h: number) => void;
    onAddAbove?: () => void;
    onWidthChange?: (size: number | "narrow" | "medium" | "full") => void;
    onResizeStart?: () => void; onResizeEnd?: () => void;
    children: React.ReactNode;
}) {
    const [over, setOver] = useState(false);
    const [expanded, setExpanded] = useState(true);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [titleVal, setTitleVal] = useState(title);
    
    const [isEditingSub, setIsEditingSub] = useState(false);
    const [subVal, setSubVal] = useState(subtitle || "");

    const [isEditingExpl, setIsEditingExpl] = useState(false);
    const [explVal, setExplVal] = useState(explanation || "");

    const [isHovered, setIsHovered] = useState(false);

    // Resize state — height is pixel-perfect, width maps to grid snaps
    const cardRef = useRef<HTMLDivElement>(null);
    const resizeRef = useRef<{ startX: number; startY: number; startW: number; startH: number; dir: string; startCols: number } | null>(null);

    const startResize = (e: React.MouseEvent, dir: string) => {
        e.preventDefault();
        e.stopPropagation();
        if (onResizeStart) onResizeStart();
        const rect = cardRef.current!.getBoundingClientRect();
        
        // Compute the actual real-time columns it's spanning using the CSS variable or fallback.
        const computedStyle = window.getComputedStyle(cardRef.current!);
        const gridColString = computedStyle.gridColumnStart; // usually something like "span 6"
        let startCols = typeof size === 'number' ? size : size === "narrow" ? 3 : size === "medium" ? 6 : 12;
        if (gridColString && gridColString.includes("span")) {
            const parsed = parseInt(gridColString.replace("span", "").trim());
            if (!isNaN(parsed)) startCols = parsed;
        }

        resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: rect.width, startH: rect.height, dir, startCols };
        document.body.style.userSelect = 'none';
        
        const cursors: Record<string, string> = {
            'top': 'ns-resize', 'bottom': 'ns-resize',
            'left': 'ew-resize', 'right': 'ew-resize',
            'top-left': 'nwse-resize', 'bottom-right': 'nwse-resize',
            'top-right': 'nesw-resize', 'bottom-left': 'nesw-resize',
            'corner': 'nwse-resize'
        };
        document.body.style.cursor = cursors[dir] || 'default';
        
        let currentSize = size as number | string; // Tracks emitted size to avoid stale closure during continuous drag
        
        const onMove = (ev: MouseEvent) => {
            if (!resizeRef.current) return;
            const { startX, startY, startW, startH, dir: d, startCols } = resizeRef.current;
            const dx = ev.clientX - startX, dy = ev.clientY - startY;
            
            // Width snaps to granular 1-12 columns boundaries
            if ((d.includes('right') || d.includes('left') || d === 'corner') && onWidthChange) {
                const diffX = d.includes('left') ? -dx : dx;
                const targetPixelW = startW + diffX;
                const colW = startW / startCols;
                let targetSpan = Math.round(targetPixelW / colW);
                if (targetSpan < 3) targetSpan = 3;
                if (targetSpan > 12) targetSpan = 12;
                
                if (targetSpan !== currentSize) {
                    onWidthChange(targetSpan);
                    currentSize = targetSpan;
                }
            }
            
            // Height is shared with parent so row neighbors auto-stretch
            if ((d.includes('bottom') || d.includes('top') || d === 'corner') && onHeightChange) {
                const diffY = d.includes('top') ? -dy : dy;
                onHeightChange(Math.max(100, startH + diffY));
            }
        };
        const onUp = () => {
            resizeRef.current = null;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (onResizeEnd) onResizeEnd();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    useEffect(() => { setTitleVal(title); }, [title]);
    useEffect(() => { setSubVal(subtitle || ""); }, [subtitle]);
    useEffect(() => { setExplVal(explanation || ""); }, [explanation]);

    const isSeamless = layout === "Seamless";
    const isPaper = layout === "Paper";

    // Default backgrounds
    const defaultBg = (isSeamless || isPaper) ? "transparent" : "var(--color-surface)";
    let bg = customStyles?.background || defaultBg;
    if (bg === "theme-primary") {
        bg = themeColor;
    }

    // Apply custom typography styles or fallback to defaults
    const headerFontFamily = customStyles?.fontFamily || "inherit";
    const headerFontSize = customStyles?.fontSize || "1rem";
    const headerFontWeight = customStyles?.fontWeight || 700;
    const headerFontStyle = customStyles?.fontStyle || "normal";
    const headerTextDecoration = customStyles?.textDecoration || "none";
    const headerTextAlign = customStyles?.textAlign || "left";
    const headerColor = customStyles?.color || "var(--color-text-primary)";

    return (
        <div 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                position: "relative",
                "--widget-span": typeof size === 'number' ? size : size === "narrow" ? 3 : size === "medium" ? 6 : 12,
                display: "flex", flexDirection: "column",
            } as React.CSSProperties}
            className="dashboard-widget">

            {/* ── Plus button (left edge) ── */}
            <div style={{ position: "absolute", left: -28, top: "50%", transform: "translateY(-50%)", zIndex: 60, opacity: isHovered ? 1 : 0, transition: "opacity 0.2s" }}>
                <button
                    onClick={(e) => { e.stopPropagation(); onAddAbove?.(); }}
                    title="Insert widget above"
                    style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: "var(--color-surface)",
                        border: "2px solid rgba(124,58,237,0.4)",
                        color: "#7C3AED",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "16px", fontWeight: 700, lineHeight: 1,
                        boxShadow: "0 2px 8px rgba(124,58,237,0.2)", transition: "all 0.15s",
                        padding: 0,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#7C3AED"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "var(--color-surface)"; e.currentTarget.style.color = "#7C3AED"; }}
                >+</button>
            </div>

            {/* Main Widget Card */}
            <div
                ref={cardRef}
                onDragOver={e => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={() => { setOver(false); onDrop(); }}
                onClick={onClick}
                style={{
                    background: bg, borderRadius: "14px", flex: 1,
                    border: isSelected ? "2px solid #7C3AED" : over ? "2px dashed #7C3AED" : (isSeamless || isPaper) ? "1px solid transparent" : "1px solid var(--color-border)",
                    boxShadow: isSelected ? "0 0 0 4px rgba(124,58,237,0.15)" : over ? "0 0 0 3px rgba(124,58,237,0.1)" : (isSeamless || isPaper) ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
                    transition: "border 0.15s, box-shadow 0.15s",
                    overflow: "hidden",
                    cursor: onClick ? "pointer" : "default",
                    display: "flex", flexDirection: "column",
                    height: widgetHeight + "px",
                    position: "relative",
                }}>
                
                {/* Top-center drag handle */}
                {isSelected && (
                    <div style={{
                        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                        zIndex: 51, display: "flex", alignItems: "center", justifyContent: "center",
                        paddingTop: "4px",
                    }}>
                        <div
                            title="Drag to reorder"
                            draggable
                            onDragStart={(e) => { e.stopPropagation(); onDragStart(); }}
                            onDragEnd={onDrop}
                            style={{
                                cursor: "grab",
                                background: "rgba(124,58,237,0.18)",
                                backdropFilter: "blur(4px)",
                                borderRadius: "999px",
                                padding: "4px 14px",
                                display: "flex", alignItems: "center", gap: "3px",
                                boxShadow: "0 2px 8px rgba(124,58,237,0.15)",
                                border: "1px solid rgba(124,58,237,0.25)",
                            }}
                        >
                            <svg width="18" height="8" viewBox="0 0 24 10" fill="none">
                                <circle cx="5"  cy="2.5" r="1.8" fill="#7C3AED" opacity="0.7"/>
                                <circle cx="12" cy="2.5" r="1.8" fill="#7C3AED" opacity="0.7"/>
                                <circle cx="19" cy="2.5" r="1.8" fill="#7C3AED" opacity="0.7"/>
                                <circle cx="5"  cy="7.5" r="1.8" fill="#7C3AED" opacity="0.7"/>
                                <circle cx="12" cy="7.5" r="1.8" fill="#7C3AED" opacity="0.7"/>
                                <circle cx="19" cy="7.5" r="1.8" fill="#7C3AED" opacity="0.7"/>
                            </svg>
                        </div>
                    </div>
                )}

                {/* Bottom-right action buttons */}
                {isSelected && (
                    <div style={{
                        position: "absolute", bottom: "10px", right: "12px",
                        display: "flex", gap: "6px", alignItems: "center", zIndex: 50,
                        background: "rgba(255,255,255,0.85)", borderRadius: "10px", padding: "3px 4px",
                        backdropFilter: "blur(6px)",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                        border: "1px solid rgba(124,58,237,0.12)",
                    }}>
                        {(title || onEditTitle) && (
                            <button onClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }} title="Rename"
                                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", width: "30px", height: "30px", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.color = "#7C3AED"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            </button>
                        )}
                        {onDelete && (
                            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete Widget"
                                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", width: "30px", height: "30px", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.15s" }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = "#EF4444"; e.currentTarget.style.color = "#EF4444"; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}>
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                            </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setExpanded(ex => !ex); }} title={expanded ? "Collapse" : "Expand"}
                            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", width: "30px", height: "30px", cursor: "pointer", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", transition: "all 0.15s" }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.color = "#7C3AED"; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}>
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                                style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}>
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>
                    </div>
                )}


                {/* Card header */}
                {(!hideHeader && (title || subtitle || isEditingTitle)) && (
                <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative" }}>
                <div style={{ flex: 1, paddingRight: isSelected ? "150px" : "16px" }}>
                    {isEditingTitle ? (
                        <input
                            autoFocus
                            value={titleVal}
                            onChange={(e) => setTitleVal(e.target.value)}
                            onBlur={() => { setIsEditingTitle(false); if (onEditTitle && titleVal.trim()) onEditTitle(titleVal.trim()); }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") { setIsEditingTitle(false); if (onEditTitle && titleVal.trim()) onEditTitle(titleVal.trim()); }
                                if (e.key === "Escape") { setIsEditingTitle(false); setTitleVal(title); }
                            }}
                            style={{
                                width: "100%", fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)",
                                background: "var(--color-subtle)", border: "1px solid #7C3AED", borderRadius: "6px",
                                padding: "2px 6px", outline: "none", marginBottom: "4px"
                            }}
                        />
                    ) : (
                        <h3 onDoubleClick={() => setIsEditingTitle(true)} title="Double-click to rename" style={{
                            fontSize: headerFontSize, fontWeight: headerFontWeight, fontFamily: headerFontFamily,
                            fontStyle: headerFontStyle, textDecoration: headerTextDecoration, textAlign: headerTextAlign,
                            color: headerColor, margin: 0, cursor: "text"
                        }}>{title}</h3>
                    )}
                    
                    {/* Subtitle */}
                    {(subtitle || onEditSubtitle) && (
                        isEditingSub ? (
                            <input
                                autoFocus
                                value={subVal}
                                onChange={(e) => setSubVal(e.target.value)}
                                onBlur={() => { setIsEditingSub(false); if (onEditSubtitle) onEditSubtitle(subVal.trim()); }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") { setIsEditingSub(false); if (onEditSubtitle) onEditSubtitle(subVal.trim()); }
                                    if (e.key === "Escape") { setIsEditingSub(false); setSubVal(subtitle || ""); }
                                }}
                                style={{
                                    width: "100%", fontSize: "0.74rem", color: "var(--color-text-primary)",
                                    background: "var(--color-subtle)", border: "1px solid #7C3AED", borderRadius: "4px",
                                    padding: "2px 4px", outline: "none", marginTop: "4px"
                                }}
                            />
                        ) : (
                            <p onDoubleClick={() => setIsEditingSub(true)} title="Double-click to edit subtitle"
                                style={{ fontSize: "0.74rem", color: "var(--color-text-muted)", margin: "4px 0 0", cursor: "text", minHeight: "14px" }}>
                                {subtitle}
                            </p>
                        )
                    )}
                </div>
            </div>
            )}

            {/* Chart Container */}
            {expanded && (
                <div style={{
                    padding: isSeamless ? "0" : "16px 20px 0",
                    width: "100%",
                    display: "flex",
                    flex: 1,
                    flexDirection: "column",
                    minHeight: 0
                }}>
                    <div style={{ flex: 1, width: "100%", height: "100%", overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
                        {children}
                    </div>
                </div>
            )}

            {/* ── Invisible Resizing Edges & Corners ── */}
            {isSelected && (
                <>
                    {/* Edges */}
                    <div onMouseDown={(e) => startResize(e, 'top')} style={{ position: 'absolute', top: -4, left: 12, right: 12, height: 8, cursor: 'ns-resize', zIndex: 55 }} />
                    <div onMouseDown={(e) => startResize(e, 'bottom')} style={{ position: 'absolute', bottom: -4, left: 12, right: 12, height: 8, cursor: 'ns-resize', zIndex: 55 }} />
                    <div onMouseDown={(e) => startResize(e, 'left')} style={{ position: 'absolute', left: -4, top: 12, bottom: 12, width: 8, cursor: 'ew-resize', zIndex: 55 }} />
                    <div onMouseDown={(e) => startResize(e, 'right')} style={{ position: 'absolute', right: -4, top: 12, bottom: 12, width: 8, cursor: 'ew-resize', zIndex: 55 }} />
                    
                    {/* Corners */}
                    <div onMouseDown={(e) => startResize(e, 'top-left')} style={{ position: 'absolute', top: -6, left: -6, width: 14, height: 14, cursor: 'nwse-resize', zIndex: 56 }} />
                    <div onMouseDown={(e) => startResize(e, 'top-right')} style={{ position: 'absolute', top: -6, right: -6, width: 14, height: 14, cursor: 'nesw-resize', zIndex: 56 }} />
                    <div onMouseDown={(e) => startResize(e, 'bottom-left')} style={{ position: 'absolute', bottom: -6, left: -6, width: 14, height: 14, cursor: 'nesw-resize', zIndex: 56 }} />
                    <div onMouseDown={(e) => startResize(e, 'bottom-right')} style={{ position: 'absolute', bottom: -6, right: -6, width: 14, height: 14, cursor: 'nwse-resize', zIndex: 56 }} />
                    
                    {/* Visual handles overlay to show it's currently selected, using pointer-events none so they don't block the invisible precise hitboxes */}
                    <div style={{
                        position: 'absolute', top: '50%', right: -6, transform: 'translateY(-50%)',
                        width: 12, height: 40, zIndex: 54, pointerEvents: "none",
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: 6, background: 'rgba(124,58,237,0.15)',
                        border: '1px solid rgba(124,58,237,0.35)', backdropFilter: 'blur(4px)',
                    }}>
                        <svg width="5" height="18" viewBox="0 0 5 24" fill="none">
                            <line x1="1.5" y1="2" x2="1.5" y2="22" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
                            <line x1="3.5" y1="2" x2="3.5" y2="22" stroke="#7C3AED" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                    </div>
                </>
            )}

            {/* ── Corner resize handle (bottom-right) ── */}
            {isSelected && (
                <div
                    onMouseDown={(e) => startResize(e, 'corner')}
                    style={{
                        position: 'absolute', bottom: -7, right: -7,
                        width: 16, height: 16, cursor: 'se-resize', zIndex: 56,
                        background: '#7C3AED',
                        borderRadius: '50%',
                        boxShadow: '0 2px 8px rgba(124,58,237,0.4)',
                        border: '2px solid #fff',
                    }}
                />
            )}

            </div>
        </div>
    );
}



/* ════════════════════════════════════
   QUICK ACTION BUTTON
════════════════════════════════════ */
function QuickBtn({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
    return (
        <button onClick={onClick} style={{
            display: "flex", alignItems: "center", gap: "6px", padding: "7px 10px",
            borderRadius: "8px", border: "1px solid var(--color-border)",
            background: "var(--color-subtle)", color: "var(--color-text-secondary)",
            fontSize: "0.78rem", cursor: "pointer", width: "100%", textAlign: "left",
            transition: "all 0.15s",
        }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.color = "#7C3AED"; e.currentTarget.style.background = "rgba(124,58,237,0.06)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; e.currentTarget.style.background = "var(--color-subtle)"; }}>
            <span style={{ fontSize: "0.9rem" }}>{icon}</span>{label}
        </button>
    );
}

/* ════════════════════════════════════
   MAIN PAGE
════════════════════════════════════ */
export default function AnalysisPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dashboardId = searchParams?.get('id') || '';
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!dashboardId) return;
        
        async function loadData() {
            try {
                setIsLoading(true);
                const [profileRes, chartsRes] = await Promise.all([
                    analysisService.getProfile(dashboardId),
                    analysisService.getCharts(dashboardId)
                ]);

                const newWidgets: any[] = [];

                // Build dynamic executive summary from profile
                let summaryText = "Ready to explore the dataset.";
                if (profileRes.profile) {
                    const bi = profileRes.profile.basic_info;
                    const dq = profileRes.profile.data_quality;
                    summaryText = `Dataset contains ${bi.total_rows?.toLocaleString() || '?'} rows and ${bi.total_columns || '?'} columns. `;
                    summaryText += `Memory usage: ${bi.memory_usage_mb?.toFixed(2) || '?'} MB. `;
                    if (bi.duplicate_rows > 0) {
                        summaryText += `Found ${bi.duplicate_rows.toLocaleString()} duplicate rows (${bi.duplicate_percentage?.toFixed(1)}%). `;
                    } else {
                        summaryText += `No duplicate rows detected. `;
                    }
                    if (dq) {
                        summaryText += `Data quality score: ${dq.quality_score?.toFixed(1)}%.`;
                    }
                }

                // Enrich summary with top insights if available
                const insights = chartsRes.insights || [];
                if (insights.length > 0) {
                    const topInsights = insights.slice(0, 2);
                    summaryText += `\n\nKey findings: ` + topInsights.map((ins: any) => ins.description).join(' ');
                }

                // Title widget
                newWidgets.push({ id: -1, type: "title_widget", title: "Dashboard Analysis", size: "full", explanation: "", layout: "Seamless" });
                
                // Executive summary widget
                newWidgets.push({ 
                    id: 0, 
                    type: "overview_text", 
                    title: "Executive Summary", 
                    size: "full", 
                    explanation: summaryText,
                    payload: profileRes.profile ? profileRes.profile.basic_info : null
                });

                // Insights list widget (if we have insights)
                if (insights.length > 0) {
                    newWidgets.push({
                        id: 1,
                        type: "insights_table",
                        title: "Key Insights",
                        size: "full",
                        explanation: insights.map((ins: any) => `${ins.title}: ${ins.description}`).join('\n')
                    });
                }

                // Chart widgets
                if (chartsRes.charts) {
                    chartsRes.charts.forEach((chart: any, idx: number) => {
                        let explanationText = chart.description || "";
                        if (chart.insights && Array.isArray(chart.insights) && chart.insights.length > 0) {
                            explanationText = chart.insights.join('\n');
                        }
                        
                        newWidgets.push({
                            id: idx + 10,
                            type: "dynamic_chart",
                            size: "medium",
                            title: chart.title,
                            explanation: explanationText,
                            chartData: chart
                        });
                    });
                }
                
                setWidgetConfigs(newWidgets);
                setWidgetOrder(newWidgets.map(w => w.id));
                const heights: Record<number, number> = {};
                newWidgets.forEach(w => { heights[w.id] = w.type === 'insights_table' ? 280 : w.size === 'full' ? 200 : 360; });
                setWidgetHeights(heights);

                // Set project title dynamically
                setProjectTitle(profileRes.dashboard_id ? `Analysis: ${profileRes.dashboard_id.substring(0, 8)}...` : "Dashboard Analysis");
            } catch (err) {
                console.error("Failed to load analysis:", err);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [dashboardId]);
    const [isReadOnly, setIsReadOnly] = useState(() => {
        if (typeof window !== "undefined") {
            return new URLSearchParams(window.location.search).get("view") === "true";
        }
        return false;
    });
    const { theme: appTheme, toggle } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(!isReadOnly);
    const [titleMenuOpen, setTitleMenuOpen] = useState(false);
    const [projectTitle, setProjectTitle] = useState("Sales, Product, And Customer Insights");
    const [isRenaming, setIsRenaming] = useState(false);
    const [renameValue, setRenameValue] = useState("");
    const [sidebarMode, setSidebarMode] = useState<"chat" | "design">("chat");
    const [activeDesignSection, setActiveDesignSection] = useState<string | null>("Styling");
    const [showQuickBlocksGallery, setShowQuickBlocksGallery] = useState(false);
    const [gallerySearch, setGallerySearch] = useState("");
    const [chartTheme, setChartTheme] = useState<ThemeKey>("corporate");

    // Presentation Mode state
    const [presentationMode, setPresentationMode] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Export state
    const [isExporting, setIsExporting] = useState(false);
    const [shareCopied, setShareCopied] = useState(false);

    // Selection and Block Styling State
    const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);
    const [blockStyles, setBlockStyles] = useState<Record<number, WidgetStyles>>({
        [-1]: { background: "theme-primary", color: "#ffffff", textAlign: "center" }
    });

    // Sidebar resize state
    const [sidebarWidth, setSidebarWidth] = useState(354.77);
    const [isResizing, setIsResizing] = useState(false);
    
    // Advanced Color Picker state
    const [showAdvancedColorPicker, setShowAdvancedColorPicker] = useState(false);
    const [tempAdvancedColor, setTempAdvancedColor] = useState("#FA41FA");

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            let newWidth = e.clientX;
            if (newWidth < 220) newWidth = 220;
            if (newWidth > 600) newWidth = 600;
            setSidebarWidth(newWidth);
        };
        const handleMouseUp = () => {
            if (isResizing) {
                setIsResizing(false);
                document.body.style.cursor = "default";
            }
        };
        if (isResizing) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing]);


    // Design menu state
    const [stylingLayout, setStylingLayout] = useState<string>("Blocks");
    const [stylingBgColor, setStylingBgColor] = useState<string>("#F0F4F9");
    const [stylingZoom, setStylingZoom] = useState<string>("Fit");
    const bgColors = [
        "#8B5CF6", "#A78BFA", "#99F6E4", "#2DD4BF", "#C4B5FD",
        "#FCA5A5", "#F87171", "#7DD3FC", "#7C3AED", "#1E1B4B"
    ];

    const STANDARD_COLORS = [
        "transparent", "#FFFFFF", "#E5E7EB", "#9CA3AF", "#4B5563", "#374151", "#9333EA",
        "#EF4444", "#F97316", "#EAB308", "#A3E635", "#65A30D", "#3B82F6", "#1D4ED8",
        "#F87171", "#FDE047", "#BEF264", "#0D9488", "#0F766E", "#7DD3FC", "#6366F1"
    ];

    const THEME_SPECIFIC_COLORS = [
        "#8B5CF6", "#A78BFA", "#99F6E4", "#2DD4BF", "#C4B5FD", "#FCA5A5", "#F87171",
        "#7DD3FC", "#7C3AED", "#1E1B4B", "#F3E8FF", "#0F172A", "#9CA3AF", "#FFFFFF"
    ];

    const [showBgColorPicker, setShowBgColorPicker] = useState(false);
    const bgColorPickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (bgColorPickerRef.current && !bgColorPickerRef.current.contains(e.target as Node)) {
                setShowBgColorPicker(false);
            }
        };
        if (showBgColorPicker) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showBgColorPicker]);


    const ct = COLOR_THEMES[chartTheme];

    /* Chat */
    const [chatMessages, setChatMessages] = useState<{ role: "user" | "ai"; text: string; chart?: any }[]>([
        { role: "ai", text: "Hi! Ask me anything about this dashboard or tell me how to edit it." }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [thinking, setThinking] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    /* Widgets State */
    const INITIAL_WIDGETS = [
        { id: -1, type: "title_widget", title: "Loading Analysis...", size: "full", explanation: "", layout: "Seamless" },
        { id: 0, type: "overview_text", title: "Executive Summary", size: "full", explanation: "Loading data profiling details..." }
    ];

    const [widgetConfigs, setWidgetConfigs] = useState(INITIAL_WIDGETS);
    const [widgetOrder, setWidgetOrder] = useState(INITIAL_WIDGETS.map(w => w.id));

    const dragRef = useRef<number | null>(null);
    const handleDragStart = useCallback((i: number) => { dragRef.current = i; }, []);
    const handleDrop = useCallback((i: number) => {
        if (dragRef.current === null || dragRef.current === i) return;
        setWidgetOrder(prev => { const n = [...prev]; const [r] = n.splice(dragRef.current!, 1); n.splice(i, 0, r); return n; });
        dragRef.current = null;
    }, []);

    // Shared widget heights — drives CSS grid row stretching
    const [widgetHeights, setWidgetHeights] = useState<Record<number, number>>(() =>
        Object.fromEntries(INITIAL_WIDGETS.map(w => [w.id, 360]))
    );
    const handleWidgetHeightChange = useCallback((id: number, h: number) => {
        setWidgetHeights(prev => ({ ...prev, [id]: h }));
    }, []);

    const [resizingWidgetId, setResizingWidgetId] = useState<number | null>(null);
    const handleWidgetWidthChange = useCallback((id: number, newSize: number | "narrow" | "medium" | "full") => {
        setWidgetConfigs(prev => prev.map(w => w.id === id ? { ...w, size: newSize as any } : w));
    }, []);

    // Track which widget the generic gallery should be inserted into
    const [insertIntoWidgetId, setInsertIntoWidgetId] = useState<number | null>(null);

    // Track uploaded image URLs per widget
    const [widgetImages, setWidgetImages] = useState<Record<number, string>>({});


    const handleAddAbove = (belowWidgetId: number) => {
        const newId = Math.max(-1, ...widgetConfigs.map(w => w.id)) + 1;
        const newConfig = { id: newId, type: 'new_block_placeholder', title: 'New Block', size: 'medium', explanation: '' };
        setWidgetConfigs(prev => [...prev, newConfig]);
        setWidgetOrder(prev => {
            const idx = prev.indexOf(belowWidgetId);
            const arr = [...prev];
            arr.splice(idx, 0, newId); // insert BEFORE belowWidgetId
            return arr;
        });
        setWidgetHeights(prev => ({ ...prev, [newId]: 200 }));
    };

    const handleAddQuickBlock = (type: string, title: string) => {
        if (insertIntoWidgetId !== null) {
            setWidgetConfigs(prev => prev.map(w => w.id === insertIntoWidgetId ? { ...w, type, title, explanation: "" } : w));
            setWidgetHeights(prev => ({ ...prev, [insertIntoWidgetId]: 360 })); // reset default block height
            setInsertIntoWidgetId(null);
        } else {
            const newId = Math.max(-1, ...widgetConfigs.map(w => w.id)) + 1;
            let defaultSize = "medium";
            if (type === "data_table" || type === "visual_board") defaultSize = "full";
            
            setWidgetConfigs(prev => [...prev, { id: newId, type, title, size: defaultSize, explanation: "" }]);
            setWidgetOrder(prev => [...prev, newId]);
        }
        setShowQuickBlocksGallery(false);
        setSidebarMode("chat");
    };

    const handleDeleteWidget = (id: number) => {
        setWidgetConfigs(prev => prev.filter(w => w.id !== id));
        setWidgetOrder(prev => prev.filter(wId => wId !== id));
    };


    const handleEditWidgetTitle = (id: number, newTitle: string) => {
        setWidgetConfigs(prev => prev.map(w => w.id === id ? { ...w, title: newTitle } : w));
    };

    const handleEditWidgetSubtitle = (id: number, newSub: string) => {
        setWidgetConfigs(prev => prev.map(w => w.id === id ? { ...w, subtitle: newSub } : w));
    };

    const handleEditWidgetExplanation = (id: number, newExpl: string) => {
        setWidgetConfigs(prev => prev.map(w => w.id === id ? { ...w, explanation: newExpl } : w));
    };

    const handleBlockClick = (id: number) => {
        setSelectedBlockId(id);
        setSidebarOpen(true);
        setSidebarMode("design");
        setActiveDesignSection("Styling");
    };

    // Helper to update styles for the currently selected block
    const updateSelectedBlockStyle = (styleUpdate: Partial<WidgetStyles>) => {
        if (selectedBlockId === null) return;
        setBlockStyles(prev => ({
            ...prev,
            [selectedBlockId]: {
                ...(prev[selectedBlockId] || {}),
                ...styleUpdate
            }
        }));
    };

    const handleSend = async () => {
        if (!chatInput.trim() || !dashboardId) return;
        const q = chatInput; setChatInput(""); setThinking(true);
        setChatMessages(p => [...p, { role: "user", text: q }]);
        setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        
        try {
            const res = await queryService.askQuestion(dashboardId, q);
            if (res.error) {
                setChatMessages(p => [...p, { role: "ai", text: `⚠️ Error: ${res.error}` }]);
            } else {
                let respText = res.text_response || "Search complete.";
                let newChart = null;
                
                if (res.intent === "data_query" && res.chart_suggestion) {
                    newChart = res.chart_suggestion;
                } else if (res.intent === "data_query" && res.rows && res.rows.length > 0) {
                    respText += `\n\nPreview (${res.row_count} total rows):\n` + JSON.stringify(res.rows.slice(0, 3), null, 2);
                }
                
                setChatMessages(p => [...p, { role: "ai", text: respText, chart: newChart } as any]);
            }
        } catch (e) {
            setChatMessages(p => [...p, { role: "ai", text: "⚠️ Network error while querying." }]);
        } finally {
            setThinking(false);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
        }
    };

    const WIDGETS = widgetConfigs.map(config => {
        let content;
        
        if (config.type === "new_block_placeholder") {
            content = (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "20px", padding: "20px" }}>
                    <button
                        onClick={() => setWidgetConfigs(p => p.map(w => w.id === config.id ? { ...w, type: 'text_editor', title: 'Text' } : w))}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "24px 32px", background: "rgba(124,58,237,0.04)", border: "2px dashed rgba(124,58,237,0.3)", borderRadius: "14px", color: "#7C3AED", cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.1)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.04)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"; }}
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 6h16M4 12h16M4 18h7"/><rect x="14" y="13" width="8" height="8" rx="1"/></svg>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Text Block</span>
                    </button>
                    <button
                        onClick={() => setWidgetConfigs(p => p.map(w => w.id === config.id ? { ...w, type: 'image_upload', title: 'Image' } : w))}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "24px 32px", background: "rgba(124,58,237,0.04)", border: "2px dashed rgba(124,58,237,0.3)", borderRadius: "14px", color: "#7C3AED", cursor: "pointer", transition: "all 0.2s" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.1)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.04)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"; }}
                    >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Image Block</span>
                    </button>
                </div>
            );
        } else if (config.type === "text_editor") {
            content = (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "12px 16px 16px", position: "relative" }}>
                    <div
                        contentEditable
                        suppressContentEditableWarning
                        onBlur={(e) => handleEditWidgetExplanation(config.id, e.currentTarget.innerText)}
                        style={{
                            flex: 1, outline: "none", fontSize: "0.95rem", color: "var(--color-text-primary)",
                            lineHeight: 1.7, minHeight: "60px", cursor: "text",
                            background: "rgba(124,58,237,0.04)", borderRadius: "8px", padding: "10px 12px",
                        }}
                    >
                        {config.explanation || <span style={{ color: "var(--color-text-muted)" }}>Type here…</span>}
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", marginTop: "12px" }}>
                        <button
                            onClick={() => { setInsertIntoWidgetId(config.id); setShowQuickBlocksGallery(true); setSidebarOpen(true); setSidebarMode("design"); }}
                            style={{

                                display: "flex", alignItems: "center", gap: "8px", padding: "8px 18px",
                                background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)",
                                borderRadius: "20px", color: "#7C3AED", fontSize: "0.82rem", fontWeight: 600,
                                cursor: "pointer", transition: "all 0.15s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.16)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.08)"; }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h7"/><rect x="14" y="13" width="8" height="8" rx="1"/></svg>
                            Quick style
                        </button>
                    </div>
                </div>
            );
        } else if (config.type === "image_upload") {
            const imgSrc = widgetImages[config.id];
            content = (
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px", position: "relative" }}>
                    <input
                        type="file" accept="image/*" id={`img-input-${config.id}`} style={{ display: "none" }}
                        onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                                const url = URL.createObjectURL(file);
                                setWidgetImages(prev => ({ ...prev, [config.id]: url }));
                            }
                        }}
                    />
                    {imgSrc ? (
                        <img
                            src={imgSrc} alt="Uploaded" onClick={() => document.getElementById(`img-input-${config.id}`)?.click()}
                            style={{ maxWidth: "100%", maxHeight: "100%", borderRadius: "8px", cursor: "pointer", objectFit: "contain" }}
                        />
                    ) : (
                        <button
                            onClick={() => document.getElementById(`img-input-${config.id}`)?.click()}
                            style={{
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
                                padding: "28px 40px", border: "2px dashed rgba(124,58,237,0.3)", borderRadius: "14px",
                                background: "rgba(124,58,237,0.04)", color: "#7C3AED", cursor: "pointer", transition: "all 0.2s",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(124,58,237,0.10)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.6)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(124,58,237,0.04)"; e.currentTarget.style.borderColor = "rgba(124,58,237,0.3)"; }}
                        >
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <rect x="3" y="3" width="18" height="18" rx="3"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <polyline points="21 15 16 10 5 21"/>
                            </svg>
                            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Browse Image</span>
                            <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Click to choose from your PC</span>
                        </button>
                    )}
                </div>
            );
        } else if (config.type === "overview_text") {
            const basicInfo = (config as any).payload;
            
            content = (
                <div style={{ padding: "0 20px 20px" }}>
                    <p 
                        contentEditable={!isReadOnly} suppressContentEditableWarning 
                        onBlur={(e) => handleEditWidgetExplanation(config.id, e.currentTarget.innerText)}
                        style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", lineHeight: 1.7, margin: 0, outline: "none", cursor: "text", whiteSpace: "pre-wrap" }}>
                        {config.explanation}
                    </p>
                    
                    {basicInfo && (
                        <div style={{ display: "flex", gap: "12px", marginTop: "16px", flexWrap: "wrap" }}>
                            <div style={{ background: "rgba(128,128,128,0.06)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(128,128,128,0.1)" }}>
                                <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 600 }}>Rows</div>
                                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{basicInfo.total_rows?.toLocaleString() || '?'}</div>
                            </div>
                            <div style={{ background: "rgba(128,128,128,0.06)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(128,128,128,0.1)" }}>
                                <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 600 }}>Columns</div>
                                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{basicInfo.total_columns?.toLocaleString() || '?'}</div>
                            </div>
                            <div style={{ background: "rgba(128,128,128,0.06)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(128,128,128,0.1)" }}>
                                <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 600 }}>Size</div>
                                <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-primary)" }}>{basicInfo.memory_usage_mb?.toFixed(1) || '?'} MB</div>
                            </div>
                            {basicInfo.duplicate_rows > 0 && (
                                <div style={{ background: "rgba(245,158,11,0.1)", padding: "8px 12px", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.3)" }}>
                                    <div style={{ fontSize: "0.65rem", textTransform: "uppercase", color: "#F59E0B", fontWeight: 600 }}>Duplicates</div>
                                    <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "#F59E0B" }}>{basicInfo.duplicate_rows.toLocaleString()} ({basicInfo.duplicate_percentage?.toFixed(1)}%)</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        } else if (config.type === "brand_insights") {
            const lines = config.explanation ? config.explanation.split('\n') : BRAND_INSIGHTS;
            content = (
                <ul style={{ padding: "0 20px 20px 36px", margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
                    {lines.map((ins, i) => (
                        <li key={i} contentEditable={!isReadOnly} suppressContentEditableWarning 
                            onBlur={(e) => {
                                const newLines = [...lines];
                                newLines[i] = e.currentTarget.innerText;
                                handleEditWidgetExplanation(config.id, newLines.join('\n'));
                            }}
                            style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", lineHeight: 1.6, outline: "none" }}>{ins}</li>
                    ))}
                </ul>
            );
        } else if (config.type === "kpi_card") {
            const k = (config as any).payload;
            content = (
                <div style={{ padding: "0 20px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: ct.primary, letterSpacing: "-0.02em" }}>{k.value}</span>
                        <span style={{ fontSize: "0.95rem" }}>{k.icon}</span>
                    </div>
                    <div style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "2px" }}>{k.sub}</div>
                </div>
            );
        } else if (config.type === "chart_product_bar") {
            content = <div style={{ paddingBottom: "20px", height: "100%", minHeight: 250 }}><ProductBarChart theme={ct} /></div>;
        } else if (config.type === "chart_pie") {
            content = <div style={{ paddingBottom: "20px", height: "100%", minHeight: 250 }}><PieChart /></div>;
        } else if (config.type === "chart_category") {
            content = <div style={{ paddingBottom: "20px", height: "100%", minHeight: 250 }}><CategoryChart theme={ct} /></div>;
        } else if (config.type === "chart_price") {
            content = <div style={{ paddingBottom: "20px", height: "100%", minHeight: 250 }}><PriceChart theme={ct} /></div>;
        } else if (config.type === "chart_stacked") {
            content = <div style={{ paddingBottom: "20px", height: "100%", minHeight: 300 }}><StackedBarChart /></div>;
        } else if (config.type === "regional_card") {
            const r = (config as any).payload;
            content = (
                <div style={{ padding: "0 20px 20px" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: ct.primary }}>${(r.revenue / 1000).toFixed(1)}K</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "4px" }}>{r.units.toLocaleString()} units</div>
                </div>
            );
        } else if (config.type === "title_widget") {
            content = (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", width: "100%", background: "transparent", minHeight: "80px" }}>
                    <span 
                        contentEditable={!isReadOnly} suppressContentEditableWarning 
                        onBlur={(e) => handleEditWidgetTitle(config.id, e.currentTarget.innerText)}
                        style={{ fontSize: "1.8rem", fontWeight: 800, color: "inherit", textAlign: "center", lineHeight: 1.2, outline: "none" }}>
                        {config.title}
                    </span>
                </div>
            );
        } else if (config.type === "table_customer") {
            content = (
                <div style={{ overflowX: "auto", padding: "0 20px 24px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                        <thead>
                            <tr>{["Segment", "Customers", "Avg Value", "LTV", "Growth"].map(h => (
                                <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, background: ct.primary, color: "#fff", fontSize: "0.75rem" }}>{h}</th>
                            ))}</tr>
                        </thead>
                        <tbody>
                            {CUSTOMER_SEGMENTS.map((s, i) => (
                                <tr key={s.segment} style={{ background: i % 2 === 0 ? "transparent" : `${ct.primary}05` }}>
                                    <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-border)", fontWeight: 600, color: "var(--color-text-primary)" }}>{s.segment}</td>
                                    <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>{s.customers.toLocaleString()}</td>
                                    <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-border)", fontWeight: 600, color: "var(--color-text-primary)" }}>{s.avgValue}</td>
                                    <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>{s.ltv}</td>
                                    <td style={{ padding: "10px 14px", borderBottom: "1px solid var(--color-border)" }}>
                                        <span style={{ color: "#10B981", fontWeight: 700, fontSize: "0.78rem" }}>{s.growth}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
        } else if (config.type === "visual_board") {
            content = <div style={{ height: "150px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--color-border)", borderRadius: "10px", color: "var(--color-text-muted)" }}>Visual board placeholder</div>;
        } else if (config.type === "insights_table") {
            const lines = config.explanation ? config.explanation.split('\n') : [
                "Alpha and Delta together account for the largest share of revenue, with Alpha the single largest contributor (≈840K)", 
                "Gamma and Beta are mid-tier contributors (~415–432K each), while Epsilon contributes significantly less (~152K), indicating a long tail product"
            ];
            content = (
                <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
                    <h3
                        contentEditable={!isReadOnly} suppressContentEditableWarning 
                        title="Double-click to edit insight title"
                        onBlur={(e) => handleEditWidgetTitle(config.id, e.currentTarget.innerText)}
                        style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: ct.primary, outline: "none", cursor: "text" }}
                    >
                        {config.title === "Summary List" ? "Key Insights" : (config.title || "Key Insights")}
                    </h3>
                    <ul style={{ padding: "0 0 0 24px", margin: 0, display: "flex", flexDirection: "column", gap: "16px", listStyleType: "disc", color: ct.primary }}>
                        {lines.map((ins, i) => (
                            <li key={i} contentEditable={!isReadOnly} suppressContentEditableWarning 
                                title="Double-click to edit insight"
                                onBlur={(e) => {
                                    const newLines = [...lines];
                                    newLines[i] = e.currentTarget.innerText;
                                    handleEditWidgetExplanation(config.id, newLines.join('\n'));
                                }}
                                style={{ fontSize: "1.05rem", color: "var(--color-text-primary)", lineHeight: 1.6, outline: "none", cursor: "text", paddingLeft: "8px" }}>{ins}</li>
                        ))}
                    </ul>
                </div>
            );
        } else if (config.type === "bar_chart") {
            content = <div style={{ height: "100%", minHeight: 250 }}><GroupedBarChart theme={ct} /></div>;
        } else if (config.type === "pie_chart_placeholder") {
            content = <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>Pie chart visualization</div>;
        } else if (config.type === "data_table") {
            content = <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-text-muted)" }}>Data Table preview</div>;
        } else if (config.type === "dynamic_chart") {
            content = <div style={{ height: "100%", paddingBottom: "20px", display: "flex", flex: 1, minHeight: 250 }}><DynamicChartRenderer chart={(config as any).chartData} theme={ct} /></div>;
        }

        return { ...config, content, size: (config as any).size || "full" };
    });

    const orderedWidgets = widgetOrder.map(i => WIDGETS.find(w => w?.id === i)).filter(Boolean);

    const [containerWidthKey, setContainerWidthKey] = useState<number>(0);
    const mainContentRef = useRef<HTMLElement>(null);

    // Track width changes for the main container to re-render charts since SVG viewBoxes need state resets for 100% width scaling
    useEffect(() => {
        if (!mainContentRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (let entry of entries) {
                // Use requestAnimationFrame to debounce and prevent the "ResizeObserver loop limit exceeded" warning
                window.requestAnimationFrame(() => {
                    setContainerWidthKey(entry.contentRect.width);
                });
            }
        });
        observer.observe(mainContentRef.current);
        return () => observer.disconnect();
    }, []);

    const pMetrics = orderedWidgets.filter(w => w?.type === "kpi_card" || w?.type === "regional_card");
    const pWidgets = orderedWidgets.filter(w => w && !["new_block_placeholder", "title_widget", "kpi_card", "regional_card"].includes(w.type));
    const totalSlides = 1 + (pMetrics.length > 0 ? 1 : 0) + pWidgets.length;

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!presentationMode) return;
            if (e.key === "Escape") setPresentationMode(false);
            if (e.key === "ArrowRight") setCurrentSlide(s => Math.min(s + 1, totalSlides - 1));
            if (e.key === "ArrowLeft") setCurrentSlide(s => Math.max(s - 1, 0));
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [presentationMode, totalSlides]);

    return (
        <div style={{ height: "100vh", overflow: "hidden", background: "var(--color-bg)", fontFamily: "Inter,sans-serif", display: "flex", flexDirection: "column" }}>

            {/* ══ STICKY HEADER ══ */}
            <header style={{
                position: "sticky", top: 0, zIndex: 200,
                background: "var(--color-nav-bg)", backdropFilter: "blur(20px)",
                borderBottom: "1px solid var(--color-border)",
                padding: "0 16px", height: "52px",
                display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
            }}>
                {/* LEFT: Logo + project title + dropdown menu */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0, position: "relative" }}>
                    <img src="/logo.jpg" alt="Insight AI"
                        style={{ width: "28px", height: "28px", borderRadius: "7px", objectFit: "cover", display: "block", flexShrink: 0 }} />

                    {/* Title button — opens dropdown */}
                    <button onClick={() => { if (!isRenaming && !isReadOnly) setTitleMenuOpen(o => !o); }} style={{
                        display: "flex", alignItems: "center", gap: "5px",
                        background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
                        borderRadius: "6px", transition: "background 0.15s",
                    }}
                        onMouseEnter={e => e.currentTarget.style.background = "var(--color-subtle)"}
                        onMouseLeave={e => e.currentTarget.style.background = "none"}>
                        <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>
                            {projectTitle}
                        </span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            style={{ color: "var(--color-text-muted)", flexShrink: 0, transform: titleMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </button>

                    {/* Inline rename input */}
                    {isRenaming && (
                        <form onSubmit={(e) => { e.preventDefault(); if (renameValue.trim()) setProjectTitle(renameValue.trim()); setIsRenaming(false); }}
                            style={{
                                position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 310, display: "flex", alignItems: "center", gap: "6px",
                                background: "var(--color-surface)", border: "1px solid rgba(124,58,237,0.4)",
                                borderRadius: "10px", padding: "8px 10px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
                                minWidth: "280px",
                            }}>
                            <input
                                autoFocus
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => { if (e.key === "Escape") setIsRenaming(false); }}
                                placeholder={projectTitle}
                                style={{
                                    flex: 1, padding: "6px 10px", borderRadius: "7px",
                                    border: "1px solid var(--color-border)",
                                    background: "var(--color-subtle)",
                                    color: "var(--color-text-primary)",
                                    fontSize: "0.85rem", outline: "none",
                                }}
                                onFocus={e => { e.target.style.borderColor = "#7C3AED"; }}
                                onBlur={e => { e.target.style.borderColor = "var(--color-border)"; }}
                            />
                            <button type="submit" style={{
                                padding: "6px 12px", borderRadius: "7px", border: "none",
                                background: "#7C3AED", color: "#fff",
                                fontSize: "0.82rem", fontWeight: 600, cursor: "pointer",
                            }}>✓</button>
                            <button type="button" onClick={() => setIsRenaming(false)} style={{
                                padding: "6px 10px", borderRadius: "7px",
                                border: "1px solid var(--color-border)",
                                background: "transparent", color: "var(--color-text-muted)",
                                fontSize: "0.82rem", cursor: "pointer",
                            }}>✕</button>
                        </form>
                    )}

                    {/* ── DROPDOWN MENU ── */}
                    {titleMenuOpen && (
                        <>
                            {/* Backdrop to close on outside click */}
                            <div onClick={() => setTitleMenuOpen(false)}
                                style={{ position: "fixed", inset: 0, zIndex: 290 }} />
                            <div style={{
                                position: "absolute", top: "calc(100% + 10px)", left: 0,
                                zIndex: 300, minWidth: "240px",
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "14px",
                                boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
                                overflow: "hidden",
                                padding: "6px 0",
                            }}>
                                {/* Home */}
                                <button onClick={() => { setTitleMenuOpen(false); router.push("/dashboard"); }} style={{
                                    display: "flex", alignItems: "center", gap: "10px", width: "100%",
                                    padding: "9px 16px", background: "none", border: "none",
                                    cursor: "pointer", color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 500,
                                    textAlign: "left", transition: "background 0.12s",
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = "var(--color-subtle)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.6 }}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
                                    Home
                                </button>

                                {/* Create new project */}
                                <button onClick={() => { setTitleMenuOpen(false); router.push("/dashboard"); }} style={{
                                    display: "flex", alignItems: "center", gap: "10px", width: "100%",
                                    padding: "9px 16px", background: "none", border: "none",
                                    cursor: "pointer", color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 500,
                                    textAlign: "left", transition: "background 0.12s",
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = "var(--color-subtle)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.6 }}><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>
                                    Create new project
                                </button>

                                {/* Rename project */}
                                <button onClick={() => { setTitleMenuOpen(false); setRenameValue(projectTitle); setIsRenaming(true); }} style={{
                                    display: "flex", alignItems: "center", gap: "10px", width: "100%",
                                    padding: "9px 16px", background: "none", border: "none",
                                    cursor: "pointer", color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 500,
                                    textAlign: "left", transition: "background 0.12s",
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = "var(--color-subtle)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.6 }}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                                    Rename project
                                </button>

                                {/* Divider */}
                                <div style={{ height: "1px", background: "var(--color-border)", margin: "6px 0" }} />

                                {/* Help */}
                                <button onClick={() => setTitleMenuOpen(false)} style={{
                                    display: "flex", alignItems: "center", gap: "10px", width: "100%",
                                    padding: "9px 16px", background: "none", border: "none",
                                    cursor: "pointer", color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 500,
                                    textAlign: "left", transition: "background 0.12s",
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = "var(--color-subtle)"}
                                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.6 }}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                                    Help
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* << collapse toggle */}
                {!isReadOnly && (
                    <button onClick={() => setSidebarOpen(o => !o)} title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                        style={{
                            display: "flex", alignItems: "center", justifyContent: "center",
                            width: "28px", height: "28px", borderRadius: "7px", flexShrink: 0,
                            border: "1px solid var(--color-border)", background: "var(--color-subtle)",
                            color: "var(--color-text-muted)", cursor: "pointer", transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = ct.primary; e.currentTarget.style.color = ct.primary; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}>
                        {sidebarOpen
                            ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" /></svg>
                            : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 5l7 7-7 7M6 5l7 7-7 7" /></svg>}
                    </button>
                )}

                {/* Design button container */}
                {!isReadOnly && (
                    <div style={{ position: "relative" }}>
                        <button onClick={() => {
                            setSidebarOpen(true);
                            setSidebarMode(m => m === "design" ? "chat" : "design");
                        }} style={{
                            display: "flex", alignItems: "center", gap: "6px", padding: "5px 13px",
                            borderRadius: "8px", background: sidebarMode === "design" ? "rgba(139,92,246,0.22)" : "rgba(139,92,246,0.10)",
                            border: "1px solid rgba(139,92,246,0.22)", color: "#7C3AED",
                            fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(139,92,246,0.22)"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = sidebarMode === "design" ? "rgba(139,92,246,0.22)" : "rgba(139,92,246,0.10)"; }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
                            </svg>
                            Design
                        </button>
                    </div>
                )}

                {/* SPACER */}
                <div style={{ flex: 1 }} />

                {/* RIGHT: Present · Share · Export · Upgrade · ··· · theme */}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    {[
                        { label: "Present", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2" /><polyline points="8 21 12 17 16 21" /><line x1="12" y1="17" x2="12" y2="21" /></svg> },
                        { label: "Share", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg> },
                        { label: "Export", icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> },
                    ].map(btn => (
                        <button key={btn.label} disabled={btn.label === "Export" && isExporting} onClick={async () => {
                            if (btn.label === "Present") {
                                setPresentationMode(true);
                                setCurrentSlide(0);
                            } else if (btn.label === "Share") {
                                const url = new URL(window.location.href);
                                url.searchParams.set("view", "true");
                                navigator.clipboard.writeText(url.toString());
                                setShareCopied(true);
                                setTimeout(() => setShareCopied(false), 2000);
                            } else if (btn.label === "Export" && !isExporting) {
                                setIsExporting(true);
                                // yield to React to render the "Exporting..." state
                                await new Promise(r => setTimeout(r, 50));
                                try {
                                    if (mainContentRef.current) {
                                        const el = mainContentRef.current;
                                        const html2canvas = (await import('html2canvas')).default;
                                        const { jsPDF } = await import('jspdf');

                                        // Temporarily allow the container to expand fully to capture everything
                                        const originalOverflowY = el.style.overflowY;
                                        const originalHeight = el.style.height;
                                        el.style.overflowY = "visible";
                                        el.style.height = "auto";

                                        const canvas = await html2canvas(el, {
                                            scale: 2,
                                            useCORS: true,
                                            logging: false,
                                            backgroundColor: stylingBgColor || '#ffffff',
                                            height: el.scrollHeight,
                                            windowHeight: el.scrollHeight
                                        });

                                        // Restore original styles
                                        el.style.overflowY = originalOverflowY;
                                        el.style.height = originalHeight;

                                        const imgData = canvas.toDataURL('image/png');
                                        
                                        const pdf = new jsPDF({
                                            orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
                                            unit: 'px',
                                            format: [canvas.width, canvas.height]
                                        });
                                        
                                        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                                        pdf.save('dashboard-export.pdf');
                                    }
                                } catch (error) {
                                    console.error('Failed to export PDF:', error);
                                } finally {
                                    setIsExporting(false);
                                }
                            }
                        }} style={{
                            display: "flex", alignItems: "center", gap: "5px", padding: "5px 11px",
                            borderRadius: "7px", border: "1px solid var(--color-border)",
                            background: (btn.label === "Share" && shareCopied) ? "rgba(16, 185, 129, 0.15)" : "var(--color-subtle)", 
                            color: (btn.label === "Share" && shareCopied) ? "#10B981" : "var(--color-text-secondary)",
                            fontSize: "0.78rem", fontWeight: 500, cursor: (btn.label === "Export" && isExporting) ? "wait" : "pointer", transition: "all 0.15s",
                            opacity: (btn.label === "Export" && isExporting) ? 0.7 : 1,
                        }}
                            onMouseEnter={e => { if (!(btn.label === "Export" && isExporting) && !(btn.label === "Share" && shareCopied)) { e.currentTarget.style.borderColor = ct.primary; e.currentTarget.style.color = ct.primary; } }}
                            onMouseLeave={e => { if (!(btn.label === "Export" && isExporting) && !(btn.label === "Share" && shareCopied)) { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; } }}>
                            {btn.label === "Export" && isExporting ? (
                                <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}>
                                        <g opacity="0.3"><circle cx="12" cy="12" r="10" /></g>
                                        <path d="M12 2v4" /><path d="M12 18v4" /><path d="M4.93 4.93l2.83 2.83" /><path d="M16.24 16.24l2.83 2.83" /><path d="M2 12h4" /><path d="M18 12h4" /><path d="M4.93 19.07l2.83-2.83" /><path d="M16.24 7.76l2.83-2.83" />
                                    </svg>
                                    Exporting...
                                </>
                            ) : btn.label === "Share" && shareCopied ? (
                                <>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                    Copied!
                                </>
                            ) : (
                                <>{btn.icon}{btn.label}</>
                            )}
                        </button>
                    ))}


                    {/* Theme toggle */}
                    <button onClick={toggle} className="theme-toggle" title="Toggle app theme">
                        {appTheme === "dark"
                            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></svg>
                            : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>}
                    </button>
                </div>
            </header>

            {/* ══ BODY (sidebar + main) ══ */}
            <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

                {/* ══ LEFT AI SIDEBAR ══ */}
                <aside style={{
                    width: sidebarOpen ? sidebarWidth : 0, flexShrink: 0,
                    overflow: "hidden",
                    transition: isResizing ? "none" : "width 0.25s ease",
                    borderRight: "1px solid var(--color-border)",
                    background: "var(--color-subtle)",
                    display: "flex", flexDirection: "column",
                    position: "relative",
                }}>
                    <div style={{ width: sidebarOpen ? sidebarWidth : 260, height: "100%", display: "flex", flexDirection: "column", overflowX: "hidden" }}>

                        {/* ── Scrollable section ── */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "16px 12px 8px", display: "flex", flexDirection: "column" }}>
                            {sidebarMode === "chat" ? (
                                <>

                                    {/* Chat messages */}
                                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px", minHeight: 0 }}>
                                        {chatMessages.map((m, i) => (
                                            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                                                <div style={{
                                                    maxWidth: "90%", padding: "8px 10px", borderRadius: "10px",
                                                    background: m.role === "user" ? `${ct.primary}15` : "var(--color-surface)",
                                                    border: `1px solid ${m.role === "user" ? `${ct.primary}25` : "var(--color-border)"}`,
                                                    fontSize: "0.76rem", lineHeight: 1.5,
                                                    color: m.role === "user" ? ct.primary : "var(--color-text-primary)",
                                                }}>
                                                    <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
                                                    {m.chart && (
                                                        <div style={{ marginTop: "12px", height: "260px", width: "100%", background: "var(--color-background)", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
                                                            <DynamicChartRenderer chart={m.chart} theme={ct} />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {thinking && (
                                            <div style={{ display: "flex", gap: "3px", padding: "8px 10px", width: "fit-content", borderRadius: "10px", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                                                {[0, 1, 2].map(i => <span key={i} style={{ width: "5px", height: "5px", borderRadius: "50%", background: ct.primary, display: "inline-block", animation: `pulse-glow 0.9s ${i * 0.2}s ease infinite` }} />)}
                                            </div>
                                        )}
                                        <div ref={chatEndRef} />
                                    </div>
                                </>
                            ) : showQuickBlocksGallery ? (
                                /* Quick Blocks Gallery View */
                                <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px", paddingLeft: "4px" }}>
                                        <button onClick={() => setShowQuickBlocksGallery(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", display: "flex", alignItems: "center", padding: 0 }}>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
                                        </button>
                                        <h2 style={{ fontSize: "1.05rem", fontWeight: 500, color: "var(--color-text-muted)", margin: 0 }}>Design / <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>Quick Blocks</span></h2>
                                    </div>

                                    {/* Search */}
                                    <div style={{ position: "relative", marginBottom: "20px" }}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}>
                                            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                        <input
                                            value={gallerySearch}
                                            onChange={e => setGallerySearch(e.target.value)}
                                            placeholder="Find quick blocks to add to your board"
                                            style={{
                                                width: "100%", padding: "10px 10px 10px 34px", borderRadius: "8px",
                                                border: "1px solid var(--color-border)", background: "var(--color-surface)",
                                                color: "var(--color-text-primary)", fontSize: "0.85rem", outline: "none"
                                            }}
                                        />
                                    </div>

                                    <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "24px", paddingRight: "4px" }}>
                                        {/* TEXT CATEGORY */}
                                        {(!gallerySearch || "text title board name".includes(gallerySearch.toLowerCase())) && (
                                            <div>
                                                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#637BF2", marginBottom: "12px" }}>Text</h3>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                                    {/* White Board Name */}
                                                    <div onClick={() => handleAddQuickBlock("visual_board", "Name Your Visual Board")} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8px", transition: "all 0.15s", minHeight: "90px" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                        <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800, textAlign: "center", color: "var(--color-text-primary)", lineHeight: 1.1 }}>Name Your Visual<br />Board</h4>
                                                        <span style={{ fontSize: "0.6rem", color: "#3B82F6", fontWeight: 600 }}>Jan 2024 - Present</span>
                                                    </div>
                                                    {/* Subtitle Board Name */}
                                                    <div onClick={() => handleAddQuickBlock("visual_board", "Named Visual Board")} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px 12px", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center", transition: "all 0.15s", minHeight: "90px" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                        <span style={{ fontSize: "0.55rem", color: "#3B82F6", fontWeight: 600 }}>What this board is about</span>
                                                        <h4 style={{ margin: "2px 0 0", fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-primary)", lineHeight: 1.1 }}>Name Your Visual<br />Board</h4>
                                                    </div>
                                                    {/* Dark Board Name */}
                                                    <div onClick={() => handleAddQuickBlock("visual_board", "Visual Board in Dark")} style={{ background: "#2D2D2D", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px 12px", cursor: "pointer", display: "flex", flexDirection: "column", justifyContent: "center", transition: "all 0.15s", minHeight: "90px" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                        <span style={{ fontSize: "0.5rem", color: "#FBBF24", fontWeight: 700, textTransform: "uppercase" }}>Company Name & Date</span>
                                                        <h4 style={{ margin: "4px 0 0", fontSize: "0.85rem", fontWeight: 700, color: "#fff", lineHeight: 1.1 }}>Visual Board in Dark<br />Background</h4>
                                                    </div>
                                                    {/* Blue Board Name */}
                                                    <div onClick={() => handleAddQuickBlock("visual_board", "Visual Board in Blue")} style={{ background: "#3B82F6", border: "1px solid #3B82F6", borderRadius: "8px", padding: "16px 12px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transition: "all 0.15s", minHeight: "90px" }} onMouseEnter={e => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.boxShadow = "0 0 0 2px #7C3AED"; }} onMouseLeave={e => { e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.boxShadow = "none"; }}>
                                                        <span style={{ fontSize: "0.5rem", color: "#FEF08A", fontWeight: 600 }}>Team name and date here</span>
                                                        <h4 style={{ margin: "4px 0 0", fontSize: "0.85rem", fontWeight: 700, color: "#fff", lineHeight: 1.1, textAlign: "center" }}>Visual Board in Blue<br />Background</h4>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* SUMMARY CATEGORY */}
                                        {(!gallerySearch || "summary text paragraph quote".includes(gallerySearch.toLowerCase())) && (
                                            <div>
                                                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#637BF2", marginBottom: "12px" }}>Summary</h3>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                                    {/* Paragraph Summary */}
                                                    <div onClick={() => handleAddQuickBlock("insights_table", "Summary")} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "8px", transition: "all 0.15s", minHeight: "120px" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                        <h4 style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Summary</h4>
                                                        <p style={{ margin: 0, fontSize: "0.6rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>San Francisco, officially the City and County of San Francisco, is a cultural, commercial, and financial center in the U.S. state of California.</p>
                                                    </div>
                                                    {/* List Summary */}
                                                    <div onClick={() => handleAddQuickBlock("insights_table", "Summary List")} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "16px 12px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "8px", transition: "all 0.15s", minHeight: "120px" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                        <h4 style={{ margin: 0, fontSize: "0.75rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Summary</h4>
                                                        <ul style={{ margin: 0, paddingLeft: "12px", fontSize: "0.6rem", color: "var(--color-text-secondary)", lineHeight: 1.4, display: "flex", flexDirection: "column", gap: "2px" }}>
                                                            <li>Line item 01</li>
                                                            <li>Line item 02</li>
                                                            <li>Line item 03</li>
                                                            <li>Line item 04</li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* CHARTS CATEGORY */}
                                        {(!gallerySearch || "chart graph data sales financial overview".includes(gallerySearch.toLowerCase())) && (
                                            <div>
                                                <h3 style={{ fontSize: "0.85rem", fontWeight: 700, color: "#637BF2", marginBottom: "12px" }}>Charts</h3>
                                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                                    {/* Bar Chart */}
                                                    <div onClick={() => handleAddQuickBlock("bar_chart", "Monthly Sales of Products (Units)")} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "10px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "8px", transition: "all 0.15s", minHeight: "100px" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                        <h4 style={{ margin: 0, fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Monthly Sales</h4>
                                                        <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", flex: 1, padding: "0 4px" }}>
                                                            <div style={{ flex: 1, background: "#7C3AED", height: "60%" }}></div>
                                                            <div style={{ flex: 1, background: "#7C3AED", height: "100%" }}></div>
                                                            <div style={{ flex: 1, background: "#7C3AED", height: "40%" }}></div>
                                                            <div style={{ flex: 1, background: "#7C3AED", height: "80%" }}></div>
                                                            <div style={{ flex: 1, background: "#7C3AED", height: "70%" }}></div>
                                                        </div>
                                                    </div>
                                                    {/* Pie Chart */}
                                                    <div onClick={() => handleAddQuickBlock("pie_chart", "Monthly expense distribution")} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "10px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "8px", transition: "all 0.15s", minHeight: "100px" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                        <h4 style={{ margin: 0, fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Expense Dist.</h4>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
                                                            <div style={{ width: "45px", height: "45px", borderRadius: "50%", border: "10px solid #3B82F6", borderTopColor: "#F59E0B", borderRightColor: "#10B981" }}></div>
                                                        </div>
                                                    </div>
                                                    {/* Area Chart */}
                                                    <div onClick={() => handleAddQuickBlock("bar_chart", "Financial Overview")} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "10px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "8px", transition: "all 0.15s", minHeight: "100px" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                        <h4 style={{ margin: 0, fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Financial Overview</h4>
                                                        <div style={{ flex: 1, background: "linear-gradient(to top right, rgba(124,58,237,0.2) 0%, transparent 100%)", borderBottom: "2px solid #7C3AED", position: "relative" }}>
                                                            <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: "50%", background: "linear-gradient(to top right, rgba(59,130,246,0.2) 0%, transparent 100%)", borderBottom: "2px solid #3B82F6" }}></div>
                                                        </div>
                                                    </div>
                                                    {/* Horizontal Bar Chart */}
                                                    <div onClick={() => handleAddQuickBlock("bar_chart", "Financial Overview (Horizontal)")} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "10px", cursor: "pointer", display: "flex", flexDirection: "column", gap: "8px", transition: "all 0.15s", minHeight: "100px" }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                        <h4 style={{ margin: 0, fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Financial Overview</h4>
                                                        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                                                            {[80, 70, 60, 90, 50].map((w, i) => (
                                                                <div key={i} style={{ height: "6px", background: "#7C3AED", width: `${w}%`, borderRadius: "3px" }}></div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                /* Design View inside Sidebar */
                                <div>
                                    <h2 style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "16px", paddingLeft: "4px" }}>Design</h2>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                        {/* STYLING SECTION */}
                                        <div style={{ display: "flex", flexDirection: "column", background: "var(--color-surface)", borderRadius: "8px", overflow: "visible" }}>
                                            <button onClick={() => setActiveDesignSection(s => s === "Styling" ? null : "Styling")} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                width: "100%", padding: "10px 14px",
                                                background: activeDesignSection === "Styling" ? "var(--color-surface)" : "var(--color-bg)", border: "none",
                                                borderRadius: activeDesignSection === "Styling" ? "8px 8px 0 0" : "8px",
                                                color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 500,
                                                cursor: "pointer", transition: "background 0.15s",
                                            }}>
                                                Styling
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--color-text-muted)", transform: activeDesignSection === "Styling" ? "scaleY(-1)" : "none", transition: "transform 0.2s" }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>

                                            {activeDesignSection === "Styling" && (
                                                <div style={{ padding: "4px 14px 14px", display: "flex", flexDirection: "column", gap: "20px" }}>
                                                    {selectedBlockId !== null && (
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                                                            {/* Title Styles Header */}
                                                            <span style={{ fontSize: "0.85rem", color: "#637BF2", fontWeight: 600 }}>Title styles</span>

                                                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                                                                {/* Font Family */}
                                                                <select value={blockStyles[selectedBlockId]?.fontFamily || "inherit"} onChange={(e) => updateSelectedBlockStyle({ fontFamily: e.target.value })} style={{
                                                                    padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--color-border)",
                                                                    background: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "0.8rem", outline: "none", cursor: "pointer"
                                                                }}>
                                                                    <option value="inherit">Roboto</option>
                                                                    <option value="Inter, sans-serif">Inter</option>
                                                                    <option value="'Times New Roman', serif">Times New Roman</option>
                                                                    <option value="monospace">Monospace</option>
                                                                </select>

                                                                {/* Heading Size */}
                                                                <select value={blockStyles[selectedBlockId]?.fontSize || "1rem"} onChange={(e) => updateSelectedBlockStyle({ fontSize: e.target.value })} style={{
                                                                    padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--color-border)",
                                                                    background: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "0.8rem", outline: "none", cursor: "pointer"
                                                                }}>
                                                                    <option value="1.5rem">Heading 1</option>
                                                                    <option value="1.25rem">Heading 2</option>
                                                                    <option value="1rem">Heading 3</option>
                                                                    <option value="0.875rem">Heading 4</option>
                                                                    <option value="0.75rem">Heading 5</option>
                                                                </select>
                                                            </div>

                                                            <div style={{ display: "flex", gap: "8px" }}>
                                                                <div style={{ display: "flex", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "6px", overflow: "hidden" }}>
                                                                    <button onClick={() => updateSelectedBlockStyle({ fontWeight: blockStyles[selectedBlockId]?.fontWeight === "bold" ? "400" : "bold" })} style={{ padding: "6px 10px", background: blockStyles[selectedBlockId]?.fontWeight === "bold" ? "rgba(99,123,242,0.15)" : "transparent", border: "none", color: blockStyles[selectedBlockId]?.fontWeight === "bold" ? "#637BF2" : "var(--color-text-primary)", cursor: "pointer", fontWeight: "bold" }}>B</button>
                                                                    <button onClick={() => updateSelectedBlockStyle({ fontStyle: blockStyles[selectedBlockId]?.fontStyle === "italic" ? "normal" : "italic" })} style={{ padding: "6px 10px", background: blockStyles[selectedBlockId]?.fontStyle === "italic" ? "rgba(99,123,242,0.15)" : "transparent", border: "none", borderLeft: "1px solid var(--color-border)", color: blockStyles[selectedBlockId]?.fontStyle === "italic" ? "#637BF2" : "var(--color-text-primary)", cursor: "pointer", fontStyle: "italic" }}>I</button>
                                                                    <button onClick={() => updateSelectedBlockStyle({ textDecoration: blockStyles[selectedBlockId]?.textDecoration === "underline" ? "none" : "underline" })} style={{ padding: "6px 10px", background: blockStyles[selectedBlockId]?.textDecoration === "underline" ? "rgba(99,123,242,0.15)" : "transparent", border: "none", borderLeft: "1px solid var(--color-border)", color: blockStyles[selectedBlockId]?.textDecoration === "underline" ? "#637BF2" : "var(--color-text-primary)", cursor: "pointer", textDecoration: "underline" }}>U</button>
                                                                    <button onClick={() => updateSelectedBlockStyle({ textDecoration: blockStyles[selectedBlockId]?.textDecoration === "line-through" ? "none" : "line-through" })} style={{ padding: "6px 10px", background: blockStyles[selectedBlockId]?.textDecoration === "line-through" ? "rgba(99,123,242,0.15)" : "transparent", border: "none", borderLeft: "1px solid var(--color-border)", color: blockStyles[selectedBlockId]?.textDecoration === "line-through" ? "#637BF2" : "var(--color-text-primary)", cursor: "pointer", textDecoration: "line-through" }}>S</button>
                                                                </div>

                                                                <div style={{ display: "flex", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "6px", overflow: "hidden" }}>
                                                                    <button onClick={() => updateSelectedBlockStyle({ textAlign: "left" })} style={{ padding: "6px 10px", background: (blockStyles[selectedBlockId]?.textAlign || "left") === "left" ? "rgba(99,123,242,0.15)" : "transparent", border: "none", color: (blockStyles[selectedBlockId]?.textAlign || "left") === "left" ? "#637BF2" : "var(--color-text-primary)", cursor: "pointer" }}>≡</button>
                                                                    <button onClick={() => updateSelectedBlockStyle({ textAlign: "center" })} style={{ padding: "6px 10px", background: blockStyles[selectedBlockId]?.textAlign === "center" ? "rgba(99,123,242,0.15)" : "transparent", border: "none", borderLeft: "1px solid var(--color-border)", color: blockStyles[selectedBlockId]?.textAlign === "center" ? "#637BF2" : "var(--color-text-primary)", cursor: "pointer" }}>Ⲷ</button>
                                                                    <button onClick={() => updateSelectedBlockStyle({ textAlign: "right" })} style={{ padding: "6px 10px", background: blockStyles[selectedBlockId]?.textAlign === "right" ? "rgba(99,123,242,0.15)" : "transparent", border: "none", borderLeft: "1px solid var(--color-border)", color: blockStyles[selectedBlockId]?.textAlign === "right" ? "#637BF2" : "var(--color-text-primary)", cursor: "pointer" }}>☰</button>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: "flex", gap: "8px" }}>
                                                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: "6px", background: "var(--color-surface)" }}>
                                                                    <span style={{ fontSize: "0.75rem" }}>Font color</span>
                                                                    <div style={{ position: "relative" }}>
                                                                        <input type="color" value={blockStyles[selectedBlockId]?.color || "#000000"} onChange={(e) => updateSelectedBlockStyle({ color: e.target.value })} style={{ width: "20px", height: "20px", padding: 0, border: "none", borderRadius: "50%", overflow: "hidden", cursor: "pointer" }} />
                                                                    </div>
                                                                </div>
                                                                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px", border: "1px solid var(--color-border)", borderRadius: "6px", background: "var(--color-surface)" }}>
                                                                    <span style={{ fontSize: "0.75rem" }}>Background</span>
                                                                    <div style={{ position: "relative" }}>
                                                                        <input type="color" value={blockStyles[selectedBlockId]?.background || "#ffffff"} onChange={(e) => updateSelectedBlockStyle({ background: e.target.value })} style={{ width: "20px", height: "20px", padding: 0, border: "none", borderRadius: "50%", overflow: "hidden", cursor: "pointer" }} />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div style={{ height: "1px", background: "var(--color-border)", margin: "10px 0 6px" }}></div>
                                                        </div>
                                                    )}

                                                    {/* Layout Cards */}
                                                    <div style={{ display: "flex", gap: "8px" }}>
                                                        {/* Blocks */}
                                                        <div onClick={() => setStylingLayout("Blocks")} style={{ flex: 1, cursor: "pointer", background: stylingLayout === "Blocks" ? "rgba(99,123,242,0.08)" : "var(--color-surface)", border: `1px solid ${stylingLayout === "Blocks" ? "#637BF2" : "transparent"}`, borderRadius: "6px", padding: "8px" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                                                <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: `2px solid ${stylingLayout === "Blocks" ? "#637BF2" : "var(--color-text-muted)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                    {stylingLayout === "Blocks" && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#637BF2" }} />}
                                                                </div>
                                                                <span style={{ fontSize: "0.75rem", color: stylingLayout === "Blocks" ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>Blocks</span>
                                                            </div>
                                                            <div style={{ width: "100%", aspectRatio: "1.2", border: `1px solid ${stylingLayout === "Blocks" ? "#637BF2" : "var(--color-border)"}`, background: "#BFBFBF", padding: "4px", display: "flex", flexDirection: "column", gap: "3px" }}>
                                                                <div style={{ height: "10px", background: "#fff", width: "100%", padding: "1px 3px", fontSize: "4px", fontWeight: "bold", color: "#333", display: "flex", alignItems: "center" }}>Title</div>
                                                                <div style={{ display: "flex", gap: "3px", flex: 1 }}>
                                                                    <div style={{ flex: 1, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg></div>
                                                                    <div style={{ flex: 1, background: "#fff", display: "flex", alignItems: "flex-end", gap: "1px", padding: "1px" }}>
                                                                        <div style={{ width: "20%", height: "40%", background: "#ddd" }} /><div style={{ width: "20%", height: "80%", background: "#ddd" }} /><div style={{ width: "20%", height: "60%", background: "#ddd" }} /><div style={{ width: "20%", height: "30%", background: "#ddd" }} />
                                                                    </div>
                                                                </div>
                                                                <div style={{ height: "16px", background: "#BFBFBF" }} />
                                                            </div>
                                                        </div>

                                                        {/* Paper */}
                                                        <div onClick={() => setStylingLayout("Paper")} style={{ flex: 1, cursor: "pointer", background: stylingLayout === "Paper" ? "rgba(99,123,242,0.08)" : "var(--color-surface)", border: `1px solid ${stylingLayout === "Paper" ? "#637BF2" : "transparent"}`, borderRadius: "6px", padding: "8px" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                                                <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: `2px solid ${stylingLayout === "Paper" ? "#637BF2" : "var(--color-text-muted)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                    {stylingLayout === "Paper" && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#637BF2" }} />}
                                                                </div>
                                                                <span style={{ fontSize: "0.75rem", color: stylingLayout === "Paper" ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>Paper</span>
                                                            </div>
                                                            <div style={{ width: "100%", aspectRatio: "1.2", border: `1px solid ${stylingLayout === "Paper" ? "#637BF2" : "var(--color-border)"}`, background: "#BFBFBF", padding: "0 6px", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" }}>
                                                                <div style={{ width: "80%", height: "100%", background: "#fff", padding: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                                                    <div style={{ fontSize: "4px", fontWeight: "bold", color: "#333", marginBottom: "2px" }}>Title</div>
                                                                    <div style={{ display: "flex", gap: "2px", height: "16px" }}>
                                                                        <div style={{ flex: 1, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg></div>
                                                                        <div style={{ flex: 1, background: "#fff", display: "flex", alignItems: "flex-end", gap: "1px" }}>
                                                                            <div style={{ width: "20%", height: "40%", background: "#ddd" }} /><div style={{ width: "20%", height: "80%", background: "#ddd" }} /><div style={{ width: "20%", height: "60%", background: "#ddd" }} /><div style={{ width: "20%", height: "30%", background: "#ddd" }} />
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ height: "1px", background: "#ddd", marginTop: "2px", width: "100%" }} />
                                                                    <div style={{ height: "1px", background: "#ddd", width: "95%" }} />
                                                                    <div style={{ height: "1px", background: "#ddd", width: "100%" }} />
                                                                    <div style={{ height: "1px", background: "#ddd", width: "80%" }} />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Seamless */}
                                                        <div onClick={() => setStylingLayout("Seamless")} style={{ flex: 1, cursor: "pointer", background: stylingLayout === "Seamless" ? "rgba(99,123,242,0.08)" : "var(--color-surface)", border: `1px solid ${stylingLayout === "Seamless" ? "#637BF2" : "transparent"}`, borderRadius: "6px", padding: "8px" }}>
                                                            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                                                                <div style={{ width: "14px", height: "14px", borderRadius: "50%", border: `2px solid ${stylingLayout === "Seamless" ? "#637BF2" : "var(--color-text-muted)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                    {stylingLayout === "Seamless" && <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#637BF2" }} />}
                                                                </div>
                                                                <span style={{ fontSize: "0.75rem", color: stylingLayout === "Seamless" ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>Seamless</span>
                                                            </div>
                                                            <div style={{ width: "100%", aspectRatio: "1.2", border: `1px solid ${stylingLayout === "Seamless" ? "#637BF2" : "var(--color-border)"}`, background: "#fff", padding: "4px", display: "flex", flexDirection: "column", gap: "2px" }}>
                                                                <div style={{ fontSize: "4px", fontWeight: "bold", color: "#333", marginBottom: "2px" }}>Title</div>
                                                                <div style={{ display: "flex", gap: "3px", height: "16px" }}>
                                                                    <div style={{ flex: 1, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg></div>
                                                                    <div style={{ flex: 1, background: "#fff", display: "flex", alignItems: "flex-end", gap: "1px" }}>
                                                                        <div style={{ width: "20%", height: "40%", background: "#ddd" }} /><div style={{ width: "20%", height: "80%", background: "#ddd" }} /><div style={{ width: "20%", height: "60%", background: "#ddd" }} /><div style={{ width: "20%", height: "30%", background: "#ddd" }} />
                                                                    </div>
                                                                </div>
                                                                <div style={{ height: "1px", background: "#ddd", marginTop: "2px", width: "100%" }} />
                                                                <div style={{ height: "1px", background: "#ddd", width: "95%" }} />
                                                                <div style={{ height: "1px", background: "#ddd", width: "100%" }} />
                                                                <div style={{ height: "1px", background: "#ddd", width: "80%" }} />
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Background Color */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-primary)", whiteSpace: "nowrap" }}>Background color</span>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap", flex: 1, justifyContent: "flex-end" }}>
                                                            {bgColors.map(c => (
                                                                <button key={c} onClick={() => selectedBlockId !== null ? updateSelectedBlockStyle({ background: c }) : setStylingBgColor(c)} style={{
                                                                    width: "14px", height: "14px", borderRadius: "50%",
                                                                    background: c, border: "none", cursor: "pointer",
                                                                    boxShadow: (selectedBlockId !== null ? blockStyles[selectedBlockId]?.background : stylingBgColor) === c ? `0 0 0 2px var(--color-surface), 0 0 0 3px ${c}` : "none",
                                                                    margin: (selectedBlockId !== null ? blockStyles[selectedBlockId]?.background : stylingBgColor) === c ? "2px" : "0"
                                                                }} />
                                                            ))}
                                                            <div style={{ position: "relative" }} ref={bgColorPickerRef}>
                                                                <button onClick={() => setShowBgColorPicker(!showBgColorPicker)} style={{ width: "16px", height: "16px", borderRadius: "50%", background: "var(--color-subtle)", border: "1px solid var(--color-border)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginLeft: "2px", transition: "all 0.15s", boxShadow: showBgColorPicker ? "0 0 0 2px var(--color-surface), 0 0 0 3px var(--color-border)" : "none" }}>
                                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>
                                                                </button>
                                                                {showBgColorPicker && (
                                                                    <div style={{
                                                                        position: "absolute", top: "24px", right: 0, width: showAdvancedColorPicker ? "260px" : "220px",
                                                                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                                                        borderRadius: "10px", padding: "14px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                                                                        zIndex: 100, display: "flex", flexDirection: "column"
                                                                    }}>
                                                                        {showAdvancedColorPicker ? (
                                                                            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                                                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                                                                                    <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--color-text-primary)" }}>More colors</span>
                                                                                    <button onClick={() => setShowAdvancedColorPicker(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "2px" }}>
                                                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                                                                    </button>
                                                                                </div>
                                                                                
                                                                                {/* Color Wheel Mockup + Overlay Input */}
                                                                                <div style={{ width: "200px", height: "200px", borderRadius: "50%", background: "conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)", margin: "0 auto", position: "relative", boxShadow: "inset 0 0 20px rgba(255,255,255,0.5)" }}>
                                                                                     <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, borderRadius: "50%", background: "radial-gradient(circle at center, #ffffff 0%, transparent 65%)", pointerEvents: "none" }} />
                                                                                     <input type="color" value={tempAdvancedColor} onChange={e => setTempAdvancedColor(e.target.value)} style={{ opacity: 0, width: "100%", height: "100%", position: "absolute", top: 0, left: 0, cursor: "crosshair" }} title="Click to open system color picker" />
                                                                                     
                                                                                     {/* Fake selector ring */}
                                                                                     <div style={{ position: "absolute", top: "65%", left: "65%", width: "16px", height: "16px", borderRadius: "50%", border: "3px solid white", boxShadow: "0 0 4px rgba(0,0,0,0.3)", pointerEvents: "none" }} />
                                                                                </div>
                                                                                
                                                                                {/* Slider Mockup */}
                                                                                <div style={{ width: "100%", height: "14px", borderRadius: "7px", background: `linear-gradient(to right, #000000, ${tempAdvancedColor})`, position: "relative" }}>
                                                                                     <input type="color" value={tempAdvancedColor} onChange={e => setTempAdvancedColor(e.target.value)} style={{ opacity: 0, width: "100%", height: "100%", position: "absolute", top: 0, left: 0, cursor: "pointer" }} />
                                                                                     <div style={{ position: "absolute", right: "-6px", top: "-3px", width: "20px", height: "20px", borderRadius: "50%", border: "3px solid white", background: tempAdvancedColor, boxShadow: "0 1px 4px rgba(0,0,0,0.3)", pointerEvents: "none" }} />
                                                                                </div>
                                                                                
                                                                                {/* Inputs */}
                                                                                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                                                                    <div style={{ position: "relative", width: "20px", height: "20px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", cursor: "crosshair", color: "var(--color-text-secondary)" }} title="Eyedropper (System Tool)">
                                                                                        <input type="color" value={tempAdvancedColor} onChange={e => setTempAdvancedColor(e.target.value)} style={{ position: "absolute", opacity: 0, cursor: "crosshair", width: "40px", height: "40px", left: "-10px", top: "-10px" }} />
                                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                                                                                    </div>
                                                                                    <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: tempAdvancedColor, border: "1px solid var(--color-border)" }} />
                                                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, justifySelf: "flex-end" }}>
                                                                                        <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginLeft: "auto" }}>Hex</span>
                                                                                        <input type="text" value={tempAdvancedColor} onChange={(e) => setTempAdvancedColor(e.target.value)} style={{ width: "80px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--color-border)", fontSize: "0.85rem", fontWeight: 500, textTransform: "uppercase", outline: "none", color: "var(--color-text-primary)", background: "var(--color-bg)" }} />
                                                                                    </div>
                                                                                </div>
                                                                                
                                                                                {/* Action Buttons */}
                                                                                <div style={{ display: "flex", gap: "8px", justifySelf: "flex-end", marginTop: "4px" }}>
                                                                                    <button onClick={() => {
                                                                                        if (selectedBlockId !== null) {
                                                                                            updateSelectedBlockStyle({ background: tempAdvancedColor });
                                                                                        } else {
                                                                                            setStylingBgColor(tempAdvancedColor);
                                                                                        }
                                                                                        setShowBgColorPicker(false);
                                                                                        setShowAdvancedColorPicker(false);
                                                                                    }} style={{ background: "#637BF2", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "opacity 0.15s" }} onMouseEnter={e => e.currentTarget.style.opacity="0.9"} onMouseLeave={e => e.currentTarget.style.opacity="1"}>Apply</button>
                                                                                    <button onClick={() => setShowAdvancedColorPicker(false)} style={{ background: "transparent", color: "var(--color-text-primary)", border: "1px solid var(--color-border)", padding: "8px 16px", borderRadius: "6px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background="var(--color-bg)"} onMouseLeave={e => e.currentTarget.style.background="transparent"}>Cancel</button>
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <>
                                                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                                                                                    {STANDARD_COLORS.map((c, idx) => (
                                                                                        <button key={idx} onClick={() => { selectedBlockId !== null ? updateSelectedBlockStyle({ background: c }) : setStylingBgColor(c); setShowBgColorPicker(false); }} title={c} style={{
                                                                                            width: "100%", aspectRatio: "1", borderRadius: "4px",
                                                                                            background: c === "transparent" ? "#fff" : c,
                                                                                            border: c === "transparent" ? "1px solid var(--color-border)" : c === "#FFFFFF" ? "1px dashed #ccc" : "none",
                                                                                            cursor: "pointer", position: "relative",
                                                                                            boxShadow: (selectedBlockId !== null ? blockStyles[selectedBlockId]?.background : stylingBgColor) === c ? `0 0 0 2px var(--color-surface), 0 0 0 3px #637BF2` : "none",
                                                                                            overflow: "hidden", padding: 0
                                                                                        }}>
                                                                                            {c === "transparent" && <div style={{ position: "absolute", top: "10px", left: "-6px", width: "30px", height: "1px", background: "#EF4444", transform: "rotate(-45deg)" }} />}
                                                                                            {(selectedBlockId !== null ? blockStyles[selectedBlockId]?.background : stylingBgColor) === c && c !== "transparent" && c !== "#FFFFFF" && (
                                                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={["#E5E7EB", "#FDE047", "#BEF264"].includes(c) ? "#000" : "#fff"} strokeWidth="3" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}><polyline points="20 6 9 17 4 12" /></svg>
                                                                                            )}
                                                                                            {(selectedBlockId !== null ? blockStyles[selectedBlockId]?.background : stylingBgColor) === c && c === "#FFFFFF" && (
                                                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}><polyline points="20 6 9 17 4 12" /></svg>
                                                                                            )}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
        
                                                                                <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", margin: "14px 0 8px" }}>
                                                                                    Theme colors ({COLOR_THEMES[chartTheme]?.label || "Creative"})
                                                                                </p>
                                                                                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px" }}>
                                                                                    {THEME_SPECIFIC_COLORS.map((c, idx) => (
                                                                                        <button key={`th-${idx}`} onClick={() => { selectedBlockId !== null ? updateSelectedBlockStyle({ background: c }) : setStylingBgColor(c); setShowBgColorPicker(false); }} title={c} style={{
                                                                                            width: "100%", aspectRatio: "1", borderRadius: "4px", background: c, border: c === "#FFFFFF" ? "1px dashed #ccc" : "none", cursor: "pointer", padding: 0,
                                                                                            boxShadow: (selectedBlockId !== null ? blockStyles[selectedBlockId]?.background : stylingBgColor) === c ? `0 0 0 2px var(--color-surface), 0 0 0 3px #637BF2` : "none", position: "relative"
                                                                                        }}>
                                                                                            {(selectedBlockId !== null ? blockStyles[selectedBlockId]?.background : stylingBgColor) === c && (
                                                                                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={c === "#FFFFFF" || ["#E5E7EB", "#FDE047", "#BEF264", "#F3E8FF"].includes(c) ? "#000" : "#fff"} strokeWidth="3" style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}><polyline points="20 6 9 17 4 12" /></svg>
                                                                                            )}
                                                                                        </button>
                                                                                    ))}
                                                                                </div>
        
                                                                                <button onClick={() => {
                                                                                    const currentCol = selectedBlockId !== null ? (blockStyles[selectedBlockId]?.background || "#ffffff") : stylingBgColor;
                                                                                    setTempAdvancedColor(currentCol);
                                                                                    setShowAdvancedColorPicker(true);
                                                                                }} style={{ background: "none", border: "none", color: "#637BF2", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px", marginTop: "16px", cursor: "pointer", padding: 0 }}>
                                                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                                                                    More colors
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Zoom */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-primary)" }}>Zoom</span>
                                                        <div style={{ display: "flex", alignItems: "center", border: "1px solid var(--color-border)", borderRadius: "6px", overflow: "hidden", flex: 1 }}>
                                                            {["50%", "75%", "100%", "125%", "150%", "Fit"].map((z, idx) => (
                                                                <button key={z} onClick={() => setStylingZoom(z)} style={{
                                                                    flex: 1, padding: "8px 0", background: stylingZoom === z ? "rgba(99,123,242,0.08)" : "var(--color-surface)",
                                                                    border: "none", borderRight: idx < 5 ? "1px solid var(--color-border)" : "none",
                                                                    color: stylingZoom === z ? "#637BF2" : "var(--color-text-primary)", fontSize: "0.7rem", fontWeight: stylingZoom === z ? 600 : 500, cursor: "pointer", transition: "all 0.15s"
                                                                }}>{z}</button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* THEMES SECTION */}
                                        <div style={{ display: "flex", flexDirection: "column", background: "var(--color-surface)", borderRadius: "8px", overflow: "hidden" }}>
                                            <button onClick={() => setActiveDesignSection(s => s === "Themes" ? null : "Themes")} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                width: "100%", padding: "10px 14px",
                                                background: activeDesignSection === "Themes" ? "var(--color-surface)" : "var(--color-bg)", border: "none",
                                                color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 500,
                                                cursor: "pointer", transition: "background 0.15s",
                                            }}>
                                                Themes
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--color-text-muted)", transform: activeDesignSection === "Themes" ? "scaleY(-1)" : "none", transition: "transform 0.2s" }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                            {activeDesignSection === "Themes" && (
                                                <div style={{ padding: "4px 14px 14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                                                    <span style={{ fontSize: "0.85rem", color: "#637BF2", fontWeight: 600 }}>Standard Themes</span>
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                                        {(Object.entries(COLOR_THEMES) as [ThemeKey, typeof COLOR_THEMES[ThemeKey]][]).map(([key, t]) => {
                                                            const pv = THEME_PREVIEWS[key] || { bg: "#ddd", color: "#333", dots: ["#fff", "#ccc", "#999"] };
                                                            const isActive = chartTheme === key;
                                                            return (
                                                                <div key={key} onClick={() => setChartTheme(key)} style={{
                                                                    padding: "3px", borderRadius: "8px", cursor: "pointer",
                                                                    border: `1px solid ${isActive ? "transparent" : "var(--color-border)"}`,
                                                                    boxShadow: isActive ? "0 0 0 1px #637BF2, 0 0 0 3px rgba(99,123,242,0.15)" : "none",
                                                                    background: "var(--color-surface)", transition: "all 0.15s"
                                                                }}>
                                                                    <div style={{
                                                                        background: pv.bg, borderRadius: "6px", padding: "12px",
                                                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                                                        position: "relative", minHeight: "38px"
                                                                    }}>
                                                                        {isActive && (
                                                                            <div style={{
                                                                                position: "absolute", top: "-4px", left: "-4px", width: "18px", height: "18px",
                                                                                background: "rgba(255, 255, 255, 0.5)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                                                                            }}>
                                                                                <div style={{ width: "12px", height: "12px", background: "#637BF2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4"><polyline points="20 6 9 17 4 12" /></svg>
                                                                                </div>
                                                                            </div>
                                                                        )}

                                                                        <span style={{ color: pv.color, fontSize: "0.75rem", fontWeight: 700, paddingLeft: isActive ? "14px" : "4px", transition: "padding 0.2s", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                                            {t.label}
                                                                        </span>

                                                                        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                                                                            {pv.dots.map((dColor, i) => (
                                                                                <div key={i} style={{
                                                                                    width: "12px", height: "12px", borderRadius: "50%", background: dColor,
                                                                                    marginLeft: i > 0 ? "-4px" : "0", border: `1.5px solid ${pv.bg}`,
                                                                                }} />
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* QUICK BLOCKS SECTION */}
                                        <div style={{ display: "flex", flexDirection: "column", background: "var(--color-surface)", borderRadius: "8px", overflow: "hidden" }}>
                                            <button onClick={() => setActiveDesignSection(s => s === "Quick Blocks" ? null : "Quick Blocks")} style={{
                                                display: "flex", alignItems: "center", justifyContent: "space-between",
                                                width: "100%", padding: "10px 14px",
                                                background: activeDesignSection === "Quick Blocks" ? "var(--color-surface)" : "var(--color-bg)", border: "none",
                                                color: "var(--color-text-primary)", fontSize: "0.85rem", fontWeight: 500,
                                                cursor: "pointer", transition: "background 0.15s",
                                            }}>
                                                Quick Blocks
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: "var(--color-text-muted)", transform: activeDesignSection === "Quick Blocks" ? "scaleY(-1)" : "none", transition: "transform 0.2s" }}>
                                                    <polyline points="6 9 12 15 18 9" />
                                                </svg>
                                            </button>
                                            {activeDesignSection === "Quick Blocks" && (
                                                <div style={{ padding: "14px" }}>
                                                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                                        {/* Block 1 */}
                                                        <div onClick={() => handleAddQuickBlock("visual_board", "Name Your Visual Board")} style={{
                                                            background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "12px",
                                                            cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px",
                                                            transition: "all 0.15s", minHeight: "80px"
                                                        }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                            <h4 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 800, textAlign: "center", color: "var(--color-text-primary)", lineHeight: 1.1 }}>Name Your Visual<br />Board</h4>
                                                            <span style={{ fontSize: "0.6rem", color: "#3B82F6", fontWeight: 600 }}>Jan 2024 - Present</span>
                                                        </div>

                                                        {/* Block 2 */}
                                                        <div onClick={() => handleAddQuickBlock("title_block", "Sales, Product, And Customer Insights")} style={{
                                                            background: "#7d8bda", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "12px",
                                                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                                                            transition: "all 0.15s", minHeight: "80px"
                                                        }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                            <h4 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 800, textAlign: "center", color: "#fff", lineHeight: 1.1 }}>Sales, Product, And<br/>Customer Insights</h4>
                                                        </div>

                                                        {/* Block 3 - Bar Chart */}
                                                        <div onClick={() => handleAddQuickBlock("bar_chart", "Monthly Sales of Products (Units)")} style={{
                                                            background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "8px",
                                                            cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px",
                                                            transition: "all 0.15s", minHeight: "80px"
                                                        }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                            <h4 style={{ margin: 0, fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Monthly Sales</h4>
                                                            <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "40px", padding: "0 4px" }}>
                                                                <div style={{ flex: 1, background: "#7C3AED", height: "60%", borderRadius: "2px 2px 0 0" }}></div>
                                                                <div style={{ flex: 1, background: "#7C3AED", height: "100%", borderRadius: "2px 2px 0 0" }}></div>
                                                                <div style={{ flex: 1, background: "#7C3AED", height: "40%", borderRadius: "2px 2px 0 0" }}></div>
                                                                <div style={{ flex: 1, background: "#7C3AED", height: "80%", borderRadius: "2px 2px 0 0" }}></div>
                                                                <div style={{ flex: 1, background: "#7C3AED", height: "70%", borderRadius: "2px 2px 0 0" }}></div>
                                                            </div>
                                                        </div>

                                                        {/* Block 4 - Pie Chart */}
                                                        <div onClick={() => handleAddQuickBlock("pie_chart", "Monthly expense distribution")} style={{
                                                            background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "8px",
                                                            cursor: "pointer", display: "flex", flexDirection: "column", gap: "6px",
                                                            transition: "all 0.15s", minHeight: "80px"
                                                        }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                            <h4 style={{ margin: 0, fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Expense Dist.</h4>
                                                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
                                                                <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "8px solid #3B82F6", borderTopColor: "#F59E0B", borderRightColor: "#10B981" }}></div>
                                                            </div>
                                                        </div>

                                                        {/* Block 5 - Table */}
                                                        <div onClick={() => handleAddQuickBlock("data_table", "Data Table")} style={{
                                                            background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "8px", padding: "8px",
                                                            cursor: "pointer", display: "flex", flexDirection: "column", gap: "4px",
                                                            transition: "all 0.15s", minHeight: "80px", gridColumn: "span 2"
                                                        }} onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                                                            <h4 style={{ margin: 0, fontSize: "0.65rem", fontWeight: 700, color: "var(--color-text-primary)" }}>Data Table</h4>
                                                            <div style={{ borderRadius: "4px", overflow: "hidden", border: "1px solid var(--color-border)" }}>
                                                                <div style={{ background: "#3B82F6", height: "12px", width: "100%" }}></div>
                                                                <div style={{ display: "flex", flexDirection: "column" }}>
                                                                    <div style={{ height: "10px", width: "100%", borderBottom: "1px solid var(--color-border)" }}></div>
                                                                    <div style={{ height: "10px", width: "100%", borderBottom: "1px solid var(--color-border)" }}></div>
                                                                    <div style={{ height: "10px", width: "100%" }}></div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* See all button */}
                                                    <div style={{ textAlign: "center", marginTop: "12px", paddingBottom: "12px" }}>
                                                        <button onClick={() => setShowQuickBlocksGallery(true)} style={{
                                                            background: "none", border: "none", cursor: "pointer", color: "var(--color-text-secondary)",
                                                            fontSize: "0.8rem", fontWeight: 500, display: "inline-flex", alignItems: "center", gap: "4px"
                                                        }} onMouseEnter={e => e.currentTarget.style.color = "#7C3AED"} onMouseLeave={e => e.currentTarget.style.color = "var(--color-text-secondary)"}>
                                                            See all <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div> {/* end scrollable section */}

                        {/* ── Fixed AI input at bottom ── */}
                        <div style={{
                            padding: "10px 12px 12px",
                            background: "var(--color-subtle)",
                            flexShrink: 0,
                            borderTop: sidebarMode === "chat" ? "1px solid var(--color-border)" : "none",
                        }}>
                            {sidebarMode === "chat" ? (
                                <div style={{ display: "flex", flexDirection: "column", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-surface)", transition: "border-color 0.2s" }}>
                                    {selectedBlockId !== null && (
                                        <div style={{
                                            display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(99,123,242,0.1)",
                                            color: "#637BF2", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem",
                                            fontWeight: 600, border: "1px solid rgba(99,123,242,0.2)", width: "fit-content", marginBottom: "8px"
                                        }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                            {WIDGETS.find(w => w.id === selectedBlockId)?.title || `Block ${selectedBlockId}`}
                                            <button onClick={() => setSelectedBlockId(null)} style={{ background: "none", border: "none", color: "#637BF2", cursor: "pointer", display: "flex", alignItems: "center", padding: "0 2px" }}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            </button>
                                        </div>
                                    )}
                                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") handleSend(); }}
                                        placeholder={selectedBlockId !== null ? "Ask AI to edit this block..." : "Ask AI to edit your dashboard"}
                                        style={{ flex: 1, background: "none", border: "none", outline: "none", fontSize: "0.85rem", color: "var(--color-text-primary)", marginBottom: "16px" }} />

                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px" }}>
                                        <div style={{ width: "1px", height: "18px", background: "var(--color-border)" }} />
                                        <button title="History" style={{ background: "none", border: "none", cursor: "pointer", color: "#637BF2", display: "flex", padding: 0 }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                        </button>
                                        <button title="Voice" style={{ background: "none", border: "none", cursor: "pointer", color: "#637BF2", display: "flex", padding: 0 }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                        </button>
                                        <button onClick={handleSend} title="Send" style={{ background: "none", border: "none", cursor: "pointer", color: "#637BF2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ display: "flex", flexDirection: "column", padding: "12px", borderRadius: "8px", border: "1px solid var(--color-border)", background: "var(--color-surface)", transition: "border-color 0.2s" }}>
                                    <button onClick={() => setSidebarMode("chat")} style={{
                                        display: "flex", alignItems: "center", gap: "6px", padding: 0,
                                        color: "var(--color-text-muted)", fontSize: "0.75rem", fontWeight: 500,
                                        background: "none", border: "none", cursor: "pointer", marginBottom: "12px"
                                    }}>
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
                                        Back to Chat
                                    </button>

                                    {selectedBlockId !== null && (
                                        <div style={{
                                            display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(99,123,242,0.1)",
                                            color: "#637BF2", padding: "4px 8px", borderRadius: "12px", fontSize: "0.75rem",
                                            fontWeight: 600, border: "1px solid rgba(99,123,242,0.2)", width: "fit-content", marginBottom: "8px"
                                        }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                                            {WIDGETS.find(w => w.id === selectedBlockId)?.title || `Block ${selectedBlockId}`}
                                            <button onClick={() => setSelectedBlockId(null)} style={{ background: "none", border: "none", color: "#637BF2", cursor: "pointer", display: "flex", alignItems: "center", padding: "0 2px" }}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                            </button>
                                        </div>
                                    )}

                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px" }}>
                                        <div style={{ width: "1px", height: "18px", background: "var(--color-border)" }} />
                                        <button title="History" style={{ background: "none", border: "none", cursor: "pointer", color: "#637BF2", display: "flex", padding: 0 }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                        </button>
                                        <button title="Voice" style={{ background: "none", border: "none", cursor: "pointer", color: "#637BF2", display: "flex", padding: 0 }}>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></svg>
                                        </button>
                                        <button onClick={handleSend} title="Send" style={{ background: "none", border: "none", cursor: "pointer", color: "#637BF2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, padding: 0 }}>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div> {/* end 260 width container */}

                    {/* Resize Handle */}
                    {sidebarOpen && (
                        <div
                            onMouseDown={(e) => {
                                e.preventDefault();
                                setIsResizing(true);
                                document.body.style.cursor = "col-resize";
                            }}
                            style={{
                                position: "absolute", top: 0, right: 0, width: "4px", height: "100%",
                                cursor: "col-resize", zIndex: 10,
                                background: "transparent", transition: "background 0.2s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(124,58,237,0.3)"}
                            onMouseLeave={(e) => { if (!isResizing) e.currentTarget.style.background = "transparent"; }}
                        />
                    )}
                </aside>

                {/* ══ MAIN DASHBOARD CONTENT ══ */}
                <main ref={mainContentRef} onClick={(e) => { if (e.target === e.currentTarget) setSelectedBlockId(null); }} style={{ flex: 1, overflowX: "hidden", overflowY: "auto", position: "relative", background: stylingBgColor, transition: "background 0.3s ease", containerType: "inline-size", containerName: "dashboard" }}>
                    {/* Zoom & Layout Wrapper - key ensures redraw when width changes */}
                    <div key={containerWidthKey} onClick={(e) => { if (e.target === e.currentTarget) setSelectedBlockId(null); }} style={{
                        transform: `scale(${stylingZoom === "Fit" ? 1 : parseInt(stylingZoom) / 100})`,
                        transformOrigin: "top center",
                        transition: "transform 0.2s ease",
                        minHeight: "100%",
                        padding: stylingZoom !== "Fit" ? "20px 0" : "0"
                    }}>
                        <div onClick={(e) => { if (e.target === e.currentTarget) setSelectedBlockId(null); }} style={{
                            background: stylingLayout === "Paper" ? "var(--color-surface)" : "transparent",
                            borderRadius: stylingLayout === "Paper" ? "12px" : "0",
                            boxShadow: stylingLayout === "Paper" ? "0 4px 24px rgba(0,0,0,0.08)" : "none",
                            padding: stylingLayout === "Paper" ? "32px" : "20px 24px",
                            maxWidth: stylingLayout === "Paper" ? "100%" : "100%",
                            margin: stylingLayout === "Paper" ? "0 auto" : "0",
                            minHeight: "100%",
                            transition: "all 0.3s ease"
                        }}>


                            {/* ═══ DYNAMIC DASHBOARD GRID ═══ */}
                            <div onClick={(e) => { if (e.target === e.currentTarget) setSelectedBlockId(null); }} style={{
                                width: "100%", display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "16px",
                                paddingBottom: "32px",
                                alignItems: "stretch", position: "relative"
                            }} className="dashboard-grid">
                                
                                {/* Vertical resize guidelines overlay */}
                                {resizingWidgetId !== null && (
                                    <div style={{
                                        position: "absolute", top: 0, bottom: 0, left: 0, right: 0,
                                        pointerEvents: "none", zIndex: 100,
                                        display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "16px"
                                    }}>
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div key={i} style={{ 
                                                borderRight: "1px dashed rgba(124,58,237,0.25)", 
                                                borderLeft: i === 0 ? "1px dashed rgba(124,58,237,0.25)" : "none",
                                                background: "rgba(124,58,237,0.015)" 
                                            }} />
                                        ))}
                                    </div>
                                )}

                                {orderedWidgets.map((w, i) => w && (
                                    <Widget key={w.id} id={w.id} title={w.title} subtitle={(w as any).subtitle} explanation={w.explanation}
                                        layout={stylingLayout} isSelected={selectedBlockId === w.id}
                                        customStyles={blockStyles[w.id]} size={w.size as any}
                                        themeColor={ct.primary} hideHeader={w.type === "insights_table" || w.type === "new_block_placeholder"}
                                        widgetHeight={widgetHeights[w.id] ?? 360}
                                        onHeightChange={(h) => handleWidgetHeightChange(w.id, h)}
                                        onWidthChange={(size) => handleWidgetWidthChange(w.id, size)}
                                        onResizeStart={() => setResizingWidgetId(w.id)}
                                        onResizeEnd={() => setResizingWidgetId(null)}
                                        onAddAbove={() => handleAddAbove(w.id)}
                                        onClick={() => handleBlockClick(w.id)} onDragStart={() => handleDragStart(i)} onDrop={() => handleDrop(i)}
                                        onDelete={() => handleDeleteWidget(w.id)} onEditTitle={(newT) => handleEditWidgetTitle(w.id, newT)}
                                        onEditSubtitle={(newS) => handleEditWidgetSubtitle(w.id, newS)}
                                        onEditExplanation={(newE) => handleEditWidgetExplanation(w.id, newE)}>
                                        {(w as any).content}
                                    </Widget>
                                ))}

                            </div>


                        </div>
                    </div>
                </main>

                {/* ══ PRESENTATION MODE OVERLAY ══ */}
                {presentationMode && (
                    <div style={{
                        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                        zIndex: 9999, background: currentSlide === 0 ? ct.primary : (appTheme === "dark" ? "#0f172a" : "#ffffff"),
                        display: "flex", flexDirection: "column",
                        animation: "fadeIn 0.3s ease",
                    }}>
                        {/* Exit button */}
                        <button onClick={() => setPresentationMode(false)} style={{
                            position: "absolute", top: "24px", right: "32px",
                            background: "rgba(0,0,0,0.1)", border: "none", color: currentSlide === 0 ? "#fff" : "var(--color-text-secondary)",
                            width: "40px", height: "40px", borderRadius: "50%", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10
                        }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        </button>

                        {/* Slide Content */}
                        <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "60px 40px", overflowY: "auto", width: "100%" }}>
                            {currentSlide === 0 && (
                                <div style={{ textAlign: "center", color: "#fff" }}>
                                    <h1 style={{ fontSize: "4rem", fontWeight: 800, marginBottom: "20px", letterSpacing: "-0.02em" }}>{projectTitle}</h1>
                                    <p style={{ fontSize: "1.2rem", opacity: 0.8 }}>Use Arrow Keys to Navigate</p>
                                </div>
                            )}

                            {pMetrics.length > 0 && currentSlide === 1 && (
                                <div style={{ maxWidth: "1200px", width: "100%", textAlign: "center" }}>
                                    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: ct.primary, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "40px" }}>Key Metrics</div>
                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "24px" }}>
                                        {pMetrics.map(w => (
                                            <div key={w!.id} style={{ background: "var(--color-surface)", padding: "30px 20px", borderRadius: "20px", border: `2px solid ${ct.primary}20` }}>
                                                {w!.type === "regional_card" ? (
                                                    <>
                                                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>{w!.title}</div>
                                                        <div style={{ fontSize: "2.4rem", fontWeight: 800, color: ct.primary, marginBottom: "8px" }}>${(((w as any).payload?.revenue || 0) / 1000).toFixed(1)}K</div>
                                                        <div style={{ fontSize: "1rem", color: "var(--color-text-secondary)" }}>{((w as any).payload?.units || 0).toLocaleString()} units</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "16px" }}>{w!.title || (w as any).payload?.label}</div>
                                                        <div style={{ fontSize: "2.4rem", fontWeight: 800, color: ct.primary, marginBottom: "8px" }}>{(w as any).payload?.value}</div>
                                                        <div style={{ fontSize: "1rem", color: "var(--color-text-secondary)" }}>{(w as any).payload?.sub}</div>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {pWidgets.map((w, idx) => {
                                const slideIdx = (pMetrics.length > 0 ? 1 : 0) + 1 + idx;
                                if (currentSlide !== slideIdx) return null;
                                
                                const lines = w!.explanation ? w!.explanation.split('\n') : null;
                                const isTextBased = ["overview_text", "brand_insights", "text_editor", "insights_table", "insights_list"].includes(w!.type);
                                
                                return (
                                    <div key={w!.id} style={{ maxWidth: "1200px", width: "100%", animation: "fadeIn 0.3s ease" }}>
                                        <div style={{ fontSize: "1.2rem", fontWeight: 700, color: ct.primary, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "20px" }}>{w!.title}</div>
                                        
                                        <div style={{ display: "grid", gridTemplateColumns: (isTextBased || !lines || lines.length === 0) ? "1fr" : "1.8fr 1fr", gap: "30px", alignItems: "stretch" }}>
                                            <div style={{ background: "var(--color-surface)", padding: isTextBased ? "40px" : "30px", borderRadius: "16px", border: "1px solid var(--color-border)", minHeight: isTextBased ? "auto" : "400px", display: "flex", flexDirection: "column" }}>
                                                <div style={{ flex: 1, pointerEvents: "none", display: "flex", flexDirection: "column", height: "100%" }}>
                                                    {(w as any).content}
                                                </div>
                                            </div>
                                            
                                            {(!isTextBased && lines && lines.length > 0) && (
                                                <InsightsBox theme={ct} insights={lines} />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Slide navigation indicators */}
                        <div style={{ display: "flex", justifyContent: "center", gap: "12px", padding: "30px", marginTop: "auto" }}>
                            {Array.from({ length: totalSlides }).map((_, i) => (
                                <button key={i} onClick={() => setCurrentSlide(i)} style={{
                                    width: i === currentSlide ? "32px" : "12px",
                                    height: "12px", borderRadius: "6px",
                                    background: currentSlide === 0 
                                        ? (i === currentSlide ? "#fff" : "rgba(255,255,255,0.4)") 
                                        : (i === currentSlide ? ct.primary : "var(--color-border)"),
                                    border: "none", cursor: "pointer", transition: "all 0.3s"
                                }} />
                            ))}
                        </div>
                    </div>
                )}
            </div >

            <style>{`
        .dashboard-grid { transition: all 0.2s ease-out; }
        .dashboard-widget { grid-column: span var(--widget-span, 12); transition: grid-column 0.2s ease-out; }
        @container dashboard (max-width:1200px) { 
            .dashboard-widget { grid-column: span max(6, var(--widget-span, 12)); } 
        }
        @container dashboard (max-width:768px) { 
            .dashboard-widget { grid-column: span 12; } 
        }
    `}</style>
        </div >
    );
}
