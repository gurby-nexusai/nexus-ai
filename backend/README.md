# Smart Data Analysis Backend

Python backend for intelligent data analysis with automatic visualization.

## Features

- **Automatic Column Type Detection**: Identifies numeric, categorical, datetime, and text columns
- **Smart Analysis**:
  - Statistical summaries
  - Correlation detection
  - Anomaly detection
  - Missing data analysis
  - Distribution analysis
- **Automatic Insights**: Generates human-readable insights
- **Visualization Recommendations**: Suggests appropriate charts
- **Auto-Generated Visualizations**: Creates histograms, scatter plots, heatmaps, etc.

## Setup

```bash
# Install dependencies
pip install -r requirements.txt

# Run the API server
python api_server.py
```

Server runs on `http://localhost:5000`

## API Endpoints

### POST /api/analyze
Upload CSV file for analysis

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body: file (CSV)

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "rows": 1000,
      "columns": 5,
      "column_types": {...},
      "missing_values": {...}
    },
    "column_analysis": {...},
    "correlations": {...},
    "insights": ["...", "..."],
    "recommended_visualizations": [...],
    "anomalies": {...},
    "visualizations": [
      {
        "type": "histogram",
        "description": "Distribution of numeric values",
        "image": "data:image/png;base64,..."
      }
    ]
  }
}
```

### GET /health
Health check endpoint

## Usage Example

```python
from data_analyzer import analyze_csv

result = analyze_csv('data.csv')
print(result['data']['insights'])
```

## Deployment

### Docker
```bash
docker build -t data-analyzer-backend .
docker run -p 5000:5000 data-analyzer-backend
```

### AWS Lambda
Use `lambda_handler.py` for serverless deployment

## Integration with Frontend

Frontend sends CSV to backend:
```javascript
const formData = new FormData()
formData.append('file', file)

const response = await fetch('http://localhost:5000/api/analyze', {
  method: 'POST',
  body: formData
})

const result = await response.json()
```

## Analysis Capabilities

1. **Numeric Columns**: Mean, median, std, quartiles, outliers
2. **Categorical Columns**: Unique values, frequency, mode
3. **Datetime Columns**: Date range, trends
4. **Correlations**: Pearson correlation matrix
5. **Anomalies**: IQR-based outlier detection
6. **Insights**: Automatic pattern detection

## Visualization Types

- Histogram (distribution)
- Bar Chart (categories)
- Scatter Plot (relationships)
- Line Chart (time series)
- Heatmap (correlations)
- Box Plot (outliers)

All visualizations returned as base64-encoded PNG images.
