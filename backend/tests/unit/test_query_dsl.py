
import pytest
from schemas.query_dsl import QueryDSL, QueryFilter, QueryAggregation, QuerySort
from services.query_service import QueryService

def test_dsl_validation_limit():
    # Test default limit
    dsl = QueryDSL()
    assert dsl.limit == 100

    # Test max limit enforcement
    with pytest.raises(ValueError):
        QueryDSL(limit=201)

def test_dsl_validation_operators():
    # Valid filter
    f = QueryFilter(column="age", operator=">", value=30)
    assert f.operator == ">"
    
    # Invalid operator
    with pytest.raises(ValueError):
        QueryFilter(column="age", operator="invalid", value=30)

def test_compile_sql_simple_select():
    dsl = QueryDSL(
        select=["name", "age"],
        limit=10
    )
    sql, params = QueryService.compile_dsl_to_sql(dsl)
    assert 'SELECT "name", "age" FROM dataset' in sql
    assert "LIMIT 10" in sql
    assert len(params) == 0

def test_compile_sql_filter():
    dsl = QueryDSL(
        select=["name"],
        filters=[
            QueryFilter(column="age", operator=">", value=25),
            QueryFilter(column="dept", operator="==", value="Sales")
        ]
    )
    sql, params = QueryService.compile_dsl_to_sql(dsl)
    assert 'WHERE "age" > ? AND "dept" = ?' in sql
    assert params == [25, "Sales"]

def test_compile_sql_aggregation():
    dsl = QueryDSL(
        groupby=["dept"],
        aggregations=[
            QueryAggregation(column="salary", function="mean", alias="avg_salary")
        ]
    )
    sql, params = QueryService.compile_dsl_to_sql(dsl)
    assert 'SELECT "dept", mean("salary") AS avg_salary' in sql
    assert 'GROUP BY "dept"' in sql

def test_compile_sql_in_operator():
    dsl = QueryDSL(
        select=["name"],
        filters=[
            QueryFilter(column="id", operator="in", value=[1, 2, 3])
        ]
    )
    sql, params = QueryService.compile_dsl_to_sql(dsl)
    assert 'IN (?, ?, ?)' in sql
    assert params == [1, 2, 3]

def test_compile_sql_between_operator():
    dsl = QueryDSL(
        select=["name"],
        filters=[
            QueryFilter(column="date", operator="between", value=["2023-01-01", "2023-12-31"])
        ]
    )
    sql, params = QueryService.compile_dsl_to_sql(dsl)
    assert 'BETWEEN ? AND ?' in sql
    assert params == ["2023-01-01", "2023-12-31"]
