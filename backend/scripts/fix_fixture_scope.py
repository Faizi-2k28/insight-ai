import sys
import re

files_to_fix = [
    "tests/integration/test_query_history.py",
    "tests/integration/test_export_api_v2.py",
    "tests/integration/test_export_api.py",
    "tests/integration/test_chart_api.py"
]

for file_path in files_to_fix:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix double decorators
    content = content.replace('@pytest.fixture(scope="module")\n@pytest.fixture(scope="function")', '@pytest.fixture(scope="function")')
    
    # Change scope="module" to scope="function"
    content = content.replace('@pytest.fixture(scope="module")', '@pytest.fixture(scope="function")')
    
    # test_export_api.py uses @pytest.fixture(autouse=True) for setup_db
    # It might use scope function by default, but let's make sure it's valid.
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Fixed {file_path}")
