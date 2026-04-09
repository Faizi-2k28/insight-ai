# backend/routes/analysis.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Dashboard, DatasetStorage
from services.analysis_service import AnalysisService
from routes.auth import get_current_active_user
import uuid
import pandas as pd
import json

router = APIRouter(prefix="/api/analysis", tags=["analysis"])


@router.get("/profile/{dashboard_id}")
async def get_data_profile(
    dashboard_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get comprehensive data profiling for a dashboard"""
    
    # Verify dashboard ownership
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == uuid.UUID(dashboard_id),
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found"
        )
    
    # Get dataset
    from services.dataset_service import DatasetService
    data_list = DatasetService.load_dataset(db, dashboard.id)
    
    df = pd.DataFrame(data_list)
    
    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset is empty"
        )
    
    # Profile the dataset via AnalysisService
    analysis_result = AnalysisService.analyze_dataset(df)
    profile = analysis_result["profile"]
    
    return {
        "success": True,
        "dashboard_id": dashboard_id,
        "profile": profile
    }


@router.get("/charts/{dashboard_id}")
async def get_chart_configurations(
    dashboard_id: str,
    num_charts: int = 5,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get automatically generated chart configurations"""
    
    # Verify dashboard ownership
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == uuid.UUID(dashboard_id),
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found"
        )
    
    # Get dataset
    from services.dataset_service import DatasetService
    data_list = DatasetService.load_dataset(db, dashboard.id)
    
    df = pd.DataFrame(data_list)
    
    analysis_result = AnalysisService.analyze_dataset(df, limit=num_charts)
    charts_with_data = analysis_result["charts"]
    insights = analysis_result.get("insights", [])
    
    return {
        "success": True,
        "charts": charts_with_data,
        "insights": insights
    }


@router.get("/recommendations/{dashboard_id}")
async def get_chart_recommendations(
    dashboard_id: str,
    limit: int = 7,
    offset: int = 0,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get paginated chart recommendations with insights"""
    
    # Verify dashboard ownership
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == uuid.UUID(dashboard_id),
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found"
        )
    
    # Get dataset
    from services.dataset_service import DatasetService
    data_list = DatasetService.load_dataset(db, dashboard.id)
    
    df = pd.DataFrame(data_list)
    
    if df.empty:
         raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset is empty"
        )
    
    analysis_result = AnalysisService.analyze_dataset(df, limit=limit, offset=offset)
    charts_with_data = analysis_result["charts"]
    meta = analysis_result["metadata"]
    
    return {
        "success": True,
        "dashboard_id": dashboard_id,
        "total_candidates": meta["total_candidates"],
        "returned_count": len(charts_with_data),
        "limit": meta["limit"],
        "offset": meta["offset"],
        "charts": charts_with_data
    }


@router.get("/summary/{dashboard_id}")
async def get_dashboard_summary(
    dashboard_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get quick summary statistics for a dashboard"""
    
    # Verify dashboard ownership
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == uuid.UUID(dashboard_id),
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found"
        )
    
    # Get dataset
    from services.dataset_service import DatasetService
    data_list = DatasetService.load_dataset(db, dashboard.id)
    
    df = pd.DataFrame(data_list)
    
    # Get profile via AnalysisService
    analysis_result = AnalysisService.analyze_dataset(df)
    profile = analysis_result["profile"]
    
    # Extract key insights
    summary = {
        "basic_info": profile["basic_info"],
        "data_quality": profile["data_quality"],
        "top_correlations": profile["correlations"][:5],
        "critical_issues": [
            issue for issue in profile["data_quality"]["issues"] 
            if issue["severity"] == "high"
        ],
        "recommendations": profile["recommendations"][:5]
    }
    
    return {
        "success": True,
        "summary": summary
    }