import requests
import sys

BASE_URL = "http://127.0.0.1:8002"

def run_readonly_smoke():
    print(f"🚀 Running Read-Only Smoke Test against {BASE_URL}...")
    
    # 1. Root Check
    try:
        resp = requests.get(f"{BASE_URL}/")
        print(f"GET / : {resp.status_code}")
        if resp.status_code != 200:
            print("❌ Root endpoint failed")
            sys.exit(1)
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)
        
    # 2. Docs Check
    resp = requests.get(f"{BASE_URL}/docs")
    print(f"GET /docs: {resp.status_code}")
    if resp.status_code != 200:
        print("❌ Docs endpoint failed")
        sys.exit(1)
        
    # 3. OpenAPI Check
    resp = requests.get(f"{BASE_URL}/openapi.json")
    print(f"GET /openapi.json: {resp.status_code}")
    if resp.status_code != 200:
        print("❌ OpenAPI endpoint failed")
        sys.exit(1)

    print("✅ Read-Only Smoke Test Passed!")

if __name__ == "__main__":
    run_readonly_smoke()
