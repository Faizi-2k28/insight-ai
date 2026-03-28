import requests
import os
import json
import time

BASE_URL = "http://127.0.0.1:8001"
USER_EMAIL = "admin@insightai.com"
USER_PASSWORD = "Admin123!"
FIXTURE_PATH = "tests/fixtures/tiny_train.csv"

def test_login():
    print("\nStep 1: Login")
    url = f"{BASE_URL}/api/auth/login"
    payload = {"email": USER_EMAIL, "password": USER_PASSWORD}
    response = requests.post(url, json=payload)
    if response.status_code == 200:
        print("✅ Login successful")
        return response.json()["access_token"]
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def test_upload(token):
    print("\nStep 2: Upload Dataset")
    url = f"{BASE_URL}/api/upload/create-dashboard"
    headers = {"Authorization": f"Bearer {token}"}
    
    with open(FIXTURE_PATH, "rb") as f:
        files = {"file": ("tiny_train.csv", f, "text/csv")}
        data = {
            "title": "E2E Test Dashboard",
            "target_column": "species",
            "problem_type": "classification",
            "description": "E2E Verification Dataset"
        }
        response = requests.post(url, headers=headers, files=files, data=data)
        
    if response.status_code == 200:
        dashboard_id = response.json()["dashboard_id"]
        print(f"✅ Upload successful. Dashboard ID: {dashboard_id}")
        return dashboard_id
    else:
        print(f"❌ Upload failed (Status {response.status_code}): {response.text}")
        try:
            print(f"  Detail: {json.dumps(response.json(), indent=2)}")
        except:
            pass
        return None

def test_recommendations(token, dashboard_id):
    print("\nStep 3: Verify Chart Recommendations")
    url = f"{BASE_URL}/api/analysis/recommendations/{dashboard_id}?limit=7"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        count = data.get("returned_count", 0)
        print(f"✅ Recommendations loaded: {count} charts")
        if count > 0:
            print(f"  Sample Chart: {data['charts'][0]['title']}")
        return True
    else:
        print(f"❌ Recommendations failed: {response.text}")
        return False

def test_ask_data(token, dashboard_id):
    print("\nStep 4: Ask Data (Chat)")
    url = f"{BASE_URL}/api/query/ask/{dashboard_id}"
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"question": "How many rows are in the dataset?"}
    response = requests.post(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Query successful")
        print(f"  SQL: {data.get('generated_sql')}")
        print(f"  Rows Returned: {data.get('row_count')}")
        return True
    else:
        print(f"❌ Query failed: {response.text}")
        return False

def test_history(token, dashboard_id):
    print("\nStep 5: Verify History")
    url = f"{BASE_URL}/api/query/history/{dashboard_id}"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        items = response.json().get("items", [])
        print(f"✅ History retrieved: {len(items)} items")
        if items:
            print(f"  Latest Query: {items[0]['query_text']}")
        return True
    else:
        print(f"❌ History failed: {response.text}")
        return False

def test_export(token, dashboard_id):
    print("\nStep 6: Verify Export HTML")
    url = f"{BASE_URL}/api/export/html/{dashboard_id}"
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        content_type = response.headers.get("Content-Type", "")
        print(f"✅ Export status: {response.status_code}")
        print(f"  Content-Type: {content_type}")
        if "text/html" in content_type:
            print("  ✅ HTML content confirmed")
        return True
    else:
        print(f"❌ Export failed: {response.text}")
        return False

if __name__ == "__main__":
    token = test_login()
    if token:
        dashboard_id = test_upload(token)
        if dashboard_id:
            test_recommendations(token, dashboard_id)
            test_ask_data(token, dashboard_id)
            test_history(token, dashboard_id)
            test_export(token, dashboard_id)
