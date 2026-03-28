import pytest
from fastapi.testclient import TestClient
from main import app
from database.connection import get_db
from database.models import Base, User, Dashboard, QueryHistory, Insight
from routes.auth import get_current_active_user
import uuid
from datetime import datetime
from sqlalchemy import create_engine, String, Text, TypeDecorator, JSON
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import json
import sqlalchemy.dialects.postgresql
from sqlalchemy.sql.sqltypes import ARRAY

# MOCK TYPES (Copied from test_chart_api.py)
class MockUUID(TypeDecorator):
    impl = String
    cache_ok = True
    def __init__(self, as_uuid=True): super().__init__()
    def process_bind_param(self, value, dialect):
        print(f"MockUUID bind: {value} type={type(value)}")
        return str(value) if value else None
    def process_result_value(self, value, dialect): return uuid.UUID(value) if value else None

class MockJSON(TypeDecorator):
    impl = Text
    cache_ok = True
    def process_bind_param(self, value, dialect): return json.dumps(value) if value else None
    def process_result_value(self, value, dialect):
        if value is None: return None
        if isinstance(value, (dict, list)): return value
        try: return json.loads(value)
        except: return value

# Setup in-memory DB
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Global Test ID
TEST_USER_ID = uuid.uuid4()

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

def override_get_current_user():
    return User(
        id=TEST_USER_ID,
        email="test@example.com",
        password_hash="fake",
        is_active=True
    )

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_active_user] = override_get_current_user

client = TestClient(app)

def patch_metadata_for_sqlite(metadata):
    from sqlalchemy.dialects.postgresql import JSONB, UUID
    from sqlalchemy.sql.sqltypes import JSON, ARRAY
    print("Patching metadata...")
    for table in metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, (JSONB, JSON, ARRAY)): column.type = MockJSON()
            elif isinstance(column.type, (UUID, sqlalchemy.dialects.postgresql.UUID)): 
                print(f"Patching UUID column: {table.name}.{column.name}")
                column.type = MockUUID()
            elif hasattr(column.type, 'python_type') and column.type.python_type == uuid.UUID: 
                print(f"Patching python_type UUID column: {table.name}.{column.name}")
                column.type = MockUUID()

@pytest.fixture(autouse=True)
def setup_db():
    patch_metadata_for_sqlite(Base.metadata)
    print(f"Dashboard.id type: {Dashboard.__table__.columns['id'].type}")
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    
    # Add User
    user = User(
        id=TEST_USER_ID,
        email="test@example.com",
        password_hash="fake",
        is_active=True
    )
    db.add(user)
    
    # Add Dashboard
    dashboard = Dashboard(
        id=uuid.uuid4(),
        title="Test Dashboard",
        user_id=TEST_USER_ID,
        file_path="test.csv",
        target_column="target",
        problem_type="classification"
    )
    db.add(dashboard)
    
    # Add Insight
    insight = Insight(
        id=uuid.uuid4(),
        dashboard_id=dashboard.id,
        title="Test Insight",
        content="This is a test insight",
        category="general",
        priority="high"
    )
    db.add(insight)
    
    # Add Query History
    history = QueryHistory(
        id=uuid.uuid4(),
        dashboard_id=dashboard.id,
        user_id=TEST_USER_ID,
        query_text="Show me sales",
        generated_code="SELECT * FROM table",
        was_successful=True,
        execution_time=0.1
    )
    db.add(history)
    
    db.commit()
    yield
    Base.metadata.drop_all(bind=engine)

# Mock Services to avoid requiring actual Data/ML processing
import services.dataset_service
import services.chart_service
import services.data_profiling_service

def mock_load_dataset(db, dashboard_id):
    return [{"col1": 10, "col2": 20}, {"col1": 15, "col2": 25}]

services.dataset_service.DatasetService.load_dataset = mock_load_dataset

def mock_profile_dataset(df):
    return {"basic_info": {"rows": 2}}

services.data_profiling_service.DataProfilingService.profile_dataset = mock_profile_dataset

def mock_generate_chart_config(df, profile, limit=7):
    return [{
        "title": "Test Chart",
        "type": "bar",
        "data": [{"name": "A", "value": 10}]
    }]

services.chart_service.ChartService.generate_chart_config = mock_generate_chart_config

def mock_generate_chart_data(df, config):
    return [{"name": "A", "value": 10}]

services.chart_service.ChartService.generate_chart_data = mock_generate_chart_data

import services.insight_service
def mock_get_insights(db, dashboard_id):
    from database.models import Insight
    return [
        Insight(title="Test Insight 1", content="Content 1"),
        Insight(title="Test Insight 2", content="Content 2")
    ]
services.insight_service.InsightService.get_insights = mock_get_insights


def test_export_html_success():
    # Get dashboard ID
    db = TestingSessionLocal()
    dashboard = db.query(Dashboard).first()
    
    response = client.get(f"/api/export/html/{dashboard.id}")
    
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "attachment; filename=" in response.headers["content-disposition"]
    
    html = response.text
    assert "<!DOCTYPE html>" in html
    assert "Test Dashboard" in html  # Title
    assert "Test Insight" in html    # Insight
    assert "Show me sales" in html   # Query History
    assert "Test Chart" in html      # Chart Title

def test_export_html_not_found():
    import traceback
    try:
        random_id = uuid.uuid4()
        response = client.get(f"/api/export/html/{random_id}")
        assert response.status_code == 404
    except Exception:
        traceback.print_exc()
        raise

if __name__ == "__main__":
    import sys
    # sys.exit(pytest.main(["-v", __file__]))
    # Run functions directly to bypass pytest capture
    try:
        test_export_html_not_found()
        print("test_export_html_not_found passed")
        test_export_html_success()
        print("test_export_html_success passed")
    except Exception as e:
        print(f"Test failed: {e}")
        sys.exit(1)
