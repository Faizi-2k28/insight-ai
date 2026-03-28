"""
Universal Data Preprocessor
Handles any CSV/Excel dataset with automatic data cleaning and transformation
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Any
from sklearn.preprocessing import StandardScaler, RobustScaler, LabelEncoder, OrdinalEncoder
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.feature_selection import VarianceThreshold, mutual_info_classif, mutual_info_regression
import logging
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)


class UniversalPreprocessor:
    """Automatically preprocess any dataset for ML"""
    
    def __init__(self, target_column: str, problem_type: str = None):
        self.target_column = target_column
        self.problem_type = problem_type
        self.label_encoders = {}
        self.scaler = None
        self.imputers = {}
        self.dropped_columns = []
        self.feature_names = []
        
    def detect_problem_type(self, df: pd.DataFrame) -> str:
        """Auto-detect classification vs regression"""
        
        if self.problem_type:
            return self.problem_type
            
        target = df[self.target_column]
        unique_count = target.nunique()
        total_count = len(target)
        
        # Rules for detection
        if target.dtype == 'object':
            return 'classification'
        elif unique_count == 2:
            return 'classification'
        elif unique_count < 20:
            return 'classification'
        elif unique_count / total_count < 0.05:
            return 'classification'
        else:
            return 'regression'
    
    def remove_useless_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Remove columns that provide no value for ML"""
        
        to_drop = []
        
        for col in df.columns:
            if col == self.target_column:
                continue
                
            # Drop if only one unique value (constant)
            if df[col].nunique() <= 1:
                to_drop.append(col)
                logger.info("Dropping column %s: only one unique value", col)
                continue
            
            # Drop if all unique (like ID columns)
            if df[col].nunique() == len(df):
                to_drop.append(col)
                logger.info("Dropping column %s: all unique values (likely ID)", col)
                continue
            
            # Drop if >95% missing
            missing_pct = df[col].isnull().sum() / len(df)
            if missing_pct > 0.95:
                to_drop.append(col)
                logger.info("Dropping column %s: %.1f%% missing", col, missing_pct * 100)
                continue
        
        self.dropped_columns = to_drop
        return df.drop(columns=to_drop)
    
    def handle_missing_values(self, df: pd.DataFrame, fit: bool = True) -> pd.DataFrame:
        """Intelligently impute missing values"""
        
        df = df.copy()
        
        for col in df.columns:
            if col == self.target_column:
                continue
            
            missing_count = df[col].isnull().sum()
            if missing_count == 0:
                continue
            
            missing_pct = missing_count / len(df)
            
            if fit:
                # Numeric columns
                if pd.api.types.is_numeric_dtype(df[col]):
                    if missing_pct < 0.1:
                        # Low missing: use median
                        self.imputers[col] = SimpleImputer(strategy='median')
                    else:
                        # High missing: use KNN
                        self.imputers[col] = SimpleImputer(strategy='median')  # Fallback
                
                # Categorical columns
                else:
                    self.imputers[col] = SimpleImputer(strategy='most_frequent')
                
                df[col] = self.imputers[col].fit_transform(df[[col]]).ravel()
            else:
                if col in self.imputers:
                    df[col] = self.imputers[col].transform(df[[col]]).ravel()
        
        return df
    
    def handle_outliers(self, df: pd.DataFrame, method: str = 'clip') -> pd.DataFrame:
        """Handle outliers in numeric columns"""
        
        df = df.copy()
        
        for col in df.select_dtypes(include=[np.number]).columns:
            if col == self.target_column:
                continue
            
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 3 * IQR
            upper_bound = Q3 + 3 * IQR
            
            outliers = ((df[col] < lower_bound) | (df[col] > upper_bound)).sum()
            
            if outliers > 0:
                outlier_pct = outliers / len(df)
                
                if method == 'clip' and outlier_pct < 0.05:
                    # Clip extreme values
                    df[col] = df[col].clip(lower=lower_bound, upper=upper_bound)
                    logger.info("Clipped %s outliers in %s", outliers, col)
        
        return df
    
    def encode_categorical(self, df: pd.DataFrame, fit: bool = True) -> pd.DataFrame:
        """Encode categorical variables"""
        
        df = df.copy()
        
        for col in df.select_dtypes(include=['object', 'category']).columns:
            if col == self.target_column:
                continue
            
            unique_count = df[col].nunique()
            
            if fit:
                # High cardinality: use ordinal encoding
                if unique_count > 10:
                    self.label_encoders[col] = LabelEncoder()
                    df[col] = self.label_encoders[col].fit_transform(df[col].astype(str))
                else:
                    # Low cardinality: label encoding (one-hot would create too many columns)
                    self.label_encoders[col] = LabelEncoder()
                    df[col] = self.label_encoders[col].fit_transform(df[col].astype(str))
            else:
                if col in self.label_encoders:
                    # Handle unseen categories
                    try:
                        df[col] = self.label_encoders[col].transform(df[col].astype(str))
                    except:
                        # If unseen category, replace with most common
                        mode_val = self.label_encoders[col].classes_[0]
                        df[col] = df[col].apply(lambda x: x if x in self.label_encoders[col].classes_ else mode_val)
                        df[col] = self.label_encoders[col].transform(df[col].astype(str))
        
        return df
    
    def scale_features(self, df: pd.DataFrame, fit: bool = True) -> pd.DataFrame:
        """Scale numeric features"""
        
        df = df.copy()
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if self.target_column in numeric_cols:
            numeric_cols.remove(self.target_column)
        
        if len(numeric_cols) == 0:
            return df
        
        if fit:
            # Use RobustScaler (better for outliers)
            self.scaler = RobustScaler()
            df[numeric_cols] = self.scaler.fit_transform(df[numeric_cols])
        else:
            if self.scaler:
                df[numeric_cols] = self.scaler.transform(df[numeric_cols])
        
        return df
    
    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Universal feature engineering that works for any dataset"""
        
        df = df.copy()
        
        # Get numeric columns
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if self.target_column in numeric_cols:
            numeric_cols.remove(self.target_column)
        
        if len(numeric_cols) < 2:
            return df
        
        # 1. Polynomial features for top correlated features
        if self.problem_type == 'regression':
            # Find top 3 correlated features with target
            correlations = {}
            for col in numeric_cols:
                corr = abs(df[col].corr(df[self.target_column]))
                if not np.isnan(corr):
                    correlations[col] = corr
            
            top_features = sorted(correlations.items(), key=lambda x: x[1], reverse=True)[:3]
            
            for col, _ in top_features:
                df[f'{col}_squared'] = df[col] ** 2
                df[f'{col}_log'] = np.log1p(np.abs(df[col]))
        
        # 2. Interaction features (top 2 numeric columns)
        if len(numeric_cols) >= 2:
            # Add interactions for top 2 variance features
            variances = df[numeric_cols].var().sort_values(ascending=False)
            top_2 = variances.head(2).index.tolist()
            
            if len(top_2) == 2:
                df[f'{top_2[0]}_x_{top_2[1]}'] = df[top_2[0]] * df[top_2[1]]
                df[f'{top_2[0]}_div_{top_2[1]}'] = df[top_2[0]] / (df[top_2[1]] + 1e-10)
        
        return df
    
    def remove_low_variance_features(self, df: pd.DataFrame, fit: bool = True) -> pd.DataFrame:
        """Remove features with very low variance"""
        
        if self.target_column in df.columns:
            X = df.drop(columns=[self.target_column])
        else:
            X = df
        
        if fit:
            selector = VarianceThreshold(threshold=0.01)
            selector.fit(X)
            self.feature_mask = selector.get_support()
            self.feature_names = X.columns[self.feature_mask].tolist()
        
        if hasattr(self, 'feature_mask'):
            X_selected = X[self.feature_names]
            if self.target_column in df.columns:
                return pd.concat([X_selected, df[[self.target_column]]], axis=1)
            return X_selected
        
        return df
    
    def fit_transform(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, str]:
        """Complete preprocessing pipeline - fit and transform"""
        logger.info("Universal preprocessing pipeline started")
        
        # Detect problem type
        self.problem_type = self.detect_problem_type(df)
        logger.info("Detected problem type: %s", self.problem_type.upper())
        
        # Remove useless columns
        df = self.remove_useless_columns(df)
        logger.info("Removed %s low-value columns", len(self.dropped_columns))
        
        # Handle missing values
        df = self.handle_missing_values(df, fit=True)
        logger.info("Imputed missing values")
        
        # Handle outliers
        df = self.handle_outliers(df)
        logger.info("Handled outliers")
        
        # Encode categorical
        df = self.encode_categorical(df, fit=True)
        logger.info("Encoded %s categorical columns", len(self.label_encoders))
        
        # Engineer features
        df = self.engineer_features(df)
        logger.info("Engineered features")
        
        # Remove low variance
        df = self.remove_low_variance_features(df, fit=True)
        logger.info("Removed low-variance features")
        
        # Scale features (last step)
        df = self.scale_features(df, fit=True)
        logger.info("Scaled features")
        logger.info("Final preprocessed shape: %s rows x %s columns", df.shape[0], df.shape[1])
        
        return df, self.problem_type
    
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        """Transform new data using fitted preprocessor"""
        
        # Apply same transformations (without fitting)
        df = df.drop(columns=[c for c in self.dropped_columns if c in df.columns], errors='ignore')
        df = self.handle_missing_values(df, fit=False)
        df = self.handle_outliers(df)
        df = self.encode_categorical(df, fit=False)
        df = self.engineer_features(df)
        df = self.remove_low_variance_features(df, fit=False)
        df = self.scale_features(df, fit=False)
        
        return df