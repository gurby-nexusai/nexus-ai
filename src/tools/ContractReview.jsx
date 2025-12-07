import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'

const CONTRACT_DB = {
  getAll: () => JSON.parse(localStorage.getItem('contracts') || '[]'),
  save: (contract) => {
    const contracts = CONTRACT_DB.getAll()
    contracts.push(contract)
    localStorage.setItem('contracts', JSON.stringify(contracts))
  },
  update: (id, updates) => {
    const contracts = CONTRACT_DB.getAll()
    const idx = contracts.findIndex(c => c.id === id)
    if (idx !== -1) {
      contracts[idx] = { ...contracts[idx], ...updates }
      localStorage.setItem('contracts', JSON.stringify(contracts))
    }
  },
  delete: (id) => {
    const contracts = CONTRACT_DB.getAll().filter(c => c.id !== id)
    localStorage.setItem('contracts', JSON.stringify(contracts))
  }
}

const TEMPLATE_DB = {
  getAll: () => JSON.parse(localStorage.getItem('contract_templates') || '[]'),
  save: (template) => {
    const templates = TEMPLATE_DB.getAll()
    templates.push(template)
    localStorage.setItem('contract_templates', JSON.stringify(templates))
  },
  delete: (id) => {
    const templates = TEMPLATE_DB.getAll().filter(t => t.id !== id)
    localStorage.setItem('contract_templates', JSON.stringify(templates))
  }
}

