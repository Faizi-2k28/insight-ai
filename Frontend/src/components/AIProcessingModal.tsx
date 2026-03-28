"use client";
import { useState, useEffect, useRef } from "react";

/* ─── Types ─── */
type Stage = "processing" | "recommendation" | "override" | "training" | "model_selection";
type ModelType = "supervised" | "unsupervised" | "timeseries";

interface Props {
    fileName: string;
    onClose: () => void;
    onGenerate: (config: { modelType: ModelType; targetLabel: string }) => void;
}

/* ─── Fake column names for the label dropdown ─── */
const FAKE_COLUMNS = [
    "Price", "Sales", "Revenue", "Category", "Region",
    "Date", "CustomerAge", "Churn", "Score", "Units",
];

/* ─── Processing steps ─── */
const STEPS = [
    "Reading Dataset...",
    "Removing Duplicates",
    "Handling Null Values",
    "Encoding Categorical Data",
    "Normalizing Features",
    "Identifying Model Type...",
];

/* ─── Header status text that cycles during Stage A ─── */
const HEADER_STATES = [
    "Reading Dataset...",
    "Cleaning Missing Values...",
    "Optimizing Features...",
    "Running AutoML Analysis...",
];

/* ─── Supervised model definitions ─── */
interface TrainedModel {
    name: string;
    icon: string;
    accuracy: number;
    color: string;
    status: "pending" | "training" | "done";
}

const SUPERVISED_MODELS: TrainedModel[] = [
    { name: "Random Forest", icon: "🌲", accuracy: 92.4, color: "#3ECF8E", status: "pending" },
    { name: "XGBoost", icon: "⚡", accuracy: 95.1, color: "#00D1FF", status: "pending" },
    { name: "Neural Network", icon: "🧠", accuracy: 89.7, color: "#8B5CF6", status: "pending" },
];

const UNSUPERVISED_MODELS: TrainedModel[] = [
    { name: "k-Means Clustering", icon: "🎯", accuracy: 88.5, color: "#3ECF8E", status: "pending" },
    { name: "PCA (Principal Component Analysis)", icon: "📉", accuracy: 91.2, color: "#00D1FF", status: "pending" },
    { name: "Association Rule Learning (Apriori)", icon: "🔗", accuracy: 85.4, color: "#8B5CF6", status: "pending" },
];

/* ─── Training progress messages ─── */
const TRAINING_MESSAGES = [
    "Splitting data into train/test sets...",
    "Training Random Forest...",
    "Training XGBoost...",
    "Training Neural Network...",
    "Evaluating model performance...",
    "Computing accuracy scores...",
];

