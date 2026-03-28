# backend/database/connection.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database.models import Base
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set. Please check your .env file.")

# Handle SSL Mode from Env (if not in URL)
connect_args = {}
db_sslmode = os.getenv("DB_SSLMODE")
if db_sslmode and "sslmode=" not in DATABASE_URL:
    connect_args["sslmode"] = db_sslmode

engine = create_engine(DATABASE_URL, echo=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

def get_db():
    """Dependency for FastAPI routes"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()