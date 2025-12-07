import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'

const SUGGESTION_DB = {
  getAll: () => JSON.parse(localStorage.getItem('suggestions') || '[]'),
  save: (suggestion) => {
    const suggestions = SUGGESTION_DB.getAll()
    suggestions.push(suggestion)
    localStorage.setItem('suggestions', JSON.stringify(suggestions))
  },
  update: (id, updates) => {
    const suggestions = SUGGESTION_DB.getAll()
    const idx = suggestions.findIndex(s => s.id === id)
    if (idx !== -1) {
      suggestions[idx] = { ...suggestions[idx], ...updates }
      localStorage.setItem('suggestions', JSON.stringify(suggestions))
    }
  },
  getByUser: (email) => SUGGESTION_DB.getAll().filter(s => s.submittedBy === email)
}

export default function SuggestionScheme() {
  const { user, logAction } = useAuth()
  const [suggestions, setSuggestions] = useState([])
  const [mySuggestions, setMySuggestions] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('Process Improvement')
  const [submitting, setSubmitting] = useState(false)
  const [evaluating, setEvaluating] = useState(false)
  const [filter, setFilter] = useState('All')
  const [myEarnings, setMyEarnings] = useState(0)
  
  // Get global LLM settings
  const llmProvider = localStorage.getItem('llmProvider') || 'ollama'
  const apiKey = localStorage.getItem('llmApiKey') || ''

  useEffect(() => {
    loadSuggestions()
  }, [user])

  const loadSuggestions = () => {
    const all = SUGGESTION_DB.getAll()
    setSuggestions(all)
    
    if (user) {
      const mine = SUGGESTION_DB.getByUser(user.email)
      setMySuggestions(mine)
      setMyEarnings(mine.reduce((sum, s) => sum + (s.reward || 0), 0))
    }
  }

  const submitSuggestion = async () => {
    if (!title.trim() || !description.trim()) return
    
    setSubmitting(true)
    
    const suggestion = {
      id: Date.now(),
      title,
      description,
      category,
      submittedBy: user?.email,
      submittedByName: user?.name,
      submittedAt: new Date().toISOString(),
      status: 'Pending Review',
      reward: 1, // Base reward for submission
      votes: 0,
      comments: []
    }
    
    // AI evaluation
    const context = `
Suggestion Title: ${title}
Category: ${category}
Description: ${description}

Evaluate this workplace improvement suggestion.`
    
    const systemPrompt = `You are an AI evaluator for workplace suggestions. Analyze and provide:
1. Potential Impact Score (0-100)
2. Estimated Annual Savings (in USD)
3. Implementation Difficulty (Easy/Medium/Hard)
4. Key Benefits (3-5 points)
5. Potential Challenges (2-3 points)

Be specific and realistic.`
    
    try {
      const evaluation = await callLLM('Evaluate this suggestion', context, systemPrompt, llmProvider, apiKey)
      
      const savingsMatch = evaluation.match(/savings?[:\s]+\$?([\d,]+)/i)
      const estimatedSavings = savingsMatch ? parseInt(savingsMatch[1].replace(/,/g, '')) : 0
      const impactMatch = evaluation.match(/impact[:\s]+(\d+)/i)
      const impactScore = impactMatch ? parseInt(impactMatch[1]) : 50
      
      suggestion.aiEvaluation = evaluation
      suggestion.estimatedSavings = estimatedSavings
      suggestion.impactScore = impactScore
      
      // Calculate bonus reward based on impact
      if (impactScore >= 80) suggestion.reward += 5
      else if (impactScore >= 60) suggestion.reward += 3
      
    } catch (error) {
      suggestion.aiEvaluation = 'AI evaluation unavailable. Manual review required.'
      suggestion.estimatedSavings = 0
      suggestion.impactScore = 0
    }
    
    SUGGESTION_DB.save(suggestion)
    loadSuggestions()
    logAction?.('submit_suggestion', { title, category })
    
    setTitle('')
    setDescription('')
    setSubmitting(false)
    
    alert(`Suggestion submitted! You earned $${suggestion.reward}`)
  }

  const voteSuggestion = (id) => {
    SUGGESTION_DB.update(id, { votes: (suggestions.find(s => s.id === id)?.votes || 0) + 1 })
    loadSuggestions()
    logAction?.('vote_suggestion', { id })
  }

  const updateStatus = (id, status, adminNotes = '') => {
    const suggestion = suggestions.find(s => s.id === id)
    if (!suggestion) return
    
    let additionalReward = 0
    let payoutApproved = undefined
    
    if (status === 'Approved') {
      additionalReward = 2
      payoutApproved = true
    } else if (status === 'Rejected') {
      payoutApproved = false
    } else if (status === 'Implemented') {
      additionalReward = 2
      if (suggestion.estimatedSavings > 10000) additionalReward += 1
      if (suggestion.estimatedSavings > 50000) additionalReward += 1
    }
    
    const updates = { 
      status,
      reward: (suggestion.reward || 0) + additionalReward,
      reviewedBy: user?.email,
      reviewedAt: new Date().toISOString(),
      adminNotes
    }
    
    if (payoutApproved !== undefined) {
      updates.payoutApproved = payoutApproved
      updates.payoutApprovedBy = user?.email
      updates.payoutApprovedAt = new Date().toISOString()
    }
    
    SUGGESTION_DB.update(id, updates)
    
    loadSuggestions()
    alert(`✓ Suggestion ${status}! Reward: $${additionalReward}`)
  }

  const getCurrentYear = () => new Date().getFullYear()
  
  const getAnnualLeaderboard = () => {
    const currentYear = getCurrentYear()
    const yearStart = new Date(currentYear, 0, 1)
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59)
    
    const yearSuggestions = suggestions.filter(s => {
      const date = new Date(s.submittedAt)
      return date >= yearStart && date <= yearEnd
    })
    
    const userStats = {}
    yearSuggestions.forEach(s => {
      if (!userStats[s.submittedBy]) {
        userStats[s.submittedBy] = {
          name: s.submittedByName,
          totalSuggestions: 0,
          implemented: 0,
          totalRewards: 0,
          totalSavings: 0
        }
      }
      userStats[s.submittedBy].totalSuggestions++
      if (s.status === 'Implemented') userStats[s.submittedBy].implemented++
      userStats[s.submittedBy].totalRewards += s.reward || 0
      userStats[s.submittedBy].totalSavings += s.estimatedSavings || 0
    })
    
    return Object.values(userStats).sort((a, b) => b.totalSavings - a.totalSavings).slice(0, 10)
  }

  const isAdmin = user?.email === 'admin@example.com' || user?.role === 'admin'

  const getTopSuggestions = () => {
    return [...suggestions]
      .filter(s => s.status === 'Implemented')
      .sort((a, b) => (b.estimatedSavings || 0) - (a.estimatedSavings || 0))
      .slice(0, 5)
  }

  const filteredSuggestions = filter === 'All' 
    ? suggestions 
    : suggestions.filter(s => s.category === filter)

  const categories = ['Process Improvement', 'Cost Reduction', 'Safety', 'Technology', 'Customer Service', 'Sustainability', 'Other']

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>💡 Workplace Suggestion Scheme</h1>
          <p style={{ color: '#666' }}>Submit ideas, earn rewards, win annual awards (AI-powered evaluation)</p>
          {user && (
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</span>
              <span style={{ 
                marginLeft: '1rem', 
                padding: '0.25rem 0.75rem', 
                background: '#28a745', 
                color: 'white', 
                borderRadius: '12px',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}>
                💰 Total Earnings: ${myEarnings}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Dashboard */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{suggestions.length}</div>
          <div>Total Suggestions</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{mySuggestions.length}</div>
          <div>My Suggestions</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            ${suggestions.reduce((sum, s) => sum + (s.estimatedSavings || 0), 0).toLocaleString()}
          </div>
          <div>Total Potential Savings</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
            {suggestions.filter(s => s.status === 'Implemented').length}
          </div>
          <div>Implemented</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Submit Form */}
        <div>
          <div style={{ padding: '1.5rem', border: '2px solid #ddd', borderRadius: '8px', background: 'white', marginBottom: '2rem' }}>
            <h3>Submit New Suggestion</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
              Earn $2 per submission + bonuses for high-impact ideas!
            </p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief title for your suggestion"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your suggestion in detail. Include expected benefits and how to implement it."
                rows={6}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
              />
            </div>

            <button
              onClick={submitSuggestion}
              disabled={submitting || !title.trim() || !description.trim()}
              style={{ 
                width: '100%', 
                padding: '0.75rem', 
                background: '#646cff', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: submitting ? 'not-allowed' : 'pointer'
              }}
            >
              {submitting ? '🤖 AI Evaluating...' : '💡 Submit Suggestion'}
            </button>
          </div>

          {/* Annual Award Leaderboard */}
          <div style={{ padding: '1.5rem', border: '2px solid #ffd700', borderRadius: '8px', background: '#fffef0', marginBottom: '1rem' }}>
            <h3>🏆 {getCurrentYear()} Annual Award Leaderboard</h3>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
              Competition runs Jan 1 - Dec 31 • Top 3 win annual awards
            </p>
            {getAnnualLeaderboard().map((user, i) => (
              <div key={i} style={{ 
                padding: '0.75rem', 
                marginBottom: '0.5rem', 
                background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'white',
                borderRadius: '4px',
                border: '1px solid #ddd'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong>{user.name}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {user.totalSuggestions} suggestions • {user.implemented} implemented • ${user.totalSavings.toLocaleString()} savings • ${user.totalRewards} earned
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions List */}
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {['All', ...categories].map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                style={{
                  padding: '0.5rem 1rem',
                  background: filter === cat ? '#646cff' : 'white',
                  color: filter === cat ? 'white' : 'black',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ maxHeight: '800px', overflowY: 'auto' }}>
            {filteredSuggestions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#666', border: '2px dashed #ddd', borderRadius: '8px' }}>
                No suggestions yet. Be the first to submit!
              </div>
            ) : (
              filteredSuggestions.map(suggestion => (
                <div key={suggestion.id} style={{ 
                  padding: '1.5rem', 
                  border: '2px solid #ddd', 
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  background: 'white',
                  borderLeftWidth: '6px',
                  borderLeftColor: 
                    suggestion.status === 'Implemented' ? '#28a745' :
                    suggestion.status === 'Approved' ? '#4dabf7' :
                    suggestion.status === 'Rejected' ? '#ff6b6b' : '#ffa500'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>{suggestion.title}</h4>
                      <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem' }}>
                        by {suggestion.submittedByName} • {new Date(suggestion.submittedAt).toLocaleDateString()} • {suggestion.category}
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          background: '#f0f0f0', 
                          borderRadius: '4px' 
                        }}>
                          {suggestion.status}
                        </span>
                        <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                          💰 ${suggestion.reward}
                        </span>
                        {suggestion.estimatedSavings > 0 && (
                          <span style={{ fontWeight: 'bold', color: '#646cff' }}>
                            💵 ${suggestion.estimatedSavings.toLocaleString()} potential savings
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => voteSuggestion(suggestion.id)}
                        style={{ 
                          padding: '0.5rem 1rem',
                          background: '#f0f0f0',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        👍 {suggestion.votes}
                      </button>
                    </div>
                  </div>

                  <p style={{ marginBottom: '1rem', color: '#333' }}>{suggestion.description}</p>

                  {suggestion.aiEvaluation && (
                    <div style={{ 
                      padding: '1rem', 
                      background: '#f9f9f9', 
                      borderRadius: '4px',
                      marginBottom: '1rem',
                      fontSize: '0.9rem'
                    }}>
                      <strong>🤖 AI Evaluation:</strong>
                      <div style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem' }}>
                        {suggestion.aiEvaluation}
                      </div>
                      {suggestion.impactScore > 0 && (
                        <div style={{ marginTop: '0.5rem', fontWeight: 'bold' }}>
                          Impact Score: {suggestion.impactScore}/100
                        </div>
                      )}
                    </div>
                  )}

                  {isAdmin && suggestion.status === 'Pending Review' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', padding: '1rem', background: '#fff3cd', borderRadius: '4px' }}>
                      <strong style={{ marginRight: '0.5rem' }}>Admin Actions:</strong>
                      <button
                        onClick={() => {
                          const notes = prompt('Admin notes (optional):')
                          updateStatus(suggestion.id, 'Approved', notes || '')
                        }}
                        style={{ 
                          padding: '0.5rem 1rem',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        ✅ Approve (+$2)
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Reason for rejection:')
                          if (notes) updateStatus(suggestion.id, 'Rejected', notes)
                        }}
                        style={{ 
                          padding: '0.5rem 1rem',
                          background: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        ❌ Reject
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Implementation notes (optional):')
                          updateStatus(suggestion.id, 'Implemented', notes || '')
                        }}
                        style={{ 
                          padding: '0.5rem 1rem',
                          background: '#646cff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        🚀 Mark Implemented (+$2-4)
                      </button>
                    </div>
                  )}
                  
                  {suggestion.adminNotes && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#fff3cd', borderRadius: '4px', fontSize: '0.9rem' }}>
                      <strong>Admin Notes:</strong> {suggestion.adminNotes}
                      {suggestion.reviewedBy && (
                        <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>
                          Reviewed by {suggestion.reviewedBy} on {new Date(suggestion.reviewedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
