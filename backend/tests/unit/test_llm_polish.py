
import pytest
from unittest.mock import patch, MagicMock
from services.llm_service import LLMService
import os
import json

@pytest.fixture
def mock_charts():
    return [
        {
            "type": "bar",
            "title": "Sales by Region",
            "x_column": "Region",
            "y_column": "Sales",
            "insights": [{"description": "North region is highest."}],
            "recommendations": [{"action": "Invest in North."}]
        },
        {
            "type": "scatter",
            "title": "Price vs Sales",
            "x_column": "Price",
            "y_column": "Sales",
            "insights": [{"description": "Negative correlation."}],
            "recommendations": [{"action": "Optimize pricing."}]
        }
    ]

def test_polish_disabled_by_default(mock_charts):
    with patch.dict(os.environ, {}, clear=True):
        result = LLMService.polish_chart_insights(mock_charts)
        assert result == {}

def test_polish_disabled_explicitly(mock_charts):
    with patch.dict(os.environ, {"ENABLE_LLM_POLISH": "false"}, clear=True):
        result = LLMService.polish_chart_insights(mock_charts)
        assert result == {}

@patch("google.generativeai.GenerativeModel")
@patch("google.generativeai.configure")
def test_polish_enabled_valid_response(mock_configure, mock_model_cls, mock_charts):
    with patch.dict(os.environ, {"ENABLE_LLM_POLISH": "true", "GEMINI_API_KEY": "fake_key"}, clear=True):
        # Mock Gemini response
        mock_instance = mock_model_cls.return_value
        mock_response = MagicMock()
        
        valid_json = [
            {
                "index": 0, 
                "narrative": "Polished narrative 1", 
                "actions": ["Action A"], 
                "risks": ["Risk A"]
            },
            {
                "index": 1, 
                "narrative": "Polished narrative 2", 
                "actions": ["Action B"], 
                "risks": ["Risk B"]
            }
        ]
        mock_response.text = json.dumps(valid_json)
        mock_instance.generate_content.return_value = mock_response
        
        result = LLMService.polish_chart_insights(mock_charts)
        
        assert len(result) == 2
        assert result[0]["narrative"] == "Polished narrative 1"
        assert result[1]["actions"] == ["Action B"]
        
        # Verify prompt contained deterministic insights
        call_args = mock_instance.generate_content.call_args[0][0]
        assert "North region is highest" in call_args

@patch("google.generativeai.GenerativeModel")
def test_polish_enabled_invalid_json(mock_model_cls, mock_charts):
    with patch.dict(os.environ, {"ENABLE_LLM_POLISH": "true", "GEMINI_API_KEY": "fake_key"}, clear=True):
        mock_instance = mock_model_cls.return_value
        mock_response = MagicMock()
        mock_response.text = "I cannot generate valid JSON for this request."
        mock_instance.generate_content.return_value = mock_response
        
        result = LLMService.polish_chart_insights(mock_charts)
        assert result == {} # Fallback to empty

@patch("google.generativeai.GenerativeModel")
def test_polish_enabled_api_error(mock_model_cls, mock_charts):
    with patch.dict(os.environ, {"ENABLE_LLM_POLISH": "true", "GEMINI_API_KEY": "fake_key"}, clear=True):
        mock_instance = mock_model_cls.return_value
        mock_instance.generate_content.side_effect = Exception("API Timeout")
        
        result = LLMService.polish_chart_insights(mock_charts)
        assert result == {} # Fallback to empty
