from fastapi.testclient import TestClient
from main import app
import os
import pytest

client = TestClient(app)

def test_excel_upload_flow():
    """
    Test that uploading an Excel (.xlsx) file works exactly like a CSV file.
    """
    # 1. Register & Login
    import uuid
    random_suffix = str(uuid.uuid4())[:8]
    email = f"excel_test_{random_suffix}@example.com"
    
    register_res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "name": "Excel Tester"}
    )
    token = register_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Upload Excel Dataset
    excel_path = "tests/fixtures/sample.xlsx"
    with open(excel_path, "rb") as f:
        excel_content = f.read()

    create_res = client.post(
        "/api/upload/create-dashboard",
        headers=headers,
        data={
            "title": "Excel Test Dashboard",
            "target_column": "target",
            "problem_type": "regression"
        },
        files={"file": ("sample.xlsx", excel_content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    )
    
    assert create_res.status_code == 200, f"Upload failed: {create_res.text}"
    dashboard_id = create_res.json()["dashboard_id"]
    
    # 3. Verify Analysis Endpoint works (meaning file was parsed correctly)
    summary_res = client.get(
        f"/api/analysis/summary/{dashboard_id}",
        headers=headers
    )
    
    assert summary_res.status_code == 200
    summary_data = summary_res.json()
    assert summary_data["success"] is True
