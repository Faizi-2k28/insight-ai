# backend/services/model_selector.py
import pandas as pd
import numpy as np

class ModelSelector:
    def __init__(self, df):
        self.df = df
    
    def detect_target_column(self):
        """
        Intelligently detect the most likely target column
        Works for ANY dataset
        """
        # Strategy 1: Look for common target column names
        common_targets = [
            'target', 'label', 'class', 'category', 'output', 'prediction',
            'price', 'salary', 'revenue', 'sales', 'profit', 'amount',
            'churn', 'fraud', 'default', 'outcome', 'result', 'status',
            'rating', 'score', 'grade', 'rank', 'survived', 'approved'
        ]
        
        # Check for exact matches (case-insensitive)
        for col in self.df.columns:
            if col.lower() in common_targets:
                print(f"✓ Found target by name: {col}")
                return col
        
        # Strategy 2: Find the last column (common ML convention)
        last_col = self.df.columns[-1]
        
        # Strategy 3: Find column with least unique values (likely categorical target)
        # But exclude columns with too many or too few unique values
        candidate_cols = []
        for col in self.df.columns:
            unique_count = self.df[col].nunique()
            total_count = len(self.df)
            unique_ratio = unique_count / total_count
            
            # Good target: 2-20 unique values, or <10% unique ratio for large datasets
            if 2 <= unique_count <= 20 or (unique_ratio < 0.1 and unique_count > 1):
                candidate_cols.append((col, unique_count, unique_ratio))
        
        # Sort by unique count (prefer fewer unique values)
        if candidate_cols:
            candidate_cols.sort(key=lambda x: x[1])
            best_col = candidate_cols[0][0]
            print(f"✓ Detected target by uniqueness: {best_col} ({candidate_cols[0][1]} unique values)")
            return best_col
        
        # Fallback: Use last column
        print(f"⚠ Using last column as target: {last_col}")
        return last_col
    
    def determine_problem_type(self, target_col):
        """
        Automatically determine if classification or regression
        Works for ANY target column
        """
        if target_col not in self.df.columns:
            return 'classification', 'Default'
        
        target_data = self.df[target_col]
        
        # Check data type
        if target_data.dtype == 'object' or target_data.dtype.name == 'category':
            return 'classification', 'Target is categorical/string type'
        
        # For numeric data, check unique values
        unique_count = target_data.nunique()
        total_count = len(target_data)
        unique_ratio = unique_count / total_count
        
        # Classification if:
        # - Few unique values (< 20)
        # - Low unique ratio (< 5% of total)
        # - Integer type with small range
        if unique_count <= 20:
            return 'classification', f'Target has only {unique_count} unique values'
        
        if unique_ratio < 0.05:
            return 'classification', f'Target has low cardinality ({unique_ratio:.2%})'
        
        # Check if integers in a small range
        if target_data.dtype in ['int64', 'int32']:
            value_range = target_data.max() - target_data.min()
            if value_range <= 50:
                return 'classification', 'Integer target with small range'
        
        # Otherwise, it's regression
        return 'regression', 'Target is continuous numeric'
    
    def get_feature_types(self, exclude_target=None):
        """
        Categorize all columns by type
        Returns dict with numeric, categorical, datetime, text columns
        """
        df = self.df.copy()
        if exclude_target:
            df = df.drop(columns=[exclude_target], errors='ignore')
        
        feature_types = {
            'numeric': [],
            'categorical': [],
            'datetime': [],
            'text': [],
            'boolean': [],
            'id': []
        }
        
        for col in df.columns:
            dtype = df[col].dtype
            unique_count = df[col].nunique()
            total_count = len(df[col])
            
            # Detect ID columns (high uniqueness, likely not useful)
            if unique_count == total_count or unique_count / total_count > 0.95:
                feature_types['id'].append(col)
                continue
            
            # Numeric columns
            if dtype in ['int64', 'int32', 'float64', 'float32']:
                # But check if it's actually categorical
                if unique_count <= 10:
                    feature_types['categorical'].append(col)
                else:
                    feature_types['numeric'].append(col)
            
            # Datetime columns
            elif 'datetime' in str(dtype):
                feature_types['datetime'].append(col)
            
            # Object/String columns
            elif dtype == 'object':
                # Check if it's categorical (few unique values)
                if unique_count <= 50:
                    feature_types['categorical'].append(col)
                else:
                    # High cardinality text
                    feature_types['text'].append(col)
            
            # Boolean
            elif dtype == 'bool':
                feature_types['boolean'].append(col)
        
        return feature_types