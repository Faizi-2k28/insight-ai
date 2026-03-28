# Insight AI

An intelligent data analytics platform that lets you upload datasets, run ML-powered analysis, generate interactive dashboards, and query your data using natural language.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | FastAPI · PostgreSQL · SQLAlchemy · Alembic |
| **ML / Analytics** | Pandas · scikit-learn · Seaborn |
| **Frontend** | Next.js 14 · TypeScript · Tailwind CSS |
| **Auth** | JWT (python-jose) |

## Project Structure

```
insight-ai/
├── backend/        # FastAPI application
│   ├── routes/     # API route handlers
│   ├── services/   # Business logic & ML services
│   ├── schemas/    # Pydantic models
│   ├── database/   # SQLAlchemy models & session
│   └── alembic/    # DB migrations
├── Frontend/       # Next.js application
│   └── src/        # Pages, components & API layer
├── scripts/        # Utility & smoke-test scripts
└── tests/          # Integration tests
```

## Getting Started

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # fill in your DB URL & secret keys
alembic upgrade head
uvicorn main:app --reload
```

### Frontend

```bash
cd Frontend
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_API_URL
npm run dev
```

## Environment Variables

See [`backend/.env.example`](backend/.env.example) and [`backend/.env.neon.example`](backend/.env.neon.example) for all required variables.

## License

MIT
