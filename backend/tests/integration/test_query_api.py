import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from database.models import User, Dashboard, DatasetStorage
import uuid

from routes.auth import get_current_active_user

client = TestClient(app)


@pytest.fixture
def mock_dashboard_with_data(db_session, override_auth):
    """Set up a dashboard with real CSV data in DatasetStorage."""
    user = override_auth  # DB-inserted user, auth already overridden

    # Define CSV data as records (matches what load_dataset returns)
    csv_records = [
        {"id": 1, "name": "Alice",   "department": "HR", "salary": 50000},
        {"id": 2, "name": "Bob",     "department": "IT", "salary": 80000},
        {"id": 3, "name": "Charlie", "department": "IT", "salary": 75000},
        {"id": 4, "name": "David",   "department": "HR", "salary": 52000},
    ]

    # Create Dashboard
    dashboard = Dashboard(
        title="Query Dashboard",
        user_id=user.id,
        dataset_filename="test_data.csv",
        row_count=4,
        column_count=4,
    )
    db_session.add(dashboard)
    db_session.flush()

    # Create Storage with actual data so load_dataset does NOT raise 500
    storage = DatasetStorage(
        dashboard_id=dashboard.id,
        data=csv_records,
    )
    db_session.add(storage)
    db_session.flush()

    yield dashboard, user, None


@patch("services.llm_service.LLMService.generate_query_dsl")
def test_ask_simple_question(mock_generate_dsl, mock_dashboard_with_data):
    dashboard, user, _ = mock_dashboard_with_data
    from schemas.query_dsl import QueryDSL, QueryFilter

    # Mock LLM to return filter DSL
    mock_generate_dsl.return_value = QueryDSL(
        select=["name", "salary"],
        filters=[QueryFilter(column="department", operator="==", value="IT")],
        limit=10
    )

    response = client.post(
        f"/api/query/ask/{dashboard.id}",
        json={"question": "Who works in IT?"}
    )

    data = response.json()
    if not data.get("success"):
        print(f"API Error: {data.get('error')}")

    assert response.status_code == 200
    assert data["success"] is True
    assert len(data["rows"]) == 2  # Bob and Charlie
    assert "Bob" in [r["name"] for r in data["rows"]]
    assert "IT" in data["generated_sql"]


@patch("services.llm_service.LLMService.generate_query_dsl")
def test_ask_aggregation_question(mock_generate_dsl, mock_dashboard_with_data):
    dashboard, user, _ = mock_dashboard_with_data
    from schemas.query_dsl import QueryDSL, QueryAggregation, QuerySort

    # Mock LLM for aggregation
    mock_generate_dsl.return_value = QueryDSL(
        groupby=["department"],
        aggregations=[QueryAggregation(column="salary", function="mean", alias="avg_salary")],
        sort=[QuerySort(column="avg_salary", descending=True)]
    )

    response = client.post(
        f"/api/query/ask/{dashboard.id}",
        json={"question": "Average salary by department"}
    )

    assert response.status_code == 200
    data = response.json()
    rows = data["rows"]

    assert len(rows) == 2  # HR and IT
    # IT avg (80000+75000)/2 = 77500
    it_row = next(r for r in rows if r["department"] == "IT")
    assert it_row["avg_salary"] == 77500.0


@patch("services.llm_service.LLMService.generate_query_dsl")
def test_llm_failure(mock_generate_dsl, mock_dashboard_with_data):
    dashboard, user, _ = mock_dashboard_with_data

    # Mock LLM failure (None)
    mock_generate_dsl.return_value = None

    response = client.post(
        f"/api/query/ask/{dashboard.id}",
        json={"question": "Unknown question"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Failed to interpret" in data["error"]
