import { useState } from 'react'
import { useAuth } from '../components/Auth'

const API_URL = 'http://localhost:5002'

export default function SixBoxAnalysis() {
  const { user, logAction } = useAuth()
  const [data, setData] = useState(null)
  const [boxResults, setBoxResults] = useState({})
  const [loading, setLoading] = useState(false)

  const boxes = [
    { id: 'descriptive', name: 'Descriptive Statistics', icon: '📊', color: '#4CAF50' },
    { id: 'correlation', name: 'Correlation Analysis', icon: '🔗', color: '#2196F3' },
    { id: 'regression', name: 'Regression Analysis', icon: '📈', color: '#FF9800' },
    { id: 'clustering', name: 'Clustering', icon: '🎯', color: '#9C27B0' },
    { id: 'timeseries', name: 'Time Series', icon: '⏱️', color: '#F44336' },
    { id: 'prediction', name: 'Prediction', icon: '🔮', color: '#00BCD4' }
  ]

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    
    try {
      const res = await fetch(`${API_URL}/api/sixbox/upload`, {
        method: 'POST',
        body: formData
      })
      const result = await res.json()
      if (result.success) {
        setData(result.data)
        logAction?.('sixbox_upload', { filename: file.name })
      }
    } catch (error) {
      alert('Backend not available')
    }
    setLoading(false)
  }

  const runBox = async (boxId) => {
    if (!data) return
    
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/sixbox/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data_id: data.id, box_type: boxId })
      })
      const result = await res.json()
      if (result.success) {
        setBoxResults(prev => ({ ...prev, [boxId]: result.results }))
        logAction?.('sixbox_analysis', { box: boxId })
      }
    } catch (error) {
      alert('Analysis failed')
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>📦 6 Boxes Data Analysis</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Comprehensive analysis framework</p>

      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #ddd', borderRadius: '8px', background: '#f9f9f9' }}>
        <input type="file" accept=".csv" onChange={handleUpload} />
        {loading && <p>Processing...</p>}
        {data && <p style={{ color: '#28a745', marginTop: '1rem' }}>✓ Data loaded: {data.rows} rows × {data.columns} columns</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
        {boxes.map(box => (
          <div key={box.id} style={{ border: `3px solid ${box.color}`, borderRadius: '12px', padding: '1.5rem', background: 'white' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{box.icon}</div>
            <h3 style={{ marginBottom: '1rem' }}>{box.name}</h3>
            <button
              onClick={() => runBox(box.id)}
              disabled={!data || loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: data ? box.color : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: data ? 'pointer' : 'not-allowed',
                fontWeight: 'bold'
              }}
            >
              {boxResults[box.id] ? '✓ Analyzed' : 'Analyze'}
            </button>
            {boxResults[box.id] && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f5f5f5', borderRadius: '6px', fontSize: '0.9rem' }}>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(boxResults[box.id], null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
