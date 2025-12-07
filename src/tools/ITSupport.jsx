import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'

const TICKET_DB = {
  getAll: () => JSON.parse(localStorage.getItem('it_tickets') || '[]'),
  save: (ticket) => {
    const tickets = TICKET_DB.getAll()
    tickets.push(ticket)
    localStorage.setItem('it_tickets', JSON.stringify(tickets))
  },
  update: (id, updates) => {
    const tickets = TICKET_DB.getAll()
    const idx = tickets.findIndex(t => t.id === id)
    if (idx !== -1) {
      tickets[idx] = { ...tickets[idx], ...updates }
      localStorage.setItem('it_tickets', JSON.stringify(tickets))
    }
  }
}

const KNOWLEDGE_DB = {
  getAll: () => JSON.parse(localStorage.getItem('it_knowledge') || '[]'),
  save: (doc) => {
    const docs = KNOWLEDGE_DB.getAll()
    docs.push(doc)
    localStorage.setItem('it_knowledge', JSON.stringify(docs))
  },
  delete: (id) => {
    const docs = KNOWLEDGE_DB.getAll().filter(d => d.id !== id)
    localStorage.setItem('it_knowledge', JSON.stringify(docs))
  }
}

export default function ITSupport() {
  const { user, logAction } = useAuth()
  const [tickets, setTickets] = useState([])
  const [issue, setIssue] = useState('')
  const [category, setCategory] = useState('Software')
  const [priority, setPriority] = useState('Medium')
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState('All')
  const [knowledgeDocs, setKnowledgeDocs] = useState([])
  const [uploading, setUploading] = useState(false)

  const llmProvider = localStorage.getItem('llmProvider') || 'ollama'
  const apiKey = localStorage.getItem('llmApiKey') || ''

  useEffect(() => {
    loadTickets()
    loadKnowledge()
  }, [])

  const loadKnowledge = () => {
    setKnowledgeDocs(KNOWLEDGE_DB.getAll())
  }

  const loadTickets = () => {
    setTickets(TICKET_DB.getAll())
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const reader = new FileReader()
    reader.onload = (event) => {
      const doc = {
        id: Date.now(),
        name: file.name,
        content: event.target.result,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.name
      }
      KNOWLEDGE_DB.save(doc)
      loadKnowledge()
      setUploading(false)
      alert('✓ Document uploaded to knowledge base')
    }
    reader.readAsText(file)
  }

  const deleteDoc = (id) => {
    if (confirm('Delete this document?')) {
      KNOWLEDGE_DB.delete(id)
      loadKnowledge()
    }
  }

  const submitTicket = async () => {
    if (!issue.trim()) return

    setSubmitting(true)

    const ticket = {
      id: Date.now(),
      issue,
      category,
      priority,
      submittedBy: user?.email,
      submittedByName: user?.name,
      submittedAt: new Date().toISOString(),
      status: 'AI Analyzing',
      messages: []
    }

    // Build RAG context from knowledge base
    const ragContext = knowledgeDocs.length > 0 
      ? `\n\nKnowledge Base:\n${knowledgeDocs.map(d => `${d.name}:\n${d.content.substring(0, 2000)}`).join('\n\n')}`
      : ''

    const context = `IT Issue: ${issue}\nCategory: ${category}\nPriority: ${priority}${ragContext}`
    const systemPrompt = `You are an IT support AI. Use the knowledge base documents to help solve issues. Analyze the issue and provide:
1. Likely cause
2. Step-by-step solution
3. If you cannot solve it, recommend escalation to human IT`

    try {
      const aiResponse = await callLLM('Analyze and solve this IT issue', context, systemPrompt, llmProvider, apiKey)
      
      ticket.messages.push({
        from: 'AI Support',
        message: aiResponse,
        timestamp: new Date().toISOString()
      })

      // Check if escalation needed
      if (aiResponse.toLowerCase().includes('escalat') || aiResponse.toLowerCase().includes('human') || aiResponse.toLowerCase().includes('cannot')) {
        ticket.status = 'Escalated to Human IT'
        ticket.escalated = true
      } else {
        ticket.status = 'AI Resolved'
      }
    } catch (error) {
      ticket.messages.push({
        from: 'System',
        message: 'AI unavailable. Escalating to human IT support.',
        timestamp: new Date().toISOString()
      })
      ticket.status = 'Escalated to Human IT'
      ticket.escalated = true
    }

    TICKET_DB.save(ticket)
    loadTickets()
    setIssue('')
    setSubmitting(false)
    logAction?.('submit_it_ticket', { category, priority })
  }

  const addMessage = async (ticketId, message) => {
    const ticket = tickets.find(t => t.id === ticketId)
    if (!ticket) return

    ticket.messages.push({
      from: user?.name,
      message,
      timestamp: new Date().toISOString()
    })

    // Get AI response
    const context = `Previous conversation:\n${ticket.messages.map(m => `${m.from}: ${m.message}`).join('\n')}`
    const systemPrompt = 'You are IT support. Continue helping with this issue.'

    try {
      const aiResponse = await callLLM(message, context, systemPrompt, llmProvider, apiKey)
      ticket.messages.push({
        from: 'AI Support',
        message: aiResponse,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      ticket.messages.push({
        from: 'System',
        message: 'AI unavailable.',
        timestamp: new Date().toISOString()
      })
    }

    TICKET_DB.update(ticketId, ticket)
    loadTickets()
  }

  const escalateToHuman = (ticketId) => {
    TICKET_DB.update(ticketId, { 
      status: 'Escalated to Human IT',
      escalated: true,
      escalatedAt: new Date().toISOString()
    })
    loadTickets()
    alert('✓ Ticket escalated to human IT support')
  }

  const resolveTicket = (ticketId) => {
    TICKET_DB.update(ticketId, { 
      status: 'Resolved',
      resolvedAt: new Date().toISOString()
    })
    loadTickets()
  }

  const filtered = filter === 'All' ? tickets : tickets.filter(t => t.status === filter)
  const categories = ['Software', 'Hardware', 'Network', 'Access/Permissions', 'Email', 'Other']

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🖥️ IT/Technical Support</h1>
      <p style={{ color: '#666' }}>AI-powered support with RAG knowledge base</p>
      {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}

      {/* Knowledge Base Upload */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', border: '2px solid #4dabf7', borderRadius: '8px', background: '#e3f2fd' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>📚 Knowledge Base ({knowledgeDocs.length} documents)</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Upload IT documentation, guides, and FAQs to enhance AI responses</p>
        <input 
          type="file" 
          accept=".txt,.md,.doc,.docx"
          onChange={handleFileUpload}
          disabled={uploading}
          style={{ marginBottom: '1rem' }}
        />
        {knowledgeDocs.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {knowledgeDocs.map(doc => (
              <div key={doc.id} style={{ padding: '0.5rem 1rem', background: 'white', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📄 {doc.name}
                <button onClick={() => deleteDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff6b6b' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginTop: '2rem' }}>
        {/* Submit Form */}
        <div style={{ padding: '1.5rem', border: '2px solid #ddd', borderRadius: '8px', background: 'white', height: 'fit-content' }}>
          <h3>Submit IT Ticket</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Describe Issue</label>
            <textarea
              value={issue}
              onChange={(e) => setIssue(e.target.value)}
              placeholder="Describe your technical issue in detail..."
              rows={6}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
            />
          </div>

          <button
            onClick={submitTicket}
            disabled={submitting || !issue.trim()}
            style={{ 
              width: '100%', 
              padding: '0.75rem', 
              background: '#646cff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontWeight: 'bold'
            }}
          >
            {submitting ? '🤖 AI Analyzing...' : 'Submit Ticket'}
          </button>
        </div>

        {/* Tickets List */}
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            {['All', 'AI Analyzing', 'AI Resolved', 'Escalated to Human IT', 'Resolved'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.5rem 1rem',
                  background: filter === f ? '#646cff' : 'white',
                  color: filter === f ? 'white' : 'black',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
              No tickets found
            </div>
          ) : (
            filtered.map(ticket => (
              <div key={ticket.id} style={{ 
                padding: '1.5rem', 
                border: '2px solid #ddd', 
                borderRadius: '8px',
                marginBottom: '1rem',
                background: 'white',
                borderLeftWidth: '6px',
                borderLeftColor: 
                  ticket.status === 'Resolved' ? '#28a745' :
                  ticket.status === 'Escalated to Human IT' ? '#ff6b6b' :
                  ticket.status === 'AI Resolved' ? '#4dabf7' : '#ffa500'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{ticket.category} Issue</h4>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>
                      {ticket.submittedByName} • {new Date(ticket.submittedAt).toLocaleString()} • {ticket.priority} Priority
                    </div>
                  </div>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: '#f0f0f0',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    height: 'fit-content'
                  }}>
                    {ticket.status}
                  </span>
                </div>

                <p style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
                  <strong>Issue:</strong> {ticket.issue}
                </p>

                {ticket.messages.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    {ticket.messages.map((msg, i) => (
                      <div key={i} style={{ 
                        padding: '0.75rem', 
                        marginBottom: '0.5rem',
                        background: msg.from === 'AI Support' ? '#e3f2fd' : '#f5f5f5',
                        borderRadius: '4px',
                        borderLeft: `3px solid ${msg.from === 'AI Support' ? '#2196F3' : '#999'}`
                      }}>
                        <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                          <strong>{msg.from}</strong> • {new Date(msg.timestamp).toLocaleTimeString()}
                        </div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.message}</div>
                      </div>
                    ))}
                  </div>
                )}

                {ticket.status !== 'Resolved' && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!ticket.escalated && (
                      <button
                        onClick={() => escalateToHuman(ticket.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        🚨 Escalate to Human IT
                      </button>
                    )}
                    <button
                      onClick={() => resolveTicket(ticket.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Mark Resolved
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
