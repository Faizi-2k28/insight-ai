# Backend Architecture Map

## A) Entry Points
| Type | File | Description |
|------|------|-------------|
| **Server** | `backend/main.py` | FastAPI app instance, CORS config, exception handlers, and router inclusion. |
| **Startup** | `uvicorn.run` | Launched via `if __name__ == "__main__":` block in `main.py`. Runs on `0.0.0.0:8000`. |
| **DB Init** | `backend/init_db.py` | Standalone script to initialize database tables using `Base.metadata.create_all`. |

## B) Route Map
| Method | Path | Handler | File | Auth? | Description |
|--------|------|---------|------|-------|-------------|
| **Auth** | | | | | |
| POST | `/api/auth/register` | `register` | `routes/auth.py` | No | Register new user. |
| POST | `/api/auth/login` | `login` | `routes/auth.py` | No | Login and get JWT. |
| GET | `/api/auth/me` | `get_current_user_info` | `routes/auth.py` | **Yes** | Get current user profile. |
| POST | `/api/auth/logout` | `logout` | `routes/auth.py` | **Yes** | Invalidate session. |
| **Upload** | | | | | |
| POST | `/api/upload/validate` | `validate_file` | `routes/upload.py` | **Yes** | Validate CSV structure/content. |
| POST | `/api/upload/create-dashboard` | `create_dashboard` | `routes/upload.py` | **Yes** | Save dataset & create dashboard. |
| **Analysis** | | | | | |
| GET | `/api/analysis/profile/{id}` | `get_data_profile` | `routes/analysis.py` | **Yes** | Get comprehensive data profile. |
| GET | `/api/analysis/charts/{id}` | `get_chart_configurations` | `routes/analysis.py` | **Yes** | Generate chart configs for dashboards. |
| GET | `/api/analysis/summary/{id}` | `get_dashboard_summary` | `routes/analysis.py` | **Yes** | Get quick summary stats. |
| **ML** | | | | | |
| POST | `/api/ml/train/{id}` | `train_models` | `routes/ml.py` | **Yes** | Train multiple ML models on dataset. |
| GET | `/api/ml/results/{id}` | `get_ml_results` | `routes/ml.py` | **Yes** | Get all training results. |
| GET | `/api/ml/best-model/{id}` | `get_best_model` | `routes/ml.py` | **Yes** | Get details of best model. |
| **Insights** | | | | | |
| POST | `/api/insights/generate/{id}` | `generate_insights` | `routes/insights.py` | **Yes** | Generate text/statistical insights. |
| POST | `/api/insights/charts/{id}` | `generate_chart_insights` | `routes/insights.py` | **Yes** | Generate insights for specific charts. |
| GET | `/api/insights/{id}` | `get_insights` | `routes/insights.py` | **Yes** | Retrieve stored insights. |
| DELETE | `/api/insights/{id}` | `delete_insights` | `routes/insights.py` | **Yes** | Clear insights. |

## C) Service Map
| Service | File | Responsibilities | Used By |
|---------|------|------------------|---------|
| **AuthService** | `services/auth_service.py` | Password hashing, JWT token generation/validation. | `routes/auth.py` |
| **DataProfilingService** | `services/data_profiling_service.py` | Stats calculation, quality checks, correlation analysis. | `routes/analysis.py`, `routes/insights.py` |
| **ChartService** | `services/chart_service.py` | Heuristics for auto-generating chart configs. | `routes/analysis.py`, `routes/insights.py` |
| **InsightService** | `services/insight_service.py` | logic to call Gemini API for text generation. | `routes/insights.py` |
| **UniversalMLTrainer** | `services/ml_trainer.py` | managing model training lifecycle. | `routes/ml.py` |
| **UniversalPreprocessor** | `services/preprocessing.py` | Data cleaning, encoding, scaling. | `routes/ml.py` |

## D) Data Model Map
| Table | Model Class | Key Columns | Relationships |
|-------|-------------|-------------|---------------|
| `users` | `User` | `id`, `email`, `password_hash`, `role` | Sessions, Dashboards, Shares |
| `sessions` | `Session` | `id`, `user_id`, `token`, `expires_at` | User |
| `dashboards` | `Dashboard` | `id`, `user_id`, `dataset_filename`, `is_public` | User, Theme, Datasets, MLResults, Insights |
| `dataset_storage` | `DatasetStorage` | `id`, `dashboard_id`, `data` (JSONB) | Dashboard (One-to-One) |
| `ml_results` | `MLResult` | `id`, `dashboard_id`, `model_name`, `test_score` | Dashboard |
| `insights` | `Insight` | `id`, `dashboard_id`, `content`, `category` | Dashboard |
| `themes` | `Theme` | `id`, `name`, `colors`, `fonts` | Dashboards |
| `chart_configurations` | `ChartConfiguration` | `id`, `dashboard_id`, `chart_type`, `config` | Dashboard |

## E) Runtime Flows

### 1. Upload Dataset Flow
1.  **User** sends CSV to `POST /api/upload/validate`.
2.  **Route** (`upload.py`) reads bytes, uses `pandas` to validate (size, columns, types).
3.  **User** sends validated file + metadata to `POST /api/upload/create-dashboard`.
4.  **Route**:
    *   Creates `Dashboard` record.
    *   Creates `DatasetStorage` record (stores full data as JSONB).
    *   Commits to DB.
    *   Returns `dashboard_id`.

### 2. Generate Insights Flow
1.  **User** requests `POST /api/insights/generate/{id}`.
2.  **Route** (`insights.py`):
    *   Fetches `Dashboard` and `DatasetStorage`.
    *   Calls `DataProfilingService.profile_dataset(df)`.
    *   Calls `InsightService.generate_insights(profile)`.
        *   Service calls Gemini API.
    *   Deletes old "statistical" insights.
    *   Saves new `Insight` records to DB.
    *   Returns list of insights.

## F) DB Lifecycle / Migrations
*   **Database Lifecycle**:
    *   **Tool**: Alembic.
    *   **Strategy**: "Single Baseline". The `initial_schema` migration acts as the source of truth for fresh installs.
    *   **Fresh Install**: `alembic upgrade head`.
    *   **Existing Dev**: `alembic stamp <revision_id>` (if schema matches).
*   **Database**:
    *   Dialect: **PostgreSQL** (confirmed via checking script).
    *   URL: Loaded from `.env` `DATABASE_URL`.
