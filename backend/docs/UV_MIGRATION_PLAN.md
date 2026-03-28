# UV Migration Plan

## Current State
- **Manager**: `pip` (standard).
- **Manifest**: `backend/requirements.txt`.
- **Virtual Env**: Created manually (`python -m venv`).

## Options

### Option A: `uv pip` (Conservative)
Keep `requirements.txt` as the source of truth. Use `uv` purely as a faster installer.
*   **Pros**: No file changes, 100% compatibility with existing workflows/runbooks.
*   **Cons**: Doesn't leverage `uv`'s advanced resolution or lockfile features.
*   **Command**: `uv pip install -r requirements.txt`

### Option B: `uv init` (Recommended for Modernization)
Migrate to `pyproject.toml` and `uv.lock`.
*   **Pros**: Deterministic builds (lockfile), faster resolution, modern standard.
*   **Cons**: Changes project structure (`pyproject.toml` becomes source of truth).
*   **Steps**:
    1.  `uv init`
    2.  `uv add -r requirements.txt`
    3.  Delete `requirements.txt` (or keep as legacy export).

## Proposed Plan (Phase 2+)
We recommend **Option B** for long-term stability, but **Option A** can be used immediately without "migration" effort.

### Migration Steps (Option B)
1.  **Backup**: `cp requirements.txt requirements.txt.bak`
2.  **Init**: Run `uv init` in `backend/`.
3.  **Add Deps**: Read `requirements.txt` and add packages:
    ```bash
    uv add fastapi uvicorn sqlalchemy python-dotenv pandas bcrypt google-generativeai alembic
    ```
4.  **Verify**: Run `uv run scripts/smoke.py`.
5.  **Commit**: Add `pyproject.toml` and `uv.lock`.

## Rollback Plan
If `uv` causes issues:
1.  Delete `pyproject.toml` and `uv.lock`.
2.  Restore `requirements.txt` (if modified/deleted).
3.  Revert to `pip install -r requirements.txt`.
