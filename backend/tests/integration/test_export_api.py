import pytest
from fastapi.testclient import TestClient
from main import app
from database.models import User, Dashboard, QueryHistory, Insight
from routes.auth import get_current_active_user
import uuid
import services.dataset_service
import services.chart_service
import services.data_profiling_service
import services.insight_service

TEST_USER_ID = uuid.uuid4()

client = TestClient(app)


@pytest.fixture(autouse=True)
def _patch_user():
    app.dependency_overrides[get_current_active_user] = lambda: User(
        id=TEST_USER_ID, email="test@example.com", password_hash="fake", is_active=True
    )
    yield
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest.fixture(autouse=True)
def _patch_services():
    """Monkey-patch services for this test module, restore originals after each test."""
    _orig_load = services.dataset_service.DatasetService.load_dataset
    _orig_profile = services.data_profiling_service.DataProfilingService.profile_dataset
    _orig_chart = services.chart_service.ChartService.generate_chart_config
    _orig_chart_data = services.chart_service.ChartService.generate_chart_data
    _orig_insights = services.insight_service.InsightService.get_insights

    services.dataset_service.DatasetService.load_dataset = lambda db, dashboard_id: [{"col1": 10, "col2": 20}]
    services.data_profiling_service.DataProfilingService.profile_dataset = lambda df: {"basic_info": {"rows": 1}}
    services.chart_service.ChartService.generate_chart_config = lambda df, profile, limit=7: [{"title": "Test Chart", "type": "bar", "data": [], "insights": ["insight"], "recommendations": ["rec"]}]
    services.chart_service.ChartService.generate_chart_data = lambda df, config: [{"name": "A", "val": 1}]
    services.insight_service.InsightService.get_insights = lambda db, did: [Insight(title="Test Insight 1", content="Content 1")]

    yield

    services.dataset_service.DatasetService.load_dataset = _orig_load
    services.data_profiling_service.DataProfilingService.profile_dataset = _orig_profile
    services.chart_service.ChartService.generate_chart_config = _orig_chart
    services.chart_service.ChartService.generate_chart_data = _orig_chart_data
    services.insight_service.InsightService.get_insights = _orig_insights


@pytest.fixture(autouse=True)
def setup_db(db_session):
    db = db_session
    db.add(User(id=TEST_USER_ID, email="test@example.com", password_hash="fake", is_active=True))
    dashboard = Dashboard(id=uuid.uuid4(), title="Test Dashboard", user_id=TEST_USER_ID, dataset_filename="test.csv")
    db.add(dashboard)
    db.flush()
    db.add(Insight(id=uuid.uuid4(), dashboard_id=dashboard.id, title="Test Insight", content="This is a test insight", category="general", priority="high"))
    db.add(QueryHistory(id=uuid.uuid4(), dashboard_id=dashboard.id, user_id=TEST_USER_ID, query_text="Show me sales", generated_code="SELECT * FROM table", was_successful=True, execution_time=0.1))
    db.flush()
    yield db


def test_export_html_success(setup_db):
    db = setup_db
    dashboard = db.query(Dashboard).filter(Dashboard.user_id == TEST_USER_ID).first()
    response = client.get(f"/api/export/html/{dashboard.id}")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]


def test_export_html_not_found():
    response = client.get(f"/api/export/html/{uuid.uuid4()}")
    assert response.status_code == 404
