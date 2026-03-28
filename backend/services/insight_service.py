# backend/services/insight_service.py
import os
from typing import Dict, List, Any
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure Gemini
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


class InsightService:
    """Service for generating AI-powered insights using Gemini"""
    
    @staticmethod
    def get_insights(db, dashboard_id: str):
        """Fetch all insights from the database for a given dashboard"""
        from database.models import Insight
        import uuid
        return db.query(Insight).filter(
            Insight.dashboard_id == uuid.UUID(str(dashboard_id))
        ).order_by(
            Insight.priority.desc(),
            Insight.created_at.desc()
        ).all()
    
    @staticmethod
    def generate_insights(
        profile: Dict,
        ml_results: List[Dict],
        dashboard_info: Dict,
        charts: List[Dict] = None
    ) -> List[Dict]:
        """
        Generate comprehensive AI-powered insights using Gemini
        Falls back to rule-based insights if Gemini fails
        """
        
        insights = []
        
        # Generate ML and data insights
        try:
            # Prepare context for Gemini
            context = InsightService._prepare_context(profile, ml_results, dashboard_info)
            
            # Try Gemini first
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            prompt = f"""You are an expert data scientist analyzing a dataset. Generate actionable insights.

{context}

Provide 4-6 insights covering:
1. Data quality and completeness
2. Statistical patterns and correlations
3. Machine learning model performance
4. Business recommendations
5. Potential issues or concerns

**IMPORTANT**: Use ONLY these categories:
- "data_quality" for data completeness, missing values, duplicates
- "statistical" for correlations, distributions, outliers
- "machine_learning" for model performance, training results, predictions
- "business" for business recommendations, ROI, strategic actions
- "patterns" for trends, seasonality, clusters

Format each insight as a JSON object:
{{
  "category": "data_quality|statistical|machine_learning|business|patterns",
  "priority": "high|medium|low",
  "title": "Clear, specific title",
  "description": "Detailed explanation of the insight",
  "action": "Specific, actionable recommendation"
}}

Return ONLY a JSON array of insight objects, no other text."""

            response = model.generate_content(prompt)
            
            # Parse response
            import json
            import re
            
            response_text = response.text.strip()
            json_match = re.search(r'\[.*\]', response_text, re.DOTALL)
            
            if json_match:
                insights = json.loads(json_match.group())
            else:
                raise ValueError("Could not parse Gemini response")
        
        except Exception as e:
            print(f"Gemini insight generation failed: {str(e)}")
            print("Falling back to rule-based insights...")
            
            # Fallback to rule-based
            insights = InsightService._generate_rule_based_insights(profile, ml_results)
        
        # Generate chart insights if charts are provided
        if charts and len(charts) > 0:
            try:
                chart_insights = InsightService.generate_chart_insights(charts, dashboard_info)
                insights.extend(chart_insights)
            except Exception as e:
                print(f"Chart insights generation failed: {str(e)}")
        
        return insights
    
    @staticmethod
    def generate_chart_insights(charts: List[Dict], dashboard_info: Dict) -> List[Dict]:
        """Generate AI insights about individual charts using Gemini"""
        
        insights = []
        
        try:
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            # Analyze each chart individually
            for idx, chart in enumerate(charts, 1):
                try:
                    # Prepare chart description
                    chart_desc = f"""
Chart Type: {chart['type'].title()}
Title: {chart['title']}
Description: {chart['description']}

"""
                    
                    # Add specific data based on chart type
                    if chart['type'] == 'pie':
                        data = chart['chart_data']['data']
                        chart_desc += "Data Distribution:\n"
                        for item in data:
                            chart_desc += f"- {item['name']}: {item['value']} ({item['percentage']}%)\n"
                        chart_desc += f"Total: {chart['chart_data']['total']}\n"
                    
                    elif chart['type'] == 'histogram':
                        data = chart['chart_data']
                        chart_desc += f"Range: {data['min']} to {data['max']}\n"
                        chart_desc += f"Mean: {data['mean']}\n"
                        chart_desc += f"Distribution: {len(chart['chart_data']['data'])} bins\n"
                        # Add top 3 bins
                        top_bins = sorted(chart['chart_data']['data'], key=lambda x: x['count'], reverse=True)[:3]
                        chart_desc += "Most frequent ranges:\n"
                        for bin_data in top_bins:
                            chart_desc += f"- {bin_data['bin']}: {bin_data['count']} occurrences\n"
                    
                    elif chart['type'] == 'bar':
                        data = chart['chart_data']['data']
                        chart_desc += "Comparison Data:\n"
                        for item in data:
                            chart_desc += f"- {item['name']}: {item['value']:.2f}\n"
                    
                    # Create prompt for this specific chart
                    prompt = f"""You are a data analyst explaining a visualization to business stakeholders.

Dataset: {dashboard_info.get('title', 'Data Analysis')}

{chart_desc}

Analyze this chart and provide:
1. What key pattern or insight this chart reveals
2. The most important finding from this visualization
3. One specific, actionable recommendation based on this chart

Format your response as a JSON object (not an array):
{{
  "insight": "Clear explanation of what the chart shows and why it matters",
  "key_finding": "The single most important takeaway",
  "recommendation": "Specific action to take based on this chart"
}}

Provide ONLY the JSON object, no other text."""

                    # Get Gemini's analysis for this chart
                    response = model.generate_content(prompt)
                    
                    # Parse response
                    import json
                    import re
                    
                    response_text = response.text.strip()
                    
                    # Try to extract JSON
                    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                    if json_match:
                        chart_analysis = json.loads(json_match.group())
                        
                        # Create insight in our format
                        insights.append({
                            "category": "visualization",
                            "priority": "medium",
                            "title": f"Chart Insight: {chart['title']}",
                            "description": chart_analysis.get('insight', 'Analysis of chart patterns and trends.'),
                            "action": f"{chart_analysis.get('key_finding', '')} {chart_analysis.get('recommendation', '')}"
                        })
                    else:
                        # Fallback if parsing fails
                        insights.append({
                            "category": "visualization",
                            "priority": "low",
                            "title": f"Chart: {chart['title']}",
                            "description": f"This {chart['type']} chart shows {chart['description'].lower()}",
                            "action": "Review this visualization to identify patterns in your data."
                        })
                
                except Exception as chart_error:
                    print(f"Error analyzing chart {idx}: {str(chart_error)}")
                    continue
        
        except Exception as e:
            print(f"Error in chart insights generation: {str(e)}")
            # Return basic insight if Gemini fails
            insights.append({
                "category": "visualization",
                "priority": "low",
                "title": "Visualizations Generated",
                "description": f"Generated {len(charts)} charts for data exploration including distribution, comparison, and trend analysis.",
                "action": "Review each visualization to understand different aspects of your data."
            })
        
        return insights
    
    @staticmethod
    def _prepare_context(profile: Dict, ml_results: List[Dict], dashboard_info: Dict) -> str:
        """Prepare context string for Gemini"""
        
        context = f"""
Dataset Information:
- Title: {dashboard_info.get('title', 'Unknown')}
- Rows: {dashboard_info.get('row_count', 0)}
- Columns: {dashboard_info.get('column_count', 0)}
- Target: {dashboard_info.get('target_column', 'Unknown')}
- Problem Type: {dashboard_info.get('problem_type', 'Unknown')}

Data Quality:
- Quality Score: {profile.get('data_quality', {}).get('quality_score', 0)}%
- Missing Values: {profile.get('statistical_summary', {}).get('total_missing_values', 0)}
- Duplicate Rows: {profile.get('basic_info', {}).get('duplicate_rows', 0)}

"""
        
        # Add correlation info
        correlations = profile.get('correlations', [])
        if correlations:
            context += "\nTop Correlations:\n"
            for corr in correlations[:5]:
                context += f"- {corr.get('column1')} <-> {corr.get('column2')}: {corr.get('correlation', 0):.3f}\n"
        else:
            context += "\nNo significant correlations found.\n"
        
        # Add ML results
        if ml_results and len(ml_results) > 0:
            best_model = ml_results[0]
            context += f"\nMachine Learning Results:\n"
            context += f"- Best Model: {best_model.get('model_name', 'Unknown')}\n"
            context += f"- Performance Score: {best_model.get('test_score', 0):.3f}\n"
            context += f"- CV Score: {best_model.get('cv_score', 0):.3f}\n"
            context += f"- Total Models Trained: {len(ml_results)}\n"
        
        return context
    
    @staticmethod
    def _generate_rule_based_insights(profile: Dict, ml_results: List[Dict]) -> List[Dict]:
        """Generate rule-based insights as fallback"""
        
        insights = []
        
        # Data quality insights
        quality_score = profile.get('data_quality', {}).get('quality_score', 0)
        if quality_score == 100:
            insights.append({
                "category": "data_quality",
                "priority": "low",
                "title": "Excellent Data Quality",
                "description": f"Dataset has perfect quality score with no missing values or duplicates.",
                "action": "Data is ready for analysis and modeling."
            })
        elif quality_score >= 80:
            insights.append({
                "category": "data_quality",
                "priority": "medium",
                "title": "Good Data Quality",
                "description": f"Dataset quality score is {quality_score}%. Minor data quality issues detected.",
                "action": "Review and address the identified data quality issues for better results."
            })
        else:
            insights.append({
                "category": "data_quality",
                "priority": "high",
                "title": "Data Quality Issues Detected",
                "description": f"Dataset quality score is only {quality_score}%. Significant issues found.",
                "action": "Prioritize data cleaning and validation before proceeding with analysis."
            })
        
        # ML performance insights
        if ml_results and len(ml_results) > 0:
            best_model = ml_results[0]
            score = best_model.get('test_score', 0)
            
            # Convert to percentage if it's a ratio
            if abs(score) <= 1.0:
                score_pct = score * 100
            else:
                score_pct = score
            
            if score_pct < 0:
                insights.append({
                    "category": "statistical",
                    "priority": "high",
                    "title": "Poor Model Performance - Check Target Column",
                    "description": f"Best model ({best_model['model_name']}) achieved {score_pct:.1f}% R², indicating the target column may not be predictable from available features. Negative R² means the model performs worse than simply predicting the average value.",
                    "action": "Verify the target column is correct. Check if it has relationships with other columns. Consider using a different target or collecting different features."
                })
            elif score_pct > 90:
                insights.append({
                    "category": "statistical",
                    "priority": "medium",
                    "title": "Excellent Model Performance",
                    "description": f"Best model achieved {score_pct:.1f}% accuracy, indicating strong predictive patterns.",
                    "action": "Model is ready for deployment. Consider validating on additional test data."
                })
            elif score_pct > 75:
                insights.append({
                    "category": "statistical",
                    "priority": "medium",
                    "title": "Good Model Performance",
                    "description": f"Best model achieved {score_pct:.1f}% accuracy, showing reliable predictions.",
                    "action": "Consider feature engineering or hyperparameter tuning for improvement."
                })
            else:
                insights.append({
                    "category": "statistical",
                    "priority": "high",
                    "title": "Model Performance Needs Improvement",
                    "description": f"Best model achieved only {score_pct:.1f}% accuracy. This suggests challenges in the data or problem.",
                    "action": "Try feature engineering, collect more data, or reconsider the problem formulation."
                })
        
        # Correlation insights
        correlations = profile.get('correlations', [])
        if not correlations or len(correlations) == 0:
            insights.append({
                "category": "patterns",
                "priority": "medium",
                "title": "No Strong Correlations Found",
                "description": "The dataset shows no significant linear correlations between features.",
                "action": "Consider non-linear relationships or feature engineering to discover hidden patterns."
            })
        
        return insights