import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import uuid

from main import app
from database.models import User, Dashboard, Insight, QueryHistory
from routes.auth import get_current_active_user

created_user = None

def override_get_current_active_user():
    return created_user

@pytest.fixture(autouse=True)
def _patch_user():
    app.dependency_overrides[get_current_active_user] = override_get_current_active_user
    yield
    app.dependency_overrides.pop(get_current_active_user, None)

client = TestClient(app)

@pytest.fixture(scope="function")
def test_db(db_session):
    global created_user
    db = db_session
    created_user = User(id=uuid.uuid4(), email="test@example.com", password_hash="dummy_hash", is_active=True)
    db.add(created_user)
    dashboard = Dashboard(id=uuid.uuid4(), title="Test Dashboard", dataset_filename="test.csv", user_id=created_user.id, target_column="target", problem_type="classification")
    db.add(dashboard)
    db.flush()
    db.add(Insight(id=uuid.uuid4(), dashboard_id=dashboard.id, title="Test Insight", content="This is a test insight", category="general", priority="high"))
    db.add(QueryHistory(id=uuid.uuid4(), dashboard_id=dashboard.id, user_id=created_user.id, query_text="Show me sales", generated_code="SELECT * FROM table", was_successful=True, execution_time=0.1))
    db.flush()
    db.refresh(dashboard)
    yield db, dashboard

@pytest.fixture
def mock_all_services(monkeypatch):
    import services.dataset_service, services.data_profiling_service, services.chart_service, services.insight_service
    monkeypatch.setattr(services.dataset_service.DatasetService, "load_dataset", lambda db, did: [{"col1": 10, "col2": 20}])
    monkeypatch.setattr(services.data_profiling_service.DataProfilingService, "profile_dataset", lambda df: {"basic_info": {"rows": 1}})
    monkeypatch.setattr(services.chart_service.ChartService, "generate_chart_config", lambda df, profile, limit=7: [{"title": "Test Chart", "type": "bar", "data": []}])
    monkeypatch.setattr(services.chart_service.ChartService, "generate_chart_data", lambda df, config: [{"name": "A", "val": 1}])
    monkeypatch.setattr(services.insight_service.InsightService, "get_insights", lambda db, did: [Insight(title="Test Insight 1", content="Content 1")])

def test_export_html_success(test_db, mock_all_services):
    db, dashboard = test_db
    response = client.get(f"/api/export/html/{dashboard.id}")
    if response.status_code != 200:
        print(f"ERROR: {response.text}")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    html = response.text
    assert "<!DOCTYPE html>" in html
    assert "Test Dashboard" in html

def test_export_html_not_found(test_db):
    response = client.get(f"/api/export/html/{uuid.uuid4()}")
    assert response.status_code == 404

if __name__ == "__main__":
    import sys
    sys.exit(__import__("pytest").main(["-v", __file__]))
