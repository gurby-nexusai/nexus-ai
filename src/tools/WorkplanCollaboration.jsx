import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx'
import { saveAs } from 'file-saver'

const WORKPLAN_DB = {
  get: () => JSON.parse(localStorage.getItem('workplan') || '{"goals":[],"initiatives":[],"objectives":[],"actions":[]}'),
  save: (workplan) => localStorage.setItem('workplan', JSON.stringify(workplan))
}

const NOTIFICATION_DB = {
  getAll: () => JSON.parse(localStorage.getItem('workplan_notifications') || '[]'),
  add: (notification) => {
    const notifications = NOTIFICATION_DB.getAll()
    notifications.push(notification)
    localStorage.setItem('workplan_notifications', JSON.stringify(notifications))
  },
  markRead: (id) => {
    const notifications = NOTIFICATION_DB.getAll()
    const idx = notifications.findIndex(n => n.id === id)
    if (idx !== -1) {
      notifications[idx].read = true
      localStorage.setItem('workplan_notifications', JSON.stringify(notifications))
    }
  }
}

const DOCUMENT_DB = {
  getAll: () => JSON.parse(localStorage.getItem('workplan_documents') || '[]'),
  add: (doc) => {
    const docs = DOCUMENT_DB.getAll()
    docs.push(doc)
    localStorage.setItem('workplan_documents', JSON.stringify(docs))
  },
  delete: (id) => {
    const docs = DOCUMENT_DB.getAll().filter(d => d.id !== id)
    localStorage.setItem('workplan_documents', JSON.stringify(docs))
  },
  search: (query) => {
    const docs = DOCUMENT_DB.getAll()
    const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3)
    
    let relevantChunks = []
    docs.forEach(doc => {
      doc.chunks.forEach(chunk => {
        let score = 0
        queryTerms.forEach(term => {
          if (chunk.text.toLowerCase().includes(term)) {
            score += 1
          }
        })
        if (score > 0) {
          relevantChunks.push({ ...chunk, docName: doc.name, score })
        }
      })
    })
    
    // Sort by relevance and return top 5
    return relevantChunks
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(c => `[${c.docName}] ${c.text}`)
      .join('\n\n')
  }
}

// Chunk text into semantic paragraphs
function chunkDocument(content, chunkSize = 500) {
  const paragraphs = content.split(/\n\n+/)
  const chunks = []
  let currentChunk = ''
  
  paragraphs.forEach(para => {
    if ((currentChunk + para).length > chunkSize && currentChunk) {
      chunks.push({ text: currentChunk.trim(), length: currentChunk.length })
      currentChunk = para
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    }
  })
  
  if (currentChunk) {
    chunks.push({ text: currentChunk.trim(), length: currentChunk.length })
  }
  
  return chunks
}

