import os
import sys
from sqlalchemy import create_engine, inspect
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def check_db():
    print(f"Checking database connection...")
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set in environment")
        sys.exit(1)
        
    print(f"URL: {DATABASE_URL.split('@')[-1]}")  # Hide credentials
    
    try:
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        
        print(f"✅ Connection successful!")
        print(f"Dialect: {engine.dialect.name}")
        
        tables = inspector.get_table_names()
        print(f"\nTables found ({len(tables)}):")
        for table in tables:
            print(f" - {table}")
            
            # Optional: Print columns for key tables to verify schema
            if table in ['users', 'dashboards']:
                columns = [col['name'] for col in inspector.get_columns(table)]
                print(f"   Columns: {', '.join(columns)}")
                
    except Exception as e:
        print(f"❌ Database check failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    check_db()
