# backend/services/ml_service.py
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Tuple
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    confusion_matrix, mean_squared_error, r2_score, mean_absolute_error
)
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.neural_network import MLPClassifier, MLPRegressor
from sklearn.linear_model import LogisticRegression, LinearRegression, Ridge
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.svm import SVC, SVR
import time
import warnings
warnings.filterwarnings('ignore')

# Try to import XGBoost
try:
    from xgboost import XGBClassifier, XGBRegressor
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False
    print("Warning: XGBoost not available. Install with: pip install xgboost")


class MLService:
    """Core machine learning service for data preparation and model training"""
    
    @staticmethod
    def prepare_data(df: pd.DataFrame, target_column: str, problem_type: str) -> Dict[str, Any]:
        """Prepare data for ML training"""
        
        try:
            # Make a copy
            df_clean = df.copy()
            
            # Remove rows with missing target
            df_clean = df_clean.dropna(subset=[target_column])
            
            if len(df_clean) == 0:
                return {
                    "success": False,
                    "error": "No valid data after removing missing target values"
                }
            
            # Separate features and target
            X = df_clean.drop(columns=[target_column])
            y = df_clean[target_column]
            
            # For classification, remove rare classes (classes with < 2 samples)
            target_encoder = None
            if problem_type == 'classification':
                # Count samples per class
                value_counts = y.value_counts()
                
                # Find classes with at least 2 samples
                valid_classes = value_counts[value_counts >= 2].index
                
                if len(valid_classes) < 2:
                    return {
                        "success": False,
                        "error": "Not enough samples for classification. Each class needs at least 2 samples, and you need at least 2 classes."
                    }
                
                # Filter to keep only valid classes
                mask = y.isin(valid_classes)
                X = X[mask]
                y = y[mask]
                
                # Encode target
                if y.dtype == 'object' or y.nunique() < 20:
                    target_encoder = LabelEncoder()
                    y = target_encoder.fit_transform(y.astype(str))
            
            # Handle categorical features
            label_encoders = {}
            for col in X.select_dtypes(include=['object']).columns:
                le = LabelEncoder()
                X[col] = le.fit_transform(X[col].astype(str))
                label_encoders[col] = le
            
            # Handle missing values in features
            X = X.fillna(X.mean(numeric_only=True))
            
            # Remove constant columns (zero variance)
            variance = X.var()
            constant_cols = variance[variance == 0].index.tolist()
            if constant_cols:
                print(f"Removing {len(constant_cols)} constant columns: {constant_cols}")
                X = X.drop(columns=constant_cols)
            
            # Check minimum samples
            if len(X) < 10:
                return {
                    "success": False,
                    "error": f"Not enough samples for training. Found {len(X)} samples, need at least 10."
                }
            
            # Split data with appropriate stratification
            test_size = min(0.2, max(0.1, 5 / len(X)))  # Adaptive test size
            
            try:
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, 
                    test_size=test_size, 
                    random_state=42, 
                    stratify=y if problem_type == 'classification' else None
                )
            except ValueError as e:
                # If stratification fails, try without it
                print(f"Stratification failed: {e}, using random split")
                X_train, X_test, y_train, y_test = train_test_split(
                    X, y, 
                    test_size=test_size, 
                    random_state=42, 
                    stratify=None
                )
            
            # Scale features
            scaler = StandardScaler()
            X_train_scaled = scaler.fit_transform(X_train)
            X_test_scaled = scaler.transform(X_test)
            
            return {
                "success": True,
                "X_train": X_train_scaled,
                "X_test": X_test_scaled,
                "y_train": y_train,
                "y_test": y_test,
                "feature_names": list(X.columns),
                "target_encoder": target_encoder,
                "scaler": scaler,
                "label_encoders": label_encoders
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Data preparation failed: {str(e)}"
            }
    
    @staticmethod
    def select_best_models(n_samples: int, n_features: int, problem_type: str) -> List[Tuple[str, Any]]:
        """Select optimal models based on dataset characteristics"""
        
        models = []
        
        if problem_type == 'classification':
            # 5 models for classification
            
            # 1. Logistic Regression
            models.append(("Logistic Regression", LogisticRegression(
                max_iter=2000,  # Increased iterations
                random_state=42,
                solver='lbfgs',
                n_jobs=-1
            )))
            
            # 2. Random Forest
            models.append(("Random Forest", RandomForestClassifier(
                n_estimators=100, 
                random_state=42, 
                max_depth=10 if n_samples > 1000 else 5,
                min_samples_split=5,
                min_samples_leaf=2,
                n_jobs=-1
            )))
            
            # 3. Gradient Boosting
            models.append(("Gradient Boosting", GradientBoostingClassifier(
                n_estimators=100,
                random_state=42,
                max_depth=3,
                learning_rate=0.1,
                subsample=0.8
            )))
            
            # 4. XGBoost (if available)
            if XGBOOST_AVAILABLE:
                models.append(("XGBoost", XGBClassifier(
                    random_state=42, 
                    eval_metric='logloss',
                    use_label_encoder=False,
                    max_depth=6 if n_samples > 1000 else 3, 
                    n_estimators=100,
                    learning_rate=0.1,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    verbosity=0,
                    n_jobs=-1
                )))
            
            # 5. Neural Network
            models.append(("Neural Network", MLPClassifier(
                hidden_layer_sizes=(100, 50) if n_features < 50 else (100,),
                max_iter=1000,  # Increased iterations
                random_state=42,
                early_stopping=True,
                validation_fraction=0.2,
                n_iter_no_change=20,  # More patience
                alpha=0.0001,  # L2 regularization
                learning_rate_init=0.001,
                solver='adam'
            )))
        
        else:  # regression
            # 5 models for regression
            
            # 1. Linear Regression
            models.append(("Linear Regression", LinearRegression(n_jobs=-1)))
            
            # 2. Random Forest
            models.append(("Random Forest", RandomForestRegressor(
                n_estimators=100, 
                random_state=42, 
                max_depth=10 if n_samples > 1000 else 5,
                min_samples_split=5,
                min_samples_leaf=2,
                n_jobs=-1
            )))
            
            # 3. Gradient Boosting
            models.append(("Gradient Boosting", GradientBoostingRegressor(
                n_estimators=100,
                random_state=42,
                max_depth=3,
                learning_rate=0.1,
                subsample=0.8
            )))
            
            # 4. XGBoost (if available)
            if XGBOOST_AVAILABLE:
                models.append(("XGBoost", XGBRegressor(
                    random_state=42, 
                    max_depth=6 if n_samples > 1000 else 3, 
                    n_estimators=100,
                    learning_rate=0.1,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    verbosity=0,
                    n_jobs=-1
                )))
            
            # 5. Neural Network
            models.append(("Neural Network", MLPRegressor(
                hidden_layer_sizes=(100, 50) if n_features < 50 else (100,),
                max_iter=1000,  # Increased iterations
                random_state=42,
                early_stopping=True,
                validation_fraction=0.2,
                n_iter_no_change=20,  # More patience
                alpha=0.0001,  # L2 regularization
                learning_rate_init=0.001,
                solver='adam'
            )))
        
        print(f"Selected {len(models)} models for {problem_type}")
        return models
    
    @staticmethod
    def train_single_model(name: str, model: Any, X_train, X_test, y_train, y_test, 
                          feature_names: List[str], problem_type: str) -> Dict[str, Any]:
        """Train a single model and return results"""
        
        try:
            print(f"Training {name}...")
            start_time = time.time()
            
            # Train model
            model.fit(X_train, y_train)
            
            # Predictions
            y_pred = model.predict(X_test)
            
            # Calculate metrics based on problem type
            if problem_type == 'classification':
                test_score = accuracy_score(y_test, y_pred)
                
                # Cross-validation
                unique, counts = np.unique(y_train, return_counts=True)
                min_class_size = counts.min()
                cv_folds = min(5, max(2, min_class_size))
                
                try:
                    cv_scores = cross_val_score(model, X_train, y_train, cv=cv_folds, scoring='accuracy')
                    cv_score = float(cv_scores.mean())
                except Exception as cv_error:
                    print(f"CV failed for {name}: {cv_error}, using test score")
                    cv_score = float(test_score)
                
                # Additional metrics
                try:
                    precision = float(precision_score(y_test, y_pred, average='weighted', zero_division=0))
                    recall = float(recall_score(y_test, y_pred, average='weighted', zero_division=0))
                    f1 = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))
                except:
                    precision = recall = f1 = 0.0
                
                metrics = {
                    "accuracy": float(test_score),
                    "precision": precision,
                    "recall": recall,
                    "f1_score": f1
                }
                
            else:  # regression
                test_score = r2_score(y_test, y_pred)
                mse = mean_squared_error(y_test, y_pred)
                rmse = np.sqrt(mse)
                mae = mean_absolute_error(y_test, y_pred)
                
                # Cross-validation
                cv_folds = min(5, max(2, len(X_train) // 10))
                
                try:
                    cv_scores = cross_val_score(model, X_train, y_train, cv=cv_folds, scoring='r2')
                    cv_score = float(cv_scores.mean())
                except Exception as cv_error:
                    print(f"CV failed for {name}: {cv_error}, using test score")
                    cv_score = float(test_score)
                
                metrics = {
                    "r2_score": float(test_score),
                    "rmse": float(rmse),
                    "mae": float(mae),
                    "mse": float(mse)
                }
            
            training_time = time.time() - start_time
            
            # Feature importance
            feature_importance = None
            try:
                if hasattr(model, 'feature_importances_'):
                    importance = model.feature_importances_
                    feature_importance = [
                        {"feature": feature_names[i], "importance": float(importance[i])}
                        for i in range(len(feature_names))
                    ]
                    feature_importance = sorted(feature_importance, key=lambda x: x['importance'], reverse=True)[:10]
                elif hasattr(model, 'coef_'):
                    importance = np.abs(model.coef_[0] if len(model.coef_.shape) > 1 else model.coef_)
                    feature_importance = [
                        {"feature": feature_names[i], "importance": float(importance[i])}
                        for i in range(len(feature_names))
                    ]
                    feature_importance = sorted(feature_importance, key=lambda x: x['importance'], reverse=True)[:10]
            except Exception as fi_error:
                print(f"Feature importance extraction failed for {name}: {fi_error}")
                feature_importance = None
            
            print(f"✅ {name} completed in {training_time:.2f}s - Score: {test_score:.4f}")
            
            return {
                "model_name": name,
                "model_type": problem_type,
                "test_score": float(test_score),
                "cv_score": cv_score,
                "training_time": float(training_time),
                "feature_importance": feature_importance,
                "metrics": metrics
            }
            
        except Exception as e:
            print(f"❌ {name} FAILED: {str(e)}")
            import traceback
            traceback.print_exc()
            return None

    @staticmethod
    def sanitize_score(score, problem_type: str, *, allow_null: bool = True):
        """
        Sanitize a score for DB storage (must be in [0, 1]).
        If allow_null is True, out-of-range values become None (for cv_score).
        If allow_null is False, out-of-range values become 0.0 (for test_score).
        """
        if score is None:
            return None if allow_null else 0.0
        try:
            value = float(score)
        except (TypeError, ValueError):
            return None if allow_null else 0.0
        if 0.0 <= value <= 1.0:
            return value
        return None if allow_null else 0.0

    @staticmethod
    def train_and_evaluate(df: pd.DataFrame, target_column: str, problem_type: str) -> Dict[str, Any]:
        """
        Full training orchestration: prepare data → select models → train → evaluate.
        Returns a dict with 'results' list, 'best_result', and 'detected_type'.
        Raises ValueError on preparation failures.
        """
        try:
            # 1. Prepare data
            prep = MLService.prepare_data(df, target_column, problem_type)
            if not prep["success"]:
                raise ValueError(prep["error"])

            X_train = prep["X_train"]
            X_test = prep["X_test"]
            y_train = prep["y_train"]
            y_test = prep["y_test"]
            feature_names = prep["feature_names"]

            # 2. Select models
            models = MLService.select_best_models(
                n_samples=len(X_train),
                n_features=X_train.shape[1],
                problem_type=problem_type
            )

            # 3. Train each model
            results = []
            for model_name, model in models:
                result = MLService.train_single_model(
                    model_name, model,
                    X_train, X_test,
                    y_train, y_test,
                    feature_names, problem_type
                )
                if result:
                    result["test_score_db"] = MLService.sanitize_score(
                        result["test_score"], problem_type, allow_null=False
                    )
                    result["cv_score_db"] = MLService.sanitize_score(
                        result["cv_score"], problem_type, allow_null=True
                    )
                    results.append(result)

            best_result = max(results, key=lambda x: x["test_score"]) if results else None

            return {
                "results": results,
                "best_result": best_result,
                "detected_type": problem_type
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"ML Pipeline fatal error: {str(e)}")
            return {
                "results": [],
                "best_result": None,
                "detected_type": problem_type,
                "error": str(e)
            }