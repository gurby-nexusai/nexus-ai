import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../components/Auth'

const DEPARTMENTS = ['HR', 'Finance', 'Operations', 'Sales', 'Marketing', 'IT', 'Product', 'Customer Service']

const CHAT_DB = {
  getTopics: () => JSON.parse(localStorage.getItem('chat_topics') || '[]'),
  saveTopic: (topic) => {
    const topics = CHAT_DB.getTopics()
    topics.push(topic)
    localStorage.setItem('chat_topics', JSON.stringify(topics))
  },
  updateTopic: (id, updates) => {
    const topics = CHAT_DB.getTopics()
    const idx = topics.findIndex(t => t.id === id)
    if (idx !== -1) {
      topics[idx] = { ...topics[idx], ...updates }
      localStorage.setItem('chat_topics', JSON.stringify(topics))
    }
  },
  getTopic: (id) => CHAT_DB.getTopics().find(t => t.id === id)
}

export default function AnonymousChat() {
  const { user, logAction } = useAuth()
  const [topics, setTopics] = useState([])
  const [activeTopic, setActiveTopic] = useState(null)
  const [newTopicTitle, setNewTopicTitle] = useState('')
  const [newTopicDesc, setNewTopicDesc] = useState('')
  const [department, setDepartment] = useState('HR')
  const [message, setMessage] = useState('')
  const [showNewTopic, setShowNewTopic] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadTopics()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [activeTopic?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadTopics = () => {
    setTopics(CHAT_DB.getTopics())
  }

  const createTopic = () => {
    if (!newTopicTitle.trim()) return

    const topic = {
      id: Date.now(),
      title: newTopicTitle,
      description: newTopicDesc,
      department,
      createdBy: user?.email,
      createdByAnonymous: `Anonymous ${Math.floor(Math.random() * 9999)}`,
      createdAt: new Date().toISOString(),
      messages: [],
      participants: 0,
      status: 'Active'
    }

    CHAT_DB.saveTopic(topic)
    loadTopics()
    setNewTopicTitle('')
    setNewTopicDesc('')
    setShowNewTopic(false)
    logAction?.('create_chat_topic', { department, title: newTopicTitle })
  }

  const sendMessage = () => {
    if (!message.trim() || !activeTopic) return

    const msg = {
      id: Date.now(),
      text: message,
      sender: `Anonymous ${Math.floor(Math.random() * 9999)}`,
      timestamp: new Date().toISOString(),
      reactions: { thumbsUp: 0, heart: 0, lightbulb: 0 }
    }

    const updatedMessages = [...(activeTopic.messages || []), msg]
    const uniqueParticipants = new Set(updatedMessages.map(m => m.sender)).size

    CHAT_DB.updateTopic(activeTopic.id, { 
      messages: updatedMessages,
      participants: uniqueParticipants
    })

    const updated = CHAT_DB.getTopic(activeTopic.id)
    setActiveTopic(updated)
    loadTopics()
    setMessage('')
    logAction?.('send_anonymous_message', { topicId: activeTopic.id })
  }

  const reactToMessage = (msgId, reaction) => {
    const updatedMessages = activeTopic.messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          reactions: {
            ...m.reactions,
            [reaction]: (m.reactions[reaction] || 0) + 1
          }
        }
      }
      return m
    })

    CHAT_DB.updateTopic(activeTopic.id, { messages: updatedMessages })
    const updated = CHAT_DB.getTopic(activeTopic.id)
    setActiveTopic(updated)
    loadTopics()
  }

  const closeTopic = (topicId) => {
    CHAT_DB.updateTopic(topicId, { status: 'Closed' })
    loadTopics()
    if (activeTopic?.id === topicId) setActiveTopic(null)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>💬 Anonymous Idea Chat</h1>
        <p style={{ color: '#666' }}>Department-based anonymous discussions for open idea sharing</p>
        {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>Logged in as: {user.name} (You appear as Anonymous in chats)</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: activeTopic ? '350px 1fr' : '1fr', gap: '2rem' }}>
        {/* Topics List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Discussion Topics ({topics.length})</h3>
            <button
              onClick={() => setShowNewTopic(!showNewTopic)}
              style={{
                padding: '0.5rem 1rem',
                background: '#646cff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              + New Topic
            </button>
          </div>

          {showNewTopic && (
            <div style={{ padding: '1rem', border: '2px solid #646cff', borderRadius: '8px', marginBottom: '1rem', background: '#f9f9ff' }}>
              <h4 style={{ margin: '0 0 1rem 0' }}>Create New Topic</h4>
              
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Topic Title</label>
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  placeholder="e.g., How can we improve remote work?"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Description</label>
                <textarea
                  value={newTopicDesc}
                  onChange={(e) => setNewTopicDesc(e.target.value)}
                  placeholder="Provide context for the discussion..."
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={createTopic}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewTopic(false)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
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

          <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
            {topics.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
                No topics yet. Create the first one!
              </div>
            ) : (
              topics.map(topic => (
                <div
                  key={topic.id}
                  onClick={() => setActiveTopic(topic)}
                  style={{
                    padding: '1rem',
                    border: activeTopic?.id === topic.id ? '2px solid #646cff' : '1px solid #ddd',
                    borderRadius: '8px',
                    marginBottom: '0.75rem',
                    cursor: 'pointer',
                    background: activeTopic?.id === topic.id ? '#f0f0ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <strong style={{ flex: 1 }}>{topic.title}</strong>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.25rem 0.5rem',
                      background: topic.status === 'Active' ? '#d4edda' : '#f8d7da',
                      color: topic.status === 'Active' ? '#155724' : '#721c24',
                      borderRadius: '4px'
                    }}>
                      {topic.status}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                    {topic.description}
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#999' }}>
                    <span>🏢 {topic.department}</span>
                    <span>💬 {topic.messages?.length || 0} messages</span>
                    <span>👥 {topic.participants || 0} participants</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        {activeTopic && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '800px', border: '2px solid #ddd', borderRadius: '8px', background: 'white' }}>
            {/* Chat Header */}
            <div style={{ padding: '1rem', borderBottom: '2px solid #ddd', background: '#f9f9f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>{activeTopic.title}</h3>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>{activeTopic.description}</div>
                  <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '0.5rem' }}>
                    🏢 {activeTopic.department} • Started by {activeTopic.createdByAnonymous} • {new Date(activeTopic.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {user?.email === activeTopic.createdBy && activeTopic.status === 'Active' && (
                  <button
                    onClick={() => closeTopic(activeTopic.id)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    Close Topic
                  </button>
                )}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
              {activeTopic.messages?.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#999' }}>
                  No messages yet. Start the conversation!
                </div>
              ) : (
                activeTopic.messages.map(msg => (
                  <div key={msg.id} style={{ marginBottom: '1rem' }}>
                    <div style={{
                      padding: '1rem',
                      background: '#f0f0f0',
                      borderRadius: '8px',
                      borderLeft: '4px solid #646cff'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <strong style={{ color: '#646cff' }}>{msg.sender}</strong>
                        <span style={{ fontSize: '0.75rem', color: '#999' }}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={{ marginBottom: '0.75rem' }}>{msg.text}</div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => reactToMessage(msg.id, 'thumbsUp')}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          👍 {msg.reactions.thumbsUp || 0}
                        </button>
                        <button
                          onClick={() => reactToMessage(msg.id, 'heart')}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          ❤️ {msg.reactions.heart || 0}
                        </button>
                        <button
                          onClick={() => reactToMessage(msg.id, 'lightbulb')}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: 'white',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
                          }}
                        >
                          💡 {msg.reactions.lightbulb || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            {activeTopic.status === 'Active' ? (
              <div style={{ padding: '1rem', borderTop: '2px solid #ddd' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Share your ideas anonymously..."
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '0.95rem'
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!message.trim()}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: '#646cff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: message.trim() ? 'pointer' : 'not-allowed',
                      fontWeight: 'bold'
                    }}
                  >
                    Send
                  </button>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '0.5rem' }}>
                  🔒 Your identity is protected. You appear as Anonymous.
                </div>
              </div>
            ) : (
              <div style={{ padding: '1rem', borderTop: '2px solid #ddd', background: '#f8d7da', textAlign: 'center', color: '#721c24' }}>
                This topic has been closed. No new messages can be added.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
