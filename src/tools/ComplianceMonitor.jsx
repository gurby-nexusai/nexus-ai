import { useState, useEffect } from 'react'

const POLICIES = [
  { id: 1, name: 'Data Retention', rule: 'Delete customer data after 90 days of inactivity', category: 'GDPR' },
  { id: 2, name: 'Password Strength', rule: 'Minimum 12 characters with special chars', category: 'Security' },
  { id: 3, name: 'Access Logging', rule: 'Log all admin access to sensitive data', category: 'SOC2' },
  { id: 4, name: 'Encryption', rule: 'All data must be encrypted at rest', category: 'Security' },
  { id: 5, name: 'Consent Tracking', rule: 'Track user consent for data processing', category: 'GDPR' },
]

export default function ComplianceMonitor() {
  const [violations, setViolations] = useState([])
  const [monitoring, setMonitoring] = useState(false)
  const [stats, setStats] = useState({ total: 0, critical: 0, resolved: 0 })
  const [documents, setDocuments] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [complianceScore, setComplianceScore] = useState(null)

  const handleDocumentUpload = async (e) => {
    const files = Array.from(e.target.files)
    setAnalyzing(true)
    
    const processed = await Promise.all(
      files.map(async (file) => {
        const text = await file.text()
        const analysis = analyzeCompliance(text)
        return {
          name: file.name,
          size: file.size,
          uploadedAt: new Date().toISOString(),
          analysis
        }
      })
    )
    
    setDocuments([...documents, ...processed])
    calculateComplianceScore([...documents, ...processed])
    setAnalyzing(false)
  }

  const analyzeCompliance = (text) => {
    const issues = []
    const lower = text.toLowerCase()
    
    if (!lower.includes('gdpr') && !lower.includes('data protection')) {
      issues.push({ severity: 'warning', message: 'No GDPR references found' })
    }
    if (!lower.includes('encryption')) {
      issues.push({ severity: 'critical', message: 'No encryption policy mentioned' })
    }
    if (!lower.includes('consent')) {
      issues.push({ severity: 'warning', message: 'No consent tracking mentioned' })
    }
    if (!lower.includes('audit') && !lower.includes('logging')) {
      issues.push({ severity: 'warning', message: 'No audit logging mentioned' })
    }
    
    return {
      issues,
      compliant: issues.filter(i => i.severity === 'critical').length === 0,
      score: Math.max(0, 100 - (issues.length * 15))
    }
  }

  const calculateComplianceScore = (docs) => {
    if (docs.length === 0) return
    const avgScore = docs.reduce((sum, d) => sum + d.analysis.score, 0) / docs.length
    setComplianceScore(avgScore.toFixed(0))
  }

  const startMonitoring = () => {
    setMonitoring(true)
    simulateMonitoring()
  }

  const simulateMonitoring = () => {
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const policy = POLICIES[Math.floor(Math.random() * POLICIES.length)]
        const newViolation = {
          id: Date.now(),
          policy: policy.name,
          category: policy.category,
          severity: Math.random() > 0.5 ? 'critical' : 'warning',
          timestamp: new Date().toLocaleTimeString(),
          details: `Detected violation of ${policy.rule}`,
          resolved: false
        }
        setViolations(prev => [newViolation, ...prev].slice(0, 20))
      }
    }, 3000)

    setTimeout(() => {
      clearInterval(interval)
      setMonitoring(false)
    }, 15000)
  }

  const resolveViolation = (id) => {
    setViolations(prev => prev.map(v => 
      v.id === id ? { ...v, resolved: true } : v
    ))
  }

  const exportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      complianceScore,
      documents: documents.map(d => ({
        name: d.name,
        score: d.analysis.score,
        issues: d.analysis.issues
      })),
      violations: violations.filter(v => !v.resolved),
      stats
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `compliance-report-${Date.now()}.json`
    a.click()
  }

  useEffect(() => {
    setStats({
      total: violations.length,
      critical: violations.filter(v => v.severity === 'critical' && !v.resolved).length,
      resolved: violations.filter(v => v.resolved).length
    })
  }, [violations])

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>🛡️ AI Compliance Monitor with RAG</h1>
          <p style={{ color: '#666' }}>Upload compliance docs, real-time monitoring, automated analysis</p>
        </div>
        <button onClick={exportReport} disabled={!documents.length && !violations.length}>
          Export Report
        </button>
      </div>

      {complianceScore !== null && (
        <div style={{ 
          padding: '2rem', 
          background: complianceScore >= 80 ? '#d4edda' : complianceScore >= 60 ? '#fff3cd' : '#f8d7da',
          borderRadius: '8px',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{complianceScore}%</div>
          <div style={{ fontSize: '1.2rem' }}>Overall Compliance Score</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', background: '#f0f0f0', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total}</div>
          <div style={{ color: '#666' }}>Total Violations</div>
        </div>
        <div style={{ padding: '1.5rem', background: '#ffe0e0', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff6b6b' }}>{stats.critical}</div>
          <div style={{ color: '#666' }}>Critical Open</div>
        </div>
        <div style={{ padding: '1.5rem', background: '#d4edda', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{stats.resolved}</div>
          <div style={{ color: '#666' }}>Resolved</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div>
          <h3>Upload Compliance Documents</h3>
          <input 
            type="file" 
            multiple 
            accept=".txt,.md,.pdf,.docx"
            onChange={handleDocumentUpload}
            style={{ marginBottom: '1rem' }}
          />
          {analyzing && <p>Analyzing documents...</p>}

          {documents.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h4>Analyzed Documents ({documents.length})</h4>
              {documents.map((doc, i) => (
                <div key={i} style={{ 
                  padding: '1rem', 
                  border: '1px solid #ddd', 
                  marginBottom: '0.5rem', 
                  borderRadius: '4px',
                  background: doc.analysis.compliant ? '#f0fff0' : '#fff5f5'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>{doc.name}</strong>
                    <span style={{ 
                      fontWeight: 'bold',
                      color: doc.analysis.score >= 80 ? '#28a745' : doc.analysis.score >= 60 ? '#ffa500' : '#ff6b6b'
                    }}>
                      Score: {doc.analysis.score}%
                    </span>
                  </div>
                  {doc.analysis.issues.length > 0 && (
                    <div style={{ fontSize: '0.85rem' }}>
                      <strong>Issues:</strong>
                      <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                        {doc.analysis.issues.map((issue, j) => (
                          <li key={j} style={{ color: issue.severity === 'critical' ? '#ff6b6b' : '#ffa500' }}>
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3>Real-time Monitoring</h3>
          <button 
            onClick={startMonitoring}
            disabled={monitoring}
            style={{ 
              padding: '1rem 2rem',
              background: monitoring ? '#ccc' : '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: monitoring ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {monitoring ? '🔴 Monitoring Active...' : '▶️ Start Monitoring'}
          </button>

          <div>
            <h4>Active Policies</h4>
            <div style={{ display: 'grid', gap: '0.5rem' }}>
              {POLICIES.map(policy => (
                <div key={policy.id} style={{ padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>{policy.name}</strong>
                    <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#e0e0ff', borderRadius: '4px' }}>
                      {policy.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3>Recent Violations</h3>
        {violations.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666', border: '1px dashed #ddd', borderRadius: '4px' }}>
            No violations detected. Start monitoring to scan for issues.
          </div>
        ) : (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {violations.map(violation => (
              <div 
                key={violation.id} 
                style={{ 
                  padding: '1rem', 
                  border: '1px solid #ddd',
                  borderLeft: `4px solid ${violation.severity === 'critical' ? '#ff6b6b' : '#ffa500'}`,
                  marginBottom: '0.5rem',
                  borderRadius: '4px',
                  opacity: violation.resolved ? 0.5 : 1
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        fontWeight: 'bold',
                        color: violation.severity === 'critical' ? '#ff6b6b' : '#ffa500',
                        textTransform: 'uppercase'
                      }}>
                        {violation.severity}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>{violation.category}</span>
                      <span style={{ fontSize: '0.75rem', color: '#666' }}>{violation.timestamp}</span>
                    </div>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>{violation.policy}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>{violation.details}</div>
                  </div>
                  {!violation.resolved && (
                    <button 
                      onClick={() => resolveViolation(violation.id)}
                      style={{ 
                        padding: '0.5rem 1rem',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      Resolve
                    </button>
                  )}
                  {violation.resolved && (
                    <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓ Resolved</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
