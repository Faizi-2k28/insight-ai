import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
import uuid

from main import app
from database.models import User, Dashboard

client = TestClient(app)


@pytest.fixture(scope="function")
def test_db(db_session, override_auth):
    """Create a dashboard owned by the pre-seeded test user."""
    db = db_session
    owner = override_auth
    dashboard = Dashboard(
        id=uuid.uuid4(),
        title="Profile Test Dashboard",
        dataset_filename="profile_test.csv",
        user_id=owner.id,
    )
    db.add(dashboard)
    db.flush()
    db.refresh(dashboard)
    yield db, dashboard


@pytest.fixture
def mock_dataset_service():
    """Mock dataset + insight services so tests don't need real DB data."""
    data = [
        {
            "id": i,
            "category": f"Cat_{i % 5}",
            "value": i * 10,
            "profit": (i * 5) + (i % 2),
            "group": f"Group_{i % 3}",
            "region": f"Region_{i % 4}",
            "date": f"2023-01-{i % 28 + 1:02d}",
        }
        for i in range(50)
    ]
    with patch(
        "services.dataset_service.DatasetService.load_dataset"
    ) as mock_data, patch(
        "services.insight_service.InsightService.generate_chart_insights"
    ) as mock_insights:
        mock_data.side_effect = lambda *a, **kw: data
        mock_insights.return_value = [{"title": "Mock Insight"}]
        yield mock_data


# ── Profile endpoint ──────────────────────────────────────────────


def test_get_data_profile_success(test_db, mock_dataset_service):
    """POST/GET to /api/analysis/profile/{id} must return 200 with a profile dict."""
    db, dashboard = test_db
    response = client.get(f"/api/analysis/profile/{dashboard.id}")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["success"] is True
    assert data["dashboard_id"] == str(dashboard.id)
    # Profile must contain the keys produced by DataProfilingService
    profile = data["profile"]
    assert "basic_info" in profile
    assert "columns" in profile
    assert "correlations" in profile
    assert "data_quality" in profile


def test_get_data_profile_not_found(test_db, mock_dataset_service):
    """Profile endpoint returns 404 for a non-existent dashboard."""
    response = client.get(f"/api/analysis/profile/{uuid.uuid4()}")
    assert response.status_code == 404


# ── Summary endpoint ─────────────────────────────────────────────


def test_get_dashboard_summary_success(test_db, mock_dataset_service):
    """GET /api/analysis/summary/{id} must return 200 with summary keys."""
    db, dashboard = test_db
    response = client.get(f"/api/analysis/summary/{dashboard.id}")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["success"] is True
    summary = data["summary"]
    assert "basic_info" in summary
    assert "data_quality" in summary
    assert "top_correlations" in summary


def test_get_dashboard_summary_not_found(test_db, mock_dataset_service):
    """Summary endpoint returns 404 for a non-existent dashboard."""
    response = client.get(f"/api/analysis/summary/{uuid.uuid4()}")
    assert response.status_code == 404


# ── Charts endpoint (quick smoke test) ───────────────────────────


def test_get_chart_configurations_success(test_db, mock_dataset_service):
    """GET /api/analysis/charts/{id} must return 200 with charts list."""
    db, dashboard = test_db
    response = client.get(f"/api/analysis/charts/{dashboard.id}")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["success"] is True
    assert isinstance(data["charts"], list)


# ── Insights generation endpoint (smoke test) ─────────────────────

@patch("services.insight_service.InsightService.generate_insights")
def test_generate_insights_success(mock_generate, test_db, mock_dataset_service):
    """POST to /api/insights/generate/{id} must return 200 with generated insights."""
    mock_generate.return_value = [{
        "title": "Test ML Insight", 
        "description": "Desc", 
        "category": "general",
        "priority": "high",
        "action": "Do something"
    }]
    db, dashboard = test_db
    response = client.post(f"/api/insights/generate/{dashboard.id}")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["success"] is True
    assert "insights" in data
    assert len(data["insights"]) > 0
