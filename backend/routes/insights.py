from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import json
import uuid

from database.connection import get_db
from database.models import User, Dashboard, Insight, MLResult, DatasetStorage
from routes.auth import get_current_active_user
from services.insight_service import InsightService
from services.data_profiling_service import DataProfilingService
from services.chart_service import ChartService

router = APIRouter()
profiling_service = DataProfilingService()


@router.post("/generate/{dashboard_id}")
async def generate_insights(
    dashboard_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate AI-powered insights for a dashboard"""
    
    try:
        # Get dashboard
        dashboard = db.query(Dashboard).filter(
            Dashboard.id == uuid.UUID(dashboard_id),
            Dashboard.user_id == current_user.id
        ).first()
        
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        # Get dataset
        from services.dataset_service import DatasetService
        data = DatasetService.load_dataset(db, dashboard.id)
        
        # Convert to DataFrame
        try:
            df = pd.DataFrame(data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to load dataset: {str(e)}")
        
        # Generate profile
        try:
            profile_data = profiling_service.profile_dataset(df)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate profile: {str(e)}")
        
        # Get ML results
        try:
            ml_results_data = db.query(MLResult).filter(
                MLResult.dashboard_id == uuid.UUID(dashboard_id)
            ).order_by(MLResult.test_score.desc()).all()
            
            ml_results = [
                {
                    "model_name": r.model_name,
                    "test_score": r.test_score,
                    "cv_score": r.cv_score,
                    "metrics": r.hyperparameters
                }
                for r in ml_results_data
            ]
        except Exception as e:
            print(f"Warning: Could not fetch ML results: {str(e)}")
            ml_results = []
        
        # Prepare dashboard info
        dashboard_info = {
            "title": dashboard.title or "Untitled",
            "description": dashboard.description or "",
            "row_count": dashboard.row_count or 0,
            "column_count": dashboard.column_count or 0,
            "target_column": dashboard.target_column or "Unknown",
            "problem_type": dashboard.problem_type or "Unknown"
        }
        
        # Generate insights (ML only, no charts)
        try:
            insights = InsightService.generate_insights(
                profile=profile_data,
                ml_results=ml_results,
                dashboard_info=dashboard_info
            )
        except Exception as e:
            print(f"Error generating insights: {str(e)}")
            insights = [{
                "category": "data_quality",
                "priority": "medium",
                "title": "Analysis Complete",
                "description": f"Dataset with {dashboard.row_count} rows and {dashboard.column_count} columns has been analyzed.",
                "action": "Review the data profile and model results for detailed information."
            }]
        
        # Validate insights
        if not insights or not isinstance(insights, list):
            insights = [{
                "category": "data_quality",
                "priority": "low",
                "title": "Analysis Complete",
                "description": "Dataset analysis completed successfully.",
                "action": "Review the dashboard for detailed results."
            }]
        
        # Delete old non-visualization insights
        try:
            db.query(Insight).filter(
                Insight.dashboard_id == uuid.UUID(dashboard_id),
                Insight.category != 'visualization'
            ).delete()
        except Exception as e:
            print(f"Warning: Could not delete old insights: {str(e)}")
        
        # Save new insights
        saved_count = 0
        for insight_data in insights:
            try:
                if not isinstance(insight_data, dict):
                    continue
                
                # Combine description + action into content
                description = insight_data.get("description", "")
                action = insight_data.get("action", "")
                
                # Create full content
                if action:
                    full_content = f"{description}\n\nRecommended Action: {action}"
                else:
                    full_content = description
                
                # Create insight with ALL required fields
                insight = Insight(
                    dashboard_id=uuid.UUID(dashboard_id),
                    insight_type="statistical",
                    category=insight_data.get("category", "general"),
                    priority=insight_data.get("priority", "medium"),
                    title=insight_data.get("title", "Insight")[:500],
                    content=full_content[:5000],
                    metadata_info={"action": action, "source": "gemini"}
                )
                db.add(insight)
                saved_count += 1
            except Exception as e:
                print(f"Warning: Could not save insight: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        # Commit to database
        try:
            db.commit()
            print(f"Successfully saved {saved_count} ML insights")
        except Exception as e:
            db.rollback()
            print(f"Error committing insights: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save insights: {str(e)}")
        
        return {
            "success": True,
            "message": f"Generated {saved_count} insights",
            "insights": insights
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Unexpected error generating insights: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/charts/{dashboard_id}")
async def generate_chart_insights(
    dashboard_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Generate AI-powered insights specifically for charts/visualizations"""
    
    try:
        # Get dashboard
        dashboard = db.query(Dashboard).filter(
            Dashboard.id == uuid.UUID(dashboard_id),
            Dashboard.user_id == current_user.id
        ).first()
        
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        # Get dataset
        from services.dataset_service import DatasetService
        data = DatasetService.load_dataset(db, dashboard.id)
        
        # Convert to DataFrame
        try:
            df = pd.DataFrame(data)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to load dataset: {str(e)}")
        
        # Get profile
        try:
            profile = DataProfilingService.profile_dataset(df)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate profile: {str(e)}")
        
        # Generate chart configurations (same as analysis.py)
        try:
            chart_configs = ChartService.generate_chart_config(df, profile)
            
            # Generate actual data for each chart
            charts = []
            for config in chart_configs:
                try:
                    chart_data = ChartService.generate_chart_data(df, config)
                    charts.append({
                        **config,
                        "chart_data": chart_data
                    })
                except Exception as chart_error:
                    print(f"Warning: Failed to generate chart data: {str(chart_error)}")
                    continue
        except Exception as e:
            print(f"Error generating charts: {str(e)}")
            import traceback
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to generate charts: {str(e)}")
        
        if not charts or len(charts) == 0:
            return {
                "success": False,
                "message": "No charts found for this dashboard",
                "insights": []
            }
        
        # Prepare dashboard info
        dashboard_info = {
            "title": dashboard.title or "Untitled",
            "description": dashboard.description or "",
            "row_count": dashboard.row_count or 0,
            "column_count": dashboard.column_count or 0,
            "target_column": dashboard.target_column or "Unknown",
            "problem_type": dashboard.problem_type or "Unknown"
        }
        
        # Generate chart insights using Gemini
        try:
            chart_insights = InsightService.generate_chart_insights(charts, dashboard_info)
        except Exception as e:
            print(f"Error generating chart insights: {str(e)}")
            import traceback
            traceback.print_exc()
            
            # Fallback to basic insights
            chart_insights = [{
                "category": "visualization",
                "priority": "low",
                "title": "Charts Available",
                "description": f"Generated {len(charts)} visualizations for data exploration.",
                "action": "Review each chart to understand different aspects of your data."
            }]
        
        # Validate insights
        if not chart_insights or not isinstance(chart_insights, list):
            chart_insights = [{
                "category": "visualization",
                "priority": "low",
                "title": "Charts Available",
                "description": f"Generated {len(charts)} visualizations for data exploration.",
                "action": "Review each chart to understand different aspects of your data."
            }]
        
        # Delete old chart insights (category = 'visualization')
        try:
            deleted = db.query(Insight).filter(
                Insight.dashboard_id == uuid.UUID(dashboard_id),
                Insight.category == 'visualization'
            ).delete()
            print(f"Deleted {deleted} old chart insights")
        except Exception as e:
            print(f"Warning: Could not delete old chart insights: {str(e)}")
        
        # Save new chart insights
        saved_count = 0
        for insight_data in chart_insights:
            try:
                if not isinstance(insight_data, dict):
                    print(f"Skipping non-dict insight: {type(insight_data)}")
                    continue
                
                # Combine description + action into content
                description = insight_data.get("description", "")
                action = insight_data.get("action", "")
                
                # Create full content
                if action:
                    full_content = f"{description}\n\nRecommended Action: {action}"
                else:
                    full_content = description
                
                # Ensure we have required fields
                if not description and not action:
                    print(f"Skipping insight with no content: {insight_data.get('title', 'Unknown')}")
                    continue
                
                # Create insight with ALL required fields
                insight = Insight(
                    dashboard_id=uuid.UUID(dashboard_id),
                    insight_type="patterns",
                    category=insight_data.get("category", "visualization"),
                    priority=insight_data.get("priority", "medium"),
                    title=insight_data.get("title", "Chart Insight")[:500],
                    content=full_content[:5000],
                    metadata_info={
                        "action": action, 
                        "source": "gemini",
                        "chart_type": insight_data.get("chart_type", "unknown")
                    }
                )
                db.add(insight)
                saved_count += 1
                print(f"Added chart insight: {insight.title[:50]}...")
                
            except Exception as e:
                print(f"Warning: Could not save chart insight: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        # Commit to database
        try:
            db.commit()
            print(f"Successfully saved {saved_count} chart insights")
        except Exception as e:
            db.rollback()
            print(f"Error committing chart insights: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save chart insights: {str(e)}")
        
        return {
            "success": True,
            "message": f"Generated {saved_count} chart insights",
            "insights": chart_insights
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Unexpected error generating chart insights: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{dashboard_id}")
async def get_insights(
    dashboard_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Get all insights for a dashboard"""
    
    try:
        # Verify dashboard ownership
        dashboard = db.query(Dashboard).filter(
            Dashboard.id == uuid.UUID(dashboard_id),
            Dashboard.user_id == current_user.id
        ).first()
        
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        # Get insights
        insights = db.query(Insight).filter(
            Insight.dashboard_id == uuid.UUID(dashboard_id)
        ).order_by(
            Insight.priority.desc(),
            Insight.created_at.desc()
        ).all()
        
        if not insights:
            return {
                "has_insights": False,
                "insights": []
            }
        
        return {
            "has_insights": True,
            "insights": [
                {
                    "id": str(insight.id),
                    "insight_type": insight.insight_type,
                    "category": insight.category,
                    "priority": insight.priority,
                    "title": insight.title,
                    "content": insight.content,
                    "action": insight.metadata_info.get("action", "") if insight.metadata_info else "",
                    "created_at": insight.created_at.isoformat()
                }
                for insight in insights
            ]
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching insights: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{dashboard_id}")
async def delete_insights(
    dashboard_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """Delete all insights for a dashboard"""
    
    try:
        # Verify dashboard ownership
        dashboard = db.query(Dashboard).filter(
            Dashboard.id == uuid.UUID(dashboard_id),
            Dashboard.user_id == current_user.id
        ).first()
        
        if not dashboard:
            raise HTTPException(status_code=404, detail="Dashboard not found")
        
        # Delete insights
        deleted_count = db.query(Insight).filter(
            Insight.dashboard_id == uuid.UUID(dashboard_id)
        ).delete()
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Deleted {deleted_count} insights"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting insights: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))