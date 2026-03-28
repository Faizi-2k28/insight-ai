# backend/services/chart_service.py
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from services.llm_service import LLMService

class ChartService:
    
    @staticmethod
    def generate_chart_config(
        df: pd.DataFrame, 
        profile: Dict[str, Any], 
        limit: int = 7, 
        offset: int = 0,
        return_metadata: bool = False
    ) -> Any:
        """
        Main entry point:
        1. Generate candidates (~20-30)
        2. Score candidates
        3. Rank and filter (diversity)
        4. Apply pagination
        5. Add insights and recommendations
        """
        candidates = ChartService.generate_candidates(df, profile)
        scored_candidates = [ChartService.score_candidate(c, df, profile) for c in candidates]
        
        # Get all diverse candidates, sorted
        all_charts = ChartService.select_top_charts(scored_candidates, limit=None)
        
        # Apply pagination
        total_candidates = len(all_charts)
        paginated_charts = all_charts[offset : offset + limit]
        
        # Add insights/recommendations only to returned charts
        for chart in paginated_charts:
            chart["insights"] = ChartService.generate_insights(df, chart)
            chart["recommendations"] = ChartService.generate_recommendations(chart)
            
        if return_metadata:
            # Apply LLM Polish (Optional)
            polished_map = LLMService.polish_chart_insights(paginated_charts)
            if polished_map:
                for idx, details in polished_map.items():
                    if 0 <= idx < len(paginated_charts):
                        paginated_charts[idx]["llm_narrative"] = details.get("narrative")
                        paginated_charts[idx]["llm_actions"] = details.get("actions")
                        paginated_charts[idx]["llm_risks"] = details.get("risks")

            return {
                "charts": paginated_charts,
                "total": total_candidates,
                "limit": limit,
                "offset": offset
            }
            
        # Apply LLM Polish (Optional) when metadata not returned (unlikely path for API but good for completeness)
        polished_map = LLMService.polish_chart_insights(paginated_charts)
        if polished_map:
            for idx, details in polished_map.items():
                if 0 <= idx < len(paginated_charts):
                    paginated_charts[idx]["llm_narrative"] = details.get("narrative")
                    paginated_charts[idx]["llm_actions"] = details.get("actions")
                    paginated_charts[idx]["llm_risks"] = details.get("risks")

        return paginated_charts

    @staticmethod
    def generate_candidates(df: pd.DataFrame, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        candidates = []
        
        columns = profile["columns"]
        numeric_cols = [c["name"] for c in columns if c["column_type"] == "numeric"]
        categorical_cols = [c["name"] for c in columns if c["column_type"] == "categorical"]
        datetime_cols = [c["name"] for c in columns if c["column_type"] == "datetime"]
        
        # 1. Univariate - Numeric (Histogram/Box)
        for col in numeric_cols:
            # Histogram
            candidates.append({
                "type": "histogram",
                "title": f"Distribution of {col}",
                "description": f"Frequency distribution of {col}",
                "config": {"column": col, "bins": 20},
                "score_components": {"type": "distribution"}
            })
            # Box Plot
            candidates.append({
                "type": "box",
                "title": f"Box Plot of {col}",
                "description": f"Distribution and outliers of {col}",
                "config": {"column": col},
                "score_components": {"type": "distribution"}
            })

        # 2. Univariate - Categorical (Bar/Pie)
        for col in categorical_cols:
            col_profile = next((c for c in columns if c["name"] == col), None)
            if not col_profile: continue
            
            unique_count = col_profile.get("unique_count", 0)
            
            if unique_count <= 20:
                # Bar Chart
                candidates.append({
                    "type": "bar",
                    "title": f"Count by {col}",
                    "description": f"Frequency of categories in {col}",
                    "config": {"column": col, "aggregation": "count"},
                    "score_components": {"type": "composition"}
                })
                
                # Pie Chart (only if very few categories)
                if unique_count <= 5:
                    candidates.append({
                        "type": "pie",
                        "title": f"Share of {col}",
                        "description": f"Proportion of categories in {col}",
                        "config": {"column": col, "aggregation": "count"},
                        "score_components": {"type": "composition"}
                    })

        # 3. Bivariate - Numeric vs Numeric (Scatter)
        # Use known correlations to pick pairs
        for corr in profile.get("correlations", []):
            if abs(corr["correlation"]) > 0.3:
                candidates.append({
                    "type": "scatter",
                    "title": f"{corr['column1']} vs {corr['column2']}",
                    "description": f"Relationship between {corr['column1']} and {corr['column2']}",
                    "config": {
                        "x_column": corr["column1"],
                        "y_column": corr["column2"],
                        "correlation": corr["correlation"]
                    },
                    "score_components": {"type": "relationship", "correlation": abs(corr["correlation"])}
                })

        # 4. Bivariate - Categorical vs Numeric (Bar Aggregation/Box)
        if len(categorical_cols) > 0 and len(numeric_cols) > 0:
            # Try top 3 cat x top 3 numeric
            top_cats = sorted(categorical_cols, key=lambda c: next((x["unique_count"] for x in columns if x["name"]==c), 100))[:3]
            
            for cat in top_cats:
                cat_profile = next((c for c in columns if c["name"] == cat), None)
                if cat_profile and cat_profile.get("unique_count", 100) > 50:
                    continue # Skip high cardinality
                    
                for num in numeric_cols[:3]:
                    # Bar Mean
                    candidates.append({
                        "type": "bar",
                        "title": f"Average {num} by {cat}",
                        "description": f"Mean {num} across {cat} groups",
                        "config": {
                            "categorical_column": cat, 
                            "numeric_column": num,
                            "aggregation": "mean"
                        },
                        "score_components": {"type": "comparison"}
                    })
                    
                    # Box Plot (Distribution by Category)
                    candidates.append({
                        "type": "box",
                        "title": f"{num} Distribution by {cat}",
                        "description": f"Distribution of {num} across {cat}",
                        "config": {
                            "column": num, # Y-axis
                            "by_column": cat # X-axis grouping
                        },
                        "score_components": {"type": "distribution_comparison"}
                    })

        # 5. Time Series (Line)
        if len(datetime_cols) > 0:
            date_col = datetime_cols[0]
            for num in numeric_cols[:3]:
                 candidates.append({
                    "type": "line",
                    "title": f"{num} Trend",
                    "description": f"{num} over time",
                    "config": {
                        "x_column": date_col,
                        "y_column": num
                    },
                    "score_components": {"type": "trend"}
                })

        return candidates

    @staticmethod
    def score_candidate(chart: Dict[str, Any], df: pd.DataFrame, profile: Dict[str, Any]) -> Dict[str, Any]:
        score = 50 # Base score
        config = chart["config"]
        chart_type = chart["type"]
        components = chart.get("score_components", {})
        
        # 1. Correlation Bonus (Scatter)
        if chart_type == "scatter":
            corr = components.get("correlation", 0)
            if corr > 0.7: score += 30
            elif corr > 0.5: score += 20
            elif corr > 0.3: score += 10
            
        # 2. Outlier Bonus (Box/Histogram)
        if chart_type in ["box", "histogram"]:
            col_name = config.get("column")
            # Find outliers in profile
            outliers = [o for o in profile.get("outliers", []) if o["column"] == col_name]
            if outliers:
                outlier_count = outliers[0]["outlier_count"]
                if outlier_count > 0: score += 15
        
        # 3. Trend Bonus (Line)
        if chart_type == "line":
            score += 20 # Trends are usually valuable
            
        # 4. Low Cardinality Bonus (Bar/Pie)
        if chart_type in ["bar", "pie"]:
            col = config.get("column") or config.get("categorical_column")
            col_prof = next((c for c in profile["columns"] if c["name"] == col), None)
            if col_prof:
                unique = col_prof.get("unique_count", 0)
                if unique < 10: score += 10
                if unique > 50: score -= 30 # Penalty for messiness
        
        # 5. Missing Value Penalty
        cols_used = []
        if "column" in config: cols_used.append(config["column"])
        if "x_column" in config: cols_used.append(config["x_column"])
        if "y_column" in config: cols_used.append(config["y_column"])
        if "categorical_column" in config: cols_used.append(config["categorical_column"])
        if "numeric_column" in config: cols_used.append(config["numeric_column"])
        
        for col in cols_used:
             col_prof = next((c for c in profile["columns"] if c["name"] == col), None)
             if col_prof:
                 missing_pct = col_prof.get("missing_count", 0) / profile.get("row_count", 1)
                 if missing_pct < 0.05: score += 5
                 if missing_pct > 0.2: score -= 20

        chart["score"] = min(100, max(0, score))
        return chart

    @staticmethod
    def select_top_charts(candidates: List[Dict[str, Any]], limit: Optional[int] = 7) -> List[Dict[str, Any]]:
        # Sort by score desc
        sorted_candidates = sorted(candidates, key=lambda x: x.get("score", 0), reverse=True)
        
        final_list = []
        seen_types = {} # type -> count
        seen_cols = set() # Avoid repetitive charts on same column
        
        for chart in sorted_candidates:
            c_type = chart["type"]
            
            # Identify primary column to check for repetition
            config = chart["config"]
            primary_col = config.get("column") or config.get("y_column") or config.get("numeric_column")
            col_key = f"{c_type}_{primary_col}"
            
            # Diversity constraints
            if seen_types.get(c_type, 0) >= 2: continue # Max 2 of same type
            if col_key in seen_cols: continue # Don't repeat same view
            
            final_list.append(chart)
            seen_types[c_type] = seen_types.get(c_type, 0) + 1
            seen_cols.add(col_key)
            
            if limit and len(final_list) >= limit: break
            
        return final_list

    @staticmethod
    def generate_insights(df: pd.DataFrame, chart: Dict[str, Any]) -> List[str]:
        insights = []
        config = chart["config"]
        ctype = chart["type"]
        
        try:
            if ctype == "bar":
                cat = config.get("column") or config.get("categorical_column")
                num = config.get("numeric_column")
                
                if num and cat in df.columns and num in df.columns: # Aggregation
                    groupby = df.groupby(cat)[num].mean()
                    top = groupby.idxmax()
                    insights.append(f"Highest average {num} is in {top} category.")
                elif cat in df.columns: # Count
                    counts = df[cat].value_counts()
                    top = counts.idxmax()
                    pct = (counts.max() / len(df)) * 100
                    insights.append(f"{top} is the most common {cat} ({pct:.1f}%).")
                    
            elif ctype == "scatter":
                corr = config.get("correlation", 0)
                strength = "Strong" if abs(corr) > 0.7 else "Moderate" if abs(corr) > 0.3 else "Weak"
                direction = "positive" if corr > 0 else "negative"
                insights.append(f"{strength} {direction} correlation ({corr:.2f}).")
                
            elif ctype == "line":
                 x = config["x_column"]
                 y = config["y_column"]
                 if x in df.columns and y in df.columns:
                     # Simple slope direction check (first vs last)
                     df_sorted = df.sort_values(x)
                     start = df_sorted[y].iloc[0]
                     end = df_sorted[y].iloc[-1]
                     trend = "increased" if end > start else "decreased"
                     insights.append(f"{y} has {trend} over the period.")
                 
            elif ctype == "histogram":
                 col = config["column"]
                 if col in df.columns:
                     skew = df[col].skew()
                     shape = "symmetric" if abs(skew) < 0.5 else ("right-skewed" if skew > 0 else "left-skewed")
                     insights.append(f"Distribution is {shape}.")
                 
            # Fallback
            if not insights:
                insights.append(f"Visualizes {chart['title']} data.")
                
        except Exception as e:
            # Silently fail insight generation on error to avoid breaking the UI
            insights.append("Analyzing data patterns...")
            
        return insights[:3]

    @staticmethod
    def generate_recommendations(chart: Dict[str, Any]) -> List[str]:
        # Simple templated actions
        recs = []
        title = chart.get("title", "Chart")
        
        if chart["type"] == "scatter":
             recs.append(f"Investigate causal drivers behind {title}.")
        elif chart["type"] == "bar":
             recs.append(f"Focus resources on top performing segments in {title}.")
        elif chart["type"] == "line":
             recs.append("Monitor this trend for future anomalies.")
        elif chart["type"] == "box":
             recs.append("Review outlier data points for data quality or fraud.")
        else:
             recs.append("Explore this Metric further in detailed analysis.")
             
        return recs

    @staticmethod
    def generate_chart_data(df: pd.DataFrame, chart_config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate actual data for a chart based on configuration"""
        
        chart_type = chart_config["type"]
        config = chart_config["config"]
        
        try:
            if chart_type == "pie" or (chart_type == "bar" and "categorical_column" not in config):
                return ChartService._generate_distribution_data(df, config["column"])
            
            elif chart_type == "bar" and "categorical_column" in config:
                return ChartService._generate_aggregated_bar_data(
                    df, 
                    config["categorical_column"], 
                    config["numeric_column"], 
                    config["aggregation"]
                )
            
            elif chart_type == "histogram":
                return ChartService._generate_histogram_data(df, config["column"], config["bins"])
            
            elif chart_type == "scatter":
                return ChartService._generate_scatter_data(
                    df, 
                    config["x_column"], 
                    config["y_column"]
                )
            
            elif chart_type == "line":
                return ChartService._generate_line_data(
                    df, 
                    config["x_column"], 
                    config["y_column"]
                )
            
            elif chart_type == "box":
                # Check which type of box plot
                if "by_column" in config:
                     # Filter for top categories to avoid overcrowding
                    return ChartService._generate_grouped_box_data(df, config["column"], config["by_column"])
                else:
                    return ChartService._generate_box_data(df, config["column"])
            
            else:
                return {"error": "Unknown chart type"}
        
        except Exception as e:
            return {"error": str(e)}
    
    @staticmethod
    def _generate_distribution_data(df: pd.DataFrame, column: str) -> Dict[str, Any]:
        """Generate data for pie/bar distribution charts"""
        
        value_counts = df[column].value_counts().head(15)  # Top 15 categories
        
        data = [
            {
                "name": str(k),
                "value": int(v),
                "percentage": float(v / len(df) * 100)
            }
            for k, v in value_counts.items()
        ]
        
        return {
            "data": data,
            "total": int(len(df))
        }
    
    @staticmethod
    def _generate_aggregated_bar_data(df: pd.DataFrame, cat_col: str, num_col: str, agg: str) -> Dict[str, Any]:
        """Generate data for categorical vs numeric bar charts"""
        
        grouped = df.groupby(cat_col)[num_col].agg(agg).sort_values(ascending=False).head(15)
        
        data = [
            {
                "name": str(k),
                "value": float(v)
            }
            for k, v in grouped.items()
        ]
        
        return {
            "data": data,
            "aggregation": agg
        }
    
    @staticmethod
    def _generate_histogram_data(df: pd.DataFrame, column: str, bins: int) -> Dict[str, Any]:
        """Generate histogram data"""
        
        non_null = df[column].dropna()
        counts, bin_edges = np.histogram(non_null, bins=bins)
        
        data = [
            {
                "bin": f"{bin_edges[i]:.2f}-{bin_edges[i+1]:.2f}",
                "count": int(counts[i]),
                "bin_start": float(bin_edges[i]),
                "bin_end": float(bin_edges[i+1])
            }
            for i in range(len(counts))
        ]
        
        return {
            "data": data,
            "min": float(non_null.min()),
            "max": float(non_null.max()),
            "mean": float(non_null.mean())
        }
    
    @staticmethod
    def _generate_scatter_data(df: pd.DataFrame, x_col: str, y_col: str) -> Dict[str, Any]:
        """Generate scatter plot data"""
        
        # Sample if too many points
        sample_df = df[[x_col, y_col]].dropna()
        if len(sample_df) > 500:
            sample_df = sample_df.sample(500, random_state=42)
        
        data = [
            {
                "x": float(row[x_col]),
                "y": float(row[y_col])
            }
            for _, row in sample_df.iterrows()
        ]
        
        return {
            "data": data,
            "correlation": float(df[[x_col, y_col]].corr().iloc[0, 1])
        }
    
    @staticmethod
    def _generate_line_data(df: pd.DataFrame, x_col: str, y_col: str) -> Dict[str, Any]:
        """Generate line chart data (time series)"""
        
        sorted_df = df[[x_col, y_col]].dropna().sort_values(x_col)
        
        # Sample if too many points
        if len(sorted_df) > 100:
            sorted_df = sorted_df.iloc[::len(sorted_df)//100]
        
        data = [
            {
                "x": str(row[x_col]),
                "y": float(row[y_col])
            }
            for _, row in sorted_df.iterrows()
        ]
        
        return {
            "data": data
        }
    
    @staticmethod
    def _generate_box_data(df: pd.DataFrame, column: str) -> Dict[str, Any]:
        """Generate box plot data"""
        
        non_null = df[column].dropna()
        
        return {
            "min": float(non_null.min()),
            "q1": float(non_null.quantile(0.25)),
            "median": float(non_null.median()),
            "q3": float(non_null.quantile(0.75)),
            "max": float(non_null.max()),
            "outliers": [float(x) for x in non_null[
                (non_null < non_null.quantile(0.25) - 1.5 * (non_null.quantile(0.75) - non_null.quantile(0.25))) |
                (non_null > non_null.quantile(0.75) + 1.5 * (non_null.quantile(0.75) - non_null.quantile(0.25)))
            ].head(50)]  # Top 50 outliers
        }

    @staticmethod
    def _generate_grouped_box_data(df: pd.DataFrame, val_col: str, cat_col: str) -> Dict[str, Any]:
        """Generate box plot data grouped by category"""
        
        # Get top categories
        top_cats = df[cat_col].value_counts().head(10).index.tolist()
        
        grouped_data = []
        for cat in top_cats:
            cat_data = df[df[cat_col] == cat][val_col].dropna()
            if len(cat_data) < 5: continue
            
            stats = {
                "category": str(cat),
                "min": float(cat_data.min()),
                "q1": float(cat_data.quantile(0.25)),
                "median": float(cat_data.median()),
                "q3": float(cat_data.quantile(0.75)),
                "max": float(cat_data.max()),
                "outliers": [float(x) for x in cat_data[
                    (cat_data < cat_data.quantile(0.25) - 1.5 * (cat_data.quantile(0.75) - cat_data.quantile(0.25))) |
                    (cat_data > cat_data.quantile(0.75) + 1.5 * (cat_data.quantile(0.75) - cat_data.quantile(0.25)))
                ].head(10)]
            }
            grouped_data.append(stats)
            
        return {
            "data": grouped_data,
            "axis_label": cat_col
        }