import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'

const TICKET_DB = {
  getAll: () => JSON.parse(localStorage.getItem('external_tickets') || '[]'),
  save: (ticket) => {
    const tickets = TICKET_DB.getAll()
    tickets.push(ticket)
    localStorage.setItem('external_tickets', JSON.stringify(tickets))
  },
  update: (id, updates) => {
    const tickets = TICKET_DB.getAll()
    const idx = tickets.findIndex(t => t.id === id)
    if (idx !== -1) {
      tickets[idx] = { ...tickets[idx], ...updates }
      localStorage.setItem('external_tickets', JSON.stringify(tickets))
    }
  }
}

const KNOWLEDGE_DB = {
  getAll: () => JSON.parse(localStorage.getItem('external_kb') || '[]'),
  save: (doc) => {
    const docs = KNOWLEDGE_DB.getAll()
    docs.push(doc)
    localStorage.setItem('external_kb', JSON.stringify(docs))
  },
  delete: (id) => {
    const docs = KNOWLEDGE_DB.getAll().filter(d => d.id !== id)
    localStorage.setItem('external_kb', JSON.stringify(docs))
  }
}

const AGENT_DB = {
  getAll: () => JSON.parse(localStorage.getItem('support_agents') || '[]'),
  save: (agent) => {
    const agents = AGENT_DB.getAll()
    agents.push(agent)
    localStorage.setItem('support_agents', JSON.stringify(agents))
  },
  update: (id, updates) => {
    const agents = AGENT_DB.getAll()
    const idx = agents.findIndex(a => a.id === id)
    if (idx !== -1) {
      agents[idx] = { ...agents[idx], ...updates }
      localStorage.setItem('support_agents', JSON.stringify(agents))
    }
  },
  delete: (id) => {
    const agents = AGENT_DB.getAll().filter(a => a.id !== id)
    localStorage.setItem('support_agents', JSON.stringify(agents))
  }
}

