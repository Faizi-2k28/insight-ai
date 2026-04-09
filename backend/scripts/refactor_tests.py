import sys
import re
import os

files_to_fix = [
    "tests/integration/test_export_api_v2.py",
    "tests/integration/test_export_api.py",
    "tests/integration/test_chart_api.py"
]

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        continue
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Remove Mock classes
    content = re.sub(r'# MOCK TYPES.*?from main import app', 'from main import app', content, flags=re.DOTALL)
    
    # 2. Remove in-memory DB setup
    content = re.sub(r'# Setup in-memory DB.*?(# Global var for user|# Global Test ID)', r'\1', content, flags=re.DOTALL)
    
    # 3. Remove override_get_db assignment
    content = re.sub(r'app\.dependency_overrides\[get_db\] = override_get_db\n', '', content)
    
    # 4. Remove patch_metadata_for_sqlite
    content = re.sub(r'def patch_metadata_for_sqlite.*?@pytest.fixture', '@pytest.fixture', content, flags=re.DOTALL)
    
    # 5. Fix test_db fixture
    content = re.sub(r'def test_db\(\):', r'def test_db(db_session):', content)
    content = re.sub(r'def setup_db\(\):', r'def setup_db(db_session):', content)
    
    content = re.sub(r'    patch_metadata_for_sqlite\(Base\.metadata\)\n', '', content)
    content = re.sub(r'    print\("Patching metadata\.\.\."\)\n', '', content)
    content = re.sub(r'    print\(f"Dashboard\.id type: \{Dashboard\.__table__\.columns\[\'id\'\]\.type\}"\)\n', '', content)
    content = re.sub(r'    Base\.metadata\.create_all\(bind=engine\)\n', '', content)
    content = re.sub(r'    db = TestingSessionLocal\(\)\n', '', content)
    
    # Replace db. with db_session.
    # But wait, we need to be careful not to replace `db` variable in functions.
    # Actually, in the fixture setup, instead of `db = TestingSessionLocal()`, we can just say `db = db_session`.
    # Let me just insert `db = db_session` where `db = TestingSessionLocal()` was.
    content = re.sub(r'db = TestingSessionLocal\(\)', 'db = db_session', content)
    
    # And drop_all
    content = re.sub(r'    Base\.metadata\.drop_all\(bind=engine\)\n', '', content)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Refactored {file_path}")
