# backend/routes/upload.py
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Form
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Dashboard, DatasetStorage
from routes.auth import get_current_active_user
import pandas as pd
import io
import json
import uuid
import logging
import math
from typing import Optional

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Configuration
MAX_FILE_SIZE_MB = 100  # 100 MB limit
MAX_ROWS = 1_000_000  # 1 million rows limit
MAX_COLUMNS = 500  # 500 columns limit

from services.data_service import DataService

def _to_json_safe(value):
    """Normalize pandas/numpy-ish values into JSON-safe primitives."""
    if value is None:
        return None

    try:
        if pd.isna(value):
            return None
    except Exception:
        pass

    if isinstance(value, (pd.Timestamp, pd.Timedelta)):
        return value.isoformat()

    if hasattr(value, "item"):
        try:
            value = value.item()
        except Exception:
            pass

    if isinstance(value, float) and not math.isfinite(value):
        return None

    return value


@router.post("/validate")
async def validate_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_active_user)
):
    """Validate uploaded CSV file"""
    
    # Check file extension
    if not file.filename or not file.filename.lower().endswith((".csv", ".xlsx")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV and Excel (.xlsx) files are allowed"
        )
    
    # Read file
    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to read file: {str(e)}"
        )
    
    # Check file size
    file_size_mb = len(contents) / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size ({file_size_mb:.1f} MB) exceeds limit of {MAX_FILE_SIZE_MB} MB"
        )
    
    try:
        # Parse Formats
        df = DataService.process_upload(contents, file.filename)
        
        # Check for empty dataset
        if len(df) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dataset is empty (0 rows)"
            )
        
        # Check for no columns
        if len(df.columns) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dataset has no columns"
            )
        
        # Check row count
        if len(df) > MAX_ROWS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dataset has {len(df):,} rows, exceeds limit of {MAX_ROWS:,} rows"
            )
        
        # Check column count
        if len(df.columns) > MAX_COLUMNS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dataset has {len(df.columns)} columns, exceeds limit of {MAX_COLUMNS} columns"
            )
        
        # Analyze columns
        columns_info = []
        for col in df.columns:
            col_info = {
                "name": str(col),
                "dtype": str(df[col].dtype),
                "unique_count": int(df[col].nunique()),
                "missing_count": int(df[col].isnull().sum()),
                "missing_percentage": float(df[col].isnull().sum() / len(df) * 100)
            }
            
            # Determine column type
            if pd.api.types.is_numeric_dtype(df[col]):
                col_info["type"] = "numeric"
                col_info["min"] = _to_json_safe(df[col].min()) if not df[col].isnull().all() else None
                col_info["max"] = _to_json_safe(df[col].max()) if not df[col].isnull().all() else None
                col_info["mean"] = _to_json_safe(df[col].mean()) if not df[col].isnull().all() else None
            else:
                col_info["type"] = "categorical"
                col_info["sample_values"] = [
                    _to_json_safe(v) for v in df[col].dropna().unique()[:5].tolist()
                ]
            
            columns_info.append(col_info)
        
        # Suggest target column and problem type
        suggested_target = None
        suggested_problem_type = None
        
        # Find potential target columns (columns with reasonable unique values)
        potential_targets = [
            col for col in columns_info 
            if 2 <= col["unique_count"] <= len(df) * 0.5
        ]
        
        if potential_targets:
            # Prefer numeric columns for regression
            numeric_targets = [col for col in potential_targets if col["type"] == "numeric"]
            categorical_targets = [col for col in potential_targets if col["type"] == "categorical"]
            
            if numeric_targets:
                suggested_target = numeric_targets[-1]["name"]  # Last numeric column
                suggested_problem_type = "regression"
            elif categorical_targets:
                suggested_target = categorical_targets[-1]["name"]  # Last categorical column
                suggested_problem_type = "classification"
        
        # Preview data (first 10 rows)
        preview_data = [
            {str(k): _to_json_safe(v) for k, v in row.items()}
            for row in df.head(10).to_dict(orient="records")
        ]
        
        return {
            "success": True,
            "filename": file.filename,
            "row_count": int(len(df)),
            "column_count": int(len(df.columns)),
            "columns": columns_info,
            "preview_data": preview_data,
            "missing_values": int(df.isnull().sum().sum()),
            "suggested_target": suggested_target,
            "suggested_problem_type": suggested_problem_type
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Unexpected upload validation failure for file '%s'", file.filename)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"File validation failed: {str(e)}"
        )


@router.post("/create-dashboard")
async def create_dashboard(
    file: UploadFile = File(...),
    title: str = Form(...),
    target_column: str = Form(...),
    problem_type: str = Form(...),
    description: Optional[str] = Form(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create dashboard with uploaded dataset"""
    
    # Validate problem type
    if problem_type not in ['classification', 'regression']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="problem_type must be 'classification' or 'regression'"
        )
    
    # Read and parse file
    try:
        contents = await file.read()
        df = DataService.process_upload(contents, file.filename)
        
        # Validate dataset
        if len(df) < 10:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dataset must have at least 10 rows"
            )
        
        if target_column not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target column '{target_column}' not found in dataset"
            )
        
        # Create dashboard
        dashboard = Dashboard(
            user_id=current_user.id,
            title=title,
            description=description,
            dataset_filename=file.filename,
            dataset_size_bytes=len(contents),
            row_count=len(df),
            column_count=len(df.columns),
            target_column=target_column,
            problem_type=problem_type
        )
        
        logger.info(f"DEBUG: Creating dashboard with ID: {dashboard.id}")
        db.add(dashboard)
        logger.info(f"DEBUG: Session NEW after add: {db.new}")
        db.flush()
        logger.info(f"DEBUG: Dashboard flushed. Relationship state: {dashboard.dataset_storage}")
        from services.dataset_service import DatasetService
        DatasetService.save_dataset(db, dashboard.id, df)
        
        db.commit()
        db.refresh(dashboard)
        
        return {
            "success": True,
            "dashboard_id": str(dashboard.id),
            "message": "Dashboard created successfully"
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create dashboard: {str(e)}"
        )

@router.get("/dashboards")
async def get_dashboards(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get all dashboards for current user"""
    
    dashboards = db.query(Dashboard).filter(
        Dashboard.user_id == current_user.id
    ).order_by(Dashboard.created_at.desc()).all()
    
    return {
        "dashboards": [
            {
                "id": str(d.id),
                "title": d.title,
                "description": d.description,
                "dataset_filename": d.dataset_filename,
                "row_count": d.row_count,
                "column_count": d.column_count,
                "target_column": d.target_column,
                "problem_type": d.problem_type,
                "created_at": d.created_at
            }
            for d in dashboards
        ]
    }


@router.get("/dashboard/{dashboard_id}")
async def get_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get specific dashboard details"""
    
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == uuid.UUID(dashboard_id),
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found"
        )
    
    return {
        "id": str(dashboard.id),
        "title": dashboard.title,
        "description": dashboard.description,
        "dataset_filename": dashboard.dataset_filename,
        "row_count": dashboard.row_count,
        "column_count": dashboard.column_count,
        "target_column": dashboard.target_column,
        "problem_type": dashboard.problem_type,
        "created_at": dashboard.created_at,
        "updated_at": dashboard.updated_at
    }