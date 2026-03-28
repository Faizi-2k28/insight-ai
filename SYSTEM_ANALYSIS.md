# Agentic Data Analyst System - Architectural Analysis Report

## 🔍 Executive Summary

The project is a **modern, monolithic web application** designed to automate data analysis and machine learning workflows. It features a **Next.js 14+ (App Router) frontend** and a **FastAPI backend** powered by **PostgreSQL**.

**Core Capabilities**:
- **Automated Data Profiling**: Statistical analysis using Pandas.
- **Auto-ML**: Automated model selection and training (Classification & Regression) using Scikit-Learn/XGBoost.
- **AI Insights**: Generates textual analysis and chart interpretations using **Gemini 1.5 Flash**.

**Detailed Finding**:
While the system is robust for *dashboarding* and *automated reporting*, it currently falls short of being a fully "Agentic" system. The **Interactive Data Analyst (Chat/Query)** and **Clustering** features are **missing from the codebase implementation**, despite being supported by the database schema (`query_history`, `dashboard.problem_type='clustering'`). There is no containerization (Docker) or explicit deployment configuration found in the repository.

---

## 🔍 Phase 1: Repository Structural Analysis

The system follows a **Service-Oriented Monolith** pattern.
Services are encapsulated classes in `backend/services/` (e.g., `MLService`, `InsightService`) invoked by specific API routes.

### Directory Structure
```
/backend
├── main.py                 # Application Entry Point
├── database/               # SQL Models (SQLAlchemy) & Schema (Alembic)
├── routes/                 # API Endpoints (Auth, Upload, Analysis, ML, Insights)
├── services/               # Core Business Logic (Profiling, ML Training, Gemini Wrapper)
└── requirements.txt        # Python Dependencies (Note: UTF-16LE encoded, problematic for some envs)

/frontend
├── app/                    # Next.js App Router Pages (dashboard/[id], etc.)
├── lib/                    # API Clients (Axios wrapper) & TypeScript interfaces
└── components/             # Reusable UI Components (Shadcn/UI based)
```

**Key Findings:**
- **Entry Points**: `backend/main.py` (FastAPI), `frontend/app/page.tsx` (Next.js).
- **Config**: `.env` files (not committed), `package.json`, `requirements.txt`.
- **Microservices**: No. It is a modular monolith.
- **API Style**: RESTful API (FastAPI).

---

## � Phase 2: Tech Stack

| Component | Technology | Description |
|-----------|------------|-------------|
| **Backend** | Python 3.9+ | FastAPI, Pydantic |
| **Frontend** | TypeScript | Next.js 14 (App Router), React 19, TailwindCSS |
| **Database** | PostgreSQL | SQLAlchemy ORM, Alembic (Migrations) |
| **AI / LLM** | Google Gemini | `google.generativeai` (single-shot prompting) |
| **ML Engine** | Scikit-Learn | Pandas, NumPy, XGBoost (Optional) |
| **Auth** | JWT | Custom OAuth2 Implementation (Stateless) |
| **Visualization**| Recharts | Frontend charting library |

---

## 🔍 Phase 3: Agentic System Deep Analysis

**Architecture Type**: **Service-Based with LLM Enrichment** (Not a true autonomous agent).

- **No Autonomous Loop**: There is no ReAct loop (Reasoning + Acting) or tool use loop (e.g., LangGraph/CrewAI).
- **Implementation**:
  - `InsightService` constructs a prompt with data statistics.
  - Sends it to Gemini.
  - Parses the JSON response via regex.
  - Returns result to UI.
- **Workflow**:
  1.  User climbs "Upload" → Server parses CSV.
  2.  User clicks "Generate Insights" → Server aggregates stats → Prompts LLM.
- **Missing Capabilities**:
  - No **Tool Use** (The LLM cannot Query DB or run Python code dynamically).
  - No **Memory** (Each request is stateless; existing `insights` table is for storage, not context).

---

## � Phase 4: Data Flow Mapping

### 1. Data Ingestion
`User (Frontend) -> /api/upload -> UploadService -> Pandas DataFrame -> JSONB -> DB (dataset_storage)`
- **Risk**: Storing full datasets in PostgreSQL JSONB is not scalable for large files (>10MB) and will bloat the database rapidly.

### 2. Auto-ML Pipeline
`User -> /api/ml/train -> MLService -> UniversalMLTrainer -> Scikit-Learn -> DB (ml_results)`
- **Process**: Sync/Blocking. The `train_models` endpoint is `async def` but executes CPU-bound Scikit-Learn code directly in the event loop thread, which will block all other API requests during training.

### 3. Insight Generation
`User -> /api/insights/generate -> InsightService -> Gemini API -> DB (insights)`

---

## � Phase 5: Data Analyst Specific Capabilities

- **Supported Formats**: CSV (converted to JSON storage).
- **Transformation Logic**: `DataProfilingService` computes stats (mean, median, skewness) via Pandas.
- **Analysis Types**:
    - **Descriptive**: Data profiling (Done via Pandas).
    - **Predictive**: Classification, Regression (Done via Sklearn/XGBoost).
    - **Clustering**: **MISSING** (Schema supports it, `MLService` code does not implement it).
    - **Natural Language Query**: **MISSING** (Schema supports `query_history`, but no `query.py` logic found).
- **Code Execution**: The system does **NOT** generate and execute Python code dynamically. It relies on pre-defined logic paths (`UniversalMLTrainer`).
- **Result Formatting**: Results are returned as JSON structure (metrics, charts config) and rendered by React components.

