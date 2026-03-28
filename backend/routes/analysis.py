# backend/routes/analysis.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Dashboard, DatasetStorage
from services.data_profiling_service import DataProfilingService
from services.chart_service import ChartService
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
    # Get dataset
    from services.dataset_service import DatasetService
    data_list = DatasetService.load_dataset(db, dashboard.id)
    
    df = pd.DataFrame(data_list)
    
    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Dataset is empty"
        )
    
    # Profile the dataset
    profile = DataProfilingService.profile_dataset(df)
    
    return {
        "success": True,
        "dashboard_id": dashboard_id,
        "profile": profile
    }


@router.get("/charts/{dashboard_id}")
async def get_chart_configurations(
    dashboard_id: str,
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
    # Get dataset
    from services.dataset_service import DatasetService
    data_list = DatasetService.load_dataset(db, dashboard.id)
    
    df = pd.DataFrame(data_list)
    
    # Profile dataset first
    profile = DataProfilingService.profile_dataset(df)
    
    # Generate chart configurations
    chart_configs = ChartService.generate_chart_config(df, profile)
    
    # Generate actual data for each chart
    charts_with_data = []
    for config in chart_configs:
        chart_data = ChartService.generate_chart_data(df, config)
        charts_with_data.append({
            **config,
            "chart_data": chart_data
        })
    
    return {
        "success": True,
        "charts": charts_with_data
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
    
    # Profile dataset
    profile = DataProfilingService.profile_dataset(df)
    
    # Generate paginated chart configurations
    # This returns a dict with metadata because return_metadata=True
    result = ChartService.generate_chart_config(
        df, 
        profile, 
        limit=limit, 
        offset=offset, 
        return_metadata=True
    )
    
    # Generate actual data for each chart
    charts_with_data = []
    for config in result["charts"]:
        chart_data = ChartService.generate_chart_data(df, config)
        charts_with_data.append({
            **config,
            "chart_data": chart_data
        })
    
    return {
        "success": True,
        "dashboard_id": dashboard_id,
        "total_candidates": result["total"],
        "returned_count": len(charts_with_data),
        "limit": result["limit"],
        "offset": result["offset"],
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
    # Get dataset
    from services.dataset_service import DatasetService
    data_list = DatasetService.load_dataset(db, dashboard.id)
    
    df = pd.DataFrame(data_list)
    
    # Get profile
    profile = DataProfilingService.profile_dataset(df)
    
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