import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'

const KNOWLEDGE_DB = {
  getAll: () => JSON.parse(localStorage.getItem('cs_knowledge') || '[]'),
  save: (doc) => {
    const docs = KNOWLEDGE_DB.getAll()
    docs.push(doc)
    localStorage.setItem('cs_knowledge', JSON.stringify(docs))
  },
  delete: (id) => {
    const docs = KNOWLEDGE_DB.getAll().filter(d => d.id !== id)
    localStorage.setItem('cs_knowledge', JSON.stringify(docs))
  }
}

export default function CustomerSupport() {
  const { user, logAction } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [escalated, setEscalated] = useState(false)
  const [customerData, setCustomerData] = useState(null)
  const [responding, setResponding] = useState(false)
  const [knowledgeDocs, setKnowledgeDocs] = useState([])
  const [uploading, setUploading] = useState(false)

  const llmProvider = localStorage.getItem('llmProvider') || 'ollama'
  const apiKey = localStorage.getItem('llmApiKey') || ''

  useEffect(() => {
    loadKnowledge()
    if (user) {
      setCustomerData({
        email: user.email,
        name: user.name,
        accountAge: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)) + ' days',
        totalEngagements: user.engagements?.length || 0,
        recentActions: user.engagements?.slice(-5).map(e => e.action).join(', ') || 'None',
        lastActive: user.engagements?.slice(-1)[0]?.timestamp || user.createdAt
      })
      
      setMessages([
        { role: 'bot', text: `Hi ${user.name}! I'm your AI support assistant powered by llama3.1. I can see your account history and provide personalized help.` }
      ])
    }
  }, [user])

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

  const handleSend = async () => {
    if (!input.trim() || responding) return
    
    const userMsg = { role: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    setResponding(true)

    const ragContext = knowledgeDocs.length > 0 
      ? `\n\nKnowledge Base:\n${knowledgeDocs.map(d => `${d.name}:\n${d.content.substring(0, 2000)}`).join('\n\n')}`
      : ''
    
    const context = `Customer Profile:
- Name: ${customerData.name}
- Email: ${customerData.email}
- Account Age: ${customerData.accountAge}
- Total Engagements: ${customerData.totalEngagements}
- Recent Actions: ${customerData.recentActions}

Conversation History:
${messages.map(m => `${m.role}: ${m.text}`).join('\n')}${ragContext}
`
    
    const systemPrompt = `You are a customer support AI. Use the customer's profile, engagement history, and knowledge base documents to provide personalized, helpful responses. Be specific about their account details when relevant.`
    
    try {
      const response = await callLLM(input, context, systemPrompt, llmProvider, apiKey)
      setMessages(prev => [...prev, { role: 'bot', text: response }])
      logAction?.('support_query', { query: input })
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Error connecting to LLM. Check your settings.' }])
    }
    
    setInput('')
    setResponding(false)
  }

  const handleEscalate = () => {
    setEscalated(true)
    setMessages(prev => [...prev, { 
      role: 'bot', 
      text: `✅ Escalated to human support.\n\nTicket #${Math.floor(Math.random() * 10000)}\nCustomer: ${customerData.name}\nEngagements: ${customerData.totalEngagements}\nPriority: ${customerData.totalEngagements < 5 ? 'High (New User)' : 'Normal'}\n\nAll conversation history and customer data shared with agent.`
    }])
    logAction?.('escalate_support', {})
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>💬 AI Customer Support</h1>
      <p style={{ color: '#666', marginBottom: '1rem' }}>AI support with RAG knowledge base</p>

      {/* Knowledge Base Upload */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem', border: '2px solid #4dabf7', borderRadius: '8px', background: '#e3f2fd' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>📚 Knowledge Base ({knowledgeDocs.length} documents)</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Upload product docs, FAQs, and policies to enhance AI responses</p>
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

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1rem', height: 'fit-content' }}>
          <h3>Customer Profile</h3>
          {customerData && (
            <div style={{ fontSize: '0.9rem' }}>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Name:</strong> {customerData.name}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Email:</strong> {customerData.email}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Account Age:</strong> {customerData.accountAge}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Total Engagements:</strong> {customerData.totalEngagements}
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <strong>Recent Actions:</strong>
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                  {customerData.recentActions}
                </div>
              </div>
              <div style={{ 
                padding: '0.5rem', 
                background: customerData.totalEngagements > 10 ? '#d4edda' : '#fff3cd',
                borderRadius: '4px',
                marginTop: '1rem',
                fontSize: '0.85rem'
              }}>
                <strong>Status:</strong> {customerData.totalEngagements > 10 ? 'Active User' : 'New User'}
              </div>
            </div>
          )}
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: '8px', height: '600px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ 
                marginBottom: '1rem', 
                display: 'flex', 
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' 
              }}>
                <div style={{ 
                  maxWidth: '70%', 
                  padding: '0.75rem', 
                  borderRadius: '8px',
                  background: msg.role === 'user' ? '#646cff' : '#f0f0f0',
                  color: msg.role === 'user' ? 'white' : 'black',
                  whiteSpace: 'pre-wrap'
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            {responding && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '0.75rem', background: '#f0f0f0', borderRadius: '8px' }}>
                  llama3.1 is thinking...
                </div>
              </div>
            )}
          </div>

          <div style={{ borderTop: '1px solid #ddd', padding: '1rem', display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your question..."
              style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              disabled={responding}
            />
            <button onClick={handleSend} disabled={responding} style={{ padding: '0.5rem 1.5rem' }}>
              Send
            </button>
            <button onClick={handleEscalate} style={{ padding: '0.5rem 1rem', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px' }}>
              Escalate
            </button>
          </div>
        </div>
      </div>

      {escalated && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#d4edda', borderRadius: '4px' }}>
          ✅ Human agent will join shortly. All conversation history and customer engagement data has been shared.
        </div>
      )}
    </div>
  )
}
