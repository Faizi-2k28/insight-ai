# backend/services/visualizer.py
import pandas as pd
import numpy as np

class Visualizer:
    def __init__(self, df):
        self.df = df
    
    def create_kpi_cards(self):
        """Generate KPI cards from dataset"""
        kpis = []
        
        # Total Records
        kpis.append({
            'title': 'Total Records',
            'value': str(len(self.df)),
            'icon': '📊'
        })
        
        # Total Features
        kpis.append({
            'title': 'Total Features',
            'value': str(len(self.df.columns)),
            'icon': '🔢'
        })
        
        # Numeric columns - show statistics
        numeric_cols = self.df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            main_col = numeric_cols[0]
            
            # Average
            avg_value = self.df[main_col].mean()
            kpis.append({
                'title': f'Average {main_col}',
                'value': f'{avg_value:.2f}',
                'icon': '📈'
            })
            
            # Min value
            min_value = self.df[main_col].min()
            kpis.append({
                'title': f'Min {main_col}',
                'value': f'{min_value:.2f}',
                'icon': '⬇️'
            })
            
            # Max value
            max_value = self.df[main_col].max()
            kpis.append({
                'title': f'Max {main_col}',
                'value': f'{max_value:.2f}',
                'icon': '⬆️'
            })
        
        # Data Completeness
        missing_pct = (self.df.isnull().sum().sum() / (len(self.df) * len(self.df.columns))) * 100
        kpis.append({
            'title': 'Data Completeness',
            'value': f'{100 - missing_pct:.1f}%',
            'icon': '✅'
        })
        
        return kpis[:6]  # Return max 6 KPIs
    
    def suggest_charts(self):
        """Suggest appropriate charts based on data types"""
        charts = []
        
        numeric_cols = self.df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = self.df.select_dtypes(include=['object', 'category']).columns.tolist()
        
        # Chart 1: Categorical distribution (Bar Chart)
        if categorical_cols and len(self.df[categorical_cols[0]].unique()) <= 10:
            charts.append({
                'type': 'bar',
                'title': f'{categorical_cols[0]} Distribution',
                'x': categorical_cols[0],
                'y': 'count'
            })
        
        # Chart 2: Categorical breakdown (Pie Chart)
        if categorical_cols and len(self.df[categorical_cols[0]].unique()) <= 6:
            charts.append({
                'type': 'pie',
                'title': f'{categorical_cols[0]} Breakdown',
                'column': categorical_cols[0]
            })
        
        # Chart 3: Numeric trend (Line Chart)
        if len(numeric_cols) >= 1:
            charts.append({
                'type': 'line',
                'title': f'{numeric_cols[0]} Trend',
                'x': 'index',
                'y': numeric_cols[0]
            })
        
        # Chart 4: Numeric comparison (Bar Chart)
        if categorical_cols and numeric_cols:
            charts.append({
                'type': 'bar',
                'title': f'{numeric_cols[0]} by {categorical_cols[0]}',
                'x': categorical_cols[0],
                'y': numeric_cols[0]
            })
        
        return charts[:4]  # Return max 4 charts
    
    def generate_chart_data(self, chart_config):
        """Generate actual data for a specific chart configuration"""
        chart_type = chart_config['type']
        
        if chart_type == 'bar':
            return self._generate_bar_data(chart_config)
        elif chart_type == 'pie':
            return self._generate_pie_data(chart_config)
        elif chart_type == 'line':
            return self._generate_line_data(chart_config)
        else:
            return []
    
    def _generate_bar_data(self, config):
        """Generate bar chart data from actual dataset"""
        x_col = config['x']
        y_col = config.get('y', 'count')
        
        if y_col == 'count':
            # Count occurrences
            counts = self.df[x_col].value_counts().head(10)
            return [
                {'category': str(idx), 'value': int(val)}
                for idx, val in counts.items()
            ]
        else:
            # Aggregate numeric values
            grouped = self.df.groupby(x_col)[y_col].mean().head(10)
            return [
                {'category': str(idx), 'value': float(val)}
                for idx, val in grouped.items()
            ]
    
    def _generate_pie_data(self, config):
        """Generate pie chart data from actual dataset"""
        column = config.get('column', config.get('x'))
        
        counts = self.df[column].value_counts().head(6)
        return [
            {'name': str(idx), 'value': int(val)}
            for idx, val in counts.items()
        ]
    
    def _generate_line_data(self, config):
        """Generate line chart data from actual dataset"""
        y_col = config['y']
        
        # Use index or first 20 rows
        data = self.df[y_col].head(20)
        return [
            {'index': i, 'value': float(val)}
            for i, val in enumerate(data)
        ]