export default function ExternalCustomerSupport() {
  const { user, logAction } = useAuth()
  const [tickets, setTickets] = useState([])
  const [knowledgeDocs, setKnowledgeDocs] = useState([])
  const [agents, setAgents] = useState([])
  const [filter, setFilter] = useState('All')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showAgentModal, setShowAgentModal] = useState(false)
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentEmail, setNewAgentEmail] = useState('')

  const llmProvider = localStorage.getItem('llmProvider') || 'ollama'
  const apiKey = localStorage.getItem('llmApiKey') || ''

  useEffect(() => {
    loadTickets()
    loadAgents()
    loadKnowledge()
    
    // Poll for new messages every second
    const interval = setInterval(() => {
      loadTickets()
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const loadTickets = () => {
    setTickets(TICKET_DB.getAll())
  }

  const loadAgents = () => {
    setAgents(AGENT_DB.getAll())
  }

  const addAgent = () => {
    if (!newAgentName.trim() || !newAgentEmail.trim()) {
      alert('Please enter agent name and email')
      return
    }

    const agent = {
      id: Date.now(),
      name: newAgentName,
      email: newAgentEmail,
      status: 'Available',
      activeTickets: 0,
      totalResolved: 0,
      addedAt: new Date().toISOString()
    }

    AGENT_DB.save(agent)
    loadAgents()
    setNewAgentName('')
    setNewAgentEmail('')
    setShowAgentModal(false)
    alert('✓ Agent added successfully')
  }

  const toggleAgentStatus = (agentId) => {
    const agent = agents.find(a => a.id === agentId)
    const newStatus = agent.status === 'Available' ? 'Busy' : 'Available'
    AGENT_DB.update(agentId, { status: newStatus })
    loadAgents()
  }

  const deleteAgent = (agentId) => {
    if (confirm('Remove this agent?')) {
      AGENT_DB.delete(agentId)
      loadAgents()
    }
  }

  const getAvailableAgent = () => {
    // Find agent with least active tickets who is available
    const available = agents.filter(a => a.status === 'Available')
    if (available.length === 0) return null
    
    return available.reduce((min, agent) => 
      agent.activeTickets < min.activeTickets ? agent : min
    )
  }

  const autoAssignTicket = (ticketId) => {
    const agent = getAvailableAgent()
    
    if (!agent) {
      alert('No agents available. Ticket will remain in queue.')
      return
    }

    TICKET_DB.update(ticketId, {
      assignedTo: agent.name,
      assignedToEmail: agent.email,
      assignedAt: new Date().toISOString(),
      status: 'In Progress'
    })

    AGENT_DB.update(agent.id, {
      activeTickets: agent.activeTickets + 1
    })

    loadTickets()
    loadAgents()
    alert(`✓ Ticket auto-assigned to ${agent.name}`)
  }

  const loadKnowledge = () => {
    setKnowledgeDocs(KNOWLEDGE_DB.getAll())
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
      alert('✓ Knowledge base document uploaded')
    }
    reader.readAsText(file)
  }

  const deleteDoc = (id) => {
    if (confirm('Delete this document?')) {
      KNOWLEDGE_DB.delete(id)
      loadKnowledge()
    }
  }

  const createDemoTicket = async () => {
    const demoQuestions = [
      'How do I reset my password?',
      'What are your business hours?',
      'How can I track my order?',
      'Do you offer refunds?',
      'How do I contact sales?'
    ]
    
    const question = demoQuestions[Math.floor(Math.random() * demoQuestions.length)]
    
    const ticket = {
      id: Date.now(),
      customerName: 'Demo Customer',
      customerEmail: `customer${Math.floor(Math.random() * 1000)}@example.com`,
      subject: question,
      message: question,
      channel: 'Chat',
      status: 'Open',
      priority: 'Medium',
      createdAt: new Date().toISOString(),
      messages: [],
      aiConfidence: 0
    }

    // Get AI response
    const ragContext = knowledgeDocs.length > 0 
      ? `\n\nKnowledge Base:\n${knowledgeDocs.map(d => `${d.name}:\n${d.content.substring(0, 1500)}`).join('\n\n')}`
      : ''

    const context = `Customer Question: ${question}${ragContext}`
    const systemPrompt = `You are a customer support AI. Provide helpful, professional responses. If you're confident in the answer, start with "I can help with that." If unsure, start with "Let me connect you with a specialist."`

    try {
      const aiResponse = await callLLM(question, context, systemPrompt, llmProvider, apiKey)
      
      const confidence = aiResponse.toLowerCase().includes('specialist') || aiResponse.toLowerCase().includes('unsure') ? 0.6 : 0.9
      
      ticket.messages.push({
        from: 'AI Assistant',
        text: aiResponse,
        timestamp: new Date().toISOString(),
        confidence: confidence
      })
      
      ticket.aiConfidence = confidence
      
      if (confidence < 0.7) {
        ticket.status = 'Escalated'
        ticket.escalatedAt = new Date().toISOString()
        
        // Auto-assign to available agent
        const agent = getAvailableAgent()
        if (agent) {
          ticket.assignedTo = agent.name
          ticket.assignedToEmail = agent.email
          ticket.assignedAt = new Date().toISOString()
          AGENT_DB.update(agent.id, { activeTickets: agent.activeTickets + 1 })
        }
      } else {
        ticket.status = 'AI Resolved'
      }
    } catch (error) {
      ticket.messages.push({
        from: 'System',
        text: 'AI unavailable. Escalating to human agent.',
        timestamp: new Date().toISOString()
      })
      ticket.status = 'Escalated'
    }

    TICKET_DB.save(ticket)
    loadTickets()
    logAction?.('demo_ticket_created', { question })
  }

  const sendReply = async () => {
    if (!replyText.trim() || !selectedTicket) return

    setReplying(true)

    const message = {
      type: 'agent',
      from: user?.name || 'Agent',
      text: replyText,
      timestamp: new Date().toISOString()
    }

    selectedTicket.messages.push(message)
    TICKET_DB.update(selectedTicket.id, {
      messages: selectedTicket.messages,
      status: 'In Progress',
      lastReplyAt: new Date().toISOString(),
      assignedTo: user?.name
    })

    loadTickets()
    setReplyText('')
    setReplying(false)
  }

  const resolveTicket = (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId)
    
    TICKET_DB.update(ticketId, {
      status: 'Resolved',
      resolvedAt: new Date().toISOString(),
      resolvedBy: user?.name
    })
    
    // Decrease agent workload and increase resolved count
    if (ticket.assignedToEmail) {
      const agent = agents.find(a => a.email === ticket.assignedToEmail)
      if (agent) {
        AGENT_DB.update(agent.id, {
          activeTickets: Math.max(0, agent.activeTickets - 1),
          totalResolved: agent.totalResolved + 1
        })
      }
    }
    
    loadTickets()
    loadAgents()
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket(null)
    }
  }

  const escalateTicket = (ticketId) => {
    TICKET_DB.update(ticketId, {
      status: 'Escalated',
      priority: 'High',
      escalated: true,
      escalatedAt: new Date().toISOString(),
      escalatedBy: user?.name
    })
    loadTickets()
  }

  const filteredTickets = filter === 'All' ? tickets : tickets.filter(t => t.status === filter)

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'Open').length,
    aiResolved: tickets.filter(t => t.status === 'AI Resolved').length,
    escalated: tickets.filter(t => t.status === 'Escalated').length,
    resolved: tickets.filter(t => t.status === 'Resolved').length,
    avgConfidence: tickets.length > 0 ? (tickets.reduce((sum, t) => sum + (t.aiConfidence || 0), 0) / tickets.length * 100).toFixed(0) : 0
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>🌐 AI External Customer Support</h1>
      <p style={{ color: '#666' }}>Multi-channel customer support with AI automation</p>
      {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>Agent: {user.name}</p>}

      {/* Stats Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.total}</div>
          <div style={{ fontSize: '0.85rem' }}>Total Tickets</div>
        </div>
        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #ffa500 0%, #ff6b6b 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.open}</div>
          <div style={{ fontSize: '0.85rem' }}>Open</div>
        </div>
        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #4dabf7 0%, #00f2fe 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.aiResolved}</div>
          <div style={{ fontSize: '0.85rem' }}>AI Resolved</div>
        </div>
        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #ff6b6b 0%, #c92a2a 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.escalated}</div>
          <div style={{ fontSize: '0.85rem' }}>Escalated</div>
        </div>
        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.resolved}</div>
          <div style={{ fontSize: '0.85rem' }}>Resolved</div>
        </div>
        <div style={{ padding: '1rem', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.avgConfidence}%</div>
          <div style={{ fontSize: '0.85rem' }}>AI Confidence</div>
        </div>
      </div>

      {/* Agent Management */}
      <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px solid #28a745', borderRadius: '8px', background: '#d4edda' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>👥 Support Agents ({agents.length})</h3>
          <button
            onClick={() => setShowAgentModal(true)}
            style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            + Add Agent
          </button>
        </div>
        
        {agents.length === 0 ? (
          <p style={{ color: '#666', fontSize: '0.9rem' }}>No agents added yet. Add agents to enable auto-assignment.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {agents.map(agent => (
              <div key={agent.id} style={{ padding: '1rem', background: 'white', borderRadius: '8px', border: '2px solid #ddd' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{agent.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{agent.email}</div>
                  </div>
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '1.2rem' }}
                  >
                    ×
                  </button>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <span style={{ 
                    padding: '0.25rem 0.5rem', 
                    background: agent.status === 'Available' ? '#28a745' : '#ffc107',
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    {agent.status}
                  </span>
                  <span style={{ padding: '0.25rem 0.5rem', background: '#f0f0f0', borderRadius: '4px' }}>
                    {agent.activeTickets} active
                  </span>
                  <span style={{ padding: '0.25rem 0.5rem', background: '#f0f0f0', borderRadius: '4px' }}>
                    {agent.totalResolved} resolved
                  </span>
                </div>
                
                <button
                  onClick={() => toggleAgentStatus(agent.id)}
                  style={{ 
                    width: '100%',
                    marginTop: '0.75rem',
                    padding: '0.5rem',
                    background: agent.status === 'Available' ? '#ffc107' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 'bold'
                  }}
                >
                  {agent.status === 'Available' ? 'Set Busy' : 'Set Available'}
                </button>
              </div>
            ))}
          </div>
        )}
        
        <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'white', borderRadius: '4px', fontSize: '0.85rem' }}>
          <strong>🤖 AI Auto-Assignment:</strong> When tickets are escalated, AI automatically assigns them to the agent with the least active tickets who is marked as "Available".
        </div>
      </div>

      {/* Knowledge Base Section */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '2px solid #4dabf7', borderRadius: '8px', background: '#e3f2fd' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>📚 Knowledge Base ({knowledgeDocs.length} documents)</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Upload FAQs, product docs, and policies to enhance AI responses</p>
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

      {/* Public Portal Link */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '2px solid #28a745', borderRadius: '8px', background: '#d4edda' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>🌐 Public Customer Support Portal</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Share this link with customers for support</p>
        <input
          value="http://localhost:5174/customer-support.html"
          readOnly
          style={{ width: '100%', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.95rem', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>

      {/* Demo Button */}
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <button
          onClick={createDemoTicket}
          style={{ padding: '1rem 2rem', background: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}
        >
          🎭 Create Demo Ticket (Simulate Customer)
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        {['All', 'Open', 'AI Resolved', 'Escalated', 'In Progress', 'Resolved'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '0.75rem 1rem',
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

      {/* Tickets List */}
      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredTickets.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
            No tickets found. Click "Create Demo Ticket" to simulate customer inquiries.
          </div>
        ) : (
          filteredTickets.map(ticket => (
            <div key={ticket.id} style={{
              padding: '1.5rem',
              border: '2px solid #ddd',
              borderRadius: '8px',
              background: 'white',
              borderLeftWidth: '6px',
              borderLeftColor: 
                ticket.status === 'Resolved' ? '#28a745' :
                ticket.status === 'Escalated' ? '#ff6b6b' :
                ticket.status === 'AI Resolved' ? '#4dabf7' : '#ffa500'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0' }}>{ticket.subject}</h4>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {ticket.customerName} ({ticket.customerEmail}) • {ticket.channel} • {new Date(ticket.createdAt).toLocaleString()}
                  </div>
                  {ticket.assignedTo && (
                    <div style={{ fontSize: '0.85rem', marginTop: '0.25rem', color: '#28a745', fontWeight: 'bold' }}>
                      👤 Assigned to: {ticket.assignedTo}
                    </div>
                  )}
                  {ticket.aiConfidence > 0 && (
                    <div style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                      AI Confidence: <span style={{ fontWeight: 'bold', color: ticket.aiConfidence > 0.7 ? '#28a745' : '#ffa500' }}>
                        {(ticket.aiConfidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
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
                <strong>Message:</strong> {ticket.message}
              </p>

              {ticket.messages.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  {ticket.messages.map((msg, i) => (
                    <div key={i} style={{
                      padding: '0.75rem',
                      marginBottom: '0.5rem',
                      background: msg.from === 'AI Assistant' ? '#e3f2fd' : '#f5f5f5',
                      borderRadius: '4px',
                      borderLeft: `3px solid ${msg.from === 'AI Assistant' ? '#2196F3' : '#999'}`
                    }}>
                      <div style={{ fontSize: '0.8rem', color: '#666', marginBottom: '0.25rem' }}>
                        <strong>{msg.from}</strong> • {new Date(msg.timestamp).toLocaleTimeString()}
                        {msg.confidence && <span style={{ marginLeft: '0.5rem' }}>({(msg.confidence * 100).toFixed(0)}% confidence)</span>}
                      </div>
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                    </div>
                  ))}
                </div>
              )}

              {ticket.status !== 'Resolved' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => setSelectedTicket(ticket)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#646cff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    💬 Reply
                  </button>
                  {!ticket.escalated && (
                    <button
                      onClick={() => escalateTicket(ticket.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      🚨 Escalate
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
                    ✓ Resolve
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Reply Modal */}
      {selectedTicket && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%' }}>
            <h3>Reply to {selectedTicket.customerName}</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
              Subject: {selectedTicket.subject}
            </p>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Type your reply..."
              rows={6}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '1rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setSelectedTicket(null); setReplyText(''); }}
                style={{ padding: '0.75rem 1.5rem', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={sendReply}
                disabled={replying || !replyText.trim()}
                style={{ padding: '0.75rem 1.5rem', background: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {replying ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      {showAgentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '500px', width: '90%' }}>
            <h3>Add Support Agent</h3>
            <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
              Add agents to your support team. AI will automatically distribute tickets to available agents.
            </p>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Agent Name</label>
              <input
                type="text"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
                placeholder="John Doe"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Agent Email</label>
              <input
                type="email"
                value={newAgentEmail}
                onChange={(e) => setNewAgentEmail(e.target.value)}
                placeholder="john@company.com"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowAgentModal(false); setNewAgentName(''); setNewAgentEmail(''); }}
                style={{ padding: '0.75rem 1.5rem', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={addAgent}
                style={{ padding: '0.75rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Add Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
