import os
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
from urllib.parse import urlparse

# Use environment variables, default to a standard local test url if not provided
db_url = os.environ.get("DATABASE_URL", "postgresql://insight_user:insight123@localhost:2828/test_insight_ai_db")

parsed_url = urlparse(db_url)
db_user = parsed_url.username or "insight_user"
db_password = parsed_url.password or "insight123"
db_host = parsed_url.hostname or "localhost"
db_port = parsed_url.port or 2828
test_db = parsed_url.path.lstrip('/') or "test_insight_ai_db"
default_db = "postgres"

try:
    conn = psycopg2.connect(
        dbname=default_db,
        user=db_user,
        password=db_password,
        host=db_host,
        port=db_port
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    try:
        cur.execute(f"CREATE DATABASE {test_db};")
        print(f"Database {test_db} created successfully.")
    except psycopg2.errors.DuplicateDatabase:
        print(f"Database {test_db} already exists.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"Failed to connect or create DB: {e}")
