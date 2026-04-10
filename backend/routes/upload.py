# backend/routes/upload.py
import os
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.connection import get_db
from database.models import User, Dashboard, DatasetStorage, MLResult
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
        
        # Fallback auto-detection for target column
        if not target_column or target_column in ["No Target Label", "auto", ""]:
            target_column = df.columns[-1]
            logger.info("Auto-detected target column fallback: %s", target_column)

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

        # Execute ML Pipeline Synchronously
        import asyncio
        from services.ml_service import MLService
        
        try:
            training_output = await asyncio.to_thread(
                MLService.train_and_evaluate,
                df, dashboard.target_column, dashboard.problem_type
            )
        except Exception as e:
            logger.error(f"ML Pipeline failed, but dashboard was created: {str(e)}")
            training_output = {"results": []}

        results_payload = []
        best_score = -float('inf')
        best_model_id = None
        
        for result in training_output["results"]:
            ml_result = MLResult(
                dashboard_id=dashboard.id,
                model_name=result['model_name'],
                model_type=result['model_type'],
                test_score=result['test_score_db'],
                cv_score=result['cv_score_db'],
                training_time=result['training_time'],
                feature_importance=result['feature_importance'],
                hyperparameters=result['metrics'],
                is_best_model=result['test_score'] > best_score
            )
            db.add(ml_result)
            db.flush()
            
            if result['test_score'] > best_score:
                best_score = result['test_score']
                best_model_id = ml_result.id
            
            results_payload.append({
                "model_name": ml_result.model_name,
                "accuracy": round((ml_result.test_score or 0) * 100, 1),
                "is_best": False
            })

        if best_model_id:
            db.query(MLResult).filter(MLResult.dashboard_id == dashboard.id).update({"is_best_model": False})
            db.query(MLResult).filter(MLResult.id == best_model_id).update({"is_best_model": True})
            for rp in results_payload:
                if rp["accuracy"] == round((best_score or 0) * 100, 1):
                    rp["is_best"] = True

        db.commit()
        
        return {
            "success": True,
            "dashboard_id": str(dashboard.id),
            "message": "Dashboard created successfully",
            "ml_results": results_payload
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


@router.delete("/dashboard/{dashboard_id}")
async def delete_dashboard(
    dashboard_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a dashboard and its associated data"""
    try:
        dashboard = db.query(Dashboard).filter(
            Dashboard.id == uuid.UUID(dashboard_id),
            Dashboard.user_id == current_user.id
        ).first()

        if not dashboard:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Dashboard not found or you don't have permission"
            )

        # SQLAlchemy cascade delete will wipe out MLResult, Insight, DatasetStorage, etc.
        db.delete(dashboard)
        db.commit()

        # Delete physical local JSON file if exists
        try:
            storage_path = "storage/datasets"
            file_path = os.path.join(storage_path, f"{dashboard_id}.json")
            if os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.warning(f"Failed to delete local dataset layout file {file_path} for dashboard {dashboard_id}: {e}")

        return {"success": True, "message": "Dashboard deleted successfully"}
        
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Dashboard ID format")
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete dashboard: {str(e)}"
        )


@router.get("/stats")
async def get_dashboard_stats(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get aggregated metrics for the current user's dashboards"""
    try:
        total_datasets = db.query(func.count(Dashboard.id)).filter(
            Dashboard.user_id == current_user.id
        ).scalar() or 0

        # Subquery to check if a dashboard has ML trained
        models_trained = db.query(func.count(func.distinct(MLResult.dashboard_id))).join(
            Dashboard, Dashboard.id == MLResult.dashboard_id
        ).filter(
            Dashboard.user_id == current_user.id
        ).scalar() or 0

        return {
            "total_datasets": total_datasets,
            "models_trained": models_trained,
            "ready_reports": total_datasets,  # Assuming all successful uploads are "ready reports"
            "processing": 0  # Dummy for now 
        }

    except Exception as e:
        logger.error(f"Failed to fetch stats: {e}")
        return {
            "total_datasets": 0,
            "models_trained": 0,
            "ready_reports": 0,
            "processing": 0
        }