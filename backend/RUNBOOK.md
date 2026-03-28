# Backend Runbook

## Prerequisites
- Python 3.10+
- PostgreSQL (or adjust DATABASE_URL for other DBs)

## Installation
1. Navigate to `backend/` directory:
   ```bash
   cd backend
   ```
2. Create virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate virtual environment:
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Configuration
Create a `.env` file in `backend/` based on `.env.example`.

**Required Environment Variables:**
- `DATABASE_URL`: Connection string for database (e.g., `postgresql://user:pass@localhost:5432/dbname`)
- `GEMINI_API_KEY`: API Key for Google Gemini
- `SECRET_KEY`: Secret key for JWT encoding
- `ALGORITHM`: Encryption algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time in minutes

## Database Initialization
To create tables:
```bash
python init_db.py
```

## Database Lifecycle & Migrations
The database schema is managed via **Alembic**. We use a **Single Baseline Strategy**.

### 1. Fresh Database Setup (New Dev / CI / Prod)
To set up a completely fresh database (e.g., Neon, CI, or a fresh local DB):
```bash
alembic upgrade head
```
This applies the authoritative `initial_schema` migration.

### 2. Existing Local Database (Alignment)
If your local database **already has tables** but Alembic doesn't know about them (or history is broken), **stamp** the database to the current baseline:
```bash
# Mark DB as being at revision af9cd7d5f46f (initial_schema)
alembic stamp af9cd7d5f46f
```
*Warning: Only do this if you are sure your local schema matches the codebase.*

### 3. Creating New Migrations
When you modify `backend/database/models.py`, generate a new migration script:
```bash
alembic revision --autogenerate -m "describe_your_change"
```
Check the generated file in `alembic/versions/` to verify it's correct.

### 4. Applying Migrations
To apply pending migrations to the database:
```bash
alembic upgrade head
```

### 5. Rollback Strategy
If a migration fails or corrupts the state:
1.  **Dev/Local**: Reset the database (drop all tables) and run `alembic upgrade head`.
2.  **Prod (Neon)**: Revert to a previous valid backup or branch if available.
*Note: We do not recommend manually editing the `alembic_version` table.*

### 6. Drift Check (Read-Only)
To check if the database schema matches the models/code without making changes:
```bash
alembic revision --autogenerate -m "drift_check" --sql
```
If this generates SQL statements (other than empty comments), there is drift. Do **not** apply this migration unless intended.

## Running the Server
```bash
python main.py
```
Server will start at `http://0.0.0.0:8000`.

## API Routes
- **Auth**: `/api/auth` (Register, Login, Me)
- **Upload**: `/api/upload` (Validate, Create Dashboard)
- **Analysis**: `/api/analysis` (Stats, Charts)
- **ML**: `/api/ml` (Train, Predict)
- **Insights**: `/api/insights` (Generate, Charts)

## Smoke Testing
Run the smoke test script to verify basic connectivity:
```bash
python scripts/smoke.py
```
This script checks:
1. Root endpoint (`/`)
2. API Docs (`/docs`)
3. OpenAPI Schema (`/openapi.json`)
