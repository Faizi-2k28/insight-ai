
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, String, Text, TypeDecorator, JSON
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import uuid
import json
import sqlalchemy.dialects.postgresql
from sqlalchemy.sql.sqltypes import ARRAY

from main import app
from database.connection import get_db
from database.models import Base, User, Dashboard, QueryHistory
from routes.auth import get_current_active_user
from datetime import datetime, timedelta

# Global var for user
created_user = None

def override_get_current_user():
    return created_user

@pytest.fixture(autouse=True)
def _patch_user():
    app.dependency_overrides[get_current_active_user] = override_get_current_user
    yield
    app.dependency_overrides.pop(get_current_active_user, None)

client = TestClient(app)

@pytest.fixture(scope="function")
def test_db(db_session):
    global created_user
    db = db_session
    
    # Add user
    created_user = User(id=uuid.uuid4(), email="test@example.com", password_hash="dummy", is_active=True)
    db.add(created_user)
    db.flush()
    
    yield db

def test_get_history_empty(test_db):
    db = test_db
    # 1. Create Dashboard
    dash = Dashboard(
        id=uuid.uuid4(),
        user_id=created_user.id,
        title="History Test Dash",
        dataset_filename="dummy.csv"
    )
    db.add(dash)
    db.flush()
    
    # 2. Fetch History
    resp = client.get(f"/api/query/history/{dash.id}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["total_count"] == 0
    assert data["items"] == []

def test_get_history_populated(test_db):
    db = test_db
    # 1. Create Dashboard
    dash_id = uuid.uuid4()
    dash = Dashboard(
        id=dash_id,
        user_id=created_user.id,
        title="History Test Dash 2",
        dataset_filename="dummy.csv"
    )
    db.add(dash)
    db.flush()
    
    # 2. Create History Items
    # Timestamps need to be set clearly
    t1 = datetime.utcnow() - timedelta(hours=1)
    t2 = datetime.utcnow()
    
    h1 = QueryHistory(
        id=uuid.uuid4(),
        user_id=created_user.id,
        dashboard_id=dash_id,
        query_text="Old Query",
        generated_code="SELECT 1",
        timestamp=t1
    )
    h2 = QueryHistory(
        id=uuid.uuid4(),
        user_id=created_user.id,
        dashboard_id=dash_id,
        query_text="New Query",
        generated_code="SELECT 2",
        timestamp=t2
    )
    db.add_all([h1, h2])
    db.flush()
    
    # 3. Fetch History
    resp = client.get(f"/api/query/history/{dash_id}")
    assert resp.status_code == 200
    data = resp.json()
    
    items = data["items"]
    assert len(items) == 2
    assert items[0]["query_text"] == "New Query"
    assert items[1]["query_text"] == "Old Query"

def test_history_pagination(test_db):
    db = test_db
    dash_id = uuid.uuid4()
    dash = Dashboard(id=dash_id, user_id=created_user.id, title="Pagination Dash", dataset_filename="dummy.csv")
    db.add(dash)
    
    items = []
    base_time = datetime.utcnow()
    for i in range(25):
        items.append(QueryHistory(
            id=uuid.uuid4(),
            user_id=created_user.id,
            dashboard_id=dash_id,
            query_text=f"Query {i}",
            timestamp=base_time - timedelta(minutes=i)
        ))
    db.add_all(items)
    db.flush()
    
    # Default limit 20
    resp = client.get(f"/api/query/history/{dash_id}")
    data = resp.json()
    assert len(data["items"]) == 20
    assert data["total_count"] == 25
    
    # Offset
    resp = client.get(f"/api/query/history/{dash_id}?offset=20")
    data = resp.json()
    assert len(data["items"]) == 5

def test_history_access_control(test_db):
    db = test_db
    # Create another user and dashboard
    other_user = User(id=uuid.uuid4(), email="other@example.com", password_hash="hash")
    db.add(other_user)
    
    other_dash = Dashboard(id=uuid.uuid4(), user_id=other_user.id, title="Other Dash", dataset_filename="dummy.csv")
    db.add(other_dash)
    db.flush()
    
    # Try to access with current_user (created_user)
    resp = client.get(f"/api/query/history/{other_dash.id}")
    assert resp.status_code == 403
