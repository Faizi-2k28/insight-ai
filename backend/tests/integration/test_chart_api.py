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
    owner = override_auth  # already inserted + auth overridden by override_auth fixture
    dashboard = Dashboard(
        id=uuid.uuid4(),
        title="Test Dashboard",
        dataset_filename="test.csv",
        user_id=owner.id
    )
    db.add(dashboard)
    db.flush()
    db.refresh(dashboard)
    yield db, dashboard


@pytest.fixture
def mock_dataset_service():
    data = [
        {
            "id": i, "category": f"Cat_{i%5}", "value": i * 10,
            "profit": (i * 5) + (i % 2), "group": f"Group_{i%3}",
            "region": f"Region_{i%4}", "date": f"2023-01-{i%28+1:02d}"
        }
        for i in range(50)
    ]
    with patch("services.dataset_service.DatasetService.load_dataset") as mock_data, \
         patch("services.insight_service.InsightService.generate_chart_insights") as mock_insights:
        mock_data.side_effect = lambda *a, **kw: data
        mock_insights.return_value = [
            {"title": "Mock Insight 1", "category": "visualization", "description": "Desc 1"},
            {"title": "Mock Insight 2", "category": "visualization", "description": "Desc 2"},
            {"title": "Mock Insight 3", "category": "visualization", "description": "Desc 3"}
        ]
        yield mock_data


def test_get_recommendations_default(test_db, mock_dataset_service):
    db, dashboard = test_db
    response = client.get(f"/api/analysis/recommendations/{dashboard.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["dashboard_id"] == str(dashboard.id)
    assert len(data["charts"]) == 7
    assert data["total_candidates"] > 7


def test_get_recommendations_pagination(test_db, mock_dataset_service):
    db, dashboard = test_db
    resp1 = client.get(f"/api/analysis/recommendations/{dashboard.id}?limit=5&offset=0")
    resp2 = client.get(f"/api/analysis/recommendations/{dashboard.id}?limit=5&offset=5")
    assert resp1.status_code == 200
    assert resp2.status_code == 200
    assert len(resp1.json()["charts"]) == 5
    assert len(resp2.json()["charts"]) == 5
    assert [c["title"] for c in resp1.json()["charts"]] != [c["title"] for c in resp2.json()["charts"]]


def test_get_recommendations_insights(test_db, mock_dataset_service):
    db, dashboard = test_db
    response = client.get(f"/api/analysis/recommendations/{dashboard.id}?limit=1")
    assert response.status_code == 200
    chart = response.json()["charts"][0]
    assert "insights" in chart
    assert "recommendations" in chart
    assert len(chart["insights"]) > 0


def test_invalid_dashboard_id(test_db, mock_dataset_service):
    response = client.get(f"/api/analysis/recommendations/{uuid.uuid4()}")
    assert response.status_code == 404


def test_generate_charts_and_insights(test_db, mock_dataset_service):
    db, dashboard = test_db
    response = client.post(f"/api/insights/charts/{dashboard.id}?num_charts=5")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "insights" in data
    assert "message" in data
    # Note: insights actually contain chart insights.
    # The charts endpoint generate_chart_insights returns a list of insights (one per chart).
    assert len(data["insights"]) >= 3
