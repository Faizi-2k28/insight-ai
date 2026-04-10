
import duckdb
import pandas as pd
import json
from typing import Dict, Any, Tuple, List, Optional
from schemas.query_dsl import QueryDSL

class QueryService:
    
    @staticmethod
    def execute_dsl(dataset_source: Any, dsl: QueryDSL) -> Dict[str, Any]:
        """
        Execute a DSL query against dataset source using DuckDB.
        Source can be a file path string or in-memory records list.
        Returns dictionary with 'columns', 'rows', 'executed_sql'
        """
        # 1. Compile DSL to SQL
        sql, params = QueryService.compile_dsl_to_sql(dsl, table_name="dataset")
        
        # 2. Execute with DuckDB
        try:
            conn = duckdb.connect(database=':memory:')
            
            # Load dataset as view from path or in-memory records.
            if isinstance(dataset_source, str):
                dataset_path = dataset_source
                if dataset_path.endswith('.csv'):
                    conn.execute(f"CREATE OR REPLACE VIEW dataset AS SELECT * FROM read_csv_auto('{dataset_path}')")
                elif dataset_path.endswith('.json'):
                    conn.execute(f"CREATE OR REPLACE VIEW dataset AS SELECT * FROM read_json_auto('{dataset_path}')")
                elif dataset_path.endswith('.parquet'):
                    conn.execute(f"CREATE OR REPLACE VIEW dataset AS SELECT * FROM read_parquet('{dataset_path}')")
                else:
                    conn.execute(f"CREATE OR REPLACE VIEW dataset AS SELECT * FROM read_csv_auto('{dataset_path}')")
            else:
                df = pd.DataFrame(dataset_source if dataset_source is not None else [])
                conn.register("dataset_df", df)
                conn.execute("CREATE OR REPLACE VIEW dataset AS SELECT * FROM dataset_df")

            # Execute query safely with parameters if supported, 
            # but DuckDB python api execute(sql, parameters) is best.
            # However, for dynamic SQL construction, we must be careful.
            # Our compilation logic puts literals in params to avoid injection.
            
            result = conn.execute(sql, params).fetchdf()
            conn.close()
            
            # Convert to dict format
            # Handle NaN/Inf for JSON compliance
            result = result.where(pd.notnull(result), None)
            
            return {
                "columns": list(result.columns),
                "rows": result.to_dict(orient="records"),
                "executed_sql": sql,
                "row_count": len(result)
            }
            
        except Exception as e:
            raise ValueError(f"Query execution failed: {str(e)}")

    @staticmethod
    def compile_dsl_to_sql(dsl: QueryDSL, table_name: str = "dataset") -> Tuple[str, List[Any]]:
        """
        Compiles the Pydantic QueryDSL into a SQL string and parameter list.
        Prevents injection by using parameterized queries for values.
        Validation of column names should happen before this or via DB error.
        """
        select_clause = "*"
        where_clauses = []
        params = []
        group_by = []
        order_by = []
        
        # SELECT / AGGREGATION
        if dsl.aggregations:
            aggs = []
            for agg in dsl.aggregations:
                alias = agg.alias or f"{agg.function}_{agg.column}"
                aggs.append(f"{agg.function}({QueryService._sanitize_identifier(agg.column)}) AS {alias}")
            
            if dsl.groupby:
                for col in dsl.groupby:
                    aggs.insert(0, QueryService._sanitize_identifier(col))
                    group_by.append(QueryService._sanitize_identifier(col))
            
            select_clause = ", ".join(aggs)
        elif dsl.select:
            select_clause = ", ".join([QueryService._sanitize_identifier(col) for col in dsl.select])
            
        # WHERE
        if dsl.filters:
            for f in dsl.filters:
                col = QueryService._sanitize_identifier(f.column)
                if f.operator == "==":
                    where_clauses.append(f"{col} = ?")
                    params.append(f.value)
                elif f.operator == "!=":
                    where_clauses.append(f"{col} != ?")
                    params.append(f.value)
                elif f.operator in [">", "<", ">=", "<="]:
                    where_clauses.append(f"{col} {f.operator} ?")
                    params.append(f.value)
                elif f.operator == "like":
                    where_clauses.append(f"{col} LIKE ?")
                    params.append(f.value)
                elif f.operator == "in":
                    # IN (?) doesn't work easily with list param in all DB drivers
                    # construct placeholders
                    if isinstance(f.value, list) and len(f.value) > 0:
                        placeholders = ", ".join(["?"] * len(f.value))
                        where_clauses.append(f"{col} IN ({placeholders})")
                        params.extend(f.value)
                    else:
                        where_clauses.append("1=0") # Empty list match nothing
                elif f.operator == "between":
                    if isinstance(f.value, list) and len(f.value) == 2:
                        where_clauses.append(f"{col} BETWEEN ? AND ?")
                        params.extend(f.value)
        
        # SORT
        if dsl.sort:
            for s in dsl.sort:
                direction = "DESC" if s.descending else "ASC"
                order_by.append(f"{QueryService._sanitize_identifier(s.column)} {direction}")

        # CONSTRUCT QUERY
        sql = f"SELECT {select_clause} FROM {table_name}"
        
        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)
            
        if group_by:
            sql += " GROUP BY " + ", ".join(group_by)
            
        if order_by:
            sql += " ORDER BY " + ", ".join(order_by)
            
        # LIMIT (Enforce constraint)
        limit = min(dsl.limit, 200)
        sql += f" LIMIT {limit}"
        
        return sql, params

    @staticmethod
    def _sanitize_identifier(identifier: str) -> str:
        """
        Simple sanitization for column names to double-quote them.
        DuckDB handles quoted identifiers standardly.
        """
        # Escape existing quotes
        clean = identifier.replace('"', '""')
        return f'"{clean}"'

    @staticmethod
    def generate_chart_suggestion(columns: List[str], rows: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        """
        Deterministic chart suggestion based on result data types.
        Rules:
        - Line: 1+ Date/Time + 1+ Numeric (Time series)
        - Bar: 1 Categorical + 1+ Numeric (Comparison)
        - Scatter: 2+ Numeric (Correlation)
        - Pie: 1 Categorical (low cardinality < 10) + 1 Numeric (Part-to-whole)
        - Table: Default
        """
        if not rows or not columns:
            return {"type": "table", "reason": "No data"}

        # Infer types from first few rows
        # Simple inference based on values
        sample = rows[:5]
        col_types = {}
        
        import datetime
        
        for col in columns:
            is_numeric = True
            is_date = True
            unique_values = set()
            
            for r in sample:
                val = r.get(col)
                if val is None:
                    continue
                unique_values.add(val)
                
                # Check numeric
                if not (isinstance(val, (int, float)) and not isinstance(val, bool)):
                    is_numeric = False
                
                # Check date (naive check for string dates or datetime objs)
                if not isinstance(val, (datetime.date, datetime.datetime)):
                    # Try parsing if string
                    if isinstance(val, str):
                        try:
                            pd.to_datetime(val)
                        except:
                            is_date = False
                    else:
                        is_date = False

            if is_numeric:
                col_types[col] = "numeric"
            elif is_date:
                col_types[col] = "date"
            else:
                col_types[col] = "categorical"
        
        # Analyze counts
        num_cols = [c for c, t in col_types.items() if t == "numeric"]
        date_cols = [c for c, t in col_types.items() if t == "date"]
        cat_cols = [c for c, t in col_types.items() if t == "categorical"]
        
        # 1. Line Chart (Time Series)
        if len(date_cols) >= 1 and len(num_cols) >= 1:
            return {
                "type": "line",
                "x_axis": date_cols[0],
                "y_axis": num_cols[0],
                "reason": "Time series data detected"
            }

        # 2. Bar Chart (Comparison)
        if len(cat_cols) >= 1 and len(num_cols) >= 1:
            # Check cardinality of first categorical
            # (We only have a sample, but usually good enough for suggestion)
            return {
                "type": "bar",
                "x_axis": cat_cols[0],
                "y_axis": num_cols[0],
                "reason": "Categorical comparison"
            }
            
        # 3. Scatter Plot (Correlation)
        if len(num_cols) >= 2:
            return {
                "type": "scatter",
                "x_axis": num_cols[0],
                "y_axis": num_cols[1],
                "reason": "Correlation between numerical variables"
            }
            
        # Default
        return {"type": "table", "reason": "Best displayed as table"}

    @staticmethod
    def process_question(question: str, records: list, schema_info: dict) -> Dict[str, Any]:
        """
        Full NLP query orchestration: LLM → Route Intent → Execute (if data) → Chart Suggestion.
        Returns a standardized dict with intent, text_response, dsl, generated_sql, etc.
        """
        from services.llm_service import LLMService

        result = {
            "intent": "conversational",
            "text_response": None,
            "dsl": None,
            "generated_sql": None,
            "columns": [],
            "rows": [],
            "row_count": 0,
            "chart_suggestion": None,
            "error": None
        }

        # 1. Generate Intent / DSL via LLM
        parsed = LLMService.generate_query_dsl(question, schema_info)
        if not parsed:
            result["error"] = "Failed to interpret question or LLM unavailable."
            return result
            
        result["intent"] = parsed.get("intent", "conversational")
        result["text_response"] = parsed.get("text_response")
        
        # If it's just a conversation, return immediately!
        if result["intent"] == "conversational":
            return result

        # 2. Execute DSL if data query
        dsl = parsed.get("dsl")
        if not dsl:
            result["error"] = "Data query requested but no valid DSL was generated."
            return result
            
        result["dsl"] = dsl.dict() if hasattr(dsl, "dict") else dsl

        try:
            exec_result = QueryService.execute_dsl(records, dsl)
            result["generated_sql"] = exec_result["executed_sql"]
            result["columns"] = exec_result["columns"]
            result["rows"] = exec_result["rows"]
            result["row_count"] = len(exec_result["rows"])
        except Exception as e:
            result["error"] = str(e)
            return result

        # 3. Chart suggestion
        if result["rows"]:
            result["chart_suggestion"] = QueryService.generate_chart_suggestion(
                result["columns"], result["rows"]
            )

        return result
