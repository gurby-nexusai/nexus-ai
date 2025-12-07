from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cross_decomposition import PLSRegression
import matplotlib
matplotlib.use('Agg')  # Use non-interactive backend
import matplotlib.pyplot as plt
import seaborn as sns
from io import BytesIO
import base64
import uuid

app = Flask(__name__)
CORS(app)

# In-memory storage (use Redis/DB in production)
data_store = {}

def detect_column_types(df):
    """Detect column types"""
    types = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            types[col] = 'numeric'
        elif pd.api.types.is_datetime64_any_dtype(df[col]):
            types[col] = 'datetime'
        else:
            types[col] = 'categorical'
    return types

def check_available_analyses(df, col_types):
    """Determine which analyses are available"""
    numeric_cols = [c for c, t in col_types.items() if t == 'numeric']
    
    return {
        'descriptive': True,  # Always available
        'regression': len(numeric_cols) >= 2,  # Need at least 2 numeric
        'pls': len(numeric_cols) >= 3,  # Need multiple predictors
        'sem': len(numeric_cols) >= 4,  # Need multiple variables
        'visualization': True,  # Always available
        'predictive': len(numeric_cols) >= 2  # Need features and target
    }

def generate_plot_base64(fig):
    """Convert matplotlib figure to base64"""
    buffer = BytesIO()
    fig.savefig(buffer, format='png', bbox_inches='tight', dpi=100)
    buffer.seek(0)
    image_base64 = base64.b64encode(buffer.read()).decode()
    plt.close(fig)
    return f"data:image/png;base64,{image_base64}"

