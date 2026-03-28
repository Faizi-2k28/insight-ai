# backend/services/data_profiling_service.py
import pandas as pd
import numpy as np
from typing import Dict, List, Any
from scipy import stats
from collections import Counter


class DataProfilingService:
    
    @staticmethod
    def profile_dataset(df: pd.DataFrame) -> Dict[str, Any]:
        """Comprehensive dataset profiling - works for ANY dataset"""
        
        profile = {
            "basic_info": DataProfilingService.get_basic_info(df),
            "columns": DataProfilingService.analyze_columns(df),
            "correlations": DataProfilingService.get_correlations(df),
            "data_quality": DataProfilingService.assess_data_quality(df),
            "statistical_summary": DataProfilingService.get_statistical_summary(df),
            "outliers": DataProfilingService.detect_outliers(df),
            "recommendations": []
        }
        
        # Generate recommendations
        profile["recommendations"] = DataProfilingService.generate_recommendations(profile, df)
        
        return profile
    
    @staticmethod
    def get_basic_info(df: pd.DataFrame) -> Dict[str, Any]:
        """Basic dataset information"""
        return {
            "total_rows": int(len(df)),
            "total_columns": int(len(df.columns)),
            "memory_usage_mb": float(df.memory_usage(deep=True).sum() / 1024 / 1024),
            "duplicate_rows": int(df.duplicated().sum()),
            "duplicate_percentage": float(df.duplicated().sum() / len(df) * 100)
        }
    
    @staticmethod
    def analyze_columns(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Analyze each column comprehensively"""
        
        columns_analysis = []
        
        for col in df.columns:
            analysis = {
                "name": str(col),
                "dtype": str(df[col].dtype),
                "unique_count": int(df[col].nunique()),
                "unique_percentage": float(df[col].nunique() / len(df) * 100),
                "missing_count": int(df[col].isnull().sum()),
                "missing_percentage": float(df[col].isnull().sum() / len(df) * 100),
                "zero_count": int((df[col] == 0).sum()) if pd.api.types.is_numeric_dtype(df[col]) else 0,
            }
            
            # Determine column type
            if pd.api.types.is_numeric_dtype(df[col]):
                analysis["column_type"] = "numeric"
                analysis["statistics"] = DataProfilingService.get_numeric_stats(df[col])
            elif pd.api.types.is_datetime64_any_dtype(df[col]):
                analysis["column_type"] = "datetime"
                analysis["statistics"] = DataProfilingService.get_datetime_stats(df[col])
            else:
                analysis["column_type"] = "categorical"
                analysis["statistics"] = DataProfilingService.get_categorical_stats(df[col])
            
            # Detect if potentially target variable
            if analysis["unique_count"] < 20 and analysis["unique_count"] > 1:
                analysis["potential_target"] = True
            else:
                analysis["potential_target"] = False
            
            columns_analysis.append(analysis)
        
        return columns_analysis
    
    @staticmethod
    def get_numeric_stats(series: pd.Series) -> Dict[str, Any]:
        """Statistics for numeric columns"""
        
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return {}
        
        return {
            "min": float(non_null.min()),
            "max": float(non_null.max()),
            "mean": float(non_null.mean()),
            "median": float(non_null.median()),
            "std": float(non_null.std()),
            "q25": float(non_null.quantile(0.25)),
            "q75": float(non_null.quantile(0.75)),
            "skewness": float(non_null.skew()),
            "kurtosis": float(non_null.kurtosis())
        }
    
    @staticmethod
    def get_categorical_stats(series: pd.Series) -> Dict[str, Any]:
        """Statistics for categorical columns"""
        
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return {}
        
        value_counts = non_null.value_counts()
        
        return {
            "most_common": str(value_counts.index[0]) if len(value_counts) > 0 else None,
            "most_common_count": int(value_counts.iloc[0]) if len(value_counts) > 0 else 0,
            "most_common_percentage": float(value_counts.iloc[0] / len(non_null) * 100) if len(value_counts) > 0 else 0,
            "top_5_values": [{"value": str(k), "count": int(v), "percentage": float(v / len(non_null) * 100)} 
                           for k, v in value_counts.head(5).items()]
        }
    
    @staticmethod
    def get_datetime_stats(series: pd.Series) -> Dict[str, Any]:
        """Statistics for datetime columns"""
        
        non_null = series.dropna()
        
        if len(non_null) == 0:
            return {}
        
        return {
            "min_date": str(non_null.min()),
            "max_date": str(non_null.max()),
            "range_days": int((non_null.max() - non_null.min()).days)
        }
    
    @staticmethod
    def get_correlations(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Find significant correlations between numeric columns"""
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        if len(numeric_cols) < 2:
            return []
        
        corr_matrix = df[numeric_cols].corr()
        correlations = []
        
        for i in range(len(numeric_cols)):
            for j in range(i + 1, len(numeric_cols)):
                corr_value = corr_matrix.iloc[i, j]
                
                if not np.isnan(corr_value) and abs(corr_value) > 0.3:  # Only significant correlations
                    correlations.append({
                        "column1": str(numeric_cols[i]),
                        "column2": str(numeric_cols[j]),
                        "correlation": float(corr_value),
                        "strength": DataProfilingService.correlation_strength(corr_value)
                    })
        
        # Sort by absolute correlation
        correlations.sort(key=lambda x: abs(x["correlation"]), reverse=True)
        
        return correlations[:20]  # Top 20 correlations
    
    @staticmethod
    def correlation_strength(corr: float) -> str:
        """Classify correlation strength"""
        abs_corr = abs(corr)
        if abs_corr >= 0.7:
            return "strong"
        elif abs_corr >= 0.4:
            return "moderate"
        else:
            return "weak"
    
    @staticmethod
    def assess_data_quality(df: pd.DataFrame) -> Dict[str, Any]:
        """Assess overall data quality"""
        
        total_cells = df.shape[0] * df.shape[1]
        missing_cells = df.isnull().sum().sum()
        
        quality_score = 100 - (missing_cells / total_cells * 100)
        
        issues = []
        
        # Check for high missing values
        for col in df.columns:
            missing_pct = df[col].isnull().sum() / len(df) * 100
            if missing_pct > 30:
                issues.append({
                    "severity": "high",
                    "column": str(col),
                    "issue": f"High missing values ({missing_pct:.1f}%)"
                })
            elif missing_pct > 10:
                issues.append({
                    "severity": "medium",
                    "column": str(col),
                    "issue": f"Moderate missing values ({missing_pct:.1f}%)"
                })
        
        # Check for duplicate rows
        dup_pct = df.duplicated().sum() / len(df) * 100
        if dup_pct > 5:
            issues.append({
                "severity": "high",
                "column": "all",
                "issue": f"High duplicate rows ({dup_pct:.1f}%)"
            })
        
        # Check for constant columns
        for col in df.columns:
            if df[col].nunique() == 1:
                issues.append({
                    "severity": "medium",
                    "column": str(col),
                    "issue": "Column has only one unique value"
                })
        
        return {
            "quality_score": float(quality_score),
            "total_issues": len(issues),
            "issues": issues
        }
    
    @staticmethod
    def get_statistical_summary(df: pd.DataFrame) -> Dict[str, Any]:
        """Statistical summary of the dataset"""
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        categorical_cols = df.select_dtypes(include=['object']).columns
        
        return {
            "numeric_columns_count": int(len(numeric_cols)),
            "categorical_columns_count": int(len(categorical_cols)),
            "datetime_columns_count": int(len(df.select_dtypes(include=['datetime64']).columns)),
            "total_missing_values": int(df.isnull().sum().sum()),
            "missing_percentage": float(df.isnull().sum().sum() / (df.shape[0] * df.shape[1]) * 100)
        }
    
    @staticmethod
    def detect_outliers(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect outliers in numeric columns using IQR method"""
        
        outliers = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            non_null = df[col].dropna()
            
            if len(non_null) < 4:
                continue
            
            Q1 = non_null.quantile(0.25)
            Q3 = non_null.quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            outlier_count = ((non_null < lower_bound) | (non_null > upper_bound)).sum()
            
            if outlier_count > 0:
                outliers.append({
                    "column": str(col),
                    "outlier_count": int(outlier_count),
                    "outlier_percentage": float(outlier_count / len(non_null) * 100),
                    "lower_bound": float(lower_bound),
                    "upper_bound": float(upper_bound)
                })
        
        return outliers
    
    @staticmethod
    def generate_recommendations(profile: Dict, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        
        recommendations = []
        
        # Data quality recommendations
        if profile["data_quality"]["quality_score"] < 80:
            recommendations.append({
                "category": "data_quality",
                "priority": "high",
                "title": "Improve Data Quality",
                "description": f"Data quality score is {profile['data_quality']['quality_score']:.1f}%. Consider handling missing values and duplicates."
            })
        
        # Missing values recommendations
        for col_info in profile["columns"]:
            if col_info["missing_percentage"] > 30:
                recommendations.append({
                    "category": "missing_data",
                    "priority": "high",
                    "title": f"High Missing Values in '{col_info['name']}'",
                    "description": f"Column has {col_info['missing_percentage']:.1f}% missing values. Consider imputation or removal."
                })
        
        # Outlier recommendations
        if len(profile["outliers"]) > 0:
            total_outliers = sum(o["outlier_count"] for o in profile["outliers"])
            recommendations.append({
                "category": "outliers",
                "priority": "medium",
                "title": "Outliers Detected",
                "description": f"Found {total_outliers} outliers across {len(profile['outliers'])} columns. Review for data entry errors."
            })
        
        # Correlation recommendations
        strong_corr = [c for c in profile["correlations"] if c["strength"] == "strong"]
        if len(strong_corr) > 0:
            recommendations.append({
                "category": "correlations",
                "priority": "medium",
                "title": "Strong Correlations Found",
                "description": f"Found {len(strong_corr)} strong correlations. Consider feature selection to avoid multicollinearity."
            })
        
        # Sample size recommendations
        if profile["basic_info"]["total_rows"] < 100:
            recommendations.append({
                "category": "sample_size",
                "priority": "high",
                "title": "Small Dataset",
                "description": f"Only {profile['basic_info']['total_rows']} rows. ML models may not be reliable. Collect more data."
            })
        
        return recommendations