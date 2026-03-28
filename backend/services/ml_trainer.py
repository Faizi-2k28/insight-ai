"""
Universal ML Trainer
Automatically trains and optimizes models for any dataset
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
import logging
from sklearn.model_selection import train_test_split, StratifiedKFold, KFold, cross_val_score
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.metrics import (
    accuracy_score, roc_auc_score, f1_score, precision_score, recall_score,
    r2_score, mean_squared_error, mean_absolute_error
)
from imblearn.over_sampling import SMOTE
import time
import warnings
warnings.filterwarnings('ignore')

logger = logging.getLogger(__name__)

# XGBoost (optional)
try:
    from xgboost import XGBClassifier, XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False


class UniversalMLTrainer:
    """Trains ML models with automatic hyperparameter optimization"""
    
    def __init__(self, problem_type: str):
        self.problem_type = problem_type
        self.best_params = {}
    
    def detect_class_imbalance(self, y: pd.Series) -> Tuple[bool, float]:
        """Detect if classification problem has class imbalance"""
        
        if self.problem_type != 'classification':
            return False, 1.0
        
        value_counts = y.value_counts()
        majority_class = value_counts.max()
        minority_class = value_counts.min()
        
        imbalance_ratio = majority_class / minority_class
        
        # Imbalanced if ratio > 2:1
        is_imbalanced = imbalance_ratio > 2
        
        return is_imbalanced, imbalance_ratio
    
    def get_optimized_models(self, X: pd.DataFrame, y: pd.Series) -> List[Tuple[str, Any]]:
        """Get models with optimized hyperparameters for the dataset"""
        
        n_samples = len(X)
        n_features = X.shape[1]
        
        models = []
        
        if self.problem_type == 'classification':
            # Detect class imbalance
            is_imbalanced, ratio = self.detect_class_imbalance(y)
            
            if is_imbalanced:
                logger.info("Class imbalance detected (ratio: %.1f:1)", ratio)
                scale_pos_weight = ratio
                class_weight = 'balanced'
            else:
                scale_pos_weight = 1
                class_weight = None
            
            # 1. Logistic Regression
            models.append(('Logistic Regression', LogisticRegression(
                max_iter=2000,
                class_weight=class_weight,
                solver='lbfgs',
                random_state=42,
                n_jobs=-1
            )))
            
            # 2. Random Forest
            models.append(('Random Forest', RandomForestClassifier(
                n_estimators=200 if n_samples > 500 else 100,
                max_depth=15 if n_samples > 1000 else 10,
                min_samples_split=5,
                min_samples_leaf=2,
                class_weight=class_weight,
                random_state=42,
                n_jobs=-1
            )))
            
            # 3. Gradient Boosting
            models.append(('Gradient Boosting', GradientBoostingClassifier(
                n_estimators=200 if n_samples > 500 else 100,
                learning_rate=0.1 if n_samples > 1000 else 0.05,
                max_depth=5 if n_samples > 1000 else 3,
                subsample=0.8,
                random_state=42
            )))
            
            # 4. XGBoost (if available)
            if XGBOOST_AVAILABLE:
                models.append(('XGBoost', XGBClassifier(
                    n_estimators=200 if n_samples > 500 else 100,
                    learning_rate=0.1 if n_samples > 1000 else 0.05,
                    max_depth=6 if n_samples > 1000 else 4,
                    scale_pos_weight=scale_pos_weight,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    eval_metric='logloss',
                    use_label_encoder=False,
                    random_state=42,
                    verbosity=0,
                    n_jobs=-1
                )))
            
            # 5. Neural Network
            hidden_layer_size = min(100, max(50, n_features * 2))
            models.append(('Neural Network', MLPClassifier(
                hidden_layer_sizes=(hidden_layer_size, hidden_layer_size // 2),
                max_iter=1000,
                early_stopping=True,
                validation_fraction=0.2,
                n_iter_no_change=20,
                random_state=42
            )))
        
        else:  # regression
            # 1. Linear Regression
            if n_features < n_samples:  # Avoid overfitting
                models.append(('Linear Regression', LinearRegression(n_jobs=-1)))
            else:
                models.append(('Ridge Regression', Ridge(alpha=1.0, random_state=42)))
            
            # 2. Random Forest
            models.append(('Random Forest', RandomForestRegressor(
                n_estimators=200 if n_samples > 500 else 100,
                max_depth=15 if n_samples > 1000 else 10,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )))
            
            # 3. Gradient Boosting
            models.append(('Gradient Boosting', GradientBoostingRegressor(
                n_estimators=200 if n_samples > 500 else 100,
                learning_rate=0.1 if n_samples > 1000 else 0.05,
                max_depth=5 if n_samples > 1000 else 3,
                subsample=0.8,
                random_state=42
            )))
            
            # 4. XGBoost (if available)
            if XGBOOST_AVAILABLE:
                models.append(('XGBoost', XGBRegressor(
                    n_estimators=200 if n_samples > 500 else 100,
                    learning_rate=0.1 if n_samples > 1000 else 0.05,
                    max_depth=6 if n_samples > 1000 else 4,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    random_state=42,
                    verbosity=0,
                    n_jobs=-1
                )))
            
            # 5. Neural Network
            hidden_layer_size = min(100, max(50, n_features * 2))
            models.append(('Neural Network', MLPRegressor(
                hidden_layer_sizes=(hidden_layer_size, hidden_layer_size // 2),
                max_iter=1000,
                early_stopping=True,
                validation_fraction=0.2,
                n_iter_no_change=20,
                random_state=42
            )))
        
        return models
    
    def apply_smote_if_needed(self, X_train: np.ndarray, y_train: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Apply SMOTE if class imbalance detected"""
        
        if self.problem_type != 'classification':
            return X_train, y_train
        
        is_imbalanced, ratio = self.detect_class_imbalance(pd.Series(y_train))
        
        if is_imbalanced and ratio > 3:  # Only if severe imbalance
            try:
                logger.info("Applying SMOTE (imbalance ratio: %.1f:1)", ratio)
                smote = SMOTE(random_state=42, k_neighbors=min(5, (y_train == y_train.min()).sum() - 1))
                X_train, y_train = smote.fit_resample(X_train, y_train)
            except Exception as e:
                logger.warning("SMOTE failed: %s. Using original data.", str(e))
        
        return X_train, y_train
    
    def train_single_model(
        self, 
        name: str, 
        model: Any, 
        X_train: np.ndarray, 
        X_test: np.ndarray, 
        y_train: np.ndarray, 
        y_test: np.ndarray,
        feature_names: List[str]
    ) -> Dict[str, Any]:
        """Train and evaluate a single model"""
        
        try:
            logger.info("Training model: %s", name)
            start_time = time.time()
            
            # Apply SMOTE if needed (only for classification)
            X_train_resampled, y_train_resampled = self.apply_smote_if_needed(X_train, y_train)
            
            # Train
            model.fit(X_train_resampled, y_train_resampled)
            
            # Predict
            y_pred = model.predict(X_test)
            
            # Calculate metrics
            if self.problem_type == 'classification':
                test_score = accuracy_score(y_test, y_pred)
                
                # Try to get probabilities for AUC
                try:
                    y_proba = model.predict_proba(X_test)[:, 1]
                    auc = roc_auc_score(y_test, y_proba)
                except:
                    auc = test_score
                
                # Cross-validation
                try:
                    cv = StratifiedKFold(n_splits=min(5, len(np.unique(y_train))), shuffle=True, random_state=42)
                    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='accuracy')
                    cv_score = float(cv_scores.mean())
                except:
                    cv_score = test_score
                
                # Additional metrics
                try:
                    metrics = {
                        'accuracy': float(test_score),
                        'auc_roc': float(auc),
                        'f1_score': float(f1_score(y_test, y_pred, average='weighted')),
                        'precision': float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
                        'recall': float(recall_score(y_test, y_pred, average='weighted'))
                    }
                except:
                    metrics = {'accuracy': float(test_score)}
            
            else:  # regression
                test_score = r2_score(y_test, y_pred)
                
                # Cross-validation
                try:
                    cv = KFold(n_splits=min(5, len(y_train) // 10), shuffle=True, random_state=42)
                    cv_scores = cross_val_score(model, X_train, y_train, cv=cv, scoring='r2')
                    cv_score = float(cv_scores.mean())
                except:
                    cv_score = test_score
                
                # Additional metrics
                try:
                    mse = mean_squared_error(y_test, y_pred)
                    metrics = {
                        'r2_score': float(test_score),
                        'rmse': float(np.sqrt(mse)),
                        'mae': float(mean_absolute_error(y_test, y_pred)),
                        'mse': float(mse)
                    }
                except:
                    metrics = {'r2_score': float(test_score)}
            
            training_time = time.time() - start_time
            
            # Feature importance
            feature_importance = None
            try:
                if hasattr(model, 'feature_importances_'):
                    importance = model.feature_importances_
                    feature_importance = [
                        {"feature": feature_names[i], "importance": float(importance[i])}
                        for i in range(min(len(feature_names), len(importance)))
                    ]
                    feature_importance = sorted(feature_importance, key=lambda x: x['importance'], reverse=True)[:10]
                elif hasattr(model, 'coef_'):
                    coef = model.coef_[0] if len(model.coef_.shape) > 1 else model.coef_
                    importance = np.abs(coef)
                    feature_importance = [
                        {"feature": feature_names[i], "importance": float(importance[i])}
                        for i in range(min(len(feature_names), len(importance)))
                    ]
                    feature_importance = sorted(feature_importance, key=lambda x: x['importance'], reverse=True)[:10]
            except:
                pass
            
            logger.info("Model %s score: %.4f (%.2fs)", name, test_score, training_time)
            
            return {
                "model_name": name,
                "model_type": self.problem_type,
                "test_score": float(test_score),
                "cv_score": float(cv_score),
                "training_time": float(training_time),
                "feature_importance": feature_importance,
                "metrics": metrics
            }
        
        except Exception as e:
            logger.exception("Model training failed for %s: %s", name, str(e))
            import traceback
            traceback.print_exc()
            return None