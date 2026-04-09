"""
Unit test for MLService.train_and_evaluate — bypasses API/DB layer entirely.
"""
import pandas as pd
from services.ml_service import MLService


def test_train_and_evaluate_classification():
    """Verify MLService trains models on a small classification dataset and returns structured results."""
    # Tiny iris-style dataset (30 rows, 3 classes, 2 features)
    data = {
        "f1": [1.0, 1.1, 1.2, 0.9, 1.3, 1.0, 1.1, 1.2, 0.8, 1.4,
               2.0, 2.1, 2.2, 1.9, 2.3, 2.0, 2.1, 2.2, 1.8, 2.4,
               3.0, 3.1, 3.2, 2.9, 3.3, 3.0, 3.1, 3.2, 2.8, 3.4],
        "f2": [5.0, 5.1, 5.2, 4.9, 5.3, 5.0, 5.1, 5.2, 4.8, 5.4,
               6.0, 6.1, 6.2, 5.9, 6.3, 6.0, 6.1, 6.2, 5.8, 6.4,
               7.0, 7.1, 7.2, 6.9, 7.3, 7.0, 7.1, 7.2, 6.8, 7.4],
        "label": ["A"]*10 + ["B"]*10 + ["C"]*10
    }
    df = pd.DataFrame(data)

    result = MLService.train_and_evaluate(df, target_column="label", problem_type="classification")

    assert "results" in result
    assert "best_result" in result
    assert "detected_type" in result
    assert result["detected_type"] == "classification"
    assert len(result["results"]) > 0

    # Each result should have sanitized DB scores
    for r in result["results"]:
        assert "test_score_db" in r
        assert "cv_score_db" in r
        assert r["test_score_db"] is not None
        assert 0.0 <= r["test_score_db"] <= 1.0

    # Best result should exist and have a model name
    assert result["best_result"] is not None
    assert "model_name" in result["best_result"]
