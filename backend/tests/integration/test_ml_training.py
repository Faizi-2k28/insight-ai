from fastapi.testclient import TestClient
from main import app
import os

client = TestClient(app)

def test_ml_training_flow():
    """
    Test the full flow: Register -> Upload -> Train
    This verifies that the endpoint works and returns 200 (sync behavior).
    """
    # 1. Register User
    import uuid
    random_suffix = str(uuid.uuid4())[:8]
    email = f"ml_test_{random_suffix}@example.com"
    
    register_res = client.post(
        "/api/auth/register",
        json={"email": email, "password": "Password123!", "name": "ML Tester"}
    )
    token = register_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Upload Dataset
    fixtures_dir = os.path.dirname(os.path.dirname(__file__))
    file_path = os.path.join(fixtures_dir, "fixtures", "tiny_train.csv")
    
    with open(file_path, "rb") as f:
        # Create dashboard first
        create_res = client.post(
            "/api/upload/create-dashboard",
            headers=headers,
            data={
                "title": "ML Test Dashboard",
                "target_column": "species",
                "problem_type": "classification"
            },
            files={"file": ("tiny_train.csv", f, "text/csv")}
        )
    
    assert create_res.status_code == 200
    dashboard_id = create_res.json()["dashboard_id"]
    
    # 4. Train Models
    # This call should be synchronous from client perspective but non-blocking on server
    train_res = client.post(
        f"/api/ml/train/{dashboard_id}",
        headers=headers
    )
    
    assert train_res.status_code == 200
    data = train_res.json()
    assert data["success"] is True
    assert len(data["results"]) > 0
    assert "best_model" in data
