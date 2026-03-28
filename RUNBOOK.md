# Runbook: Agentic Data Analyst System

## Prerequisites
- **Python 3.9+**
- **Node.js 18+**
- **PostgreSQL 14+**

## Environment Variables

### Backend (`backend/.env`)
Create a `.env` file in the `backend/` directory:

```ini
# Database Connection
DATABASE_URL=postgresql://user:password@localhost:5432/insight_ai_db

# Security
SECRET_KEY=change_this_to_a_secure_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# AI Services
GEMINI_API_KEY=your_google_gemini_api_key

# Optional: ML Configuration
# ML_MODEL_PATH=./models

# Storage Configuration
# Dataset files are stored in backend/storage/datasets/ by default.
# Ensure this directory is writable.
```

### Frontend (`frontend/.env.local`)
Create a `.env.local` file in the `frontend/` directory:

```ini
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Running the Application

### 1. Database Setup
Ensure PostgreSQL is running and the database exists.

```bash
# Verify PostgreSQL is up
psql -U postgres -c "SELECT 1"

# Create Database (if not exists)
psql -U postgres -c "CREATE DATABASE insight_ai_db"
```

### 2. Backend
Navigate to `backend/`:

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/Mac:
# source venv/bin/activate

pip install -r requirements.txt

# Run Migrations (if using Alembic)
# alembic upgrade head 

# Start Server
uvicorn main:app --reload
```
*Backend runs on: `http://localhost:8000`*
*Docs available at: `http://localhost:8000/docs`*

### 3. Frontend
Navigate to `frontend/`:

```bash
cd frontend
npm install
npm run dev
```
*Frontend runs on: `http://localhost:3000`*

## Testing & Verification

### Smoke Test
Run the smoke test script to verify core functionality:

```bash
# From project root
python scripts/smoke.py
```

### Manual Smoke Check
1. Open `http://localhost:3000`.
2. Login/Register.
3. Upload `tests/fixtures/tiny_clean.csv`.
4. Verify "Upload Successful".
5. Click "Generate Insights".
