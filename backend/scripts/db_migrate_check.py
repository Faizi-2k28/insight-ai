import os
import sys
import subprocess
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

def check_migrations():
    print(f"Checking Alembic migration state...")
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set in environment")
        sys.exit(1)
        
    # Check 1: Alembic Command Output
    print("\n--- Alembic Current ---")
    try:
        if sys.platform == "win32":
            alembic_cmd = ".venv_check\\Scripts\\alembic.exe"
        else:
            alembic_cmd = "alembic"
            
        result = subprocess.run([alembic_cmd, "current"], capture_output=True, text=True)
        print(result.stdout)
        if result.stderr:
            print(f"Error: {result.stderr}")
    except Exception as e:
        print(f"❌ Failed to run alembic command: {str(e)}")

    # Check 2: Database Table Verification
    print("\n--- DB Verification ---")
    try:
        engine = create_engine(DATABASE_URL)
        inspector = inspect(engine)
        
        tables = inspector.get_table_names()
        if 'alembic_version' in tables:
            print("✅ 'alembic_version' table EXISTS.")
            
            with engine.connect() as conn:
                result = conn.execute(text("SELECT * FROM alembic_version"))
                rows = result.fetchall()
                print(f"Current Revision in DB: {[row[0] for row in rows]}")
        else:
            print("❌ 'alembic_version' table MISSING.")
            
    except Exception as e:
        print(f"❌ Database check failed: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    check_migrations()