---

## � Phase 6: Security & Reliability

- **Authentication**: JWT-based stateless auth.
- **Authorization**: Role-based access (Admin vs User), enforced via `Depends(get_current_active_user)`.
- **Secrets**: Managed via `.env` (passed to `genai.configure`).
- **Input Validation**: `pydantic` models + `pandas` type checking.
- **Sandboxing**: **Not Applicable** (Since no dynamic code execution exists, sandboxing is not implemented).
- **Guardrails**: Basic try-catch blocks around Gemini calls, falling back to rule-based insights if LLM fails (regex parsing error).

---

## � Phase 7: Performance & Scalability

- **Bottlenecks**:
    - **Data Storage**: Storing datasets in SQL (JSONB) is a major anti-pattern for analytics.
    - **Blocking Operations**: `UniversalMLTrainer` runs synchronously. A large dataset training job will hang the web server.
- **Concurrency**: `async def` is used, but CPU-bound tasks are not offloaded to `run_in_executor` or Celery.
- **Horizontal Scalability**: Stateless backend allows scaling, *but* the blocking training jobs and local file handling make it stateful/fragile.

---

## 🔍 Phase 8: Deployment & Infrastructure

**Status: Not Found / Incomplete**

- **Docker**: No `Dockerfile` or `docker-compose.yml` found in the root or subdirectories.
- **Local Run**:
    - Backend: `uvicorn main:app --reload`
    - Frontend: `npm run dev`
- **Production Flow**: Likely intended for Vercel (Frontend) + VPS/Cloud Run (Backend), but no config exists.
- **Microservices**: None. All logic is in the single FastAPI app.

---

## 🔍 Phase 9: Project Goals & Philosophy

**Inferred Objectives:**
1.  **Democratize Data Science**: Provide "One-Click" analysis for non-coders (Upload -> Insights).
2.  **Hybrid Intelligence**: Combine deterministic stats (Pandas) with generative explanations (Gemini).
3.  **MVP Status**: The project appears to be a **Proof of Concept (MVP)** rather than a production-hardened system, evidenced by:
    - Missing containerization.
    - Blocking threads.
    - Storing CSVs in JSON columns.
    - Missing "Chat" implementation.

---

## 🔍 Phase 10: Architectural Diagram

```mermaid
graph TD
    User((User))
    FE[Next.js Frontend]
    
    subgraph Backend [FastAPI Backend]
        API[API Routes]
        Auth[Auth Service]
        Prof[Profiling Service]
        ML[ML Service]
        Insight[Insight Service]
    end
    
    DB[(PostgreSQL)]
    LLM((Gemini API))
    
    User -->|Upload CSV| FE
    FE -->|POST /upload| API
    API -->|Validation| Auth
    API -->|Process| Prof
    Prof -->|Store JSONB| DB
    
    User -->|Train Model| FE
    FE -->|POST /ml/train| API
    API -->|Train (Blocking)| ML
    ML -->|Read Data| DB
    ML -->|Save Results| DB
    
    User -->|Get Insights| FE
    FE -->|POST /insights| API
    API -->|Generate| Insight
    Insight -->|Context| DB
    Insight -->|Prompt| LLM
    LLM -->|Analysis| Insight
    Insight -->|Save| DB
```

---

## 🔍 Phase 11: Risk & Improvement Report

### 🔴 Critical Issues
1.  **Missing "Agentic" Core**: The "Chat with Data" and "NLQ" features—the heart of an "Agentic Analyst"—are missing from the codebase, despite DB schemas existing.
2.  **Missing Clustering**: The codebase handles Classification and Regression but ignores Clustering logic in `MLService`.
3.  **Blocking ML Training**: Training models in the main thread will cause timeouts and unresponsiveness.
4.  **Data Scalability**: Storing datasets in DB will fail for datasets > 50MB.

### 🟠 Technical Debt
1.  **Requirements Encoding**: `requirements.txt` is UTF-16LE encoded, causing read issues in some environments.
2.  **Missing Routes**: Frontend `api/index.ts` defines methods that don't match the active backend routes (e.g., `exports`).

### ✅ Recommendations
1.  **Implement `query.py`**: Create the NLQ endpoint using PandasAI or LangChain SQL Agent.
2.  **Async Task Queue**: Move ML training to **Celery/Redis** background workers.
3.  **Blob Storage**: Move dataset storage to S3/MinIO or local filesystem, storing only metadata in DB.
4.  **Containerization**: Add `Dockerfile` for backend and frontend.

---

## � Phase 12: Executive Summary

**High-Level Summary**:
This repository is a solid foundation for an Automated Machine Learning (AutoML) dashboard, leveraging Python/FastAPI for calculation and Next.js for presentation. It successfully implements automated data profiling, model training (Classification/Regression), and basic AI-generated insights using Gemini. However, it currently lacks the interactive "Agentic" features (Chat, Dynamic Code Execution) promised by its schema.

**For Stakeholders**:
The system is currently a "Data Dashboard Generator" rather than an "AI Data Analyst". It excels at turning a CSV into a static report with charts and predicted models. To become a true AI Assistant, it needs the "Chat" feature implemented and the ability to answer ad-hoc questions dynamicallly.

**For Technical Engineers**:
The architecture is clean but has scalability blockers. Storing datasets in PostgreSQL JSON columns and running ML training in the main AsyncIO loop will prevent this from handling real-world loads. Moving to async workers (Celery) and blob storage (S3) is an immediate priority.
