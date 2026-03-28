from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from database.connection import get_db
from database.models import User, Dashboard
from services.export_service import ExportService
from routes.auth import get_current_active_user
import uuid

router = APIRouter(prefix="/api/export", tags=["export"])

@router.get("/html/{dashboard_id}", response_class=HTMLResponse)
async def export_dashboard_html(
    dashboard_id: str,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Export dashboard as HTML report.
    Returns: HTML file download
    """
    
    # 1. Verify Ownership
    try:
        dash_uuid = uuid.UUID(dashboard_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dashboard ID")
        
    dashboard = db.query(Dashboard).filter(
        Dashboard.id == dash_uuid,
        Dashboard.user_id == current_user.id
    ).first()
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Dashboard not found"
        )
        
    # 2. Generate HTML
    try:
        html_content = ExportService.generate_html_report(dashboard_id, db, str(current_user.id))
        
        return HTMLResponse(
            content=html_content, 
            headers={
                "Content-Disposition": f"attachment; filename=report_{dashboard.title.replace(' ', '_')}.html"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate report: {str(e)}"
        )
