"""
Unit test for QueryService business logic — bypasses API/DB layer entirely.
"""
from services.query_service import QueryService


def test_generate_chart_suggestion_bar():
    """Verify chart suggestion picks 'bar' for 1 categorical + 1 numeric column."""
    columns = ["region", "total_sales"]
    rows = [
        {"region": "North", "total_sales": 100},
        {"region": "South", "total_sales": 200},
        {"region": "East", "total_sales": 150},
        {"region": "West", "total_sales": 250},
    ]

    suggestion = QueryService.generate_chart_suggestion(columns, rows)

    assert suggestion is not None
    assert suggestion["type"] == "bar"
    assert suggestion["x_axis"] == "region"
    assert suggestion["y_axis"] == "total_sales"


def test_generate_chart_suggestion_scatter():
    """Verify chart suggestion picks 'scatter' for 2+ numeric columns."""
    columns = ["height", "weight"]
    rows = [
        {"height": 170, "weight": 65},
        {"height": 180, "weight": 80},
        {"height": 160, "weight": 55},
    ]

    suggestion = QueryService.generate_chart_suggestion(columns, rows)

    assert suggestion is not None
    assert suggestion["type"] == "scatter"


def test_generate_chart_suggestion_empty():
    """Verify chart suggestion returns 'table' for empty data."""
    suggestion = QueryService.generate_chart_suggestion([], [])

    assert suggestion is not None
    assert suggestion["type"] == "table"