export default function ContractReview() {
  const { user, logAction } = useAuth()
  const [contracts, setContracts] = useState([])
  const [templates, setTemplates] = useState([])
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [selectedContract, setSelectedContract] = useState(null)
  const [filter, setFilter] = useState('All')

  const llmProvider = localStorage.getItem('llmProvider') || 'ollama'
  const apiKey = localStorage.getItem('llmApiKey') || ''

  useEffect(() => {
    loadContracts()
    loadTemplates()
  }, [])

  const loadContracts = () => {
    setContracts(CONTRACT_DB.getAll())
  }

  const loadTemplates = () => {
    setTemplates(TEMPLATE_DB.getAll())
  }

  const handleContractUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      const contract = {
        id: Date.now(),
        name: file.name,
        content: event.target.result,
        uploadedBy: user?.name,
        uploadedAt: new Date().toISOString(),
        status: 'Pending Review',
        type: 'Unknown'
      }

      CONTRACT_DB.save(contract)
      loadContracts()
      setUploading(false)
      alert('✓ Contract uploaded. Click "Analyze" to review.')
      logAction?.('upload_contract', { name: file.name })
    }
    reader.readAsText(file)
  }

  const handleTemplateUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const template = {
        id: Date.now(),
        name: file.name,
        content: event.target.result,
        uploadedAt: new Date().toISOString()
      }
      TEMPLATE_DB.save(template)
      loadTemplates()
      alert('✓ Template uploaded')
    }
    reader.readAsText(file)
  }

  const analyzeContract = async (contractId) => {
    const contract = contracts.find(c => c.id === contractId)
    if (!contract) return

    setAnalyzing(true)

    const templateContext = templates.length > 0 
      ? `\n\nStandard Templates:\n${templates.map(t => `${t.name}:\n${t.content.substring(0, 1000)}`).join('\n\n')}`
      : ''

    const context = `Contract to Review:\n${contract.content}${templateContext}`
    
    const systemPrompt = `You are a legal contract review AI. Analyze the contract and provide:

1. CONTRACT TYPE: Identify the type of contract
2. KEY TERMS: List main terms and obligations
3. RISKS IDENTIFIED: List potential legal risks or unfavorable terms
4. MISSING CLAUSES: Identify standard clauses that are missing
5. REDLINE SUGGESTIONS: Suggest specific changes or additions
6. COMPLIANCE ISSUES: Note any regulatory compliance concerns
7. OVERALL RISK LEVEL: Rate as Low, Medium, or High

Be specific and cite clause numbers or sections when possible.`

    try {
      const analysis = await callLLM('Analyze this contract for risks and compliance', context, systemPrompt, llmProvider, apiKey)
      
      // Extract risk level
      let riskLevel = 'Medium'
      if (analysis.toLowerCase().includes('risk level: low')) riskLevel = 'Low'
      if (analysis.toLowerCase().includes('risk level: high')) riskLevel = 'High'

      // Extract contract type
      const typeMatch = analysis.match(/contract type:?\s*([^\n]+)/i)
      const contractType = typeMatch ? typeMatch[1].trim() : 'General'

      CONTRACT_DB.update(contractId, {
        analysis: analysis,
        riskLevel: riskLevel,
        type: contractType,
        status: 'Reviewed',
        reviewedAt: new Date().toISOString(),
        reviewedBy: user?.name
      })

      loadContracts()
      setAnalyzing(false)
      alert('✓ Contract analysis complete')
      logAction?.('analyze_contract', { contractId, riskLevel })
    } catch (error) {
      setAnalyzing(false)
      alert('Error analyzing contract. Check LLM settings.')
    }
  }

  const compareWithTemplate = async (contractId, templateId) => {
    const contract = contracts.find(c => c.id === contractId)
    const template = templates.find(t => t.id === templateId)
    if (!contract || !template) return

    setAnalyzing(true)

    const context = `Contract:\n${contract.content}\n\nTemplate:\n${template.content}`
    const systemPrompt = `Compare the contract with the template and identify:
1. Missing clauses from template
2. Deviations from standard terms
3. Additional clauses not in template
4. Recommendations for alignment`

    try {
      const comparison = await callLLM('Compare contract with template', context, systemPrompt, llmProvider, apiKey)
      
      CONTRACT_DB.update(contractId, {
        comparison: comparison,
        comparedWith: template.name,
        comparedAt: new Date().toISOString()
      })

      loadContracts()
      setAnalyzing(false)
      alert('✓ Comparison complete')
    } catch (error) {
      setAnalyzing(false)
      alert('Error comparing. Check LLM settings.')
    }
  }

  const deleteContract = (id) => {
    if (confirm('Delete this contract?')) {
      CONTRACT_DB.delete(id)
      loadContracts()
      if (selectedContract?.id === id) setSelectedContract(null)
    }
  }

  const deleteTemplate = (id) => {
    if (confirm('Delete this template?')) {
      TEMPLATE_DB.delete(id)
      loadTemplates()
    }
  }

  const filteredContracts = filter === 'All' ? contracts : contracts.filter(c => c.status === filter)

  const stats = {
    total: contracts.length,
    pending: contracts.filter(c => c.status === 'Pending Review').length,
    reviewed: contracts.filter(c => c.status === 'Reviewed').length,
    highRisk: contracts.filter(c => c.riskLevel === 'High').length
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>⚖️ AI Contract Review</h1>
      <p style={{ color: '#666' }}>AI-powered contract analysis and risk assessment</p>
      {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total}</div>
          <div>Total Contracts</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #ffa500 0%, #ff6b6b 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.pending}</div>
          <div>Pending Review</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.reviewed}</div>
          <div>Reviewed</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.highRisk}</div>
          <div>High Risk</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        {/* Sidebar */}
        <div>
          {/* Upload Contract */}
          <div style={{ padding: '1.5rem', border: '2px solid #ddd', borderRadius: '8px', background: 'white', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Upload Contract</h3>
            <input 
              type="file" 
              accept=".txt,.md,.doc,.docx,.pdf"
              onChange={handleContractUpload}
              disabled={uploading}
              style={{ width: '100%', marginBottom: '0.5rem' }}
            />
            {uploading && <p style={{ fontSize: '0.85rem', color: '#666' }}>Uploading...</p>}
          </div>

          {/* Upload Template */}
          <div style={{ padding: '1.5rem', border: '2px solid #28a745', borderRadius: '8px', background: '#d4edda', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Templates ({templates.length})</h3>
            <input 
              type="file" 
              accept=".txt,.md,.doc,.docx"
              onChange={handleTemplateUpload}
              style={{ width: '100%', marginBottom: '1rem' }}
            />
            {templates.map(t => (
              <div key={t.id} style={{ padding: '0.5rem', background: 'white', borderRadius: '4px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem' }}>📄 {t.name}</span>
                <button onClick={() => deleteTemplate(t.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer' }}>✕</button>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div style={{ padding: '1.5rem', border: '2px solid #ddd', borderRadius: '8px', background: 'white' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Filter</h3>
            {['All', 'Pending Review', 'Reviewed'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  background: filter === f ? '#646cff' : 'white',
                  color: filter === f ? 'white' : 'black',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div>
          {filteredContracts.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
              No contracts found. Upload a contract to get started.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {filteredContracts.map(contract => (
                <div key={contract.id} style={{
                  padding: '1.5rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  borderLeftWidth: '6px',
                  borderLeftColor: 
                    contract.riskLevel === 'High' ? '#ff6b6b' :
                    contract.riskLevel === 'Low' ? '#28a745' : '#ffa500'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>📄 {contract.name}</h4>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        {contract.type} • Uploaded by {contract.uploadedBy} • {new Date(contract.uploadedAt).toLocaleDateString()}
                      </div>
                      {contract.riskLevel && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            background: contract.riskLevel === 'High' ? '#ff6b6b' : contract.riskLevel === 'Low' ? '#28a745' : '#ffa500',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '0.85rem',
                            fontWeight: 'bold'
                          }}>
                            {contract.riskLevel} Risk
                          </span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteContract(contract.id)}
                      style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '1.5rem' }}
                    >
                      ✕
                    </button>
                  </div>

                  {contract.analysis && (
                    <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px', marginBottom: '1rem' }}>
                      <strong>🤖 AI Analysis:</strong>
                      <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                        {contract.analysis}
                      </div>
                    </div>
                  )}

                  {contract.comparison && (
                    <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '4px', marginBottom: '1rem' }}>
                      <strong>📊 Template Comparison ({contract.comparedWith}):</strong>
                      <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                        {contract.comparison}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {!contract.analysis && (
                      <button
                        onClick={() => analyzeContract(contract.id)}
                        disabled={analyzing}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#646cff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: analyzing ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {analyzing ? '🤖 Analyzing...' : '🔍 Analyze Contract'}
                      </button>
                    )}
                    
                    {templates.length > 0 && (
                      <select
                        onChange={(e) => e.target.value && compareWithTemplate(contract.id, parseInt(e.target.value))}
                        disabled={analyzing}
                        style={{
                          padding: '0.5rem 1rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Compare with Template...</option>
                        {templates.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                    )}

                    <button
                      onClick={() => setSelectedContract(contract)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      📖 View Full Contract
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contract Viewer Modal */}
      {selectedContract && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '900px', maxHeight: '80vh', overflow: 'auto', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0' }}>{selectedContract.name}</h2>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  {selectedContract.type} • {selectedContract.riskLevel} Risk
                </div>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
                style={{ padding: '0.5rem 1rem', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
            <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px', whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.6' }}>
              {selectedContract.content}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
