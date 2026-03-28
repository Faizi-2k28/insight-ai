import os
import sqlalchemy
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("No DATABASE_URL")
    exit(1)

engine = create_engine(DATABASE_URL)

try:
    with engine.connect() as conn:
        print("Connected!")
        result = conn.execute(text("SELECT table_schema, table_name FROM information_schema.tables WHERE table_schema = 'public'"))
        rows = result.fetchall()
        print(f"Tables in public schema ({len(rows)}):")
        for row in rows:
            print(row)
            
        # Check if maybe they are in another schema
        result = conn.execute(text("SELECT current_schema()"))
        print(f"Current schema: {result.scalar()}")
        
except Exception as e:
    print(e)
