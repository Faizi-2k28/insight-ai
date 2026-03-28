# backend/services/export_service.py
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
import io
import os
import json
import uuid
import pandas as pd
from jinja2 import Environment, FileSystemLoader

from database.models import Dashboard, QueryHistory
from services.insight_service import InsightService
from services.dataset_service import DatasetService
from services.chart_service import ChartService
from services.data_profiling_service import DataProfilingService

class ExportService:
    @staticmethod
    def generate_html_report(dashboard_id: str, db, user_id: str) -> str:
        """Generate HTML report for a dashboard"""
        
        # 1. Fetch Dashboard Metadata
        dashboard = db.query(Dashboard).filter(Dashboard.id == uuid.UUID(dashboard_id)).first()
        if not dashboard:
            raise ValueError("Dashboard not found")

        # 2. Fetch Insights
        # Get all insights
        insights = InsightService.get_insights(db, dashboard_id)
        
        # 3. Fetch Query History (Last 10)
        query_history = db.query(QueryHistory).filter(
            QueryHistory.dashboard_id == uuid.UUID(dashboard_id),
            QueryHistory.user_id == uuid.UUID(user_id)
        ).order_by(QueryHistory.timestamp.desc()).limit(10).all()
        
        # 4. Fetch Top Charts
        data_list = DatasetService.load_dataset(db, dashboard_id)
        df = pd.DataFrame(data_list)
        
        profile = DataProfilingService.profile_dataset(df)
        
        # Generate charts (Limit 7)
        chart_configs = ChartService.generate_chart_config(df, profile, limit=7)
        # We need actual data for the charts for the export
        charts_with_data = []
        for config in chart_configs:
            chart_data = ChartService.generate_chart_data(df, config)
            # Add data to config for JS mapping
            config['data'] = chart_data 
            charts_with_data.append(config)

        # 5. Render Template
        template_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'templates')
        env = Environment(loader=FileSystemLoader(template_dir))
        template = env.get_template('report.html')
        
        # Prepare context
        context = {
            'dashboard': {
                'title': dashboard.title,
                'description': dashboard.description,
                'created_at': dashboard.created_at.strftime("%Y-%m-%d %H:%M"),
                'target_column': dashboard.target_column,
                'problem_type': dashboard.problem_type
            },
            'insights': [{'title': i.title, 'content': i.content} for i in insights],
            'charts': charts_with_data,
            'query_history': [{
                'created_at': q.timestamp.strftime("%Y-%m-%d %H:%M"),
                'query_text': q.query_text,
                'was_successful': q.was_successful
            } for q in query_history],
            'chart_data_json': json.dumps(charts_with_data)
        }
        
        return template.render(context)
        
    @staticmethod
    def export_to_pdf(dashboard_data):
        """Export dashboard to PDF"""
        buffer = io.BytesIO()
        
        # Create PDF
        c = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter
        
        # Title
        c.setFont("Helvetica-Bold", 20)
        c.drawString(1*inch, height - 1*inch, dashboard_data['title'])
        
        # Problem type and target
        c.setFont("Helvetica", 12)
        c.drawString(1*inch, height - 1.5*inch, 
                    f"Problem Type: {dashboard_data['problem_type']}")
        c.drawString(1*inch, height - 1.8*inch, 
                    f"Target: {dashboard_data['target']}")
        
        # ML Results
        c.setFont("Helvetica-Bold", 14)
        c.drawString(1*inch, height - 2.5*inch, "ML Model Results")
        
        y_position = height - 3*inch
        c.setFont("Helvetica", 10)
        
        for result in dashboard_data.get('ml_results', [])[:5]:
            cv_score = result.get('cv_score', 0) * 100
            test_score = result.get('test_score', 0) * 100
            text = f"{result['model_name']}: CV={cv_score:.1f}% | Test={test_score:.1f}%"
            c.drawString(1.2*inch, y_position, text)
            y_position -= 0.3*inch
        
        # Insights
        c.setFont("Helvetica-Bold", 14)
        c.drawString(1*inch, y_position - 0.5*inch, "Key Insights")
        
        y_position -= 1*inch
        c.setFont("Helvetica", 10)
        
        for insight in dashboard_data.get('insights', [])[:5]:
            # Wrap long text
            title = insight['title'][:60] + "..." if len(insight['title']) > 60 else insight['title']
            c.drawString(1.2*inch, y_position, f"• {title}")
            y_position -= 0.3*inch
        
        # Footer
        c.setFont("Helvetica-Oblique", 8)
        c.drawString(1*inch, 0.5*inch, "Generated by Insight AI - Automated ML & Analytics Platform")
        
        c.save()
        buffer.seek(0)
        return buffer