export default function AIProcessingModal({ fileName, onClose, onGenerate }: Props) {
    const [stage, setStage] = useState<Stage>("processing");
    const [checkedCount, setCheckedCount] = useState(0);
    const [headerIdx, setHeaderIdx] = useState(0);
    const [modelType, setModelType] = useState<ModelType>("supervised");
    const [showOverride, setShowOverride] = useState(false);
    const [targetLabel, setTargetLabel] = useState("No Target Label");
    const [labelSearch, setLabelSearch] = useState("");
    const [labelOpen, setLabelOpen] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [progress, setProgress] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    /* ─── Training state ─── */
    const [trainedModels, setTrainedModels] = useState<TrainedModel[]>(SUPERVISED_MODELS.map(m => ({ ...m })));
    const [trainingIdx, setTrainingIdx] = useState(0);
    const [trainingProgress, setTrainingProgress] = useState(0);
    const [trainingMsg, setTrainingMsg] = useState(TRAINING_MESSAGES[0]);
    const [selectedModel, setSelectedModel] = useState<string>("");

    /* ── Tick checkboxes one-by-one ── */
    useEffect(() => {
        if (stage !== "processing") return;
        if (checkedCount >= STEPS.length) {
            setTimeout(() => setStage("recommendation"), 600);
            return;
        }
        const t = setTimeout(() => setCheckedCount((c) => c + 1), 700);
        return () => clearTimeout(t);
    }, [checkedCount, stage]);

    /* ── Progress bar fill ── */
    useEffect(() => {
        if (stage !== "processing") return;
        const target = Math.round((checkedCount / STEPS.length) * 100);
        const t = setTimeout(() => setProgress(target), 50);
        return () => clearTimeout(t);
    }, [checkedCount, stage]);

    /* ── Cycle header text ── */
    useEffect(() => {
        if (stage !== "processing") return;
        const t = setInterval(() => setHeaderIdx((i) => (i + 1) % HEADER_STATES.length), 1800);
        return () => clearInterval(t);
    }, [stage]);

    /* ── Close dropdown on outside click ── */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setLabelOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    /* ── Training animation ── */
    useEffect(() => {
        if (stage !== "training") return;

        // Reset training state
        const targetModels = modelType === "unsupervised" ? UNSUPERVISED_MODELS : SUPERVISED_MODELS;
        setTrainingIdx(0);
        setTrainingProgress(0);
        setTrainedModels(targetModels.map(m => ({ ...m, status: "pending" })));
        setTrainingMsg(TRAINING_MESSAGES[0]);

        let currentIdx = 0;
        let progressVal = 0;
        let msgIdx = 0;

        // Message cycling
        const msgTimer = setInterval(() => {
            msgIdx = (msgIdx + 1) % TRAINING_MESSAGES.length;
            setTrainingMsg(TRAINING_MESSAGES[msgIdx]);
        }, 1400);

        // Progress + model training simulation
        const timer = setInterval(() => {
            progressVal += 2;
            setTrainingProgress(Math.min(progressVal, 100));

            // Train models one by one
            if (progressVal >= 20 && currentIdx === 0) {
                setTrainedModels(prev => prev.map((m, i) => i === 0 ? { ...m, status: "training" } : m));
            }
            if (progressVal >= 35 && currentIdx === 0) {
                currentIdx = 1;
                setTrainingIdx(1);
                setTrainedModels(prev => prev.map((m, i) => i === 0 ? { ...m, status: "done" } : i === 1 ? { ...m, status: "training" } : m));
            }
            if (progressVal >= 55 && currentIdx === 1) {
                currentIdx = 2;
                setTrainingIdx(2);
                setTrainedModels(prev => prev.map((m, i) => i === 1 ? { ...m, status: "done" } : i === 2 ? { ...m, status: "training" } : m));
            }
            if (progressVal >= 80 && currentIdx === 2) {
                currentIdx = 3;
                setTrainingIdx(3);
                setTrainedModels(prev => prev.map(m => ({ ...m, status: "done" })));
            }

            if (progressVal >= 100) {
                clearInterval(timer);
                clearInterval(msgTimer);
                setTimeout(() => {
                    // Auto-select best model
                    const best = targetModels.reduce((a, b) => a.accuracy > b.accuracy ? a : b);
                    setSelectedModel(best.name);
                    setStage("model_selection");
                }, 800);
            }
        }, 120);

        return () => {
            clearInterval(timer);
            clearInterval(msgTimer);
        };
    }, [stage]);

    const handleTrainModel = () => {
        if (modelType === "supervised" || modelType === "unsupervised") {
            setStage("training");
        } else {
            // For timeseries, go directly to dashboard
            setToastVisible(true);
            setTimeout(() => {
                onGenerate({ modelType, targetLabel });
                onClose();
            }, 1800);
        }
    };

    const handleGenerate = () => {
        setToastVisible(true);
        setTimeout(() => {
            onGenerate({ modelType, targetLabel });
            onClose();
        }, 1800);
    };

    const filteredColumns = FAKE_COLUMNS.filter((c) =>
        c.toLowerCase().includes(labelSearch.toLowerCase())
    );

    /* ── Step indicator at top ── */
    const steps = ["Upload", "Analysis", "Configure", "Model Selection", "Dashboard"];
    const activeStep =
        stage === "processing" ? 1
            : stage === "recommendation" ? 2
                : stage === "override" ? 2
                    : stage === "training" ? 3
                        : stage === "model_selection" ? 3
                            : 2;

    const modelCards: { id: ModelType; icon: string; title: string; subtitle: string }[] = [
        { id: "supervised", icon: "🤖", title: "Supervised", subtitle: "Predicting a specific value (Regression / Classification)" },
        { id: "unsupervised", icon: "🔮", title: "Unsupervised", subtitle: "Finding hidden patterns and clusters" },
        { id: "timeseries", icon: "📈", title: "Time Series", subtitle: "Forecasting future trends over time" },
    ];

    return (
        <div
            onClick={onClose}
            style={{
                position: "fixed", inset: 0, zIndex: 500,
                background: "rgba(0,0,0,0.75)", backdropFilter: "blur(10px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "16px",
            }}
        >
            {/* Modal panel */}
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: "100%", maxWidth: "580px",
                    maxHeight: "92vh", overflowY: "auto",
                    background: "var(--color-glass-solid)",
                    border: "1px solid rgba(0,209,255,0.18)",
                    borderRadius: "20px",
                    boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,209,255,0.06)",
                    animation: "fadeInUp 0.3s ease",
                    position: "relative",
                }}
            >


                {/* ── Close button — inside modal, won't overlap dashboard ── */}
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute", top: "14px", right: "14px",
                        width: "28px", height: "28px", borderRadius: "8px",
                        border: "1px solid var(--color-border)",
                        background: "var(--color-subtle)",
                        color: "var(--color-text-muted)",
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 10, transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F87171"; e.currentTarget.style.color = "#F87171"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>

                <div style={{ padding: "28px 28px 32px" }}>

                    {/* ── Step indicator ── */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "28px" }}>
                        {steps.map((s, i) => (
                            <div key={s} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : "none" }}>
                                <div style={{
                                    display: "flex", alignItems: "center", gap: "6px", flexShrink: 0,
                                }}>
                                    <div style={{
                                        width: "24px", height: "24px", borderRadius: "50%",
                                        background: i < activeStep ? "#00D1FF" : i === activeStep ? "rgba(0,209,255,0.15)" : "var(--color-subtle)",
                                        border: i === activeStep ? "2px solid #00D1FF" : i < activeStep ? "none" : "1px solid var(--color-border)",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        fontSize: "0.65rem", fontWeight: 700,
                                        color: i < activeStep ? "#000" : i === activeStep ? "#00D1FF" : "var(--color-text-muted)",
                                        transition: "all 0.4s",
                                        boxShadow: i === activeStep ? "0 0 12px rgba(0,209,255,0.4)" : "none",
                                    }}>
                                        {i < activeStep ? "✓" : i + 1}
                                    </div>
                                    <span style={{
                                        fontSize: "0.68rem", fontWeight: i === activeStep ? 600 : 400,
                                        color: i === activeStep ? "#00D1FF" : i < activeStep ? "var(--color-text-secondary)" : "var(--color-text-muted)",
                                        whiteSpace: "nowrap",
                                    }}>{s}</span>
                                </div>
                                {i < steps.length - 1 && (
                                    <div style={{
                                        flex: 1, height: "1px", margin: "0 6px",
                                        background: i < activeStep ? "#00D1FF" : "var(--color-border)",
                                        transition: "background 0.4s",
                                    }} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* ════════════════════════════════════
              STAGE A — Processing
          ════════════════════════════════════ */}
                    {stage === "processing" && (
                        <div>
                            {/* Scanning circle */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
                                <div style={{
                                    width: "72px", height: "72px", borderRadius: "50%",
                                    border: "3px solid rgba(0,209,255,0.15)",
                                    borderTop: "3px solid #00D1FF",
                                    animation: "spin 1s linear infinite",
                                    marginBottom: "14px",
                                    boxShadow: "0 0 24px rgba(0,209,255,0.3)",
                                }} />
                                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
                                    {HEADER_STATES[headerIdx]}
                                </div>
                                <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                                    {fileName}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{ background: "var(--color-subtle)", borderRadius: "100px", height: "5px", marginBottom: "22px", overflow: "hidden" }}>
                                <div style={{
                                    height: "100%", borderRadius: "100px",
                                    background: "linear-gradient(90deg, #00D1FF, #8B5CF6)",
                                    width: `${progress}%`, transition: "width 0.6s ease",
                                    boxShadow: "0 0 8px rgba(0,209,255,0.5)",
                                }} />
                            </div>

                            {/* Checklist */}
                            <div style={{
                                background: "rgba(0,0,0,0.2)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "10px",
                            }}>
                                {STEPS.map((step, i) => {
                                    const done = i < checkedCount;
                                    const active = i === checkedCount;
                                    return (
                                        <div key={step} style={{
                                            display: "flex", alignItems: "center", gap: "12px",
                                            opacity: done || active ? 1 : 0.35, transition: "opacity 0.4s",
                                        }}>
                                            <div style={{
                                                width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                                                border: done ? "none" : active ? "2px solid #00D1FF" : "1px solid var(--color-border)",
                                                background: done ? "linear-gradient(135deg,#00D1FF,#3ECF8E)" : "transparent",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                boxShadow: active ? "0 0 10px rgba(0,209,255,0.4)" : done ? "0 0 8px rgba(0,209,255,0.3)" : "none",
                                                transition: "all 0.3s",
                                                animation: active ? "pulse-glow 1.2s ease-in-out infinite" : "none",
                                            }}>
                                                {done && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                            </div>
                                            <span style={{
                                                fontSize: "0.85rem",
                                                fontWeight: done ? 500 : active ? 600 : 400,
                                                color: done ? "var(--color-text-primary)" : active ? "#00D1FF" : "var(--color-text-muted)",
                                                transition: "color 0.3s",
                                            }}>
                                                {step}
                                            </span>
                                            {done && (
                                                <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "#3ECF8E", fontWeight: 600 }}>Done</span>
                                            )}
                                            {active && (
                                                <span style={{ marginLeft: "auto" }}>
                                                    <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#00D1FF", display: "inline-block", animation: "pulse-glow 0.8s ease-in-out infinite" }} />
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════
              STAGE B — Recommendation
          ════════════════════════════════════ */}
                    {stage === "recommendation" && (
                        <div style={{ animation: "fadeInUp 0.35s ease" }}>
                            {/* Success header */}
                            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                                <div style={{
                                    width: "56px", height: "56px", borderRadius: "50%",
                                    background: "linear-gradient(135deg,#3ECF8E22,#00D1FF22)",
                                    border: "2px solid #3ECF8E",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    margin: "0 auto 12px",
                                    boxShadow: "0 0 24px rgba(62,207,142,0.3)",
                                }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3ECF8E" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                                    Preprocessing Complete!
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#3ECF8E", fontWeight: 500 }}>Model Optimized ✓</div>
                            </div>

                            {/* AI Insights panel */}
                            <div style={{
                                background: "rgba(0,209,255,0.04)",
                                border: "1px solid rgba(0,209,255,0.15)",
                                borderRadius: "12px", padding: "16px", marginBottom: "16px",
                            }}>
                                <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "#00D1FF", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
                                    ✦ AI Insights
                                </div>
                                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
                                    {[
                                        { label: "Data Type", value: "Tabular / Structured", color: "#00D1FF" },
                                        { label: "Size", value: "45,000 Rows", color: "#8B5CF6" },
                                        { label: "Task Detected", value: "Regression", color: "#3ECF8E", glow: true },
                                    ].map((badge) => (
                                        <div key={badge.label} style={{
                                            padding: "6px 12px", borderRadius: "8px",
                                            background: `${badge.color}10`,
                                            border: `1px solid ${badge.color}30`,
                                            boxShadow: badge.glow ? `0 0 12px ${badge.color}25` : "none",
                                        }}>
                                            <div style={{ fontSize: "0.65rem", color: badge.color, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>{badge.label}</div>
                                            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-primary)", marginTop: "1px" }}>{badge.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Recommendation box */}
                                <div style={{
                                    background: "rgba(139,92,246,0.06)",
                                    border: "1px solid rgba(139,92,246,0.2)",
                                    borderRadius: "10px", padding: "14px",
                                }}>
                                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                                        <div style={{
                                            width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                                            background: "linear-gradient(135deg,#8B5CF6,#00D1FF)",
                                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem",
                                        }}>✨</div>
                                        <div>
                                            <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                                                AI Suggests:{" "}
                                                <span style={{ color: "#8B5CF6" }}>Supervised Regression Model</span>
                                            </div>
                                            <div style={{ fontSize: "0.76rem", color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
                                                Because your target column contains numerical values (e.g., Price, Sales). This model predicts exact numeric outcomes.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Manual override toggle */}
                            {!showOverride ? (
                                <button
                                    onClick={() => { setShowOverride(true); setStage("override"); }}
                                    style={{
                                        width: "100%", padding: "10px", borderRadius: "10px",
                                        border: "1px solid var(--color-border)",
                                        background: "var(--color-subtle)",
                                        color: "var(--color-text-secondary)",
                                        fontSize: "0.85rem", cursor: "pointer", transition: "all 0.2s",
                                        marginBottom: "12px",
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#8B5CF6"; e.currentTarget.style.color = "#8B5CF6"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                                >
                                    🔧 I&apos;ll choose manually
                                </button>
                            ) : null}

                            {/* Label selector */}
                            <LabelSelector
                                filteredColumns={filteredColumns}
                                labelSearch={labelSearch}
                                setLabelSearch={setLabelSearch}
                                targetLabel={targetLabel}
                                setTargetLabel={setTargetLabel}
                                labelOpen={labelOpen}
                                setLabelOpen={setLabelOpen}
                                dropdownRef={dropdownRef}
                            />

                            {/* Train Model button */}
                            <button
                                onClick={handleTrainModel}
                                className="cta-btn pulse-glow"
                                style={{
                                    width: "100%", padding: "15px", borderRadius: "12px",
                                    fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                                    marginTop: "16px", display: "flex", alignItems: "center",
                                    justifyContent: "center", gap: "10px",
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                <span>Train Model</span>
                            </button>
                        </div>
                    )}

                    {/* ════════════════════════════════════
              STAGE C — Manual Override
          ════════════════════════════════════ */}
                    {stage === "override" && (
                        <div style={{ animation: "fadeInUp 0.3s ease" }}>
                            <div style={{ marginBottom: "20px" }}>
                                <div style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                                    Choose Your Model Type
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                                    Override the AI recommendation and select manually
                                </div>
                            </div>

                            {/* Model type cards */}
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                                {modelCards.map((card) => (
                                    <button
                                        key={card.id}
                                        onClick={() => setModelType(card.id)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: "14px",
                                            padding: "14px 16px", borderRadius: "12px", cursor: "pointer",
                                            border: modelType === card.id ? "1px solid rgba(0,209,255,0.4)" : "1px solid var(--color-border)",
                                            background: modelType === card.id ? "rgba(0,209,255,0.06)" : "var(--color-subtle)",
                                            textAlign: "left", transition: "all 0.2s",
                                            boxShadow: modelType === card.id ? "0 0 16px rgba(0,209,255,0.1)" : "none",
                                        }}
                                    >
                                        <div style={{
                                            width: "42px", height: "42px", borderRadius: "10px", flexShrink: 0,
                                            background: modelType === card.id ? "rgba(0,209,255,0.12)" : "rgba(255,255,255,0.04)",
                                            border: modelType === card.id ? "1px solid rgba(0,209,255,0.3)" : "1px solid var(--color-border)",
                                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
                                        }}>
                                            {card.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                fontSize: "0.9rem", fontWeight: 600,
                                                color: modelType === card.id ? "#00D1FF" : "var(--color-text-primary)",
                                                marginBottom: "2px",
                                            }}>
                                                {card.title}
                                            </div>
                                            <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", lineHeight: 1.4 }}>
                                                {card.subtitle}
                                            </div>
                                        </div>
                                        {modelType === card.id && (
                                            <div style={{
                                                width: "20px", height: "20px", borderRadius: "50%",
                                                background: "#00D1FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                            }}>
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Label selector */}
                            <LabelSelector
                                filteredColumns={filteredColumns}
                                labelSearch={labelSearch}
                                setLabelSearch={setLabelSearch}
                                targetLabel={targetLabel}
                                setTargetLabel={setTargetLabel}
                                labelOpen={labelOpen}
                                setLabelOpen={setLabelOpen}
                                dropdownRef={dropdownRef}
                            />

                            {/* Train Model button */}
                            <button
                                onClick={handleTrainModel}
                                className="cta-btn pulse-glow"
                                style={{
                                    width: "100%", padding: "15px", borderRadius: "12px",
                                    fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                                    marginTop: "16px", display: "flex", alignItems: "center",
                                    justifyContent: "center", gap: "10px",
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                <span>Train Model</span>
                            </button>

                            {/* Back link */}
                            <button
                                onClick={() => { setStage("recommendation"); setShowOverride(false); }}
                                style={{
                                    width: "100%", marginTop: "10px", padding: "8px",
                                    background: "none", border: "none", cursor: "pointer",
                                    fontSize: "0.8rem", color: "var(--color-text-muted)", transition: "color 0.2s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
                            >
                                ← Back to AI Recommendation
                            </button>
                        </div>
                    )}

                    {/* ════════════════════════════════════
              STAGE D — Training Models
          ════════════════════════════════════ */}
                    {stage === "training" && (
                        <div style={{ animation: "fadeInUp 0.3s ease" }}>
                            {/* Header */}
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px" }}>
                                <div style={{
                                    width: "72px", height: "72px", borderRadius: "50%",
                                    border: "3px solid rgba(0,209,255,0.15)",
                                    borderTop: "3px solid #00D1FF",
                                    animation: "spin 1s linear infinite",
                                    marginBottom: "14px",
                                    boxShadow: "0 0 24px rgba(0,209,255,0.3)",
                                }} />
                                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                                    Training Models...
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", textAlign: "center" }}>
                                    {trainingMsg}
                                </div>
                            </div>

                            {/* Progress bar */}
                            <div style={{ background: "var(--color-subtle)", borderRadius: "100px", height: "5px", marginBottom: "22px", overflow: "hidden" }}>
                                <div style={{
                                    height: "100%", borderRadius: "100px",
                                    background: "linear-gradient(90deg, #00D1FF, #8B5CF6, #3ECF8E)",
                                    width: `${trainingProgress}%`, transition: "width 0.3s ease",
                                    boxShadow: "0 0 8px rgba(0,209,255,0.5)",
                                }} />
                            </div>

                            {/* Model training cards */}
                            <div style={{
                                background: "rgba(0,0,0,0.2)",
                                border: "1px solid var(--color-border)",
                                borderRadius: "12px", padding: "16px", display: "flex", flexDirection: "column", gap: "12px",
                            }}>
                                {trainedModels.map((model, i) => (
                                    <div key={model.name} style={{
                                        display: "flex", alignItems: "center", gap: "14px",
                                        padding: "14px 16px", borderRadius: "10px",
                                        background: model.status === "training" ? "rgba(0,209,255,0.06)" : model.status === "done" ? "rgba(62,207,142,0.04)" : "var(--color-subtle)",
                                        border: model.status === "training" ? "1px solid rgba(0,209,255,0.25)" : model.status === "done" ? "1px solid rgba(62,207,142,0.2)" : "1px solid var(--color-border)",
                                        transition: "all 0.4s",
                                        opacity: model.status === "pending" ? 0.4 : 1,
                                    }}>
                                        <div style={{
                                            width: "40px", height: "40px", borderRadius: "10px", flexShrink: 0,
                                            background: `${model.color}15`,
                                            border: `1px solid ${model.color}30`,
                                            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem",
                                        }}>
                                            {model.icon}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "2px" }}>
                                                {model.name}
                                            </div>
                                            <div style={{ fontSize: "0.72rem", color: model.status === "training" ? "#00D1FF" : model.status === "done" ? "#3ECF8E" : "var(--color-text-muted)" }}>
                                                {model.status === "pending" ? "Waiting..." : model.status === "training" ? "Training in progress..." : `Accuracy: ${model.accuracy}%`}
                                            </div>
                                        </div>
                                        <div style={{ flexShrink: 0 }}>
                                            {model.status === "pending" && (
                                                <div style={{ width: "20px", height: "20px", borderRadius: "50%", border: "1px solid var(--color-border)" }} />
                                            )}
                                            {model.status === "training" && (
                                                <div style={{
                                                    width: "20px", height: "20px", borderRadius: "50%",
                                                    border: "2px solid rgba(0,209,255,0.15)",
                                                    borderTop: "2px solid #00D1FF",
                                                    animation: "spin 0.8s linear infinite",
                                                }} />
                                            )}
                                            {model.status === "done" && (
                                                <div style={{
                                                    width: "20px", height: "20px", borderRadius: "50%",
                                                    background: "linear-gradient(135deg,#3ECF8E,#00D1FF)",
                                                    display: "flex", alignItems: "center", justifyContent: "center",
                                                    boxShadow: "0 0 8px rgba(62,207,142,0.3)",
                                                }}>
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ textAlign: "center", marginTop: "16px", fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                                Training {trainingIdx < 3 ? `${trainingIdx + 1}` : "3"} of 3 models...
                            </div>
                        </div>
                    )}

                    {/* ════════════════════════════════════
              STAGE E — Model Selection (results)
          ════════════════════════════════════ */}
                    {stage === "model_selection" && (
                        <div style={{ animation: "fadeInUp 0.35s ease" }}>
                            {/* Success header */}
                            <div style={{ textAlign: "center", marginBottom: "24px" }}>
                                <div style={{
                                    width: "56px", height: "56px", borderRadius: "50%",
                                    background: "linear-gradient(135deg,#3ECF8E22,#00D1FF22)",
                                    border: "2px solid #3ECF8E",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    margin: "0 auto 12px",
                                    boxShadow: "0 0 24px rgba(62,207,142,0.3)",
                                }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3ECF8E" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                </div>
                                <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "4px" }}>
                                    Training Complete!
                                </div>
                                <div style={{ fontSize: "0.8rem", color: "#3ECF8E", fontWeight: 500 }}>All 3 models trained successfully ✓</div>
                            </div>

                            {/* Best model badge */}
                            <div style={{
                                background: "rgba(0,209,255,0.06)",
                                border: "1px solid rgba(0,209,255,0.2)",
                                borderRadius: "10px", padding: "12px 16px", marginBottom: "16px",
                                display: "flex", alignItems: "center", gap: "10px",
                            }}>
                                <span style={{ fontSize: "1rem" }}>🏆</span>
                                <div>
                                    <div style={{ fontSize: "0.75rem", color: "#00D1FF", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Best Model Selected</div>
                                    <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                                        {trainedModels.reduce((a, b) => a.accuracy > b.accuracy ? a : b).name} — {trainedModels.reduce((a, b) => a.accuracy > b.accuracy ? a : b).accuracy}% Accuracy
                                    </div>
                                </div>
                            </div>

                            {/* Model results - selectable */}
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "8px" }}>
                                Select a model (or keep the best one)
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
                                {trainedModels
                                    .slice()
                                    .sort((a, b) => b.accuracy - a.accuracy)
                                    .map((model, i) => {
                                        const isBest = i === 0;
                                        const isSelected = selectedModel === model.name;
                                        return (
                                            <button
                                                key={model.name}
                                                onClick={() => setSelectedModel(model.name)}
                                                style={{
                                                    display: "flex", alignItems: "center", gap: "14px",
                                                    padding: "14px 16px", borderRadius: "12px", cursor: "pointer",
                                                    border: isSelected ? `1px solid ${model.color}60` : "1px solid var(--color-border)",
                                                    background: isSelected ? `${model.color}08` : "var(--color-subtle)",
                                                    textAlign: "left", transition: "all 0.2s",
                                                    boxShadow: isSelected ? `0 0 20px ${model.color}15` : "none",
                                                    position: "relative",
                                                }}
                                            >
                                                {/* Best badge */}
                                                {isBest && (
                                                    <div style={{
                                                        position: "absolute", top: "-8px", right: "12px",
                                                        fontSize: "0.6rem", fontWeight: 700, color: "#000",
                                                        background: "linear-gradient(135deg,#3ECF8E,#00D1FF)",
                                                        borderRadius: "100px", padding: "2px 8px",
                                                        boxShadow: "0 2px 8px rgba(62,207,142,0.3)",
                                                    }}>
                                                        BEST
                                                    </div>
                                                )}

                                                <div style={{
                                                    width: "42px", height: "42px", borderRadius: "10px", flexShrink: 0,
                                                    background: `${model.color}15`,
                                                    border: `1px solid ${model.color}30`,
                                                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem",
                                                }}>
                                                    {model.icon}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{
                                                        fontSize: "0.9rem", fontWeight: 600,
                                                        color: isSelected ? model.color : "var(--color-text-primary)",
                                                        marginBottom: "4px",
                                                    }}>
                                                        {model.name}
                                                    </div>
                                                    {/* Accuracy bar */}
                                                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                                        <div style={{ flex: 1, height: "4px", borderRadius: "100px", background: "var(--color-border)", overflow: "hidden" }}>
                                                            <div style={{
                                                                height: "100%", borderRadius: "100px",
                                                                background: `linear-gradient(90deg, ${model.color}, ${model.color}CC)`,
                                                                width: `${model.accuracy}%`,
                                                                transition: "width 1s ease",
                                                                boxShadow: `0 0 6px ${model.color}40`,
                                                            }} />
                                                        </div>
                                                        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: model.color, minWidth: "48px", textAlign: "right" }}>
                                                            {model.accuracy}%
                                                        </span>
                                                    </div>
                                                </div>
                                                {isSelected && (
                                                    <div style={{
                                                        width: "22px", height: "22px", borderRadius: "50%",
                                                        background: model.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                                        boxShadow: `0 0 10px ${model.color}40`,
                                                    }}>
                                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                                    </div>
                                                )}
                                                {!isSelected && (
                                                    <div style={{
                                                        width: "22px", height: "22px", borderRadius: "50%",
                                                        border: "1.5px solid var(--color-border)", flexShrink: 0,
                                                    }} />
                                                )}
                                            </button>
                                        );
                                    })}
                            </div>

                            {/* Generate Dashboard button */}
                            <button
                                onClick={handleGenerate}
                                className="cta-btn pulse-glow"
                                style={{
                                    width: "100%", padding: "15px", borderRadius: "12px",
                                    fontSize: "1rem", fontWeight: 700, cursor: "pointer",
                                    display: "flex", alignItems: "center",
                                    justifyContent: "center", gap: "10px",
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                                <span>Generate Dashboard</span>
                            </button>

                            {/* Back link */}
                            <button
                                onClick={() => setStage("recommendation")}
                                style={{
                                    width: "100%", marginTop: "10px", padding: "8px",
                                    background: "none", border: "none", cursor: "pointer",
                                    fontSize: "0.8rem", color: "var(--color-text-muted)", transition: "color 0.2s",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-text-secondary)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
                            >
                                ← Back to Configure
                            </button>
                        </div>
                    )}
                </div>

                {/* ── Keyframes ── */}
                <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
            </div>

            {/* ── Success Toast ── */}
            {toastVisible && (
                <div style={{
                    position: "fixed", bottom: "32px", left: "50%", transform: "translateX(-50%)",
                    background: "linear-gradient(135deg,rgba(62,207,142,0.15),rgba(0,209,255,0.12))",
                    border: "1px solid rgba(62,207,142,0.4)",
                    borderRadius: "12px", padding: "14px 24px",
                    display: "flex", alignItems: "center", gap: "10px",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                    animation: "fadeInUp 0.3s ease",
                    zIndex: 600, whiteSpace: "nowrap",
                }}>
                    <span style={{ fontSize: "1.1rem" }}>✅</span>
                    <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "#3ECF8E" }}>
                        Preprocessing Complete! Model Optimized.
                    </span>
                </div>
            )}
        </div>
    );
}

/* ─── Shared Label Selector sub-component ─── */
function LabelSelector({
    filteredColumns, labelSearch, setLabelSearch,
    targetLabel, setTargetLabel, labelOpen, setLabelOpen, dropdownRef,
}: {
    filteredColumns: string[];
    labelSearch: string;
    setLabelSearch: (v: string) => void;
    targetLabel: string;
    setTargetLabel: (v: string) => void;
    labelOpen: boolean;
    setLabelOpen: (v: boolean) => void;
    dropdownRef: React.RefObject<HTMLDivElement | null>;
}) {
    const isNoLabel = targetLabel === "No Target Label";
    return (
        <div ref={dropdownRef} style={{ position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                    Select Target Label (Y-Axis)
                </span>
                {isNoLabel && (
                    <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>
                        ✦ Will be auto-detected by backend
                    </span>
                )}
            </div>
            <button
                onClick={() => setLabelOpen(!labelOpen)}
                style={{
                    width: "100%", padding: "10px 14px", borderRadius: "10px",
                    border: isNoLabel ? "1px dashed var(--color-border)" : "1px solid var(--color-border)",
                    background: "var(--color-subtle)",
                    color: isNoLabel ? "var(--color-text-muted)" : "var(--color-text-primary)",
                    fontSize: "0.875rem", cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    transition: "border-color 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#00D1FF"; }}
                onMouseLeave={(e) => { if (!labelOpen) e.currentTarget.style.borderColor = isNoLabel ? "var(--color-border)" : "var(--color-border)"; }}
            >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isNoLabel
                        ? <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>—</span>
                        : <span style={{ fontSize: "0.7rem", color: "#00D1FF" }}>⊛</span>
                    }
                    <span style={{ fontStyle: isNoLabel ? "italic" : "normal" }}>
                        {isNoLabel ? "No Target Label" : targetLabel}
                    </span>
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ transform: labelOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s", color: "var(--color-text-muted)" }}>
                    <polyline points="6 9 12 15 18 9" />
                </svg>
            </button>

            {labelOpen && (
                <div style={{
                    position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                    background: "var(--color-glass-solid)",
                    border: "1px solid rgba(0,209,255,0.2)",
                    borderRadius: "10px", overflow: "hidden",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
                    zIndex: 10, animation: "fadeInUp 0.15s ease",
                }}>
                    <div style={{ padding: "8px" }}>
                        <input
                            autoFocus
                            value={labelSearch}
                            onChange={(e) => setLabelSearch(e.target.value)}
                            placeholder="Search columns…"
                            style={{
                                width: "100%", padding: "8px 10px", borderRadius: "8px",
                                border: "1px solid var(--color-border)",
                                background: "var(--color-subtle)",
                                color: "var(--color-text-primary)",
                                fontSize: "0.82rem", outline: "none",
                            }}
                        />
                    </div>
                    <div style={{ maxHeight: "180px", overflowY: "auto" }}>

                        {/* ── No Target Label option (always first) ── */}
                        {!labelSearch && (
                            <button
                                onClick={() => { setTargetLabel("No Target Label"); setLabelOpen(false); setLabelSearch(""); }}
                                style={{
                                    width: "100%", padding: "9px 16px", border: "none",
                                    borderBottom: "1px solid var(--color-border)",
                                    background: isNoLabel ? "rgba(255,255,255,0.04)" : "transparent",
                                    color: isNoLabel ? "var(--color-text-secondary)" : "var(--color-text-muted)",
                                    fontSize: "0.82rem", cursor: "pointer",
                                    textAlign: "left", transition: "all 0.15s",
                                    display: "flex", alignItems: "center", gap: "8px",
                                    fontStyle: "italic",
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-subtle)"; e.currentTarget.style.color = "var(--color-text-primary)"; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = isNoLabel ? "rgba(255,255,255,0.04)" : "transparent"; e.currentTarget.style.color = isNoLabel ? "var(--color-text-secondary)" : "var(--color-text-muted)"; }}
                            >
                                {isNoLabel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                <span>— No Target Label</span>
                                <span style={{ marginLeft: "auto", fontSize: "0.65rem", color: "var(--color-text-muted)", fontStyle: "normal" }}>auto-detect</span>
                            </button>
                        )}

                        {/* ── Column options ── */}
                        {filteredColumns.map((col) => (
                            <button
                                key={col}
                                onClick={() => { setTargetLabel(col); setLabelOpen(false); setLabelSearch(""); }}
                                style={{
                                    width: "100%", padding: "9px 16px", border: "none",
                                    background: col === targetLabel ? "rgba(0,209,255,0.08)" : "transparent",
                                    color: col === targetLabel ? "#00D1FF" : "var(--color-text-secondary)",
                                    fontSize: "0.85rem", cursor: "pointer",
                                    textAlign: "left", transition: "all 0.15s",
                                    display: "flex", alignItems: "center", gap: "8px",
                                }}
                                onMouseEnter={(e) => { if (col !== targetLabel) { e.currentTarget.style.background = "var(--color-subtle)"; e.currentTarget.style.color = "var(--color-text-primary)"; } }}
                                onMouseLeave={(e) => { if (col !== targetLabel) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; } }}
                            >
                                {col === targetLabel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00D1FF" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
                                {col}
                            </button>
                        ))}
                        {filteredColumns.length === 0 && (
                            <div style={{ padding: "12px 16px", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>No columns found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