export default function WorkplanCollaboration() {
  const { user, logAction } = useAuth()
  const [workplan, setWorkplan] = useState(WORKPLAN_DB.get())
  const [activeTab, setActiveTab] = useState('goals')
  const [showAdd, setShowAdd] = useState(false)
  const [newItem, setNewItem] = useState({ title: '', description: '', department: '', owner: '', deadline: '', status: 'Not Started', parentId: null })
  const [notifications, setNotifications] = useState([])
  const [documents, setDocuments] = useState([])
  const [uploading, setUploading] = useState(false)

  const departments = ['Executive', 'Sales', 'Marketing', 'Engineering', 'Operations', 'Finance', 'HR', 'IT', 'Customer Success']

  useEffect(() => {
    loadWorkplan()
    loadNotifications()
    loadDocuments()
  }, [])

  const loadDocuments = () => {
    setDocuments(DOCUMENT_DB.getAll())
  }

  const handleDocumentUpload = async (e) => {
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

      // Chunk the document
      const chunks = chunkDocument(content, 500)

      const doc = {
        id: Date.now(),
        name: file.name,
        content: content,
        chunks: chunks,
        chunkCount: chunks.length,
        uploadedBy: user?.name,
        uploadedAt: new Date().toISOString()
      }

      DOCUMENT_DB.add(doc)
      loadDocuments()
      alert(`✓ Document uploaded and chunked into ${chunks.length} segments`)
      e.target.value = ''
    } catch (error) {
      alert('Error uploading document: ' + error.message)
    }
    setUploading(false)
  }

  const loadWorkplan = () => {
    setWorkplan(WORKPLAN_DB.get())
  }

  const loadNotifications = () => {
    setNotifications(NOTIFICATION_DB.getAll().filter(n => !n.read))
  }

  const addItem = async () => {
    if (!newItem.title.trim()) return

    const item = {
      id: Date.now(),
      ...newItem,
      createdBy: user?.email,
      createdByName: user?.name,
      createdAt: new Date().toISOString(),
      updates: []
    }

    const updated = { ...workplan }
    updated[activeTab].push(item)
    WORKPLAN_DB.save(updated)
    loadWorkplan()
    
    // If adding goals, notify all departments
    if (activeTab === 'goals') {
      await notifyDepartments(item)
    }
    
    setNewItem({ title: '', description: '', department: '', owner: '', deadline: '', status: 'Not Started', parentId: null })
    setShowAdd(false)
    logAction?.('add_workplan_item', { type: activeTab, department: item.department })
  }

  const notifyDepartments = async (goal) => {
    const message = await callLLM(`Generate a brief notification message (2-3 sentences) to all departments that a new strategic goal "${goal.title}" has been created by ${user?.name}. Encourage them to add strategic initiatives to support this goal.`)
    
    departments.forEach(dept => {
      NOTIFICATION_DB.add({
        id: Date.now() + Math.random(),
        department: dept,
        type: 'goal_created',
        goalId: goal.id,
        goalTitle: goal.title,
        message: message,
        createdBy: user?.name,
        createdAt: new Date().toISOString(),
        read: false
      })
    })
    
    loadNotifications()
  }

  const generateWithAI = async () => {
    if (!newItem.title.trim()) {
      alert('Please enter a title first')
      return
    }

    // Search for relevant document chunks based on title
    let ragContext = ''
    if (documents.length > 0) {
      const relevantChunks = DOCUMENT_DB.search(newItem.title)
      if (relevantChunks) {
        ragContext = '\n\nRELEVANT COMPANY CONTEXT:\n' + relevantChunks
      }
    }

    let prompt = ''
    let context = ''

    if (activeTab === 'goals') {
      prompt = `${ragContext}\n\nBased on the company context above, generate a detailed strategic goal description for: "${newItem.title}". Include measurable outcomes, timeline considerations, and key success factors aligned with company priorities. Keep it concise (3-4 sentences).`
    } else if (activeTab === 'initiatives') {
      const parent = workplan.goals.find(g => g.id === newItem.parentId)
      if (!parent) {
        alert('Please select a goal first')
        return
      }
      context = `Goal: ${parent.title}\n${parent.description}`
      
      // Search with combined context
      const searchQuery = `${newItem.title} ${parent.title}`
      const relevantChunks = DOCUMENT_DB.search(searchQuery)
      if (relevantChunks) {
        ragContext = '\n\nRELEVANT COMPANY CONTEXT:\n' + relevantChunks
      }
      
      prompt = `${ragContext}\n\nBased on the company context and this strategic goal:\n${context}\n\nGenerate a strategic initiative titled "${newItem.title}" that supports this goal. Include specific actions, resources needed, and expected impact. Keep it concise (3-4 sentences).`
    } else if (activeTab === 'objectives') {
      const parent = workplan.initiatives.find(i => i.id === newItem.parentId)
      if (!parent) {
        alert('Please select an initiative first')
        return
      }
      context = `Initiative: ${parent.title}\n${parent.description}`
      
      const searchQuery = `${newItem.title} ${parent.title}`
      const relevantChunks = DOCUMENT_DB.search(searchQuery)
      if (relevantChunks) {
        ragContext = '\n\nRELEVANT COMPANY CONTEXT:\n' + relevantChunks
      }
      
      prompt = `${ragContext}\n\nBased on the company context and this strategic initiative:\n${context}\n\nGenerate a measurable objective titled "${newItem.title}". Include specific metrics, targets, and how success will be measured. Keep it concise (2-3 sentences).`
    } else if (activeTab === 'actions') {
      const parent = workplan.objectives.find(o => o.id === newItem.parentId)
      if (!parent) {
        alert('Please select an objective first')
        return
      }
      context = `Objective: ${parent.title}\n${parent.description}`
      
      const searchQuery = `${newItem.title} ${parent.title}`
      const relevantChunks = DOCUMENT_DB.search(searchQuery)
      if (relevantChunks) {
        ragContext = '\n\nRELEVANT COMPANY CONTEXT:\n' + relevantChunks
      }
      
      prompt = `${ragContext}\n\nBased on the company context and this objective:\n${context}\n\nGenerate a concrete action plan titled "${newItem.title}". Include specific steps, responsibilities, and deliverables. Keep it concise (2-3 sentences).`
    }

    const description = await callLLM(prompt)
    setNewItem({ ...newItem, description })
  }

  const exportGoalChain = async (goalId) => {
    const goal = workplan.goals.find(g => g.id === goalId)
    const initiatives = workplan.initiatives.filter(i => i.parentId === goalId)
    
    const sections = [
      new Paragraph({ text: `Strategic Plan: ${goal.title}`, heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()}`, italics: true }),
      new Paragraph({ text: '' }),
      
      new Paragraph({ text: 'STRATEGIC GOAL', heading: HeadingLevel.HEADING_2 }),
      new Paragraph({ text: goal.title, bold: true }),
      new Paragraph({ text: goal.description || '' }),
      new Paragraph({ text: `Department: ${goal.department} | Owner: ${goal.owner || 'TBD'} | Status: ${goal.status}` }),
      new Paragraph({ text: '' })
    ]

    initiatives.forEach((init, idx) => {
      const objectives = workplan.objectives.filter(o => o.parentId === init.id)
      
      sections.push(
        new Paragraph({ text: `${idx + 1}. STRATEGIC INITIATIVE: ${init.title}`, heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: init.description || '' }),
        new Paragraph({ text: `Department: ${init.department} | Owner: ${init.owner || 'TBD'} | Status: ${init.status}` }),
        new Paragraph({ text: '' })
      )

      objectives.forEach((obj, oidx) => {
        const actions = workplan.actions.filter(a => a.parentId === obj.id)
        
        sections.push(
          new Paragraph({ text: `   ${idx + 1}.${oidx + 1} Objective: ${obj.title}`, heading: HeadingLevel.HEADING_4 }),
          new Paragraph({ text: `   ${obj.description || ''}` }),
          new Paragraph({ text: `   Department: ${obj.department} | Owner: ${obj.owner || 'TBD'} | Status: ${obj.status}` }),
          new Paragraph({ text: '' })
        )

        actions.forEach((act, aidx) => {
          sections.push(
            new Paragraph({ text: `      ${idx + 1}.${oidx + 1}.${aidx + 1} Action: ${act.title}` }),
            new Paragraph({ text: `      ${act.description || ''}` }),
            new Paragraph({ text: `      Owner: ${act.owner || 'TBD'} | Deadline: ${act.deadline || 'TBD'} | Status: ${act.status}` }),
            new Paragraph({ text: '' })
          )
        })
      })
    })

    const doc = new Document({ sections: [{ children: sections }] })
    const blob = await Packer.toBlob(doc)
    saveAs(blob, `Goal_${goal.id}_${goal.title.replace(/[^a-z0-9]/gi, '_')}.docx`)
  }

  const exportOverallPlan = async () => {
    const sections = [
      new Paragraph({ text: 'COMPLETE STRATEGIC WORKPLAN', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.CENTER }),
      new Paragraph({ text: `Generated: ${new Date().toLocaleDateString()}`, alignment: AlignmentType.CENTER, italics: true }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: `Total Goals: ${workplan.goals.length} | Initiatives: ${workplan.initiatives.length} | Objectives: ${workplan.objectives.length} | Actions: ${workplan.actions.length}` }),
      new Paragraph({ text: '' })
    ]

    workplan.goals.forEach((goal, gidx) => {
      const initiatives = workplan.initiatives.filter(i => i.parentId === goal.id)
      
      sections.push(
        new Paragraph({ text: `GOAL ${gidx + 1}: ${goal.title}`, heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ text: goal.description || '' }),
        new Paragraph({ text: `Department: ${goal.department} | Owner: ${goal.owner || 'TBD'} | Status: ${goal.status}` }),
        new Paragraph({ text: '' })
      )

      initiatives.forEach((init, iidx) => {
        const objectives = workplan.objectives.filter(o => o.parentId === init.id)
        
        sections.push(
          new Paragraph({ text: `  Initiative ${gidx + 1}.${iidx + 1}: ${init.title}`, heading: HeadingLevel.HEADING_3 }),
          new Paragraph({ text: `  ${init.description || ''}` }),
          new Paragraph({ text: `  Department: ${init.department} | Owner: ${init.owner || 'TBD'} | Status: ${init.status}` }),
          new Paragraph({ text: '' })
        )

        objectives.forEach((obj, oidx) => {
          const actions = workplan.actions.filter(a => a.parentId === obj.id)
          
          sections.push(
            new Paragraph({ text: `    Objective ${gidx + 1}.${iidx + 1}.${oidx + 1}: ${obj.title}`, heading: HeadingLevel.HEADING_4 }),
            new Paragraph({ text: `    ${obj.description || ''}` }),
            new Paragraph({ text: `    Department: ${obj.department} | Owner: ${obj.owner || 'TBD'} | Status: ${obj.status}` }),
            new Paragraph({ text: '' })
          )

          actions.forEach((act, aidx) => {
            sections.push(
              new Paragraph({ text: `      Action ${gidx + 1}.${iidx + 1}.${oidx + 1}.${aidx + 1}: ${act.title}` }),
              new Paragraph({ text: `      ${act.description || ''}` }),
              new Paragraph({ text: `      Owner: ${act.owner || 'TBD'} | Deadline: ${act.deadline || 'TBD'} | Status: ${act.status}` }),
              new Paragraph({ text: '' })
            )
          })
        })
      })
    })

    const doc = new Document({ sections: [{ children: sections }] })
    const blob = await Packer.toBlob(doc)
    const timestamp = new Date().toISOString().split('T')[0]
    saveAs(blob, `Strategic_Workplan_Complete_${timestamp}.docx`)
  }

  const updateItem = (id, updates) => {
    const updated = { ...workplan }
    const idx = updated[activeTab].findIndex(i => i.id === id)
    if (idx !== -1) {
      updated[activeTab][idx] = { 
        ...updated[activeTab][idx], 
        ...updates,
        lastUpdatedBy: user?.name,
        lastUpdatedAt: new Date().toISOString()
      }
      updated[activeTab][idx].updates.push({
        by: user?.name,
        at: new Date().toISOString(),
        changes: updates
      })
      WORKPLAN_DB.save(updated)
      loadWorkplan()
    }
  }

  const deleteItem = (id) => {
    if (!confirm('Delete this item?')) return
    const updated = { ...workplan }
    updated[activeTab] = updated[activeTab].filter(i => i.id !== id)
    WORKPLAN_DB.save(updated)
    loadWorkplan()
  }

  const tabs = [
    { key: 'goals', label: 'Strategic Goals', icon: '🎯' },
    { key: 'initiatives', label: 'Strategic Initiatives', icon: '🚀' },
    { key: 'objectives', label: 'Objectives', icon: '📊' },
    { key: 'actions', label: 'Action Plans', icon: '✅' }
  ]

  const statuses = ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled']
  const statusColors = {
    'Not Started': '#999',
    'In Progress': '#2196F3',
    'On Hold': '#ff9800',
    'Completed': '#28a745',
    'Cancelled': '#ff6b6b'
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>📋 AI Workplan Collaboration</h1>
      <p style={{ color: '#666' }}>Cross-department strategic planning and execution tracking (1 Goal → 1-5 Initiatives → 1-5 Objectives → 1-5 Actions)</p>
      {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name} • Department: {user.department || 'Not Set'}</p>}

      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>🔔 Notifications ({notifications.length})</h3>
          {notifications.slice(0, 3).map(notif => (
            <div key={notif.id} style={{ padding: '0.75rem', background: 'white', borderRadius: '4px', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>{notif.goalTitle}</strong>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#666' }}>{notif.message}</p>
              </div>
              <button
                onClick={() => { NOTIFICATION_DB.markRead(notif.id); loadNotifications(); }}
                style={{ padding: '0.5rem 1rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
              >
                Dismiss
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Document Upload for RAG */}
      <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#e3f2fd', border: '1px solid #2196F3', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: '#1565c0' }}>📄 Company Documents ({documents.length})</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Upload meeting minutes, strategic plans, or company documents to help AI generate contextually relevant goals and initiatives</p>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <input
            type="file"
            accept=".txt,.docx"
            onChange={handleDocumentUpload}
            disabled={uploading}
            style={{ flex: 1 }}
          />
          {uploading && <span>Uploading...</span>}
        </div>

        {documents.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {documents.map(doc => (
              <div key={doc.id} style={{ padding: '0.5rem 1rem', background: 'white', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span>📄 {doc.name} ({doc.chunkCount} chunks)</span>
                <button
                  onClick={() => { DOCUMENT_DB.delete(doc.id); loadDocuments(); }}
                  style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontSize: '1rem' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2rem', marginBottom: '2rem', borderBottom: '2px solid #ddd' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setShowAdd(false) }}
            style={{
              padding: '1rem 1.5rem',
              background: activeTab === tab.key ? '#646cff' : 'transparent',
              color: activeTab === tab.key ? 'white' : 'black',
              border: 'none',
              borderBottom: activeTab === tab.key ? '3px solid #646cff' : 'none',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            {tab.icon} {tab.label} ({workplan[tab.key].length})
          </button>
        ))}
      </div>

      <button
        onClick={() => setShowAdd(!showAdd)}
        style={{
          marginBottom: '2rem',
          padding: '0.75rem 1.5rem',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        + Add {tabs.find(t => t.key === activeTab)?.label}
      </button>

      <button
        onClick={exportOverallPlan}
        style={{
          marginBottom: '2rem',
          marginLeft: '1rem',
          padding: '0.75rem 1.5rem',
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        📥 Download Complete Plan
      </button>

      {showAdd && (
        <div style={{ padding: '2rem', border: '2px solid #28a745', borderRadius: '8px', marginBottom: '2rem', background: '#f0fff0' }}>
          <h3>Add New {tabs.find(t => t.key === activeTab)?.label}</h3>
          
          {/* Parent Selection */}
          {activeTab === 'initiatives' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Link to Strategic Goal *</label>
              <select
                value={newItem.parentId || ''}
                onChange={(e) => setNewItem({ ...newItem, parentId: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">Select Goal</option>
                {workplan.goals.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'objectives' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Link to Strategic Initiative *</label>
              <select
                value={newItem.parentId || ''}
                onChange={(e) => setNewItem({ ...newItem, parentId: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">Select Initiative</option>
                {workplan.initiatives.map(i => <option key={i.id} value={i.id}>{i.title}</option>)}
              </select>
            </div>
          )}
          {activeTab === 'actions' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Link to Objective *</label>
              <select
                value={newItem.parentId || ''}
                onChange={(e) => setNewItem({ ...newItem, parentId: Number(e.target.value) })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">Select Objective</option>
                {workplan.objectives.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
              </select>
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Title *</label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Department *</label>
              <select
                value={newItem.department}
                onChange={(e) => setNewItem({ ...newItem, department: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">Select Department</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
            <textarea
              value={newItem.description}
              onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
              rows={20}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical', fontSize: '0.95rem', lineHeight: '1.5' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Owner</label>
              <input
                type="text"
                value={newItem.owner}
                onChange={(e) => setNewItem({ ...newItem, owner: e.target.value })}
                placeholder="Person responsible"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Deadline</label>
              <input
                type="date"
                value={newItem.deadline}
                onChange={(e) => setNewItem({ ...newItem, deadline: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Status</label>
              <select
                value={newItem.status}
                onChange={(e) => setNewItem({ ...newItem, status: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={generateWithAI}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              🤖 Generate with AI
            </button>
            <button
              onClick={addItem}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              Add
            </button>
            <button
              onClick={() => setShowAdd(false)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#999',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {workplan[activeTab].length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
            No {tabs.find(t => t.key === activeTab)?.label.toLowerCase()} yet
          </div>
        ) : (
          workplan[activeTab].map(item => (
            <div key={item.id} style={{ 
              padding: '1.5rem', 
              border: '2px solid #ddd', 
              borderRadius: '8px',
              background: 'white',
              borderLeftWidth: '6px',
              borderLeftColor: statusColors[item.status]
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{item.title}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    {item.department} • Created by {item.createdByName} • {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                  <select
                    value={item.status}
                    onChange={(e) => updateItem(item.id, { status: e.target.value })}
                    style={{
                      padding: '0.5rem',
                      background: statusColors[item.status],
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button
                    onClick={() => deleteItem(item.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {item.description && (
                <p style={{ marginBottom: '1rem', color: '#555' }}>{item.description}</p>
              )}

              {/* Start Initiatives Button for Goals */}
              {activeTab === 'goals' && (
                <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={() => {
                      setActiveTab('initiatives')
                      setShowAdd(true)
                      setNewItem({ title: '', description: '', department: item.department, owner: '', deadline: '', status: 'Not Started', parentId: item.id })
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    🚀 Start Strategic Initiatives (up to 5)
                  </button>
                  <button
                    onClick={() => exportGoalChain(item.id)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    📥 Download Goal Chain
                  </button>
                </div>
              )}

              {/* Start Objectives Button for Initiatives */}
              {activeTab === 'initiatives' && (
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => {
                      setActiveTab('objectives')
                      setShowAdd(true)
                      setNewItem({ title: '', description: '', department: item.department, owner: '', deadline: '', status: 'Not Started', parentId: item.id })
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    📊 Start Objectives (up to 5)
                  </button>
                </div>
              )}

              {/* Start Actions Button for Objectives */}
              {activeTab === 'objectives' && (
                <div style={{ marginBottom: '1rem' }}>
                  <button
                    onClick={() => {
                      setActiveTab('actions')
                      setShowAdd(true)
                      setNewItem({ title: '', description: '', department: item.department, owner: '', deadline: '', status: 'Not Started', parentId: item.id })
                    }}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    ✅ Start Action Plans (up to 5)
                  </button>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                {item.owner && (
                  <div style={{ padding: '0.75rem', background: '#f9f9f9', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Owner</div>
                    <div style={{ fontWeight: 'bold' }}>{item.owner}</div>
                  </div>
                )}
                {item.deadline && (
                  <div style={{ padding: '0.75rem', background: '#f9f9f9', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Deadline</div>
                    <div style={{ fontWeight: 'bold' }}>{new Date(item.deadline).toLocaleDateString()}</div>
                  </div>
                )}
                {item.lastUpdatedBy && (
                  <div style={{ padding: '0.75rem', background: '#f9f9f9', borderRadius: '4px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>Last Updated</div>
                    <div style={{ fontWeight: 'bold' }}>{item.lastUpdatedBy}</div>
                  </div>
                )}
              </div>

              {item.updates.length > 0 && (
                <details style={{ marginTop: '1rem' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 'bold', color: '#646cff' }}>
                    View Update History ({item.updates.length})
                  </summary>
                  <div style={{ marginTop: '0.5rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
                    {item.updates.map((update, i) => (
                      <div key={i} style={{ marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid #ddd' }}>
                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                          {update.by} • {new Date(update.at).toLocaleString()}
                        </div>
                        <div style={{ fontSize: '0.85rem' }}>
                          {Object.entries(update.changes).map(([key, val]) => (
                            <div key={key}>{key}: {val}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
