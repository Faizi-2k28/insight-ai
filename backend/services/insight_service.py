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
        charts: List[Dict] = None,
        num_insights: int = 5
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
            model = genai.GenerativeModel('gemini-2.0-flash')  # 1500 req/day free tier
            
            prompt = f"""You are an expert data scientist analyzing a dataset. Generate actionable insights.

{context}

Provide exactly {num_insights} insights covering:
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
            insights = InsightService._generate_rule_based_insights(profile, ml_results, dashboard_info, num_insights)
        
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
        """Generate AI insights about individual charts using Gemini.
        Falls back to deterministic data-driven insights per chart when Gemini is unavailable."""
        
        insights = []
        gemini_available = True
        model = None
        
        try:
            model = genai.GenerativeModel('gemini-2.0-flash')  # 1500 req/day free tier
        except Exception as e:
            print(f"Gemini model init failed: {str(e)}")
            gemini_available = False
        
        for idx, chart in enumerate(charts, 1):
            chart_type = chart.get('type', 'unknown')
            chart_title = chart.get('title', 'Chart')
            chart_desc_text = chart.get('description', '')
            chart_data = chart.get('chart_data', {})
            
            # --- Try Gemini first ---
            if gemini_available and model:
                try:
                    chart_desc = f"""
Chart Type: {chart_type.title()}
Title: {chart_title}
Description: {chart_desc_text}

