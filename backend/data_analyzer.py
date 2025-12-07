import pandas as pd
import numpy as np
import json
from typing import Dict, List, Any
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64

class SmartDataAnalyzer:
    """Intelligent data analyzer that automatically detects data types and suggests appropriate analysis"""
    
    def __init__(self, data: pd.DataFrame):
        self.data = data
        self.analysis_results = {}
        self.column_types = self._detect_column_types()
        
    def _detect_column_types(self) -> Dict[str, str]:
        """Automatically detect column types"""
        types = {}
        for col in self.data.columns:
            if pd.api.types.is_numeric_dtype(self.data[col]):
                if self.data[col].nunique() < 10:
                    types[col] = 'categorical_numeric'
                else:
                    types[col] = 'continuous_numeric'
            elif pd.api.types.is_datetime64_any_dtype(self.data[col]):
                types[col] = 'datetime'
            elif self.data[col].nunique() < len(self.data) * 0.5:
                types[col] = 'categorical'
            else:
                types[col] = 'text'
        return types
    
    def analyze(self) -> Dict[str, Any]:
        """Perform comprehensive automatic analysis"""
        results = {
            'summary': self._generate_summary(),
            'column_analysis': self._analyze_columns(),
            'correlations': self._find_correlations(),
            'insights': self._generate_insights(),
            'recommended_visualizations': self._recommend_visualizations(),
            'anomalies': self._detect_anomalies()
        }
        return results
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate dataset summary"""
        return {
            'rows': len(self.data),
            'columns': len(self.data.columns),
            'column_types': self.column_types,
            'missing_values': self.data.isnull().sum().to_dict(),
            'memory_usage': f"{self.data.memory_usage(deep=True).sum() / 1024**2:.2f} MB"
        }
    
    def _analyze_columns(self) -> Dict[str, Dict]:
        """Analyze each column based on its type"""
        analysis = {}
        
        for col, col_type in self.column_types.items():
            if col_type in ['continuous_numeric', 'categorical_numeric']:
                analysis[col] = {
                    'type': col_type,
                    'mean': float(self.data[col].mean()),
                    'median': float(self.data[col].median()),
                    'std': float(self.data[col].std()),
                    'min': float(self.data[col].min()),
                    'max': float(self.data[col].max()),
                    'quartiles': {
                        'q1': float(self.data[col].quantile(0.25)),
                        'q2': float(self.data[col].quantile(0.50)),
                        'q3': float(self.data[col].quantile(0.75))
                    }
                }
            elif col_type == 'categorical':
                value_counts = self.data[col].value_counts()
                analysis[col] = {
                    'type': col_type,
                    'unique_values': int(self.data[col].nunique()),
                    'top_values': value_counts.head(5).to_dict(),
                    'mode': str(self.data[col].mode()[0]) if len(self.data[col].mode()) > 0 else None
                }
            elif col_type == 'datetime':
                analysis[col] = {
                    'type': col_type,
                    'min_date': str(self.data[col].min()),
                    'max_date': str(self.data[col].max()),
                    'date_range_days': (self.data[col].max() - self.data[col].min()).days
                }
                
        return analysis
    
    def _find_correlations(self) -> Dict[str, Any]:
        """Find correlations between numeric columns"""
        numeric_cols = [col for col, t in self.column_types.items() 
                       if t in ['continuous_numeric', 'categorical_numeric']]
        
        if len(numeric_cols) < 2:
            return {'message': 'Not enough numeric columns for correlation analysis'}
        
        corr_matrix = self.data[numeric_cols].corr()
        
        # Find strong correlations
        strong_correlations = []
        for i in range(len(corr_matrix.columns)):
            for j in range(i+1, len(corr_matrix.columns)):
                corr_value = corr_matrix.iloc[i, j]
                if abs(corr_value) > 0.5:
                    strong_correlations.append({
                        'column1': corr_matrix.columns[i],
                        'column2': corr_matrix.columns[j],
                        'correlation': float(corr_value),
                        'strength': 'strong' if abs(corr_value) > 0.7 else 'moderate'
                    })
        
        return {
            'correlation_matrix': corr_matrix.to_dict(),
            'strong_correlations': strong_correlations
        }
    
    def _generate_insights(self) -> List[str]:
        """Generate automatic insights from data"""
        insights = []
        
        # Check for missing data
        missing = self.data.isnull().sum()
        if missing.sum() > 0:
            high_missing = missing[missing > len(self.data) * 0.1]
            if len(high_missing) > 0:
                insights.append(f"⚠️ High missing data in: {', '.join(high_missing.index.tolist())}")
        
        # Check for outliers in numeric columns
        numeric_cols = [col for col, t in self.column_types.items() 
                       if t == 'continuous_numeric']
        for col in numeric_cols:
            q1 = self.data[col].quantile(0.25)
            q3 = self.data[col].quantile(0.75)
            iqr = q3 - q1
            outliers = ((self.data[col] < (q1 - 1.5 * iqr)) | 
                       (self.data[col] > (q3 + 1.5 * iqr))).sum()
            if outliers > 0:
                insights.append(f"📊 {col}: {outliers} potential outliers detected")
        
        # Check for trends in datetime columns
        datetime_cols = [col for col, t in self.column_types.items() if t == 'datetime']
        if datetime_cols and numeric_cols:
            insights.append(f"📈 Time series analysis available for {len(numeric_cols)} metrics")
        
        # Check data distribution
        for col in numeric_cols[:3]:  # Top 3 numeric columns
            skew = self.data[col].skew()
            if abs(skew) > 1:
                insights.append(f"📉 {col}: {'Right' if skew > 0 else 'Left'} skewed distribution")
        
        return insights
    
    def _recommend_visualizations(self) -> List[Dict[str, str]]:
        """Recommend appropriate visualizations"""
        recommendations = []
        
        numeric_cols = [col for col, t in self.column_types.items() 
                       if t in ['continuous_numeric', 'categorical_numeric']]
        categorical_cols = [col for col, t in self.column_types.items() if t == 'categorical']
        datetime_cols = [col for col, t in self.column_types.items() if t == 'datetime']
        
        # Histogram for numeric columns
        if numeric_cols:
            recommendations.append({
                'type': 'histogram',
                'columns': numeric_cols[:3],
                'description': 'Distribution of numeric values'
            })
        
        # Bar chart for categorical
        if categorical_cols:
            recommendations.append({
                'type': 'bar_chart',
                'columns': categorical_cols[:2],
                'description': 'Frequency of categories'
            })
        
        # Scatter plot for correlations
        if len(numeric_cols) >= 2:
            recommendations.append({
                'type': 'scatter_plot',
                'columns': numeric_cols[:2],
                'description': 'Relationship between variables'
            })
        
        # Time series if datetime present
        if datetime_cols and numeric_cols:
            recommendations.append({
                'type': 'line_chart',
                'columns': [datetime_cols[0], numeric_cols[0]],
                'description': 'Trend over time'
            })
        
        # Heatmap for correlations
        if len(numeric_cols) >= 3:
            recommendations.append({
                'type': 'heatmap',
                'columns': numeric_cols,
                'description': 'Correlation matrix'
            })
        
        return recommendations
    
    def _detect_anomalies(self) -> Dict[str, List]:
        """Detect anomalies in numeric columns"""
        anomalies = {}
        
        numeric_cols = [col for col, t in self.column_types.items() 
                       if t == 'continuous_numeric']
        
        for col in numeric_cols:
            # Using IQR method
            q1 = self.data[col].quantile(0.25)
            q3 = self.data[col].quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            
            anomaly_indices = self.data[
                (self.data[col] < lower_bound) | (self.data[col] > upper_bound)
            ].index.tolist()
            
            if anomaly_indices:
                anomalies[col] = {
                    'count': len(anomaly_indices),
                    'percentage': f"{len(anomaly_indices) / len(self.data) * 100:.2f}%",
                    'bounds': {'lower': float(lower_bound), 'upper': float(upper_bound)}
                }
        
        return anomalies
    
    def generate_visualization(self, viz_type: str, columns: List[str]) -> str:
        """Generate visualization and return as base64 encoded image"""
        plt.figure(figsize=(10, 6))
        
        if viz_type == 'histogram':
            for col in columns:
                plt.hist(self.data[col].dropna(), alpha=0.5, label=col, bins=30)
            plt.legend()
            plt.title('Distribution')
            
        elif viz_type == 'bar_chart':
            col = columns[0]
            self.data[col].value_counts().head(10).plot(kind='bar')
            plt.title(f'{col} Frequency')
            
        elif viz_type == 'scatter_plot':
            plt.scatter(self.data[columns[0]], self.data[columns[1]], alpha=0.5)
            plt.xlabel(columns[0])
            plt.ylabel(columns[1])
            plt.title(f'{columns[0]} vs {columns[1]}')
            
        elif viz_type == 'line_chart':
            self.data.plot(x=columns[0], y=columns[1], kind='line')
            plt.title('Trend Over Time')
            
        elif viz_type == 'heatmap':
            corr = self.data[columns].corr()
            sns.heatmap(corr, annot=True, cmap='coolwarm', center=0)
            plt.title('Correlation Heatmap')
        
        # Convert to base64
        buffer = BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight')
        buffer.seek(0)
        image_base64 = base64.b64encode(buffer.read()).decode()
        plt.close()
        
        return f"data:image/png;base64,{image_base64}"


def analyze_csv(file_path: str) -> Dict[str, Any]:
    """Main function to analyze CSV file"""
    try:
        # Read CSV
        df = pd.read_csv(file_path)
        
        # Create analyzer
        analyzer = SmartDataAnalyzer(df)
        
        # Perform analysis
        results = analyzer.analyze()
        
        # Generate recommended visualizations
        visualizations = []
        for rec in results['recommended_visualizations'][:3]:  # Top 3
            viz_data = analyzer.generate_visualization(rec['type'], rec['columns'])
            visualizations.append({
                'type': rec['type'],
                'description': rec['description'],
                'image': viz_data
            })
        
        results['visualizations'] = visualizations
        
        return {
            'success': True,
            'data': results
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        result = analyze_csv(sys.argv[1])
        print(json.dumps(result))
