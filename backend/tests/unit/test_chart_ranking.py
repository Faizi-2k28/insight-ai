import pytest
import pandas as pd
import os
from services.chart_service import ChartService
from services.data_profiling_service import DataProfilingService

@pytest.fixture
def ranking_df():
    # Load the fixture we just created
    fixture_path = os.path.join(os.path.dirname(__file__), "../fixtures/ranking_dataset.csv")
    return pd.read_csv(fixture_path)

@pytest.fixture
def ranking_profile(ranking_df):
    return DataProfilingService.profile_dataset(ranking_df)

def test_candidate_volume(ranking_df, ranking_profile):
    """Ensure we generate enough candidates before filtering"""
    candidates = ChartService.generate_candidates(ranking_df, ranking_profile)
    # We expect at least 15 candidates given the mix of columns
    # Univariate (7 cols) + Bivariate combinations
    assert len(candidates) >= 15, f"Expected >= 15 candidates, got {len(candidates)}"

def test_determinism(ranking_df, ranking_profile):
    """Ensure scoring and ranking is deterministic"""
    run1 = ChartService.generate_chart_config(ranking_df, ranking_profile)
    run2 = ChartService.generate_chart_config(ranking_df, ranking_profile)
    
    # Extract titles or unique identifiers to compare
    titles1 = [c['title'] for c in run1]
    titles2 = [c['title'] for c in run2]
    
    assert titles1 == titles2
    assert len(run1) == len(run2)

def test_ranking_logic(ranking_df, ranking_profile):
    """Ensure highly correlated variables rank higher than low signal ones"""
    charts = ChartService.generate_chart_config(ranking_df, ranking_profile)
    
    # value_a and value_b are perfectly correlated (10x), so they should be in top results
    scatter_found = False
    for chart in charts:
        if chart['type'] == 'scatter' and \
           (('value_a' in chart['title'] and 'value_b' in chart['title']) or \
            ('value_a' in chart['config'].values() and 'value_b' in chart['config'].values())):
            scatter_found = True
            break
            
    assert scatter_found, "High correlation scatter plot missing from top charts"

def test_diversity_enforcement(ranking_df, ranking_profile):
    """Ensure top charts include different types"""
    charts = ChartService.generate_chart_config(ranking_df, ranking_profile)
    
    types = set(c['type'] for c in charts)
    assert len(types) >= 3, f"Expected >= 3 chart types, got {len(types)}: {types}"
    assert len(charts) <= 7, "Returned more than 7 charts"

def test_insights_structure(ranking_df, ranking_profile):
    """Ensure charts have insights and recommendations"""
    charts = ChartService.generate_chart_config(ranking_df, ranking_profile)
    
    for chart in charts:
        assert 'insights' in chart
        assert 'recommendations' in chart
        assert len(chart['insights']) > 0
        assert len(chart['recommendations']) > 0
