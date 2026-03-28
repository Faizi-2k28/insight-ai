
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, String, Text, TypeDecorator, JSON
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pandas as pd
import uuid
import json
from unittest.mock import MagicMock, patch
import sqlalchemy.dialects.postgresql
from sqlalchemy.sql.sqltypes import ARRAY

# MOCK TYPES
class MockUUID(TypeDecorator):
    impl = String
    cache_ok = True
    def __init__(self, as_uuid=True):
        super().__init__()
    def process_bind_param(self, value, dialect):
        if value is None: return None
        return str(value)
    def process_result_value(self, value, dialect):
        if value is None: return None
        return uuid.UUID(value)

class MockJSON(TypeDecorator):
    impl = Text
    cache_ok = True
    def process_bind_param(self, value, dialect):
        if value is None: return None
        return json.dumps(value)
    def process_result_value(self, value, dialect):
        if value is None: return None
        if isinstance(value, (dict, list)): return value
        try:
            return json.loads(value)
        except:
            return value

from main import app
from database.connection import get_db
from database.models import Base, User, Dashboard, DatasetStorage, Insight, QueryHistory
from routes.auth import get_current_active_user

# Setup in-memory DB for integration tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

# Global var for user
created_user = None

def override_get_current_active_user():
    return created_user

app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_active_user] = override_get_current_active_user

client = TestClient(app)

def patch_metadata_for_sqlite(metadata):
    """Iterate over all tables and swap generic objects with SQLite-compatible mocks"""
    from sqlalchemy.dialects.postgresql import JSONB, UUID
    
    for table in metadata.tables.values():
        for column in table.columns:
            # Replace JSON/JSONB/ARRAY
            if isinstance(column.type, (JSONB, JSON, ARRAY)):
                column.type = MockJSON()
            
            # Replace UUID
            elif isinstance(column.type, (UUID, sqlalchemy.dialects.postgresql.UUID)):
                column.type = MockUUID()
                
            # Check for generic UUID from models
            elif hasattr(column.type, 'python_type') and column.type.python_type == uuid.UUID:
                 column.type = MockUUID()

@pytest.fixture(scope="module")
def test_db():
    global created_user
    
    # Patch metadata BEFORE creating tables
    patch_metadata_for_sqlite(Base.metadata)
    
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Add user
    created_user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        password_hash="dummy_hash",
        is_active=True
    )
    db.add(created_user)
    
    # Add dashboard
    dashboard_id = uuid.uuid4()
    dashboard = Dashboard(
        id=dashboard_id,
        title="Test Dashboard",
        dataset_filename="test.csv",
        user_id=created_user.id,
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
        user_id=created_user.id,
        query_text="Show me sales",
        generated_code="SELECT * FROM table",
        was_successful=True,
        execution_time=0.1
    )
    db.add(history)
    
    db.commit()
    db.refresh(dashboard)
    
    yield db, dashboard
    
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def mock_all_services(monkeypatch):
    # Mock Dataset Service
    def mock_load(db, dashboard_id):
        return [{"col1": 10, "col2": 20}]
    import services.dataset_service
    monkeypatch.setattr(services.dataset_service.DatasetService, "load_dataset", mock_load)
    
    # Mock Data Profiling
    def mock_profile(df):
        return {"basic_info": {"rows": 1}}
    import services.data_profiling_service
    monkeypatch.setattr(services.data_profiling_service.DataProfilingService, "profile_dataset", mock_profile)
    
    # Mock Chart Service
    def mock_config(df, profile, limit=7):
        return [{"title": "Test Chart", "type": "bar", "data": []}]
    def mock_data(df, config):
        return [{"name": "A", "val": 1}]
    import services.chart_service
    monkeypatch.setattr(services.chart_service.ChartService, "generate_chart_config", mock_config)
    monkeypatch.setattr(services.chart_service.ChartService, "generate_chart_data", mock_data)
    
    # Mock Insight Service
    def mock_insights(db, dashboard_id):
        return [
            Insight(title="Test Insight 1", content="Content 1")
        ]
    import services.insight_service
    monkeypatch.setattr(services.insight_service.InsightService, "get_insights", mock_insights)

def test_export_html_success(test_db, mock_all_services):
    db, dashboard = test_db
    
    response = client.get(f"/api/export/html/{dashboard.id}")
    
    if response.status_code != 200:
        print(f"ERROR RESPONSE: {response.text}")
        
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    assert "attachment; filename=" in response.headers["content-disposition"]
    
    html = response.text
    assert "<!DOCTYPE html>" in html
    assert "Test Dashboard" in html

def test_export_html_not_found(test_db):
    random_id = uuid.uuid4()
    response = client.get(f"/api/export/html/{random_id}")
    assert response.status_code == 404

if __name__ == "__main__":
    import sys
    sys.exit(pytest.main(["-v", __file__]))
