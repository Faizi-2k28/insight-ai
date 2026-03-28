from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_login_failure_invalid_creds():
    """
    Test that logging in with invalid credentials returns 401.
    This is a safe integration test that touches the auth route 
    but does not require DB seeding since the lookup will fail safely.
    """
    # Attempt login with non-existent user but VALID password format 
    # (to bypass 400 Bad Request validation and hit 401 Unauthorized)
    response = client.post(
        "/api/auth/login",
        json={"email": "non_existent_user@example.com", "password": "WrongPassword123!"},
    )
    
    # Needs to be 401 Unauthorized
    assert response.status_code == 401
    assert "Incorrect email or password" in response.json().get("detail", "")
