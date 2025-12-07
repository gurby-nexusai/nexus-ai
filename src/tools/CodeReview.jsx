import { useState } from 'react'

const RULES = [
  { id: 1, pattern: /console\.log/g, severity: 'warning', message: 'Remove console.log before production' },
  { id: 2, pattern: /var\s+/g, severity: 'error', message: 'Use const or let instead of var' },
  { id: 3, pattern: /==(?!=)/g, severity: 'warning', message: 'Use === instead of ==' },
  { id: 4, pattern: /function\s+\w+\s*\([^)]*\)\s*{[^}]{200,}}/g, severity: 'info', message: 'Function is too long, consider refactoring' },
  { id: 5, pattern: /TODO|FIXME/g, severity: 'info', message: 'Unresolved TODO/FIXME comment' },
]

export default function CodeReview() {
  const [code, setCode] = useState('')
  const [issues, setIssues] = useState([])
  const [stats, setStats] = useState(null)

  const analyzeCode = () => {
    const found = []
    const lines = code.split('\n')

    RULES.forEach(rule => {
      lines.forEach((line, idx) => {
        if (rule.pattern.test(line)) {
          found.push({
            line: idx + 1,
            severity: rule.severity,
            message: rule.message,
            code: line.trim()
          })
        }
      })
    })

    setIssues(found)
    setStats({
      lines: lines.length,
      errors: found.filter(i => i.severity === 'error').length,
      warnings: found.filter(i => i.severity === 'warning').length,
      info: found.filter(i => i.severity === 'info').length
    })
  }

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'error': return '#ff6b6b'
      case 'warning': return '#ffa500'
      case 'info': return '#4dabf7'
      default: return '#666'
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>🔍 AI Code Review</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>Automated code quality checks</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div>
          <h3>Paste Your Code</h3>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste JavaScript code here..."
            style={{ 
              width: '100%', 
              height: '400px', 
              fontFamily: 'monospace', 
              padding: '1rem',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}
          />
          <button 
            onClick={analyzeCode} 
            style={{ 
              marginTop: '1rem', 
              padding: '0.75rem 2rem',
              background: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Analyze Code
          </button>
        </div>

        <div>
          <h3>Analysis Results</h3>
          
          {stats && (
            <div style={{ 
              padding: '1rem', 
              background: '#f9f9f9', 
              borderRadius: '4px', 
              marginBottom: '1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem'
            }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>Lines</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.lines}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>Errors</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff6b6b' }}>{stats.errors}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>Warnings</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffa500' }}>{stats.warnings}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>Info</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4dabf7' }}>{stats.info}</div>
              </div>
            </div>
          )}

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {issues.length === 0 && stats && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                ✅ No issues found!
              </div>
            )}
            {issues.map((issue, i) => (
              <div key={i} style={{ 
                padding: '1rem', 
                border: '1px solid #ddd', 
                borderLeft: `4px solid ${getSeverityColor(issue.severity)}`,
                marginBottom: '0.5rem',
                borderRadius: '4px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold', 
                    color: getSeverityColor(issue.severity),
                    textTransform: 'uppercase'
                  }}>
                    {issue.severity}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#666' }}>Line {issue.line}</span>
                </div>
                <div style={{ marginBottom: '0.5rem' }}>{issue.message}</div>
                <code style={{ 
                  display: 'block', 
                  padding: '0.5rem', 
                  background: '#f5f5f5', 
                  borderRadius: '4px',
                  fontSize: '0.85rem'
                }}>
                  {issue.code}
                </code>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
