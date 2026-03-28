
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from main import app
from database.models import User, Dashboard, DatasetStorage
import uuid
import pandas as pd
import tempfile
import os

client = TestClient(app)

# Helper to create auth headers
def create_auth_headers(user_id):
    from services.auth_service import AuthService
    token = AuthService.create_access_token({"sub": str(user_id)})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def mock_dashboard_with_data(db_session):
    # Create User
    user = User(email=f"test_query_{uuid.uuid4()}@example.com", password_hash="hash", name="Query Tester")
    db_session.add(user)
    db_session.commit()
    
    # Create Data File
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        f.write("id,name,department,salary\n")
        f.write("1,Alice,HR,50000\n")
        f.write("2,Bob,IT,80000\n")
        f.write("3,Charlie,IT,75000\n")
        f.write("4,David,HR,52000\n")
        data_path = f.name.replace("\\", "/") # Normalize path
        
    # Create Dashboard
    dashboard = Dashboard(
        title="Query Dashboard",
        user_id=user.id,
        dataset_filename="test_data.csv",
        row_count=4,
        column_count=4
    )
    db_session.add(dashboard)
    db_session.flush()
    
    # Create Storage
    storage = DatasetStorage(
        dashboard_id=dashboard.id,
        file_path=data_path,
        row_count=4
    )
    db_session.add(storage)
    db_session.commit()
    
    yield dashboard, user, data_path
    
    # Cleanup
    if os.path.exists(data_path):
        os.unlink(data_path)

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
    
    headers = create_auth_headers(user.id)
    response = client.post(
        f"/api/query/ask/{dashboard.id}",
        json={"question": "Who works in IT?"},
        headers=headers
    )
    
    data = response.json()
    if not data.get("success"):
        print(f"API Error: {data.get('error')}")
        
    assert response.status_code == 200
    assert data["success"] is True
    assert len(data["rows"]) == 2 # Bob and Charlie
    assert "Bob" in [r["name"] for r in data["rows"]]
    assert "IT" in data["generated_sql"] # Sanity check SQL content

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
    
    headers = create_auth_headers(user.id)
    response = client.post(
        f"/api/query/ask/{dashboard.id}",
        json={"question": "Average salary by department"},
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    rows = data["rows"]
    
    assert len(rows) == 2 # HR and IT
    # IT avg (80000+75000)/2 = 77500
    it_row = next(r for r in rows if r["department"] == "IT")
    assert it_row["avg_salary"] == 77500.0

@patch("services.llm_service.LLMService.generate_query_dsl")
def test_llm_failure(mock_generate_dsl, mock_dashboard_with_data):
    dashboard, user, _ = mock_dashboard_with_data
    
    # Mock LLM failure (None)
    mock_generate_dsl.return_value = None
    
    headers = create_auth_headers(user.id)
    response = client.post(
        f"/api/query/ask/{dashboard.id}",
        json={"question": "Unknown question"},
        headers=headers
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "Failed to interpret" in data["error"]
