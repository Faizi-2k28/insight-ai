"""
Universal ML Training Route
Works with ANY dataset (classification or regression)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
import pandas as pd
import numpy as np
import json
import uuid
import asyncio
import logging

from database.models import Dashboard, DatasetStorage, MLResult, User
from database.connection import get_db
from routes.auth import get_current_active_user
from services.preprocessing import UniversalPreprocessor
from services.ml_trainer import UniversalMLTrainer
from sklearn.model_selection import train_test_split

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])
logger = logging.getLogger(__name__)


def _sanitize_score_for_db(score: float, problem_type: str):
    """
    DB constraint requires cv_score in [0, 1].
    For regression, R2 can be negative, so persist out-of-range values as NULL.
    """
    if score is None:
        return None
    try:
        value = float(score)
    except (TypeError, ValueError):
        return None
    if 0.0 <= value <= 1.0:
        return value
    logger.warning("Dropping out-of-range cv_score for %s: %s", problem_type, value)
    return None


def _sanitize_test_score_for_db(score: float, problem_type: str):
    """
    DB constraint requires test_score in [0, 1] and column is NOT NULL.
    Regression metrics (e.g. R2) may be negative, so coerce invalid values to 0.0.
    """
    if score is None:
        return 0.0
    try:
        value = float(score)
    except (TypeError, ValueError):
        return 0.0
    if 0.0 <= value <= 1.0:
        return value
    logger.warning("Coercing out-of-range test_score for %s: %s -> 0.0", problem_type, value)
    return 0.0


@router.post("/train/{dashboard_id}")
async def train_models(
    dashboard_id: str,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """
    Universal ML training for ANY dataset
    """
    try:
        logger.info("Universal ML training started for dashboard %s", dashboard_id)
        
        # Get dashboard
        dashboard = db.query(Dashboard).filter(
            Dashboard.id == uuid.UUID(dashboard_id),
            Dashboard.user_id == current_user.id
        ).first()
        
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        # Get dataset
        from services.dataset_service import DatasetService
        data_list = DatasetService.load_dataset(db, uuid.UUID(dashboard_id))
        
        df = pd.DataFrame(data_list)
        logger.info(
            "Dataset loaded: %s rows x %s columns, target=%s",
            len(df), len(df.columns), dashboard.target_column
        )
        
        # Delegate training orchestration to MLService
        from services.ml_service import MLService
        training_output = await asyncio.to_thread(
            MLService.train_and_evaluate,
            df, dashboard.target_column, dashboard.problem_type
        )
        
        detected_type = training_output["detected_type"]
        dashboard.problem_type = detected_type
        
        # Persist results to DB
        results = []
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
            
            results.append({
                "id": str(ml_result.id),
                **result,
                "test_score": result['test_score_db'],
                "cv_score": result['cv_score_db'],
                "is_best_model": result['test_score'] > best_score
            })
        
        # Mark best model
        if best_model_id:
            db.query(MLResult).filter(
                MLResult.dashboard_id == dashboard.id
            ).update({"is_best_model": False})
            
            db.query(MLResult).filter(
                MLResult.id == best_model_id
            ).update({"is_best_model": True})
        
        db.commit()
        
        best_result = training_output["best_result"]
        logger.info("Training complete: %s models", len(results))
        
        return {
            "success": True,
            "message": f"Successfully trained {len(results)} models",
            "problem_type": detected_type,
            "best_model": best_result['model_name'] if best_result else None,
            "best_score": best_result['test_score'] if best_result else None,
            "results": results
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        import traceback
        logger.exception("Training failed for dashboard %s: %s", dashboard_id, str(e))
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@router.get("/results/{dashboard_id}")
async def get_ml_results(
    dashboard_id: str,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Get all ML results"""
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == uuid.UUID(dashboard_id),
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    ml_results = db.query(MLResult).filter(
        MLResult.dashboard_id == uuid.UUID(dashboard_id)
    ).order_by(MLResult.test_score.desc()).all()
    
    return {
        "dashboard_id": dashboard_id,
        "problem_type": dashboard.problem_type,
        "results": [
            {
                "id": str(r.id),
                "model_name": r.model_name,
                "model_type": r.model_type,
                "test_score": r.test_score,
                "cv_score": r.cv_score,
                "training_time": r.training_time,
                "feature_importance": r.feature_importance,
                "is_best_model": r.is_best_model,
                "created_at": r.created_at.isoformat()
            }
            for r in ml_results
        ]
    }


@router.get("/best-model/{dashboard_id}")
async def get_best_model(
    dashboard_id: str,
    current_user: User = Depends(get_current_active_user),
    db: DBSession = Depends(get_db)
):
    """Get best model"""
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == uuid.UUID(dashboard_id),
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    best_model = db.query(MLResult).filter(
        MLResult.dashboard_id == uuid.UUID(dashboard_id),
        MLResult.is_best_model == True
    ).first()
    
    if not best_model:
        raise HTTPException(status_code=404, detail="No best model found")
    
    return {
        "id": str(best_model.id),
        "model_name": best_model.model_name,
        "model_type": best_model.model_type,
        "test_score": best_model.test_score,
        "cv_score": best_model.cv_score,
        "training_time": best_model.training_time,
        "feature_importance": best_model.feature_importance,
        "created_at": best_model.created_at.isoformat()
    }