"""
                    # Add specific data based on chart type
                    if chart_type == 'pie':
                        data = chart_data.get('data', [])
                        chart_desc += "Data Distribution:\n"
                        for item in data:
                            chart_desc += f"- {item['name']}: {item['value']} ({item.get('percentage', 0)}%)\n"
                        chart_desc += f"Total: {chart_data.get('total', 0)}\n"
                    
                    elif chart_type == 'histogram':
                        chart_desc += f"Range: {chart_data.get('min', 0)} to {chart_data.get('max', 0)}\n"
                        chart_desc += f"Mean: {chart_data.get('mean', 0)}\n"
                        bins = chart_data.get('data', [])
                        chart_desc += f"Distribution: {len(bins)} bins\n"
                        top_bins = sorted(bins, key=lambda x: x.get('count', 0), reverse=True)[:3]
                        chart_desc += "Most frequent ranges:\n"
                        for bin_data in top_bins:
                            chart_desc += f"- {bin_data.get('bin', '?')}: {bin_data.get('count', 0)} occurrences\n"
                    
                    elif chart_type == 'bar':
                        data = chart_data.get('data', [])
                        chart_desc += "Comparison Data:\n"
                        for item in data:
                            chart_desc += f"- {item.get('name', '?')}: {item.get('value', 0):.2f}\n"
                    
                    elif chart_type == 'scatter':
                        chart_desc += f"Correlation: {chart_data.get('correlation', 'N/A')}\n"
                        chart_desc += f"Data points: {len(chart_data.get('data', []))}\n"
                    
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

                    response = model.generate_content(prompt)
                    
                    import json
                    import re
                    
                    response_text = response.text.strip()
                    json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                    if json_match:
                        chart_analysis = json.loads(json_match.group())
                        insights.append({
                            "category": "visualization",
                            "priority": "medium",
                            "title": f"Chart Insight: {chart_title}",
                            "description": chart_analysis.get('insight', 'Analysis of chart patterns and trends.'),
                            "action": f"{chart_analysis.get('key_finding', '')} {chart_analysis.get('recommendation', '')}"
                        })
                        continue  # Success — skip fallback
                
                except Exception as chart_error:
                    print(f"Gemini failed for chart {idx} ({chart_title}): {str(chart_error)}")
                    # Fall through to rule-based below
            
            # --- Rule-based fallback per chart ---
            fallback = InsightService._generate_single_chart_insight(chart_type, chart_title, chart_desc_text, chart_data)
            insights.append(fallback)
        
        return insights
    
    @staticmethod
    def _generate_single_chart_insight(chart_type: str, title: str, description: str, chart_data: Dict) -> Dict:
        """Generate a deterministic insight for a single chart from its data."""
        
        try:
            if chart_type == 'bar':
                data = chart_data.get('data', [])
                if data:
                    top = max(data, key=lambda x: x.get('value', 0))
                    bottom = min(data, key=lambda x: x.get('value', 0))
                    return {
                        "category": "visualization",
                        "priority": "medium",
                        "title": f"Chart Insight: {title}",
                        "description": f"'{top.get('name', '?')}' leads with a value of {top.get('value', 0):.2f}, while '{bottom.get('name', '?')}' is the lowest at {bottom.get('value', 0):.2f}. The spread of {abs(top.get('value', 0) - bottom.get('value', 0)):.2f} across {len(data)} categories suggests {'significant variation' if abs(top.get('value', 0) - bottom.get('value', 0)) > top.get('value', 1) * 0.5 else 'relatively even distribution'}.",
                        "action": f"Investigate what drives '{top.get('name', '?')}' to the top — replicate its success factors across other segments."
                    }
            
            elif chart_type == 'pie':
                data = chart_data.get('data', [])
                if data:
                    top = max(data, key=lambda x: x.get('value', 0))
                    pct = top.get('percentage', 0)
                    return {
                        "category": "visualization",
                        "priority": "medium",
                        "title": f"Chart Insight: {title}",
                        "description": f"'{top.get('name', '?')}' dominates with {pct:.1f}% of the total ({top.get('value', 0):,} records). {'This heavy concentration suggests a class imbalance that may affect modeling.' if pct > 50 else f'The remaining {100-pct:.1f}% is spread across {len(data)-1} other categories.'}",
                        "action": f"{'Consider stratified sampling or SMOTE to address the imbalance.' if pct > 50 else 'Review whether category grouping could simplify analysis.'}"
                    }
            
            elif chart_type == 'histogram':
                mean_val = chart_data.get('mean', 0)
                min_val = chart_data.get('min', 0)
                max_val = chart_data.get('max', 0)
                spread = max_val - min_val
                bins = chart_data.get('data', [])
                if bins:
                    top_bin = max(bins, key=lambda x: x.get('count', 0))
                    return {
                        "category": "visualization",
                        "priority": "medium",
                        "title": f"Chart Insight: {title}",
                        "description": f"Values range from {min_val:.2f} to {max_val:.2f} (spread: {spread:.2f}) with a mean of {mean_val:.2f}. The most frequent range is {top_bin.get('bin', '?')} ({top_bin.get('count', 0):,} observations). {'The wide spread suggests high variability — consider normalizing.' if spread > abs(mean_val) * 2 else 'The distribution appears relatively concentrated around the mean.'}",
                        "action": "Check for outliers at the distribution tails and consider whether transformation (log, sqrt) would improve normality."
                    }
            
            elif chart_type == 'scatter':
                corr = chart_data.get('correlation', 0)
                n_points = len(chart_data.get('data', []))
                strength = "strong" if abs(corr) > 0.7 else "moderate" if abs(corr) > 0.3 else "weak"
                direction = "positive" if corr > 0 else "negative"
                return {
                    "category": "visualization",
                    "priority": "high" if abs(corr) > 0.7 else "medium",
                    "title": f"Chart Insight: {title}",
                    "description": f"Shows a {strength} {direction} correlation (r={corr:.3f}) across {n_points} data points. {'This strong relationship suggests potential predictive power or redundancy between these features.' if abs(corr) > 0.7 else 'Moderate correlation may indicate a useful but non-dominant relationship.'}",
                    "action": f"{'Consider using one feature as a proxy for the other to reduce dimensionality.' if abs(corr) > 0.7 else 'Explore this relationship further with residual analysis.'}"
                }
            
            elif chart_type == 'line':
                data = chart_data.get('data', [])
                if data and len(data) > 1:
                    first_val = data[0].get('y', 0)
                    last_val = data[-1].get('y', 0)
                    trend = "upward" if last_val > first_val else "downward"
                    change_pct = ((last_val - first_val) / abs(first_val) * 100) if first_val != 0 else 0
                    return {
                        "category": "visualization",
                        "priority": "medium",
                        "title": f"Chart Insight: {title}",
                        "description": f"Shows an {trend} trend with a {abs(change_pct):.1f}% {'increase' if change_pct > 0 else 'decrease'} from start to end across {len(data)} data points.",
                        "action": f"{'Monitor this growth trend and set alerts for anomalous deviations.' if trend == 'upward' else 'Investigate the declining trend and identify potential root causes.'}"
                    }
            
            elif chart_type == 'box':
                if 'data' in chart_data and isinstance(chart_data['data'], list):
                    # Grouped box
                    groups = chart_data['data']
                    if groups:
                        widest = max(groups, key=lambda g: g.get('q3', 0) - g.get('q1', 0))
                        return {
                            "category": "visualization",
                            "priority": "medium",
                            "title": f"Chart Insight: {title}",
                            "description": f"Comparing distributions across {len(groups)} groups. '{widest.get('category', '?')}' shows the widest spread (IQR: {widest.get('q3', 0) - widest.get('q1', 0):.2f}), indicating highest variability.",
                            "action": f"Investigate why '{widest.get('category', '?')}' has such high variability — it may contain distinct sub-populations."
                        }
                else:
                    median = chart_data.get('median', 0)
                    outlier_count = len(chart_data.get('outliers', []))
                    return {
                        "category": "visualization",
                        "priority": "medium",
                        "title": f"Chart Insight: {title}",
                        "description": f"Median value is {median:.2f} with {outlier_count} outlier(s) detected beyond the 1.5×IQR boundary.",
                        "action": f"{'Review the {outlier_count} outliers for data quality issues or genuinely extreme observations.' if outlier_count > 0 else 'Distribution looks clean with no extreme outliers.'}"
                    }
        
        except Exception as e:
            print(f"Rule-based chart insight failed for '{title}': {str(e)}")
        
        # Ultimate fallback
        return {
            "category": "visualization",
            "priority": "low",
            "title": f"Chart: {title}",
            "description": f"This {chart_type} chart shows {description.lower() if description else 'data patterns'}.",
            "action": "Review this visualization to identify patterns in your data."
        }
    
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
    def _generate_rule_based_insights(
        profile: Dict, 
        ml_results: List[Dict],
        dashboard_info: Dict = None,
        num_insights: int = 5
    ) -> List[Dict]:
        """Generate comprehensive rule-based insights as fallback when Gemini is unavailable."""
        
        insights = []
        dashboard_info = dashboard_info or {}
        basic_info = profile.get('basic_info', {})
        data_quality = profile.get('data_quality', {})
        columns = profile.get('columns', [])
        correlations = profile.get('correlations', [])
        outliers = profile.get('outliers', [])
        recommendations = profile.get('recommendations', [])
        
        row_count = basic_info.get('row_count', dashboard_info.get('row_count', 0))
        col_count = basic_info.get('column_count', dashboard_info.get('column_count', 0))
        duplicate_rows = basic_info.get('duplicate_rows', 0)
        
        # --- 1. Data Quality Score ---
        quality_score = data_quality.get('quality_score', 0)
        if quality_score == 100:
            insights.append({
                "category": "data_quality",
                "priority": "low",
                "title": "Excellent Data Quality",
                "description": f"Dataset has a perfect quality score of 100% across {row_count:,} rows and {col_count} columns with no missing values or duplicates.",
                "action": "Data is ready for analysis and modeling — no cleaning required."
            })
        elif quality_score >= 80:
            insights.append({
                "category": "data_quality",
                "priority": "medium",
                "title": "Good Data Quality",
                "description": f"Dataset quality score is {quality_score:.1f}%. Minor data quality issues detected across {row_count:,} rows.",
                "action": "Review and address the identified data quality issues for better results."
            })
        else:
            insights.append({
                "category": "data_quality",
                "priority": "high",
                "title": "Data Quality Issues Detected",
                "description": f"Dataset quality score is only {quality_score:.1f}%. Significant issues found in the {row_count:,}-row dataset.",
                "action": "Prioritize data cleaning and validation before proceeding with analysis."
            })
        
        # --- 2. Missing Values Insight ---
        cols_with_missing = [c for c in columns if c.get('missing_count', 0) > 0]
        if cols_with_missing:
            worst = max(cols_with_missing, key=lambda c: c.get('missing_count', 0))
            total_missing = sum(c.get('missing_count', 0) for c in cols_with_missing)
            pct = (worst['missing_count'] / row_count * 100) if row_count else 0
            insights.append({
                "category": "data_quality",
                "priority": "high" if pct > 20 else "medium",
                "title": f"Missing Values in {len(cols_with_missing)} Column(s)",
                "description": f"Found {total_missing:,} total missing values. Column '{worst['name']}' has the most missing data ({worst['missing_count']:,} values, {pct:.1f}% of rows).",
                "action": f"Apply imputation strategies for '{worst['name']}' — consider mean/median for numeric or mode for categorical columns."
            })
        else:
            insights.append({
                "category": "data_quality",
                "priority": "low",
                "title": "No Missing Values",
                "description": f"All {col_count} columns have complete data across {row_count:,} rows — no imputation needed.",
                "action": "Proceed directly to feature engineering and modeling."
            })
        
        # --- 3. Duplicate Rows ---
        if duplicate_rows > 0:
            dup_pct = (duplicate_rows / row_count * 100) if row_count else 0
            insights.append({
                "category": "data_quality",
                "priority": "high" if dup_pct > 5 else "medium",
                "title": f"{duplicate_rows:,} Duplicate Rows Detected",
                "description": f"{duplicate_rows:,} duplicate rows found ({dup_pct:.1f}% of the dataset). Duplicates can skew statistical analysis and inflate model performance.",
                "action": "Investigate whether duplicates are data entry errors or valid repeated observations, then deduplicate if appropriate."
            })
        
        # --- 4. ML Performance ---
        if ml_results and len(ml_results) > 0:
            best_model = ml_results[0]
            score = best_model.get('test_score', 0)
            score_pct = score * 100 if abs(score) <= 1.0 else score
            model_name = best_model.get('model_name', 'Unknown')
            
            if score_pct < 0:
                insights.append({
                    "category": "machine_learning",
                    "priority": "high",
                    "title": "Poor Model Performance — Check Target Column",
                    "description": f"Best model ({model_name}) achieved {score_pct:.1f}% R². Negative R² means the model performs worse than simply predicting the average value.",
                    "action": "Verify the target column is correct. Check relationships with other columns. Consider a different target or additional features."
                })
            elif score_pct > 90:
                insights.append({
                    "category": "machine_learning",
                    "priority": "medium",
                    "title": f"Excellent Model Performance ({model_name})",
                    "description": f"Best model achieved {score_pct:.1f}% accuracy, indicating strong predictive patterns in the data.",
                    "action": "Model is ready for deployment. Consider validating on a held-out test set to confirm generalization."
                })
            elif score_pct > 75:
                insights.append({
                    "category": "machine_learning",
                    "priority": "medium",
                    "title": f"Good Model Performance ({model_name})",
                    "description": f"Best model achieved {score_pct:.1f}% accuracy, showing reliable predictions.",
                    "action": "Consider feature engineering or hyperparameter tuning for further improvement."
                })
            else:
                insights.append({
                    "category": "machine_learning",
                    "priority": "high",
                    "title": "Model Performance Needs Improvement",
                    "description": f"Best model ({model_name}) achieved only {score_pct:.1f}% accuracy, suggesting challenges in the data or problem formulation.",
                    "action": "Try feature engineering, collect more data, or reconsider the problem formulation."
                })
            
            # Multiple models comparison
            if len(ml_results) > 1:
                worst = ml_results[-1]
                worst_score = worst.get('test_score', 0)
                worst_pct = worst_score * 100 if abs(worst_score) <= 1.0 else worst_score
                insights.append({
                    "category": "machine_learning",
                    "priority": "low",
                    "title": f"{len(ml_results)} Models Compared",
                    "description": f"Trained {len(ml_results)} models. Performance ranges from {worst_pct:.1f}% ({worst.get('model_name', 'Worst')}) to {score_pct:.1f}% ({model_name}). The gap of {abs(score_pct - worst_pct):.1f}pp suggests {'significant model sensitivity' if abs(score_pct - worst_pct) > 20 else 'relatively consistent behavior across algorithms'}.",
                    "action": "Consider ensemble methods to combine the strengths of top-performing models."
                })
        
        # --- 5. Correlation Insights ---
        if correlations and len(correlations) > 0:
            strong = [c for c in correlations if abs(c.get('correlation', 0)) > 0.7]
            moderate = [c for c in correlations if 0.3 < abs(c.get('correlation', 0)) <= 0.7]
            
            if strong:
                top = strong[0]
                insights.append({
                    "category": "patterns",
                    "priority": "high",
                    "title": f"Strong Correlation: {top['column1']} ↔ {top['column2']}",
                    "description": f"Found {len(strong)} strong correlation(s). The strongest is between '{top['column1']}' and '{top['column2']}' (r={top['correlation']:.3f}). Strong correlations may indicate redundant features or causal relationships.",
                    "action": f"Investigate the relationship between '{top['column1']}' and '{top['column2']}'. Consider removing one to reduce multicollinearity in modeling."
                })
            if moderate and len(insights) < num_insights:
                top_mod = moderate[0]
                insights.append({
                    "category": "patterns",
                    "priority": "medium",
                    "title": f"Moderate Correlations Detected ({len(moderate)} pairs)",
                    "description": f"Found {len(moderate)} moderate correlation(s). Example: '{top_mod['column1']}' and '{top_mod['column2']}' (r={top_mod['correlation']:.3f}).",
                    "action": "Explore these relationships further — they may reveal useful feature interactions for modeling."
                })
        else:
            insights.append({
                "category": "patterns",
                "priority": "medium",
                "title": "No Strong Correlations Found",
                "description": "The dataset shows no significant linear correlations between features.",
                "action": "Consider non-linear relationships or feature engineering to discover hidden patterns."
            })
        
        # --- 6. Outlier Insights ---
        if outliers and len(outliers) > 0:
            total_outlier_cols = len(outliers)
            worst_outlier = max(outliers, key=lambda o: o.get('outlier_count', 0))
            insights.append({
                "category": "statistical",
                "priority": "medium",
                "title": f"Outliers Detected in {total_outlier_cols} Column(s)",
                "description": f"Column '{worst_outlier['column']}' has the most outliers ({worst_outlier.get('outlier_count', 0):,} data points beyond 1.5×IQR). Outliers can significantly affect model training and statistical summaries.",
                "action": f"Investigate outliers in '{worst_outlier['column']}' — consider capping, removing, or applying robust scaling."
            })
        
        # --- 7. Column Type Distribution ---
        if columns and len(insights) < num_insights:
            numeric_cols = [c for c in columns if c.get('column_type') == 'numeric']
            categorical_cols = [c for c in columns if c.get('column_type') == 'categorical']
            datetime_cols = [c for c in columns if c.get('column_type') == 'datetime']
            
            insights.append({
                "category": "statistical",
                "priority": "low",
                "title": "Feature Type Distribution",
                "description": f"Dataset contains {len(numeric_cols)} numeric, {len(categorical_cols)} categorical, and {len(datetime_cols)} datetime column(s) across {col_count} total features.",
                "action": "Ensure categorical columns are properly encoded and datetime features are extracted before modeling."
            })
        
        # --- 8. High-Cardinality Categorical Warning ---
        if columns and len(insights) < num_insights:
            high_card = [c for c in columns if c.get('column_type') == 'categorical' and c.get('unique_count', 0) > 50]
            if high_card:
                col_names = ', '.join([c['name'] for c in high_card[:3]])
                insights.append({
                    "category": "data_quality",
                    "priority": "medium",
                    "title": f"High-Cardinality Categorical Column(s)",
                    "description": f"{len(high_card)} categorical column(s) have >50 unique values ({col_names}). High cardinality can cause sparse encodings and increase dimensionality.",
                    "action": "Consider grouping rare categories, using target encoding, or converting to embeddings."
                })
        
        # --- 9. Business Context Insight ---
        target = dashboard_info.get('target_column', '')
        problem = dashboard_info.get('problem_type', '')
        if target and problem and len(insights) < num_insights:
            insights.append({
                "category": "business",
                "priority": "medium",
                "title": f"{problem.title()} Task: Predicting '{target}'",
                "description": f"This analysis targets '{target}' as a {problem} problem using {col_count} features and {row_count:,} records. {'Ensure class balance for reliable classification results.' if problem == 'classification' else 'Check the target distribution for skewness that may affect regression performance.'}",
                "action": f"Review feature importance to identify which columns most influence '{target}' predictions."
            })
        
        # --- 10. Recommendations from profiler ---
        if recommendations and len(insights) < num_insights:
            for rec in recommendations[:2]:
                if len(insights) >= num_insights:
                    break
                insights.append({
                    "category": "business",
                    "priority": rec.get('priority', 'low'),
                    "title": rec.get('title', 'Recommendation'),
                    "description": rec.get('description', 'Consider reviewing this aspect of your data.'),
                    "action": rec.get('action', 'Take appropriate action based on this recommendation.')
                })
        
        # Trim to requested count
        return insights[:num_insights]
