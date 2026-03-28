import requests
import sys

BASE_URL = "http://localhost:8000"

def check_endpoint(name, url, expected_status=200):
    print(f"Testing {name} ({url})...", end=" ")
    try:
        response = requests.get(url)
        if response.status_code == expected_status:
            print(f"PASS ({response.status_code})")
            return True
        else:
            print(f"FAIL (Expected {expected_status}, got {response.status_code})")
            return False
    except requests.exceptions.ConnectionError:
        print("FAIL (Connection Refused - Is server running?)")
        return False
    except Exception as e:
        print(f"FAIL (Error: {str(e)})")
        return False

def run_smoke_test():
    print("🚀 Starting Smoke Test...")
    
    checks = [
        ("Root", f"{BASE_URL}/"),
        ("API Docs", f"{BASE_URL}/docs"),
        ("OpenAPI Schema", f"{BASE_URL}/openapi.json")
    ]
    
    success = True
    for name, url in checks:
        if not check_endpoint(name, url):
            success = False
            
    if success:
        print("\n✅ smoke test passed!")
        sys.exit(0)
    else:
        print("\n❌ smoke test failed!")
        sys.exit(1)

if __name__ == "__main__":
    run_smoke_test()
