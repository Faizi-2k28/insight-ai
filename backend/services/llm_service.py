
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
    def generate_query_dsl(question: str, schema_info: Dict[str, Any]) -> Optional[QueryDSL]:
        """
        Generates a valid QueryDSL object from a natural language question.
        Returns None if generation fails.
        """
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("GEMINI_API_KEY missing for query generation.")
            return None

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel('gemini-2.5-flash')

            # Extract relevant schema info
            columns = [
                f"{col['name']} ({col['column_type']})" 
                for col in schema_info.get("columns", [])
            ]
            
            prompt = f"""
            You are a data analyst converting questions into a structured JSON query DSL.
            
            Dataset Schema:
            Columns: {', '.join(columns)}
            
            Supported Operations:
            - Select columns
            - Filter (==, !=, <, >, <=, >=, in, between, like)
            - Group By
            - Aggregations (sum, mean, count, min, max, median)
            - Sort
            - Limit (default 100, max 200)

            User Question: "{question}"

            Output Constraints:
            1. Return ONLY a valid JSON object matching the following structure.
            2. Do NOT use columns that don't exist in the schema.
            3. Infer the best query to answer the question.
            4. If the user asks for a specific number of rows, set the limit accordingly (max 200).

            JSON Structure Example:
            {{
                "select": ["col1", "col2"],
                "filters": [{{"column": "col1", "operator": ">", "value": 10}}],
                "groupby": ["col2"],
                "aggregations": [{{"column": "col3", "function": "sum", "alias": "total_col3"}}],
                "sort": [{{"column": "total_col3", "descending": true}}],
                "limit": 5
            }}

            Return JSON:
            """

            response = model.generate_content(prompt)
            text = response.text.strip()
            
            # Clean markdown
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()
            
            # Parse and Validate
            data = json.loads(text)
            return QueryDSL(**data)

        except Exception as e:
            logger.error(f"DSL generation failed: {e}")
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
            model = genai.GenerativeModel('gemini-2.5-flash')

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
