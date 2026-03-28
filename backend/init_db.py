# backend/init_db.py
from database.connection import init_db

if __name__ == "__main__":
    print("🔄 Creating database tables...")
    init_db()
    print("✅ Database initialized successfully!")