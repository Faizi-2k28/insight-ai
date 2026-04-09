
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import logging

from database.connection import get_db
from database.models import Dashboard, DatasetStorage
from services.llm_service import LLMService
from services.query_service import QueryService
from services.dataset_service import DatasetService
from services.data_profiling_service import DataProfilingService

from routes.auth import get_current_active_user

router = APIRouter(prefix="/api/query", tags=["query"])
logger = logging.getLogger(__name__)

class AskQuestionRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    success: bool
    dashboard_id: str
    question: str
    dsl: Optional[Dict[str, Any]] = None
    generated_sql: Optional[str] = None
    columns: Optional[list] = None
    rows: Optional[list] = None
    row_count: int = 0
    error: Optional[str] = None
    chart_suggestion: Optional[Dict[str, Any]] = None

@router.post("/ask/{dashboard_id}", response_model=QueryResponse)
def ask_question(
    dashboard_id: str, 
    request: AskQuestionRequest, 
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Ask a natural language question about a dashboard's dataset.
    Generates execution DSL via LLM and runs safely using DuckDB.
    Persists query history and provides chart suggestions.
    """
    import time
    from database.models import QueryHistory
    
    start_time = time.time()
    
    # 1. Fetch Dashboard & Access Check
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    if str(dashboard.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this dashboard")

    dataset_storage = db.query(DatasetStorage).filter(DatasetStorage.dashboard_id == dashboard_id).first()
    if not dataset_storage:
        raise HTTPException(status_code=404, detail="Dataset not found")

    error_msg = None
    dsl_data = None
    generated_sql = None
    columns = []
    rows = []
    chart_suggestion = None

    try:
        # 2. Get Schema Metadata
        records = DatasetService.load_dataset(db, dashboard_id)
        import pandas as pd
        df = pd.DataFrame(records)
        profile = DataProfilingService.profile_dataset(df)
        schema_info = profile.get("basic_info", {})
        schema_info["columns"] = profile.get("columns", [])

        # 3. Delegate to QueryService
        qr = QueryService.process_question(request.question, records, schema_info)
        dsl_data = qr["dsl"]
        generated_sql = qr["generated_sql"]
        columns = qr["columns"]
        rows = qr["rows"]
        chart_suggestion = qr["chart_suggestion"]
        error_msg = qr["error"]

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Query execution error: {e}")

    # 4. Persist History
    duration = (time.time() - start_time) * 1000
    preview_data = rows[:50] if rows else None
    
    history_entry = QueryHistory(
        user_id=current_user.id,
        dashboard_id=dashboard.id,
        query_text=request.question,
        generated_code=generated_sql,
        result_data=preview_data,
        execution_time=duration,
        error_message=error_msg,
        was_successful=(error_msg is None)
    )
    db.add(history_entry)
    db.commit()

    # 5. Response
    if error_msg:
        return QueryResponse(
            success=False,
            dashboard_id=str(dashboard_id),
            question=request.question,
            dsl=dsl_data,
            error=error_msg
        )
    
    return QueryResponse(
        success=True,
        dashboard_id=str(dashboard_id),
        question=request.question,
        dsl=dsl_data,
        generated_sql=generated_sql,
        columns=columns,
        rows=rows,
        row_count=len(rows),
        chart_suggestion=chart_suggestion
    )

class QueryHistoryItem(BaseModel):
    id: str
    query_text: str
    generated_code: Optional[str]
    result_preview: Optional[list] = None # result_data
    was_successful: bool
    error_message: Optional[str]
    created_at: str
class HistoryResponse(BaseModel):
    success: bool
    dashboard_id: str
    total_count: int
    returned_count: int
    limit: int
    offset: int
    items: list[QueryHistoryItem]

@router.get("/history/{dashboard_id}", response_model=HistoryResponse)
def get_query_history(
    dashboard_id: str,
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: Any = Depends(get_current_active_user)
):
    """
    Retrieve recent query history for the authenticated user and dashboard.
    """
    from database.models import QueryHistory
    
    # 1. Validate Dashboard Access
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
        
    if str(dashboard.user_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to access this dashboard")

    # 2. Query History
    # Filter by dashboard_id AND user_id (User's history on this dashboard)
    query = db.query(QueryHistory).filter(
        QueryHistory.dashboard_id == dashboard_id,
        QueryHistory.user_id == current_user.id
    )
    
    total_count = query.count()
    
    # Hard cap limit
    limit = min(limit, 50)
    
    history_items = query.order_by(QueryHistory.timestamp.desc())\
                         .offset(offset)\
                         .limit(limit)\
                         .all()
    
    # Map to response model
    items = []
    for h in history_items:
        items.append(QueryHistoryItem(
            id=str(h.id),
            query_text=h.query_text,
            generated_code=h.generated_code,
            result_preview=h.result_data,
            was_successful=h.was_successful or True, # Default to true if null (legacy)
            error_message=h.error_message,
            created_at=h.timestamp.isoformat()
        ))
        
    return HistoryResponse(
        success=True,
        dashboard_id=str(dashboard_id),
        total_count=total_count,
        returned_count=len(items),
        limit=limit,
        offset=offset,
        items=items
    )
