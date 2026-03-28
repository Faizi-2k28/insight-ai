
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
from database.models import Base, User, Dashboard, DatasetStorage
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
        user_id=created_user.id
    )
    db.add(dashboard)
    
    db.commit()
    db.refresh(dashboard)
    
    yield db, dashboard
    
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def mock_dataset_service():
    with patch("services.dataset_service.DatasetService.load_dataset") as mock:
        # Return a list of dicts simulating a loaded dataset
        # We need a decent size to test pagination
        data = []
        for i in range(50):
            data.append({
                "id": i,
                "category": f"Cat_{i%5}", # 5 categories
                "value": i * 10,
                "profit": (i * 5) + (i % 2), # New Numeric
                "group": f"Group_{i%3}",
                "region": f"Region_{i%4}",   # New Categorical
                "date": f"2023-01-{i%28+1:02d}"
            })
        
        mock.return_value = data
        yield mock

def test_get_recommendations_default(test_db, mock_dataset_service):
    db, dashboard = test_db
    
    response = client.get(f"/api/analysis/recommendations/{dashboard.id}")
    
    assert response.status_code == 200
    data = response.json()
    
    assert data["success"] is True
    assert data["dashboard_id"] == str(dashboard.id)
    assert len(data["charts"]) == 7 # Default limit
    assert data["limit"] == 7
    assert data["offset"] == 0
    assert data["returned_count"] == 7
    assert data["total_candidates"] > 7 # Should have generated more

def test_get_recommendations_pagination(test_db, mock_dataset_service):
    db, dashboard = test_db
    
    # Page 1
    resp1 = client.get(f"/api/analysis/recommendations/{dashboard.id}?limit=5&offset=0")
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert len(data1["charts"]) == 5
    
    # Page 2
    resp2 = client.get(f"/api/analysis/recommendations/{dashboard.id}?limit=5&offset=5")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert len(data2["charts"]) == 5
    
    # Verify different content
    titles1 = [c["title"] for c in data1["charts"]]
    titles2 = [c["title"] for c in data2["charts"]]
    
    # Intersection might happen if tie-breaking is weak, but with different offsets should differ
    assert titles1 != titles2 

def test_get_recommendations_insights(test_db, mock_dataset_service):
    db, dashboard = test_db
    
    response = client.get(f"/api/analysis/recommendations/{dashboard.id}?limit=1")
    data = response.json()
    
    chart = data["charts"][0]
    assert "insights" in chart
    assert "recommendations" in chart
    assert len(chart["insights"]) > 0
    assert len(chart["recommendations"]) > 0

def test_invalid_dashboard_id(test_db, mock_dataset_service):
    random_id = uuid.uuid4()
    response = client.get(f"/api/analysis/recommendations/{random_id}")
    assert response.status_code == 404
