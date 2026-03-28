$ErrorActionPreference = "Stop"

Write-Host "Starting Test Run..." -ForegroundColor Cyan

# Create artifacts dir if not exists (pytest usually does this but good to be safe)
if (-not (Test-Path "artifacts")) {
    New-Item -ItemType Directory -Force -Path "artifacts" | Out-Null
}

# Run pytest using the verified python environment
# Usage: .venv_check\Scripts\python.exe -m pytest
# pytest.ini handles the arguments for reports
& .venv_check\Scripts\python.exe -m pytest

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ Tests Passed!" -ForegroundColor Green
    
    if (Test-Path "artifacts/junit.xml") {
        Write-Host " - JUnit Report: artifacts/junit.xml (Found)" -ForegroundColor Gray
    } else {
        Write-Host " - JUnit Report: MISSING" -ForegroundColor Red
    }

    if (Test-Path "artifacts/coverage_html/index.html") {
        Write-Host " - Coverage Report: artifacts/coverage_html/index.html (Found)" -ForegroundColor Gray
    } else {
        Write-Host " - Coverage Report: MISSING" -ForegroundColor Red
    }
} else {
    Write-Host "`n❌ Tests Failed!" -ForegroundColor Red
    exit 1
}
