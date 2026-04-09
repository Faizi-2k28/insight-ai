import React from 'react';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

export interface ChartConfig {
    type: string;
    title: string;
    description?: string;
    config: any;
    chart_data: {
        data?: any[];
        total?: number;
        correlation?: number;
        aggregation?: string;
        axis_label?: string;
        min?: number;
        q1?: number;
        median?: number;
        q3?: number;
        max?: number;
        outliers?: number[];
        [key: string]: any;
    };
}

export interface DynamicChartRendererProps {
    chart: ChartConfig;
    theme?: { primary: string; secondary: string; positive: string; negative: string; [key: string]: string };
}

class ErrorBoundary extends React.Component<{ fallback: React.ReactNode, children: React.ReactNode }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() { return { hasError: true }; }
    componentDidCatch(error: any, errorInfo: any) { console.error("Chart Render Error:", error, errorInfo); }
    render() {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}

const COLORS = ["#00D1FF", "#8B5CF6", "#3ECF8E", "#F97316", "#EC4899", "#EAB308", "#14B8A6"];

export default function DynamicChartRenderer({ chart, theme }: DynamicChartRendererProps) {
    const primaryColor = theme?.primary || "#00D1FF";
    const secondaryColor = theme?.secondary || "#8B5CF6";

    const { type, config, chart_data } = chart;

    // Special handling for box plots which may have flat data (no .data array)
    if (type === 'box') {
        return (
            <ErrorBoundary fallback={<div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>Failed to render chart data.</div>}>
                <BoxPlotRenderer chart_data={chart_data} config={config} primaryColor={primaryColor} />
            </ErrorBoundary>
        );
    }

    const data = chart_data?.data || [];

    if (!data || data.length === 0) {
        return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>No data available</div>;
    }

    const renderChart = () => {
        switch (type) {
            case 'bar':
                const barX = config.categorical_column || config.column || 'name';
                const barY = config.numeric_column || 'value';
                
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                            <XAxis dataKey={barX} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}K` : val} />
                            <RechartsTooltip cursor={{ fill: 'rgba(128,128,128,0.05)' }} contentStyle={{ background: 'rgba(15,15,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey={barY} name={config.numeric_column || "Value"} radius={[4, 4, 0, 0]} fill={primaryColor}>
                                {data.map((_: any, i: number) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                );

            case 'line':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                            <XAxis dataKey="x" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}K` : val} />
                            <RechartsTooltip contentStyle={{ background: 'rgba(15,15,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                            <Line type="monotone" dataKey="y" name={config.y_column} stroke={primaryColor} strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                );

            case 'pie':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                                {data.map((_: any, i: number) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <RechartsTooltip contentStyle={{ background: 'rgba(15,15,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} formatter={(val: any) => typeof val === 'number' ? val.toLocaleString() : val} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                        </PieChart>
                    </ResponsiveContainer>
                );

            case 'scatter':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
                            <XAxis type="number" dataKey="x" name={config.x_column} tick={{ fontSize: 11, opacity: 0.6 }} axisLine={false} tickLine={false} />
                            <YAxis type="number" dataKey="y" name={config.y_column} tick={{ fontSize: 11, opacity: 0.6 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'rgba(15,15,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                            <Scatter name={chart.title} data={data} fill={secondaryColor} />
                        </ScatterChart>
                    </ResponsiveContainer>
                );

            case 'histogram':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                            <XAxis dataKey="bin" tick={{ fontSize: 10, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} />
                            <RechartsTooltip cursor={{ fill: 'rgba(128,128,128,0.05)' }} contentStyle={{ background: 'rgba(15,15,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                            <Bar dataKey="count" name="Frequency" fill={primaryColor} radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                );

            default:
                return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>Unsupported Chart Type: {type}</div>;
        }
    };

    return (
        <ErrorBoundary fallback={<div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: '#EF4444' }}>Failed to render chart data.</div>}>
            {renderChart()}
        </ErrorBoundary>
    );
}

/* ═══════════════════════════════════════
   BOX PLOT RENDERER (handles both flat and grouped data)
═══════════════════════════════════════ */
function BoxPlotRenderer({ chart_data, config, primaryColor }: { chart_data: any; config: any; primaryColor: string }) {
    // Grouped box plot: chart_data.data is an array of { category, min, q1, median, q3, max }
    if (Array.isArray(chart_data?.data) && chart_data.data.length > 0) {
        return (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart_data.data} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.6 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip cursor={{ fill: 'rgba(128,128,128,0.05)' }} contentStyle={{ background: 'rgba(15,15,35,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }} />
                    <Bar dataKey="median" name="Median" fill={primaryColor} radius={[2, 2, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        );
    }

    // Single-column box plot: flat dict with min, q1, median, q3, max
    if (chart_data?.median !== undefined) {
        const stats = [
            { label: "Min", value: chart_data.min },
            { label: "Q1", value: chart_data.q1 },
            { label: "Median", value: chart_data.median },
            { label: "Q3", value: chart_data.q3 },
            { label: "Max", value: chart_data.max },
        ];
        const outlierCount = chart_data.outliers?.length || 0;
        const col = config?.column || "Value";

        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px 20px', gap: '12px' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {col} Distribution
                </div>
                {/* Visual range bar */}
                <div style={{ position: 'relative', height: '32px', margin: '8px 0', background: 'rgba(128,128,128,0.08)', borderRadius: '6px', overflow: 'hidden' }}>
                    {(() => {
                        const range = chart_data.max - chart_data.min || 1;
                        const q1Pct = ((chart_data.q1 - chart_data.min) / range) * 100;
                        const q3Pct = ((chart_data.q3 - chart_data.min) / range) * 100;
                        const medPct = ((chart_data.median - chart_data.min) / range) * 100;
                        return (
                            <>
                                {/* IQR box */}
                                <div style={{ position: 'absolute', left: `${q1Pct}%`, width: `${q3Pct - q1Pct}%`, top: '4px', bottom: '4px', background: `${primaryColor}30`, border: `2px solid ${primaryColor}`, borderRadius: '4px' }} />
                                {/* Median line */}
                                <div style={{ position: 'absolute', left: `${medPct}%`, top: '2px', bottom: '2px', width: '3px', background: primaryColor, borderRadius: '2px' }} />
                            </>
                        );
                    })()}
                </div>
                {/* Stats grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                    {stats.map(s => (
                        <div key={s.label} style={{ textAlign: 'center', padding: '8px 4px', background: 'rgba(128,128,128,0.04)', borderRadius: '8px' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: '4px' }}>{s.label}</div>
                            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{typeof s.value === 'number' ? s.value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}</div>
                        </div>
                    ))}
                </div>
                {outlierCount > 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#F97316', marginTop: '4px' }}>
                        ⚠️ {outlierCount} outlier{outlierCount > 1 ? 's' : ''} detected beyond 1.5×IQR
                    </div>
                )}
            </div>
        );
    }

    return <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>No box plot data available</div>;
}
