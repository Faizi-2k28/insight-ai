import pandas as pd
from typing import Optional, Dict, Any, List
from services.data_profiling_service import DataProfilingService
from services.chart_service import ChartService
from services.insight_service import InsightService

class AnalysisService:
    @staticmethod
    def analyze_dataset(
        df: pd.DataFrame,
        user_query: Optional[str] = None,
        dashboard_info: Optional[Dict[str, Any]] = None,
        limit: int = 7,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Orchestrate data profiling, chart recommendations, and NLP insights generation.
        """
        # 1. Profile Dataset
        profile = DataProfilingService.profile_dataset(df)

        # 2. Generate Chart Configurations
        # Generate paginated chart configurations
        chart_result = ChartService.generate_chart_config(
            df, 
            profile, 
            limit=limit, 
            offset=offset, 
            return_metadata=True
        )
        
        # 3. Formulate Chart Data
        charts_with_data = []
        for config in chart_result["charts"]:
            try:
                chart_data = ChartService.generate_chart_data(df, config)
                charts_with_data.append({
                    **config,
                    "chart_data": chart_data
                })
            except Exception as e:
                # Optionally log error
                continue

        # 4. Generate AI Insights
        info = dashboard_info or {}
        # Based on charts generated
        if charts_with_data:
            insights = InsightService.generate_chart_insights(charts_with_data, info)
        else:
            insights = []

        # Validate basic insight fallback
        if not insights or not isinstance(insights, list):
            insights = [{
                "category": "visualization",
                "priority": "low",
                "title": "Charts Available",
                "description": f"Generated {len(charts_with_data)} visualizations for data exploration.",
                "action": "Review each chart to understand different aspects of your data."
            }]

        return {
            "profile": profile,
            "charts": charts_with_data,
            "insights": insights,
            "metadata": {
                "total_candidates": chart_result.get("total", 0),
                "limit": chart_result.get("limit", limit),
                "offset": chart_result.get("offset", offset)
            }
        }