@app.route('/api/upload', methods=['POST'])
def upload_data():
    """Upload and store CSV data"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        df = pd.read_csv(file)
        
        # Generate unique ID
        data_id = str(uuid.uuid4())
        data_store[data_id] = df
        
        return jsonify({
            'success': True,
            'data': {
                'id': data_id,
                'rows': len(df),
                'columns': len(df.columns)
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/describe', methods=['POST'])
def describe_data():
    """Describe uploaded data"""
    try:
        data_id = request.json.get('data_id')
        df = data_store.get(data_id)
        
        if df is None:
            return jsonify({'success': False, 'error': 'Data not found'}), 404
        
        col_types = detect_column_types(df)
        available = check_available_analyses(df, col_types)
        
        # Check missing data
        missing = df.isnull().sum()
        missing_data = {col: int(count) for col, count in missing.items() if count > 0}
        
        return jsonify({
            'success': True,
            'description': {
                'rows': len(df),
                'columns': len(df.columns),
                'numeric_columns': sum(1 for t in col_types.values() if t == 'numeric'),
                'categorical_columns': sum(1 for t in col_types.values() if t == 'categorical'),
                'column_types': col_types,
                'missing_data': missing_data
            },
            'available_analyses': available
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/analyze', methods=['POST'])
def analyze_data():
    """Run specific analysis"""
    try:
        data_id = request.json.get('data_id')
        analysis_type = request.json.get('analysis_type')
        
        print(f"Analyzing: {analysis_type} for data_id: {data_id}")
        
        df = data_store.get(data_id)
        if df is None:
            print(f"Data not found for id: {data_id}")
            return jsonify({'success': False, 'error': 'Data not found'}), 404
        
        print(f"DataFrame shape: {df.shape}")
        
        if analysis_type == 'descriptive':
            results = run_descriptive(df)
        elif analysis_type == 'regression':
            results = run_regression(df)
        elif analysis_type == 'pls':
            results = run_pls(df)
        elif analysis_type == 'sem':
            results = run_sem(df)
        elif analysis_type == 'visualization':
            results = run_visualization(df)
        elif analysis_type == 'predictive':
            results = run_predictive(df)
        else:
            return jsonify({'success': False, 'error': 'Unknown analysis type'}), 400
        
        print(f"Analysis complete: {analysis_type}")
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        print(f"Error in analyze_data: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

def run_descriptive(df):
    """Descriptive statistics"""
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    desc = df[numeric_cols].describe()
    
    return {
        'summary': desc.to_dict(),
        'insights': [
            f"Dataset contains {len(df)} observations",
            f"Average values range from {desc.loc['mean'].min():.2f} to {desc.loc['mean'].max():.2f}",
            f"Standard deviations range from {desc.loc['std'].min():.2f} to {desc.loc['std'].max():.2f}"
        ]
    }

def run_regression(df):
    """Multiple regression analysis"""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if len(numeric_cols) < 2:
        return {'error': 'Need at least 2 numeric columns'}
    
    # Use last column as target
    X = df[numeric_cols[:-1]].dropna()
    y = df[numeric_cols[-1]].dropna()
    
    # Align indices
    common_idx = X.index.intersection(y.index)
    X = X.loc[common_idx]
    y = y.loc[common_idx]
    
    model = LinearRegression()
    model.fit(X, y)
    
    r2 = model.score(X, y)
    
    # Create visualization
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.scatter(y, model.predict(X), alpha=0.5)
    ax.plot([y.min(), y.max()], [y.min(), y.max()], 'r--', lw=2)
    ax.set_xlabel('Actual')
    ax.set_ylabel('Predicted')
    ax.set_title(f'Multiple Regression (R² = {r2:.3f})')
    
    viz = generate_plot_base64(fig)
    
    return {
        'summary': {
            'r_squared': float(r2),
            'coefficients': {col: float(coef) for col, coef in zip(numeric_cols[:-1], model.coef_)},
            'intercept': float(model.intercept_)
        },
        'visualizations': [{'title': 'Regression Fit', 'image': viz}],
        'insights': [
            f"Model explains {r2*100:.1f}% of variance",
            f"Strongest predictor: {numeric_cols[:-1][np.argmax(np.abs(model.coef_))]}"
        ]
    }

def run_pls(df):
    """Partial Least Squares analysis"""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if len(numeric_cols) < 3:
        return {'error': 'Need at least 3 numeric columns'}
    
    X = df[numeric_cols[:-1]].dropna()
    y = df[numeric_cols[-1]].dropna()
    
    common_idx = X.index.intersection(y.index)
    X = X.loc[common_idx]
    y = y.loc[common_idx]
    
    pls = PLSRegression(n_components=min(2, len(numeric_cols)-1))
    pls.fit(X, y)
    
    y_pred = pls.predict(X)
    r2 = 1 - np.sum((y.values.reshape(-1, 1) - y_pred)**2) / np.sum((y.values - y.mean())**2)
    
    # Visualization
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.scatter(y, y_pred, alpha=0.5)
    ax.plot([y.min(), y.max()], [y.min(), y.max()], 'r--', lw=2)
    ax.set_xlabel('Actual')
    ax.set_ylabel('Predicted')
    ax.set_title(f'PLS Regression (R² = {r2:.3f})')
    
    viz = generate_plot_base64(fig)
    
    return {
        'summary': {
            'r_squared': float(r2),
            'n_components': pls.n_components
        },
        'visualizations': [{'title': 'PLS Fit', 'image': viz}],
        'insights': [
            f"PLS model with {pls.n_components} components",
            f"Explains {r2*100:.1f}% of variance"
        ]
    }

def run_sem(df):
    """Correlation Matrix analysis"""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if len(numeric_cols) < 4:
        return {'error': 'Need at least 4 numeric columns'}
    
    # Correlation matrix
    corr = df[numeric_cols].corr()
    
    # Visualization
    fig, ax = plt.subplots(figsize=(10, 8))
    sns.heatmap(corr, annot=True, cmap='coolwarm', center=0, ax=ax)
    ax.set_title('Correlation Matrix')
    
    viz = generate_plot_base64(fig)
    
    # Find strong relationships
    strong_corr = []
    for i in range(len(corr.columns)):
        for j in range(i+1, len(corr.columns)):
            if abs(corr.iloc[i, j]) > 0.5:
                strong_corr.append({
                    'var1': corr.columns[i],
                    'var2': corr.columns[j],
                    'correlation': float(corr.iloc[i, j])
                })
    
    return {
        'summary': {
            'variables': len(numeric_cols),
            'strong_relationships': len(strong_corr)
        },
        'visualizations': [{'title': 'Correlation Heatmap', 'image': viz}],
        'insights': [
            f"Found {len(strong_corr)} strong relationships",
            f"Average correlation: {corr.values[np.triu_indices_from(corr.values, k=1)].mean():.3f}"
        ]
    }

def run_visualization(df):
    """Generate comprehensive visualizations"""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    visualizations = []
    
    # Histograms
    if numeric_cols:
        fig, axes = plt.subplots(1, min(3, len(numeric_cols)), figsize=(15, 4))
        if len(numeric_cols) == 1:
            axes = [axes]
        for i, col in enumerate(numeric_cols[:3]):
            axes[i].hist(df[col].dropna(), bins=30, edgecolor='black')
            axes[i].set_title(f'{col} Distribution')
            axes[i].set_xlabel(col)
            axes[i].set_ylabel('Frequency')
        plt.tight_layout()
        visualizations.append({'title': 'Distributions', 'image': generate_plot_base64(fig)})
    
    # Box plots
    if len(numeric_cols) >= 2:
        fig, ax = plt.subplots(figsize=(12, 6))
        df[numeric_cols[:5]].boxplot(ax=ax)
        ax.set_title('Box Plots')
        ax.set_ylabel('Value')
        plt.xticks(rotation=45)
        visualizations.append({'title': 'Box Plots', 'image': generate_plot_base64(fig)})
    
    return {
        'visualizations': visualizations,
        'insights': [
            f"Generated {len(visualizations)} visualizations",
            f"Analyzed {len(numeric_cols)} numeric variables"
        ]
    }

def run_predictive(df):
    """Predictive modeling"""
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    
    if len(numeric_cols) < 2:
        return {'error': 'Need at least 2 numeric columns'}
    
    X = df[numeric_cols[:-1]].dropna()
    y = df[numeric_cols[-1]].dropna()
    
    common_idx = X.index.intersection(y.index)
    X = X.loc[common_idx]
    y = y.loc[common_idx]
    
    # Train model
    model = LinearRegression()
    model.fit(X, y)
    predictions = model.predict(X)
    
    # Feature importance
    importance = np.abs(model.coef_)
    
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.barh(numeric_cols[:-1], importance)
    ax.set_xlabel('Absolute Coefficient')
    ax.set_title('Feature Importance')
    
    viz = generate_plot_base64(fig)
    
    return {
        'summary': {
            'model': 'Linear Regression',
            'features': len(numeric_cols) - 1,
            'r_squared': float(model.score(X, y))
        },
        'visualizations': [{'title': 'Feature Importance', 'image': viz}],
        'insights': [
            f"Most important feature: {numeric_cols[:-1][np.argmax(importance)]}",
            f"Model accuracy: {model.score(X, y)*100:.1f}%"
        ]
    }

@app.route('/api/sixbox/upload', methods=['POST'])
def sixbox_upload():
    """Upload data for 6 boxes analysis"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file'}), 400
        
        file = request.files['file']
        df = pd.read_csv(file)
        data_id = str(uuid.uuid4())
        data_store[data_id] = df
        
        return jsonify({
            'success': True,
            'data': {'id': data_id, 'rows': len(df), 'columns': len(df.columns)}
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/sixbox/analyze', methods=['POST'])
def sixbox_analyze():
    """Run 6 boxes analysis"""
    try:
        data_id = request.json.get('data_id')
        box_type = request.json.get('box_type')
        
        df = data_store.get(data_id)
        if df is None:
            return jsonify({'success': False, 'error': 'Data not found'}), 404
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if box_type == 'descriptive':
            results = {'stats': df[numeric_cols].describe().to_dict(), 'summary': f'{len(df)} rows analyzed'}
        elif box_type == 'correlation':
            corr = df[numeric_cols].corr()
            results = {'correlation_matrix': corr.to_dict(), 'avg_correlation': float(corr.values[np.triu_indices_from(corr.values, k=1)].mean())}
        elif box_type == 'regression':
            if len(numeric_cols) >= 2:
                X, y = df[numeric_cols[:-1]].dropna(), df[numeric_cols[-1]].dropna()
                common_idx = X.index.intersection(y.index)
                X, y = X.loc[common_idx], y.loc[common_idx]
                model = LinearRegression().fit(X, y)
                results = {'r_squared': float(model.score(X, y)), 'coefficients': {col: float(c) for col, c in zip(numeric_cols[:-1], model.coef_)}}
            else:
                results = {'error': 'Need 2+ numeric columns'}
        elif box_type == 'clustering':
            from sklearn.cluster import KMeans
            if len(numeric_cols) >= 2:
                X = df[numeric_cols].dropna()
                kmeans = KMeans(n_clusters=min(3, len(X)), random_state=42).fit(X)
                results = {'n_clusters': int(kmeans.n_clusters), 'inertia': float(kmeans.inertia_), 'cluster_sizes': [int(sum(kmeans.labels_ == i)) for i in range(kmeans.n_clusters)]}
            else:
                results = {'error': 'Need 2+ numeric columns'}
        elif box_type == 'timeseries':
            if len(numeric_cols) >= 1:
                col = numeric_cols[0]
                values = df[col].dropna()
                results = {'mean': float(values.mean()), 'trend': 'increasing' if values.iloc[-1] > values.iloc[0] else 'decreasing', 'volatility': float(values.std())}
            else:
                results = {'error': 'Need numeric column'}
        elif box_type == 'prediction':
            if len(numeric_cols) >= 2:
                X, y = df[numeric_cols[:-1]].dropna(), df[numeric_cols[-1]].dropna()
                common_idx = X.index.intersection(y.index)
                X, y = X.loc[common_idx], y.loc[common_idx]
                model = LinearRegression().fit(X, y)
                pred = model.predict(X[-5:])
                results = {'predictions': [float(p) for p in pred], 'accuracy': float(model.score(X, y))}
            else:
                results = {'error': 'Need 2+ numeric columns'}
        else:
            return jsonify({'success': False, 'error': 'Unknown box type'}), 400
        
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5002, debug=True)
