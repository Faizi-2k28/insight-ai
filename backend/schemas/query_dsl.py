
from typing import List, Optional, Union, Literal
from pydantic import BaseModel, Field, validator

class QueryFilter(BaseModel):
    column: str
    operator: Literal["==", "!=", ">", "<", ">=", "<=", "in", "between", "like"]
    value: Union[str, int, float, List[Union[str, int, float]]]

class QueryAggregation(BaseModel):
    column: str
    function: Literal["sum", "mean", "count", "min", "max", "median"]
    alias: Optional[str] = None

class QuerySort(BaseModel):
    column: str
    descending: bool = False

class QueryDSL(BaseModel):
    select: Optional[List[str]] = None
    filters: Optional[List[QueryFilter]] = None
    groupby: Optional[List[str]] = None
    aggregations: Optional[List[QueryAggregation]] = None
    sort: Optional[List[QuerySort]] = None
    limit: int = Field(default=100, ge=1, le=200)

    @validator('filters', each_item=True)
    def validate_filter_value(cls, v):
        if v.operator == "between" and (not isinstance(v.value, list) or len(v.value) != 2):
            raise ValueError("Value for 'between' operator must be a list of 2 elements")
        if v.operator == "in" and not isinstance(v.value, list):
            raise ValueError("Value for 'in' operator must be a list")
        return v
