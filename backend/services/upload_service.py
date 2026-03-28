# backend/services/upload_service.py
import pandas as pd
import numpy as np
from typing import Dict, List, Any
import io

class UploadService:
    
    @staticmethod
    def validate_file(filename: str, file_size: int) -> Dict[str, Any]:
        """Validate uploaded file"""
        
        # Check file extension
        allowed_extensions = ['.csv', '.xlsx', '.xls']
        if not any(filename.lower().endswith(ext) for ext in allowed_extensions):
            return {
                "valid": False,
                "error": "Invalid file type. Please upload CSV or Excel files only."
            }
        
        # Check file size (max 50MB)
        max_size = 50 * 1024 * 1024  # 50MB in bytes
        if file_size > max_size:
            return {
                "valid": False,
                "error": f"File too large. Maximum size is 50MB. Your file is {file_size / (1024*1024):.2f}MB"
            }
        
        return {"valid": True, "error": None}
    
    @staticmethod
    async def process_csv(file_content: bytes, filename: str) -> Dict[str, Any]:
        """Process uploaded CSV/Excel file"""
        
        try:
            # Read file based on extension
            if filename.endswith('.csv'):
                df = pd.read_csv(io.BytesIO(file_content))
            else:  # Excel
                df = pd.read_excel(io.BytesIO(file_content))
            
            # Basic validation
            if df.empty:
                return {
                    "success": False,
                    "error": "File is empty. Please upload a file with data."
                }
            
            if len(df.columns) < 2:
                return {
                    "success": False,
                    "error": "File must have at least 2 columns."
                }
            
            # Analyze data
            analysis = UploadService.analyze_dataframe(df)
            
            # Get preview data (first 10 rows) - convert to native Python types
            preview_data = df.head(10).replace({np.nan: None}).to_dict('records')
            
            return {
                "success": True,
                "filename": filename,
                "row_count": int(len(df)),  # Convert to int
                "column_count": int(len(df.columns)),  # Convert to int
                "columns": analysis["columns"],
                "preview_data": preview_data,
                "missing_values": analysis["missing_values"],
                "suggested_target": analysis["suggested_target"],
                "suggested_problem_type": analysis["suggested_problem_type"]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Error processing file: {str(e)}"
            }
    
    @staticmethod
    def analyze_dataframe(df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze dataframe columns and suggest ML settings"""
        
        columns_info = []
        numeric_columns = []
        categorical_columns = []
        
        for col in df.columns:
            col_info = {
                "name": str(col),
                "dtype": str(df[col].dtype),
                "unique_count": int(df[col].nunique()),
                "missing_count": int(df[col].isnull().sum()),
                "missing_percentage": float(df[col].isnull().sum() / len(df) * 100)
            }
            
            # Classify column type
            if pd.api.types.is_numeric_dtype(df[col]):
                col_info["type"] = "numeric"
                numeric_columns.append(str(col))
                
                if not df[col].isnull().all():
                    col_info["min"] = float(df[col].min())
                    col_info["max"] = float(df[col].max())
                    col_info["mean"] = float(df[col].mean())
                else:
                    col_info["min"] = None
                    col_info["max"] = None
                    col_info["mean"] = None
            else:
                col_info["type"] = "categorical"
                categorical_columns.append(str(col))
                col_info["sample_values"] = [str(v) for v in df[col].value_counts().head(5).index.tolist()]
            
            columns_info.append(col_info)
        
        # Suggest target column
        suggested_target = None
        suggested_problem_type = None
        
        if len(df.columns) > 0:
            last_col = df.columns[-1]
            unique_ratio = df[last_col].nunique() / len(df)
            
            suggested_target = str(last_col)
            
            # Suggest problem type
            if pd.api.types.is_numeric_dtype(df[last_col]):
                if unique_ratio < 0.05:
                    suggested_problem_type = "classification"
                else:
                    suggested_problem_type = "regression"
            else:
                suggested_problem_type = "classification"
        
        return {
            "columns": columns_info,
            "missing_values": int(df.isnull().sum().sum()),
            "numeric_columns": numeric_columns,
            "categorical_columns": categorical_columns,
            "suggested_target": suggested_target,
            "suggested_problem_type": suggested_problem_type
        }
    
    @staticmethod
    def store_dataset(df: pd.DataFrame, max_rows: int = 500) -> Dict[str, Any]:
        """Store dataset for visualization (limit rows for performance)"""
        
        # Limit rows for storage
        df_limited = df.head(max_rows)
        
        # Convert to JSON-serializable format (replace NaN with None)
        data = df_limited.replace({np.nan: None}).to_dict('records')
        
        return {
            "data": data,
            "row_count": int(len(df_limited)),
            "column_names": [str(col) for col in df.columns.tolist()]
        }