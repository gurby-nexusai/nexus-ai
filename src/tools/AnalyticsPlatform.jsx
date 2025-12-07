import { useState } from 'react'
import { useAuth } from '../components/Auth'

const API_URL = 'http://localhost:5002'

const SAMPLE_DATASETS = {
  sales: {
    name: 'Sales Data',
    description: 'Monthly sales by region and product',
    data: `Month,Region,Product,Sales,Units
Jan,North,Widget A,15000,120
Jan,South,Widget A,12000,95
Jan,East,Widget B,18000,140
Jan,West,Widget B,16000,125
Feb,North,Widget A,16500,130
Feb,South,Widget A,13500,105
Feb,East,Widget B,19000,145
Feb,West,Widget B,17000,130
Mar,North,Widget A,18000,145
Mar,South,Widget A,14000,110
Mar,East,Widget B,21000,160
Mar,West,Widget B,18500,140`
  },
  employees: {
    name: 'Employee Performance',
    description: 'Employee metrics and satisfaction scores',
    data: `Employee,Department,Salary,YearsExp,Satisfaction,Performance
John,Engineering,85000,5,8,92
Sarah,Marketing,72000,3,7,88
Mike,Sales,68000,4,9,95
Lisa,Engineering,95000,8,6,85
Tom,HR,65000,2,8,90
Emma,Sales,71000,3,9,93
David,Engineering,78000,4,7,87
Anna,Marketing,69000,3,8,89
Chris,Sales,73000,5,9,94
Rachel,HR,67000,3,7,86`
  },
  customers: {
    name: 'Customer Analytics',
    description: 'Customer behavior and purchase patterns',
    data: `CustomerID,Age,Income,PurchaseFreq,AvgSpend,Satisfaction,Churn
C001,34,65000,12,450,8,0
C002,45,85000,8,620,7,0
C003,28,52000,15,380,9,0
C004,52,95000,6,720,6,1
C005,38,72000,10,510,8,0
C006,41,68000,9,480,7,0
C007,29,58000,14,420,9,0
C008,55,105000,5,850,5,1
C009,33,61000,11,460,8,0
C010,47,88000,7,680,6,1`
  }
}

