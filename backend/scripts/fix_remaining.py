import os
import re

# 1. test_export_api.py
f1 = "tests/integration/test_export_api.py"
with open(f1, "r", encoding="utf-8") as f: c1 = f.read()

# remove mocks
c1 = re.sub(r'# MOCK TYPES \(Copied from test_chart_api\.py\).*?import json\nimport sqlalchemy\.dialects\.postgresql\nfrom sqlalchemy\.sql\.sqltypes import ARRAY\n', '', c1, flags=re.DOTALL)
c1 = re.sub(r'class MockUUID.*?return value\n', '', c1, flags=re.DOTALL)
c1 = re.sub(r'file_path="test\.csv"', 'dataset_filename="test.csv"', c1)
c1 = re.sub(r'db\.commit\(\)', 'db.flush()', c1)
c1 = re.sub(r'def setup_db\(\):', 'def setup_db(db_session):\n    global db\n    db = db_session', c1)
c1 = re.sub(r'def test_export_html_success\(\):', 'def test_export_html_success(db_session):\n    # Get dashboard ID\n    dashboard = db_session.query(Dashboard).first()', c1)
c1 = re.sub(r'    dashboard = db\.query\(Dashboard\)\.first\(\)', '', c1)
    
with open(f1, "w", encoding="utf-8") as f: f.write(c1)

# 2. test_chart_api.py
f2 = "tests/integration/test_chart_api.py"
with open(f2, "r", encoding="utf-8") as f: c2 = f.read()
c2 = re.sub(r'db\.commit\(\)', 'db.flush()', c2)
with open(f2, "w", encoding="utf-8") as f: f.write(c2)

# 3. test_export_api_v2.py
f3 = "tests/integration/test_export_api_v2.py"
with open(f3, "r", encoding="utf-8") as f: c3 = f.read()
c3 = re.sub(r'db\.commit\(\)', 'db.flush()', c3)
with open(f3, "w", encoding="utf-8") as f: f.write(c3)

# 4. test_query_api.py
f4 = "tests/integration/test_query_api.py"
with open(f4, "r", encoding="utf-8") as f: c4 = f.read()
c4 = re.sub(r'db_session\.commit\(\)', 'db_session.flush()', c4)
c4 = re.sub(r'        file_path=data_path,\n        row_count=4\n', '        data={}\n', c4)
with open(f4, "w", encoding="utf-8") as f: f.write(c4)

print("Fixed!")
