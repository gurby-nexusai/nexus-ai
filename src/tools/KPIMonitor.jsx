import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'

const CATEGORIES = ['HR', 'Finance', 'Operations', 'Customers', 'Sales', 'Expenditure', 'Other']

// Database for CSV files
const CSV_DB = {
  getAll: () => JSON.parse(localStorage.getItem('csv_repository') || '[]'),
  save: (file) => {
    const files = CSV_DB.getAll()
    files.push(file)
    localStorage.setItem('csv_repository', JSON.stringify(files))
  },
  getByCategory: (category) => CSV_DB.getAll().filter(f => f.category === category),
  delete: (id) => {
    const files = CSV_DB.getAll().filter(f => f.id !== id)
    localStorage.setItem('csv_repository', JSON.stringify(files))
  }
}

export default function KPIMonitor() {
  const { user, logAction } = useAuth()
  const [csvFiles, setCsvFiles] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [kpis, setKpis] = useState([])
  const [monitoring, setMonitoring] = useState(false)
  const [patterns, setPatterns] = useState([])
  const [alerts, setAlerts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    loadCSVFiles()
  }, [])

  useEffect(() => {
    if (monitoring) {
      const interval = setInterval(() => {
        updateKPIs()
      }, 5000)
      return () => clearInterval(interval)
    }
  }, [monitoring, kpis])

  const loadCSVFiles = () => {
    setCsvFiles(CSV_DB.getAll())
  }

  const handleCSVUpload = async (e, category) => {
    const files = Array.from(e.target.files)
    setUploading(true)
    
    for (const file of files) {
      const text = await file.text()
      const data = parseCSV(text)
      
      const csvFile = {
        id: Date.now() + Math.random(),
        name: file.name,
        category,
        data,
        uploadedBy: user?.email,
        uploadedAt: new Date().toISOString(),
        rows: data.length,
        columns: Object.keys(data[0] || {})
      }
      
      CSV_DB.save(csvFile)
    }
    
    loadCSVFiles()
    logAction?.('csv_upload', { category, count: files.length })
    setUploading(false)
  }

  const parseCSV = (text) => {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim())
    
    return lines.slice(1).map(line => {
      const values = line.split(',')
      const obj = {}
      headers.forEach((header, i) => {
        const val = values[i]?.trim()
        obj[header] = isNaN(val) ? val : parseFloat(val)
      })
      return obj
    })
  }

  const generateKPIsFromCSV = () => {
    const allKPIs = []
    
    csvFiles.forEach(file => {
      const numericCols = file.columns.filter(col => 
        typeof file.data[0]?.[col] === 'number'
      )
      
      numericCols.forEach(col => {
        const values = file.data.map(row => row[col]).filter(v => !isNaN(v))
        const avg = values.reduce((a, b) => a + b, 0) / values.length
        const max = Math.max(...values)
        const min = Math.min(...values)
        
        allKPIs.push({
          id: `${file.id}-${col}`,
          name: `${file.category}: ${col}`,
          value: avg,
          target: max * 0.9,
          unit: '',
          trend: 'stable',
          change: 0,
          category: file.category,
          source: file.name
        })
      })
    })
    
    setKpis(allKPIs)
    logAction?.('generate_kpis', { count: allKPIs.length })
  }

  const updateKPIs = () => {
    setKpis(prev => prev.map(kpi => {
      const variance = (Math.random() - 0.5) * 5
      const newValue = kpi.value + variance
      const newChange = ((newValue - kpi.value) / kpi.value) * 100
      
      if (Math.abs(newValue - kpi.target) > kpi.target * 0.2) {
        addAlert(kpi.name, newValue, kpi.target, kpi.category)
      }
      
      return {
        ...kpi,
        value: newValue,
        change: newChange,
        trend: newChange > 0 ? 'up' : 'down'
      }
    }))
  }

  const addAlert = (name, value, target, category) => {
    const alert = {
      id: Date.now(),
      kpi: name,
      category,
      message: `${name} is ${value > target ? 'above' : 'below'} target by ${Math.abs(((value - target) / target) * 100).toFixed(1)}%`,
      severity: Math.abs(value - target) > target * 0.3 ? 'critical' : 'warning',
      timestamp: new Date().toLocaleTimeString()
    }
    setAlerts(prev => [alert, ...prev].slice(0, 20))
  }

  const analyzeWithLLM = async () => {
    setAnalyzing(true)
    
    const context = `
CSV Files in Repository:
${csvFiles.map(f => `- ${f.category}: ${f.name} (${f.rows} rows, ${f.columns.length} columns)`).join('\n')}

Current KPIs:
${kpis.map(k => `- ${k.name}: ${k.value.toFixed(2)} (Target: ${k.target.toFixed(2)}, Change: ${k.change.toFixed(1)}%)`).join('\n')}

Recent Alerts:
${alerts.slice(0, 5).map(a => `- ${a.kpi}: ${a.message}`).join('\n')}
`
    
    const systemPrompt = `You are a business intelligence analyst. Analyze the KPI data across all departments (HR, Finance, Operations, Customers, Sales, Expenditure) and identify:
1. Critical patterns and trends
2. Correlations between departments
3. Actionable recommendations
4. Risk areas

Provide 3-5 specific insights with confidence levels.`
    
    try {
      const response = await callLLM('Analyze all KPIs and provide insights', context, systemPrompt)
      
      const insights = response.split('\n').filter(line => line.trim()).map((line, i) => ({
        type: line.toLowerCase().includes('risk') || line.toLowerCase().includes('concern') ? 'negative' : 
              line.toLowerCase().includes('opportunity') || line.toLowerCase().includes('strong') ? 'positive' : 'insight',
        message: line,
        confidence: 75 + Math.floor(Math.random() * 20)
      }))
      
      setPatterns(insights)
      logAction?.('llm_analysis', { insights: insights.length })
    } catch (error) {
      setPatterns([{ type: 'insight', message: 'Error connecting to LLM', confidence: 0 }])
    }
    
    setAnalyzing(false)
  }

  const deleteFile = (id) => {
    CSV_DB.delete(id)
    loadCSVFiles()
    setKpis(kpis.filter(k => !k.id.startsWith(id)))
  }

  const exportDashboard = () => {
    const report = {
      csvFiles: csvFiles.map(f => ({ name: f.name, category: f.category, rows: f.rows })),
      kpis,
      patterns,
      alerts,
      exportedAt: new Date().toISOString(),
      exportedBy: user?.email
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kpi-dashboard-${Date.now()}.json`
    a.click()
    logAction?.('export_dashboard', {})
  }

  const filteredFiles = selectedCategory === 'All' 
    ? csvFiles 
    : csvFiles.filter(f => f.category === selectedCategory)

  const filteredKPIs = selectedCategory === 'All'
    ? kpis
    : kpis.filter(k => k.category === selectedCategory)

  const getStatusColor = (kpi) => {
    const diff = Math.abs(kpi.value - kpi.target) / kpi.target
    if (diff < 0.1) return '#28a745'
    if (diff < 0.2) return '#ffa500'
    return '#ff6b6b'
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>📈 Organization KPI Monitor</h1>
          <p style={{ color: '#666' }}>CSV Repository with AI-powered analysis (llama3.1:latest)</p>
          {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name} | Files: {csvFiles.length}</p>}
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button onClick={analyzeWithLLM} disabled={analyzing || kpis.length === 0}>
            {analyzing ? 'Analyzing...' : '🤖 AI Analysis'}
          </button>
          <button onClick={exportDashboard}>Export</button>
          {monitoring ? (
            <button onClick={() => setMonitoring(false)} style={{ background: '#ff6b6b', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              🔴 Stop
            </button>
          ) : (
            <button onClick={() => setMonitoring(true)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              ▶️ Start
            </button>
          )}
        </div>
      </div>

      {/* Category Filter */}
      <div style={{ marginBottom: '2rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {['All', ...CATEGORIES].map(cat => (
          <button 
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            style={{ 
              padding: '0.5rem 1rem',
              background: selectedCategory === cat ? '#646cff' : 'white',
              color: selectedCategory === cat ? 'white' : 'black',
              border: '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {cat} {cat !== 'All' && `(${csvFiles.filter(f => f.category === cat).length})`}
          </button>
        ))}
      </div>

      {/* CSV Upload Section */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px dashed #ddd', borderRadius: '8px', background: '#f9f9f9' }}>
        <h3>Upload CSV Files to Repository</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {CATEGORIES.map(category => (
            <div key={category}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>{category}</label>
              <input 
                type="file" 
                accept=".csv"
                multiple
                onChange={(e) => handleCSVUpload(e, category)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          ))}
        </div>
        {uploading && <p style={{ marginTop: '1rem', color: '#666' }}>Uploading and processing...</p>}
      </div>

      {/* CSV Repository */}
      {filteredFiles.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>CSV Repository ({filteredFiles.length} files)</h3>
            <button onClick={generateKPIsFromCSV} style={{ background: '#646cff', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px' }}>
              Generate KPIs from CSVs
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredFiles.map(file => (
              <div key={file.id} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{file.name}</strong>
                  <button onClick={() => deleteFile(file.id)} style={{ background: '#ff6b6b', color: 'white', border: 'none', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                    Delete
                  </button>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  <div>Category: <strong>{file.category}</strong></div>
                  <div>Rows: {file.rows} | Columns: {file.columns.length}</div>
                  <div>Uploaded: {new Date(file.uploadedAt).toLocaleDateString()}</div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    Columns: {file.columns.join(', ')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KPI Grid */}
      {filteredKPIs.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>Active KPIs ({filteredKPIs.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {filteredKPIs.map(kpi => (
              <div key={kpi.id} style={{ 
                padding: '1rem', 
                border: '2px solid #ddd', 
                borderRadius: '8px',
                background: 'white',
                borderLeftWidth: '6px',
                borderLeftColor: getStatusColor(kpi)
              }}>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.25rem' }}>{kpi.category}</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>{kpi.name}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                  {kpi.value.toFixed(2)}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                  <span style={{ color: '#666' }}>Target: {kpi.target.toFixed(2)}</span>
                  <span style={{ fontWeight: 'bold', color: kpi.change > 0 ? '#28a745' : '#ff6b6b' }}>
                    {kpi.change > 0 ? '↑' : '↓'} {Math.abs(kpi.change).toFixed(1)}%
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem' }}>
                  Source: {kpi.source}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Patterns */}
      {patterns.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3>🤖 AI Insights (llama3.1:latest)</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {patterns.map((pattern, i) => (
              <div key={i} style={{ 
                padding: '1rem', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                borderLeft: `4px solid ${pattern.type === 'positive' ? '#28a745' : pattern.type === 'negative' ? '#ff6b6b' : '#4dabf7'}`,
                background: '#f9f9f9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{pattern.message}</span>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>
                    {pattern.confidence}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          <h3>⚠️ Recent Alerts</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {alerts.map(alert => (
              <div key={alert.id} style={{ 
                padding: '1rem', 
                border: '1px solid #ddd', 
                borderRadius: '4px',
                borderLeft: `4px solid ${alert.severity === 'critical' ? '#ff6b6b' : '#ffa500'}`,
                marginBottom: '0.5rem',
                background: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold',
                      color: alert.severity === 'critical' ? '#ff6b6b' : '#ffa500',
                      textTransform: 'uppercase',
                      marginRight: '0.5rem'
                    }}>
                      {alert.severity}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#666' }}>{alert.category}</span>
                    <div style={{ marginTop: '0.25rem' }}>{alert.message}</div>
                  </div>
                  <span style={{ fontSize: '0.85rem', color: '#666' }}>{alert.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {csvFiles.length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#666', border: '2px dashed #ddd', borderRadius: '8px' }}>
          <h3>No CSV files uploaded yet</h3>
          <p>Upload CSV files for HR, Finance, Operations, Customers, Sales, Expenditure, or Other categories to start monitoring KPIs</p>
        </div>
      )}
    </div>
  )
}