export default function AnalyticsPlatform() {
  const { user, logAction } = useAuth()
  const [data, setData] = useState(null)
  const [description, setDescription] = useState(null)
  const [analysisResults, setAnalysisResults] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [availableAnalyses, setAvailableAnalyses] = useState({})
  const [error, setError] = useState(null)

  const loadSampleData = async (sampleKey) => {
    const sample = SAMPLE_DATASETS[sampleKey]
    setUploading(true)
    
    const blob = new Blob([sample.data], { type: 'text/csv' })
    const file = new File([blob], `${sample.name}.csv`, { type: 'text/csv' })
    
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setDescription(null)
        setAnalysisResults(null)
        logAction?.('sample_data_load', { sample: sampleKey })
      }
    } catch (error) {
      alert('Backend not available. Make sure Python server is running on port 5002')
    }
    
    setUploading(false)
  }

  const handleCSVUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })
      
      const result = await response.json()
      
      if (result.success) {
        setData(result.data)
        setDescription(null)
        setAnalysisResults(null)
        logAction?.('csv_upload', { filename: file.name })
      }
    } catch (error) {
      alert('Backend not available. Make sure Python server is running on port 5002')
    }
    
    setUploading(false)
  }

  const describeData = async () => {
    if (!data) return
    
    setAnalyzing(true)
    try {
      const response = await fetch(`${API_URL}/api/describe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_id: data.id })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setDescription(result.description)
        setAvailableAnalyses(result.available_analyses)
        logAction?.('describe_data', {})
      }
    } catch (error) {
      alert('Error describing data')
    }
    setAnalyzing(false)
  }

  const runAnalysis = async (analysisType) => {
    if (!data || !availableAnalyses[analysisType]) return
    
    setAnalyzing(true)
    setError(null)
    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data_id: data.id,
          analysis_type: analysisType
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setAnalysisResults(prev => ({
          ...prev,
          [analysisType]: result.results
        }))
        logAction?.('run_analysis', { type: analysisType })
      } else {
        setError(`Analysis failed: ${result.error}`)
      }
    } catch (error) {
      setError(`Error running analysis: ${error.message}`)
    }
    setAnalyzing(false)
  }

  const exportResults = () => {
    const report = { data: description, analyses: analysisResults, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${Date.now()}.json`
    a.click()
  }

  const analysisButtons = [
    { key: 'descriptive', label: 'Descriptive Statistics', icon: '📊' },
    { key: 'regression', label: 'Multiple Regression', icon: '📈' },
    { key: 'pls', label: 'PLS Analysis', icon: '🔗' },
    { key: 'sem', label: 'Correlation Matrix', icon: '🔀' },
    { key: 'visualization', label: 'Visualizations', icon: '📉' },
    { key: 'predictive', label: 'Predictive Models', icon: '🔮' }
  ]

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>📊 AI Analytics Platform</h1>
        <p style={{ color: '#666' }}>Smart data analysis with Python backend</p>
        {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}
        {error && (
          <div style={{ padding: '1rem', background: '#f8d7da', color: '#721c24', borderRadius: '4px', marginTop: '1rem' }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Upload Section */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #ddd', borderRadius: '8px', background: '#f9f9f9' }}>
        <h3>Upload CSV Data or Try Sample Datasets</h3>
        
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Upload Your CSV:</label>
          <input 
            type="file" 
            accept=".csv"
            onChange={handleCSVUpload}
          />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Or Load Sample Data:</label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(SAMPLE_DATASETS).map(([key, sample]) => (
              <button
                key={key}
                onClick={() => loadSampleData(key)}
                disabled={uploading}
                style={{
                  padding: '0.75rem 1rem',
                  background: 'white',
                  border: '2px solid #646cff',
                  borderRadius: '4px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  color: '#646cff'
                }}
                title={sample.description}
              >
                📁 {sample.name}
              </button>
            ))}
          </div>
        </div>

        {uploading && <p>Loading data...</p>}
        
        {data && !description && (
          <button
            onClick={describeData}
            disabled={analyzing}
            style={{
              padding: '0.75rem 1.5rem',
              background: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginTop: '1rem'
            }}
          >
            {analyzing ? 'Analyzing...' : '🔍 Describe Data'}
          </button>
        )}
      </div>

      {/* Description Results */}
      {description && (
        <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px solid #646cff', borderRadius: '8px', background: 'white' }}>
          <h3>📋 Data Description</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{description.rows}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Rows</div>
            </div>
            <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{description.columns}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Columns</div>
            </div>
            <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{description.numeric_columns}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Numeric</div>
            </div>
            <div style={{ padding: '1rem', background: '#f0f0f0', borderRadius: '4px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{description.categorical_columns}</div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Categorical</div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Column Types:</strong>
            <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {Object.entries(description.column_types).map(([col, type]) => (
                <span key={col} style={{
                  padding: '0.25rem 0.75rem',
                  background: type.includes('numeric') ? '#d4edda' : '#fff3cd',
                  borderRadius: '12px',
                  fontSize: '0.85rem'
                }}>
                  {col}: {type}
                </span>
              ))}
            </div>
          </div>

          {description.missing_data && Object.keys(description.missing_data).length > 0 && (
            <div style={{ padding: '1rem', background: '#fff3cd', borderRadius: '4px' }}>
              <strong>⚠️ Missing Data:</strong>
              {Object.entries(description.missing_data).map(([col, count]) => (
                <div key={col} style={{ fontSize: '0.9rem' }}>{col}: {count} missing</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analysis Buttons */}
      {description && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>Available Analyses</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {analysisButtons.map(btn => {
              const isAvailable = availableAnalyses[btn.key]
              return (
                <button
                  key={btn.key}
                  onClick={() => runAnalysis(btn.key)}
                  disabled={!isAvailable || analyzing}
                  style={{
                    padding: '1.5rem',
                    background: isAvailable ? '#646cff' : '#e0e0e0',
                    color: isAvailable ? 'white' : '#999',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{btn.icon}</div>
                  {btn.label}
                  {!isAvailable && (
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>
                      Not available for this data
                    </div>
                  )}
                  {analysisResults?.[btn.key] && (
                    <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: '#90EE90' }}>
                      ✓ Completed
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults && Object.keys(analysisResults).length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>📊 Analysis Results</h3>
            <button
              onClick={exportResults}
              style={{
                padding: '0.5rem 1rem',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📥 Export Results
            </button>
          </div>
          
          {Object.entries(analysisResults).map(([type, results]) => (
            <div key={type} style={{ 
              padding: '1.5rem', 
              border: '2px solid #646cff', 
              borderRadius: '8px', 
              background: 'white',
              marginBottom: '1rem'
            }}>
              <h4 style={{ marginTop: 0 }}>
                {analysisButtons.find(b => b.key === type)?.icon} {analysisButtons.find(b => b.key === type)?.label}
              </h4>
              
              {results.summary && (
                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
                  <strong>Summary:</strong>
                  <pre style={{ margin: '0.5rem 0 0 0', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                    {JSON.stringify(results.summary, null, 2)}
                  </pre>
                </div>
              )}
              
              {results.insights && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Key Insights:</strong>
                  <ul style={{ marginTop: '0.5rem' }}>
                    {results.insights.map((insight, i) => (
                      <li key={i} style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {results.visualizations && results.visualizations.length > 0 && (
                <div>
                  <strong>Visualizations:</strong>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                    {results.visualizations.map((viz, i) => (
                      <div key={i} style={{ border: '1px solid #ddd', borderRadius: '4px', padding: '1rem', background: 'white' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>{viz.title}</div>
                        <img src={viz.image} alt={viz.title} style={{ width: '100%', borderRadius: '4px' }} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!data && (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
          <div>Upload a CSV file to begin analysis</div>
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Python backend will automatically detect data types and available analyses
          </div>
        </div>
      )}
    </div>
  )
}
