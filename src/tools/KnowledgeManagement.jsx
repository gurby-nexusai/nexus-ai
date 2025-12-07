import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'

// Simple chunking function
const chunkText = (text, chunkSize = 500) => {
  const words = text.split(/\s+/)
  const chunks = []
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '))
  }
  return chunks
}

const KNOWLEDGE_DB = {
  getAll: () => JSON.parse(localStorage.getItem('knowledge_docs') || '[]'),
  save: (doc) => {
    const docs = KNOWLEDGE_DB.getAll()
    docs.push(doc)
    localStorage.setItem('knowledge_docs', JSON.stringify(docs))
  },
  update: (id, updates) => {
    const docs = KNOWLEDGE_DB.getAll()
    const idx = docs.findIndex(d => d.id === id)
    if (idx !== -1) {
      docs[idx] = { ...docs[idx], ...updates }
      localStorage.setItem('knowledge_docs', JSON.stringify(docs))
    }
  },
  delete: (id) => {
    const docs = KNOWLEDGE_DB.getAll().filter(d => d.id !== id)
    localStorage.setItem('knowledge_docs', JSON.stringify(docs))
  }
}

export default function KnowledgeManagement() {
  const { user, logAction } = useAuth()
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [filter, setFilter] = useState('All')
  const [askQuestion, setAskQuestion] = useState('')
  const [aiAnswer, setAiAnswer] = useState(null)
  const [asking, setAsking] = useState(false)

  const llmProvider = localStorage.getItem('llmProvider') || 'ollama'
  const apiKey = localStorage.getItem('llmApiKey') || ''

  useEffect(() => {
    loadDocuments()
  }, [])

  const loadDocuments = () => {
    setDocuments(KNOWLEDGE_DB.getAll())
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    
    try {
      let content = ''
      
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer()
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer })
        content = result.value
      } else {
        content = await file.text()
      }
      
      if (!content || content.trim().length < 50) {
        throw new Error('Document is too short or empty')
      }
      
      // Chunk the document for better search
      const chunks = chunkText(content, 500)
      
      // Auto-categorize with AI
      let category = 'General'
      try {
        const categoryPrompt = await callLLM(
          `Categorize this document into one of: Policy, Procedure, Technical, HR, Finance, Sales, Marketing, Legal, Operations, Other. Return only the category name.`,
          `Document: ${file.name}\nContent preview: ${content.substring(0, 500)}`
        )
        category = categoryPrompt.trim()
      } catch (error) {
        console.log('Auto-categorization failed, using General')
      }

      const doc = {
        id: Date.now(),
        name: file.name,
        content: content,
        chunks: chunks,
        category: category,
        uploadedBy: user?.name,
        uploadedAt: new Date().toISOString(),
        version: 1,
        tags: [],
        views: 0,
        department: user?.department || 'General'
      }

      KNOWLEDGE_DB.save(doc)
      loadDocuments()
      alert(`✓ Document uploaded (${chunks.length} searchable chunks)`)
      e.target.value = ''
      logAction?.('upload_knowledge_doc', { name: file.name, category })
    } catch (error) {
      console.error('Upload error:', error)
      alert('Error uploading document: ' + error.message)
    }
    
    setUploading(false)
  }

  const searchDocuments = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    
    // Enhanced keyword search with chunk matching
    const query = searchQuery.toLowerCase()
    const results = []
    
    documents.forEach(doc => {
      let score = 0
      let matchedChunks = []
      
      // Check document name
      if (doc.name.toLowerCase().includes(query)) score += 10
      
      // Check category
      if (doc.category.toLowerCase().includes(query)) score += 5
      
      // Check chunks for matches
      if (doc.chunks) {
        doc.chunks.forEach(chunk => {
          if (chunk.toLowerCase().includes(query)) {
            score += 1
            matchedChunks.push(chunk)
          }
        })
      } else if (doc.content.toLowerCase().includes(query)) {
        score += 1
      }
      
      if (score > 0) {
        results.push({ ...doc, relevanceScore: score, matchedChunks })
      }
    })
    
    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore)
    
    setSearchResults(results)
    setSearching(false)
    logAction?.('search_knowledge', { query: searchQuery, results: results.length })
  }

  const askAI = async () => {
    if (!askQuestion.trim()) return

    setAsking(true)
    setAiAnswer(null)

    try {
      // Find relevant chunks using keyword matching
      const query = askQuestion.toLowerCase()
      const relevantChunks = []
      
      documents.forEach(doc => {
        if (doc.chunks) {
          doc.chunks.forEach(chunk => {
            if (chunk.toLowerCase().includes(query)) {
              relevantChunks.push({ name: doc.name, chunk })
            }
          })
        }
      })
      
      // If no keyword matches, use first few documents
      if (relevantChunks.length === 0) {
        documents.slice(0, 3).forEach(doc => {
          if (doc.chunks) {
            relevantChunks.push({ name: doc.name, chunk: doc.chunks[0] })
          }
        })
      }
      
      const context = relevantChunks.slice(0, 5).map(r => 
        `[${r.name}]\n${r.chunk}`
      ).join('\n\n---\n\n')

      const answer = await callLLM(
        `Question: ${askQuestion}\n\nRelevant Documents:\n${context}\n\nAnswer the question based on the documents. If the answer isn't in the documents, say so clearly.`
      )
      
      setAiAnswer({
        answer,
        sources: relevantChunks.slice(0, 5).map(r => ({ name: r.name }))
      })
      
      logAction?.('ask_ai_knowledge', { question: askQuestion })
    } catch (error) {
      console.error('Ask AI failed:', error)
      setAiAnswer({
        answer: 'Error: Unable to get AI response. Check your LLM settings or try again.',
        sources: []
      })
    }

    setAsking(false)
  }

  const viewDocument = (doc) => {
    KNOWLEDGE_DB.update(doc.id, { views: (doc.views || 0) + 1 })
    setSelectedDoc(doc)
    loadDocuments()
  }

  const deleteDocument = (id) => {
    if (confirm('Delete this document?')) {
      KNOWLEDGE_DB.delete(id)
      loadDocuments()
      if (selectedDoc?.id === id) setSelectedDoc(null)
    }
  }

  const addTag = (docId, tag) => {
    const doc = documents.find(d => d.id === docId)
    if (doc && !doc.tags.includes(tag)) {
      KNOWLEDGE_DB.update(docId, { tags: [...doc.tags, tag] })
      loadDocuments()
    }
  }

  const categories = ['All', ...new Set(documents.map(d => d.category))]
  const filteredDocs = filter === 'All' ? documents : documents.filter(d => d.category === filter)
  const displayDocs = searchResults.length > 0 ? searchResults : filteredDocs

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>📚 AI Knowledge Management</h1>
      <p style={{ color: '#666' }}>Centralized document repository with AI-powered search</p>
      {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{documents.length}</div>
          <div>Total Documents</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{categories.length - 1}</div>
          <div>Categories</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{documents.reduce((sum, d) => sum + (d.views || 0), 0)}</div>
          <div>Total Views</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{new Set(documents.map(d => d.uploadedBy)).size}</div>
          <div>Contributors</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
        {/* Sidebar */}
        <div>
          {/* Upload */}
          <div style={{ padding: '1.5rem', border: '2px solid #ddd', borderRadius: '8px', background: 'white', marginBottom: '1rem' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Upload Document</h3>
            <input 
              type="file" 
              accept=".txt,.md,.doc,.docx,.pdf"
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ width: '100%' }}
            />
            {uploading && <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>Uploading & categorizing...</p>}
          </div>

          {/* Categories */}
          <div style={{ padding: '1.5rem', border: '2px solid #ddd', borderRadius: '8px', background: 'white' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>Categories</h3>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  background: filter === cat ? '#646cff' : 'white',
                  color: filter === cat ? 'white' : 'black',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                {cat} ({documents.filter(d => cat === 'All' || d.category === cat).length})
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div>
          {/* Search */}
          <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px solid #646cff', borderRadius: '8px', background: '#f0f0ff' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>🔍 Search Documents</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchDocuments()}
                placeholder="Search by name, content, category, or tags..."
                style={{ flex: 1, padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <button
                onClick={searchDocuments}
                disabled={searching}
                style={{ padding: '0.75rem 1.5rem', background: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>

            <h3 style={{ margin: '1.5rem 0 1rem 0' }}>🤖 Ask AI</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={askQuestion}
                onChange={(e) => setAskQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askAI()}
                placeholder="Ask a question about your documents..."
                style={{ flex: 1, padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
              <button
                onClick={askAI}
                disabled={asking}
                style={{ padding: '0.75rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                {asking ? 'Thinking...' : 'Ask'}
              </button>
            </div>

            {aiAnswer && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: 'white', borderRadius: '4px', border: '1px solid #ddd' }}>
                <strong>AI Answer:</strong>
                <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{aiAnswer.answer}</div>
                
                {aiAnswer.sources && aiAnswer.sources.length > 0 && (
                  <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f0f4ff', borderRadius: '4px' }}>
                    <strong style={{ fontSize: '0.9rem' }}>📚 Sources:</strong>
                    <ul style={{ marginTop: '0.5rem', marginBottom: 0, paddingLeft: '1.5rem' }}>
                      {aiAnswer.sources.map((source, idx) => (
                        <li key={idx} style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                          {source.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document List */}
          <div>
            <h3>Documents ({displayDocs.length})</h3>
            {displayDocs.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
                No documents found
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '1rem' }}>
                {displayDocs.map(doc => (
                  <div key={doc.id} style={{ padding: '1.5rem', border: '2px solid #ddd', borderRadius: '8px', background: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', cursor: 'pointer', color: '#646cff' }} onClick={() => viewDocument(doc)}>
                          📄 {doc.name}
                        </h4>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>
                          <span style={{ padding: '0.25rem 0.5rem', background: '#f0f0f0', borderRadius: '4px', marginRight: '0.5rem' }}>
                            {doc.category}
                          </span>
                          <span>by {doc.uploadedBy} • {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                          <span style={{ marginLeft: '0.5rem' }}>👁️ {doc.views || 0} views</span>
                        </div>
                        {doc.tags.length > 0 && (
                          <div style={{ marginTop: '0.5rem' }}>
                            {doc.tags.map(tag => (
                              <span key={tag} style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: '#e3f2fd', borderRadius: '4px', fontSize: '0.8rem', marginRight: '0.5rem' }}>
                                🏷️ {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => viewDocument(doc)}
                          style={{ padding: '0.5rem 1rem', background: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          View
                        </button>
                        <button
                          onClick={() => deleteDocument(doc.id)}
                          style={{ padding: '0.5rem 1rem', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                      {doc.content.substring(0, 200)}...
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDoc && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '800px', maxHeight: '80vh', overflow: 'auto', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0' }}>{selectedDoc.name}</h2>
                <div style={{ fontSize: '0.9rem', color: '#666' }}>
                  Category: {selectedDoc.category} • Version: {selectedDoc.version} • Views: {selectedDoc.views}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                  Uploaded by {selectedDoc.uploadedBy} on {new Date(selectedDoc.uploadedAt).toLocaleDateString()}
                </div>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                style={{ padding: '0.5rem 1rem', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
            <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px', whiteSpace: 'pre-wrap', fontSize: '0.9rem', lineHeight: '1.6' }}>
              {selectedDoc.content}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
