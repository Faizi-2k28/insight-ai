
import os
import json
import logging
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv
from schemas.query_dsl import QueryDSL

load_dotenv()

logger = logging.getLogger(__name__)

class LLMService:
    @staticmethod
    def _is_llm_enabled() -> bool:
        """Check if LLM polish is enabled via environment variable."""
        # For Phase 12, we might want a separate flag or reuse/default to allowed if key exists
        # since this is a core feature of the 'Chat with Data' phase.
        # Let's assume if key exists, it's enabled for now, or check a general flag.
        return bool(os.getenv("GEMINI_API_KEY"))

    @staticmethod
    def generate_query_dsl(question: str, schema_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a structured intent object from a natural language question.
        Returns a dictionary with 'intent', 'text_response', and optionally 'dsl' properties.
        """
        api_key = os.getenv("GEMINI_API_KEY")
        
        columns_info = schema_info.get("columns", [])
        column_names = [col['name'] for col in columns_info]
        
        if api_key:
            try:
                genai.configure(api_key=api_key)
                model = genai.GenerativeModel('gemini-2.0-flash')  # 1500 req/day free tier

                # Build rich context for the prompt
                row_count = schema_info.get("row_count", schema_info.get("total_rows", "unknown"))
                num_stats = ""
                cat_samples = ""
                for col in columns_info:
                    if col.get("column_type") == "numeric":
                        stats = col.get("stats", {})
                        if stats:
                            num_stats += f"  {col['name']}: min={stats.get('min','?')}, max={stats.get('max','?')}, mean={stats.get('mean','?'):.2f}\n" if isinstance(stats.get('mean'), float) else f"  {col['name']}: min={stats.get('min','?')}, max={stats.get('max','?')}\n"
                    elif col.get("column_type") == "categorical":
                        samples = col.get("top_values", col.get("sample_values", []))
                        if samples:
                            cat_samples += f"  {col['name']}: {', '.join(str(s) for s in samples[:5])}\n"

                prompt = f"""
You are an intelligent data analyst AI assistant. You can answer conversational questions about the dataset AND perform structured data queries.

Dataset Context:
- Total rows: {row_count}
- Columns: {', '.join(columns)}

Numeric Column Statistics:
{num_stats if num_stats else '  (no numeric columns)'}

Categorical Column Sample Values:
{cat_samples if cat_samples else '  (no categorical columns)'}

Supported Data Operations: select, filter (==, !=, <, >, <=, >=, in, between, like), groupby, aggregations (sum, mean, count, min, max), sort, limit.

User Question: "{question}"

Output Rules:
1. Return ONLY valid JSON.
2. For conversational/analytical questions (e.g., "tell me about the dataset", "summarize", "what does this data contain?", "how many rows?", "what are the columns?"), return:
   {{"intent": "conversational", "text_response": "<your insightful, specific answer using the actual dataset facts above>"}}
3. For specific data retrieval questions (e.g., "top 5 regions by revenue", "average price by category"), return:
   {{"intent": "data_query", "text_response": "<brief description>", "dsl": {{"select": [...], "groupby": [...], "aggregations": [...], "sort": [...], "limit": 10}}}}
4. Only use columns that exist in the schema.
5. For conversational intents, DO NOT include a 'dsl' key.

Return JSON:
"""

                response = model.generate_content(prompt)
                text = response.text.strip()
                
                if text.startswith("```json"):
                    text = text[7:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                
                data = json.loads(text)
                
                # Check for legacy mapping just in case LLM hallucinated
                if "intent" not in data:
                    return {
                        "intent": "data_query",
                        "text_response": "Here is the data visualization based on your query.",
                        "dsl": QueryDSL(**data)
                    }
                
                # If intent exists
                if data["intent"] == "data_query" and "dsl" in data:
                    data["dsl"] = QueryDSL(**data["dsl"])
                
                return data

            except Exception as e:
                err_str = str(e)
                if "429" in err_str or "ResourceExhausted" in err_str or "quota" in err_str.lower():
                    logger.warning("Gemini quota exhausted for query DSL generation.")
                    return {
                        "intent": "conversational",
                        "text_response": "⚠️ The AI assistant has hit its daily request quota. Keyword-based queries still work — try asking: \"top 10 rows\", \"average sales by region\", etc. The quota resets every 24 hours."
                    }
                logger.warning(f"Gemini DSL generation failed: {e}. Falling back to keyword parser.")
        
        # --- Keyword-based fallback (only when Gemini is unavailable) ---
        
        q_lower = question.lower().strip()
        
        # Smart conversational handlers that use schema_info directly
        conversational_triggers = [
            "about", "tell me", "describe", "what is", "what are", "summarize",
            "summary", "overview", "explain", "who", "help", "can you", "dataset",
            "columns", "how many rows", "how many col", "what data", "what kind",
            "recommendation", "suggest", "clean", "improve", "visuali"
        ]
        if any(trigger in q_lower for trigger in conversational_triggers):
            row_count = schema_info.get("row_count", schema_info.get("total_rows", "?"))
            num_cols   = [c for c in columns_info if c.get("column_type") == "numeric"]
            cat_cols   = [c for c in columns_info if c.get("column_type") == "categorical"]
            dt_cols    = [c for c in columns_info if c.get("column_type") == "datetime"]

            # Build a rich summary
            parts = []
            parts.append(f"This dataset contains **{row_count} rows** and **{len(column_names)} columns**.")

            if cat_cols:
                cat_names = ", ".join(c["name"] for c in cat_cols[:5])
                parts.append(f"Categorical columns: {cat_names}.")
            if num_cols:
                num_names = ", ".join(c["name"] for c in num_cols[:5])
                parts.append(f"Numeric columns: {num_names}.")
            if dt_cols:
                dt_names = ", ".join(c["name"] for c in dt_cols[:3])
                parts.append(f"Date/time columns: {dt_names}.")

            # Add a stat highlight for the first numeric column
            if num_cols:
                fc = num_cols[0]
                stats = fc.get("stats", {})
                if stats:
                    fc_min = stats.get("min", "?"); fc_max = stats.get("max", "?"); fc_mean = stats.get("mean", "?")
                    if isinstance(fc_mean, float): fc_mean = f"{fc_mean:.2f}"
                    parts.append(f"For example, **{fc['name']}** ranges from {fc_min} to {fc_max} (avg: {fc_mean}).")

            # Recommendation branch
            if any(t in q_lower for t in ["recommendation", "suggest", "clean", "improve"]):
                tips = []
                for c in columns_info:
                    null_pct = c.get("null_percentage", 0) or 0
                    if null_pct > 5:
                        tips.append(f"• **{c['name']}** has {null_pct:.1f}% missing values — consider imputation or removal.")
                if not tips:
                    tips.append("• No major data quality issues detected. Consider normalizing numeric columns before ML modelling.")
                parts.append("**Recommendations:**\n" + "\n".join(tips))
            else:
                parts.append("You can ask me things like: *\"top 10 sales by region\"*, *\"average profit by category\"*, or *\"show rows where discount > 0.3\"*.")

            return {
                "intent": "conversational",
                "text_response": "\n\n".join(parts)
            }
        
        fallback_dsl = LLMService._keyword_fallback_dsl(question, columns_info, column_names)
        if fallback_dsl:
            return {
                "intent": "data_query",
                "text_response": "Here is the data matching your query.",
                "dsl": fallback_dsl
            }
        return {
            "intent": "conversational",
            "text_response": "I'm not sure how to answer that. Try: *\"tell me about the dataset\"*, *\"top 10 rows by sales\"*, or *\"average profit by region\"*."
        }

    
    @staticmethod
    def _keyword_fallback_dsl(
        question: str, 
        columns_info: List[Dict[str, Any]], 
        column_names: List[str]
    ) -> Optional[QueryDSL]:
        """
        Parse common natural-language query patterns into a QueryDSL
        without needing an LLM. Handles: top/bottom N, show/list all,
        count/sum/average by, filter patterns, etc.
        """
        import re
        
        q = question.lower().strip()
        
        numeric_cols = [c['name'] for c in columns_info if c.get('column_type') == 'numeric']
        categorical_cols = [c['name'] for c in columns_info if c.get('column_type') == 'categorical']
        
        # Helper: find a column name mentioned in the question
        def find_mentioned_columns(text):
            found = []
            text_lower = text.lower()
            # Sort by length descending to match longer names first
            for col in sorted(column_names, key=len, reverse=True):
                if col.lower() in text_lower:
                    found.append(col)
            return found
        
        mentioned = find_mentioned_columns(q)
        
        # Extract a number from the question (for "top 5", "first 10", etc.)
        limit_match = re.search(r'(?:top|first|last|bottom|show|list)\s+(\d+)', q)
        limit = int(limit_match.group(1)) if limit_match else None
        
        try:
            # --- Pattern 1: "top N <column>" or "top N" ---
            if re.search(r'\btop\b|\bhighest\b|\bbest\b|\blargest\b|\bmost\b', q):
                sort_col = mentioned[0] if mentioned and mentioned[0] in numeric_cols else (numeric_cols[0] if numeric_cols else column_names[0])
                return QueryDSL(
                    select=column_names[:5],  # Show first 5 columns
                    sort=[{"column": sort_col, "descending": True}],
                    limit=min(limit or 5, 200)
                )
            
            # --- Pattern 2: "bottom N" / "lowest" ---
            if re.search(r'\bbottom\b|\blowest\b|\bworst\b|\bsmallest\b|\bleast\b', q):
                sort_col = mentioned[0] if mentioned and mentioned[0] in numeric_cols else (numeric_cols[0] if numeric_cols else column_names[0])
                return QueryDSL(
                    select=column_names[:5],
                    sort=[{"column": sort_col, "descending": False}],
                    limit=min(limit or 5, 200)
                )
            
            # --- Pattern 3: "count by <column>" / "how many per <column>" ---
            if re.search(r'\bcount\b.*\bby\b|\bhow many\b.*\bper\b|\bhow many\b.*\bby\b|\bcount\b.*\bper\b|\bcount\b.*\beach\b', q):
                group_col = mentioned[0] if mentioned else (categorical_cols[0] if categorical_cols else column_names[0])
                return QueryDSL(
                    groupby=[group_col],
                    aggregations=[{"column": group_col, "function": "count", "alias": f"count_{group_col}"}],
                    sort=[{"column": f"count_{group_col}", "descending": True}],
                    limit=min(limit or 20, 200)
                )
            
            # --- Pattern 4: "average/mean <col> by <col>" ---
            if re.search(r'\baverage\b|\bmean\b', q):
                agg_col = None
                group_col = None
                for col in mentioned:
                    if col in numeric_cols and not agg_col:
                        agg_col = col
                    elif col in categorical_cols and not group_col:
                        group_col = col
                agg_col = agg_col or (numeric_cols[0] if numeric_cols else column_names[0])
                if group_col:
                    return QueryDSL(
                        groupby=[group_col],
                        aggregations=[{"column": agg_col, "function": "mean", "alias": f"avg_{agg_col}"}],
                        sort=[{"column": f"avg_{agg_col}", "descending": True}],
                        limit=min(limit or 20, 200)
                    )
                else:
                    return QueryDSL(
                        aggregations=[{"column": agg_col, "function": "mean", "alias": f"avg_{agg_col}"}],
                        limit=1
                    )
            
            # --- Pattern 5: "sum <col> by <col>" / "total" ---
            if re.search(r'\bsum\b|\btotal\b', q):
                agg_col = None
                group_col = None
                for col in mentioned:
                    if col in numeric_cols and not agg_col:
                        agg_col = col
                    elif col in categorical_cols and not group_col:
                        group_col = col
                agg_col = agg_col or (numeric_cols[0] if numeric_cols else column_names[0])
                if group_col:
                    return QueryDSL(
                        groupby=[group_col],
                        aggregations=[{"column": agg_col, "function": "sum", "alias": f"total_{agg_col}"}],
                        sort=[{"column": f"total_{agg_col}", "descending": True}],
                        limit=min(limit or 20, 200)
                    )
                else:
                    return QueryDSL(
                        aggregations=[{"column": agg_col, "function": "sum", "alias": f"total_{agg_col}"}],
                        limit=1
                    )
            
            # --- Pattern 6: "show all" / "list all" / "show me" ---
            if re.search(r'\bshow\b|\blist\b|\bdisplay\b|\bgive\b|\bget\b', q):
                select = mentioned[:5] if mentioned else column_names[:5]
                return QueryDSL(
                    select=select,
                    limit=min(limit or 100, 200)
                )
            
            # --- Default: select all columns, sensible limit ---
            return QueryDSL(
                select=column_names[:5],
                limit=min(limit or 10, 200)
            )
        
        except Exception as e:
            logger.error(f"Keyword fallback DSL failed: {e}")
            return None


    @staticmethod
    def polish_chart_insights(charts: List[Dict[str, Any]]) -> Dict[int, Dict[str, Any]]:
        """
        Polishes insights for a list of charts using LLM.
        Returns a dictionary mapping chart index to polished attributes.
        Returns empty dict if disabled or on error.
        """
        if not LLMService._is_llm_enabled():
            return {}

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.warning("ENABLE_LLM_POLISH is true but GEMINI_API_KEY is missing.")
            return {}

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.0-flash')  # 1500 req/day free tier

            # Prepare batch prompt
            chart_summaries = []
            for idx, chart in enumerate(charts):
                summary = {
                    "index": idx,
                    "type": chart.get("type"),
                    "title": chart.get("title"),
                    "x_axis": chart.get("x_column"),
                    "y_axis": chart.get("y_column"),
                    # Only include metadata/stats, NO raw data
                    "deterministic_insights": [i.get("description") for i in chart.get("insights", [])],
                    "recommendations": [r.get("action") for r in chart.get("recommendations", [])]
                }
                chart_summaries.append(summary)

            prompt = f"""
            You are an expert data analyst. Enhance the insights for the following charts.
            Input: {json.dumps(chart_summaries, indent=2)}

            For each chart, provide:
            1. "narrative": A single, polished sentence summarizing the key takeaway.
            2. "actions": A list of up to 3 specific strategic actions (short strings).
            3. "risks": A list of up to 3 potential risks or limitations (short strings).

            Strict Rules:
            - Do NOT hallucinate data not present in the input.
            - Keep descriptions professional and concise.
            - Output MUST be a valid JSON array of objects.
            - Each object format: {{ "index": <int>, "narrative": <str>, "actions": [<str>], "risks": [<str>] }}

            Return ONLY the valid JSON array.
            """

            response = model.generate_content(prompt)
            
            # Robust JSON parsing
            try:
                text = response.text.strip()
                # Clean up any markdown blocks if present
                if text.startswith("```json"):
                    text = text[7:]
                if text.endswith("```"):
                    text = text[:-3]
                text = text.strip()
                
                results = json.loads(text)
            except Exception as e:
                logger.error(f"Failed to parse LLM response: {e}")
                return {}

            # Validate and map results
            polished_map = {}
            if isinstance(results, list):
                for item in results:
                    idx = item.get("index")
                    if idx is not None and isinstance(idx, int) and 0 <= idx < len(charts):
                        polished_map[idx] = {
                            "narrative": str(item.get("narrative", ""))[:500],
                            "actions": [str(x)[:200] for x in item.get("actions", [])][:3],
                            "risks": [str(x)[:200] for x in item.get("risks", [])][:3]
                        }
            
            return polished_map

        except Exception as e:
            logger.error(f"LLM polish failed: {e}")
            return {}
