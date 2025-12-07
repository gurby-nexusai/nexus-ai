import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import DataManagement from './DataManagement'

const ADMIN_DB = {
  getUsers: () => JSON.parse(localStorage.getItem('users') || '[]'),
  updateUser: (email, updates) => {
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const idx = users.findIndex(u => u.email === email)
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates }
      localStorage.setItem('users', JSON.stringify(users))
    }
  }
}

const SUGGESTION_DB = {
  getAll: () => JSON.parse(localStorage.getItem('suggestions') || '[]'),
  update: (id, updates) => {
    const suggestions = JSON.parse(localStorage.getItem('suggestions') || '[]')
    const idx = suggestions.findIndex(s => s.id === id)
    if (idx !== -1) {
      suggestions[idx] = { ...suggestions[idx], ...updates }
      localStorage.setItem('suggestions', JSON.stringify(suggestions))
    }
  }
}

const APP_CONFIG_DB = {
  getAll: () => JSON.parse(localStorage.getItem('app_config') || '{}'),
  toggle: (appId) => {
    const config = APP_CONFIG_DB.getAll()
    config[appId] = !config[appId]
    localStorage.setItem('app_config', JSON.stringify(config))
  },
  isActive: (appId) => {
    const config = APP_CONFIG_DB.getAll()
    return config[appId] !== false // Default to active if not set
  }
}

export default function AdminApp() {
  const { user, logAction } = useAuth()
  const [users, setUsers] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [apps, setApps] = useState([])
  const [activeTab, setActiveTab] = useState('users')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!isAdmin()) {
      alert('Access denied. Admin only.')
      return
    }
    loadData()
    loadApps()
  }, [])

  const isAdmin = () => {
    return user?.role === 'admin' || user?.email === 'admin@example.com'
  }

  const loadData = () => {
    setUsers(ADMIN_DB.getUsers())
    setSuggestions(SUGGESTION_DB.getAll())
  }

  const loadApps = () => {
    // Get app list from parent component's AI_SOLUTIONS
    const appList = [
      { id: 1, name: 'AI Writing Assistant' },
      { id: 2, name: 'AI Presentation Generator' },
      { id: 3, name: 'AI Anonymous Idea Chat' },
      { id: 4, name: 'AI Event Manager' },
      { id: 5, name: 'AI Voting/Polling System' },
      { id: 6, name: 'AI Open Meeting Scheduler' },
      { id: 7, name: 'AI ROI Calculator' },
      { id: 8, name: 'AI Internal Customer Support' },
      { id: 9, name: 'AI IT/Technical Support' },
      { id: 10, name: 'AI Analytics Platform' },
      { id: 11, name: 'AI Compliance Monitor' },
      { id: 12, name: 'AI App Analytics & SEO' },
      { id: 13, name: 'AI Suggestion Scheme' },
      { id: 14, name: 'AI Workplan Collaboration' },
      { id: 15, name: 'AI Admin Dashboard' },
      { id: 16, name: 'AI Knowledge Management' },
      { id: 17, name: 'AI External Customer Support' },
      { id: 18, name: 'AI Contract Review' },
      { id: 19, name: 'AI Recruitment Assistant' },
      { id: 20, name: 'AI Annual Performance Assessment' }
    ]
    setApps(appList)
  }

  const toggleApp = (appId) => {
    APP_CONFIG_DB.toggle(appId)
    loadApps() // Refresh to show updated state
    logAction?.('toggle_app', { appId, active: APP_CONFIG_DB.isActive(appId) })
  }

  const updateUserRole = (email, role) => {
    ADMIN_DB.updateUser(email, { role })
    loadData()
    logAction?.('update_user_role', { email, role })
  }

  const approvePayout = (suggestionId, approved, notes) => {
    const suggestion = suggestions.find(s => s.id === suggestionId)
    
    SUGGESTION_DB.update(suggestionId, {
      payoutApproved: approved,
      payoutApprovedBy: user?.email,
      payoutApprovedAt: new Date().toISOString(),
      payoutNotes: notes
    })
    
    loadData()
    logAction?.('approve_payout', { suggestionId, approved })
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
    loadData()
    alert(`✓ Suggestion ${status}! Reward: $${additionalReward}`)
  }

  const filteredSuggestions = suggestions.filter(s => {
    if (filter === 'pending_review') return s.status === 'Pending Review'
    if (filter === 'pending_payout') return s.status === 'Implemented' && s.payoutApproved !== true && s.payoutApproved !== false
    if (filter === 'approved_payout') return s.payoutApproved === true || s.status === 'Approved'
    if (filter === 'rejected_payout') return s.payoutApproved === false || s.status === 'Rejected'
    return true
  })

  const totalPendingReview = suggestions.filter(s => s.status === 'Pending Review').length

  const totalPendingPayouts = suggestions
    .filter(s => s.status === 'Implemented' && s.payoutApproved !== true && s.payoutApproved !== false)
    .reduce((sum, s) => sum + (s.reward || 0), 0)

  const totalApprovedPayouts = suggestions
    .filter(s => s.payoutApproved === true || s.status === 'Approved')
    .reduce((sum, s) => sum + (s.reward || 0), 0)

  if (!isAdmin()) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>🚫 Access Denied</h1>
        <p>This area is restricted to administrators only.</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>⚙️ Admin Dashboard</h1>
        <p style={{ color: '#666' }}>Manage users, roles, and approve payouts</p>
        {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>Admin: {user.name}</p>}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '1rem 2rem',
            background: activeTab === 'users' ? '#646cff' : 'transparent',
            color: activeTab === 'users' ? 'white' : 'black',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #646cff' : 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          👥 User Management
        </button>
        <button
          onClick={() => setActiveTab('apps')}
          style={{
            padding: '1rem 2rem',
            background: activeTab === 'apps' ? '#646cff' : 'transparent',
            color: activeTab === 'apps' ? 'white' : 'black',
            border: 'none',
            borderBottom: activeTab === 'apps' ? '3px solid #646cff' : 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📱 App Management
        </button>
        <button
          onClick={() => setActiveTab('data')}
          style={{
            padding: '1rem 2rem',
            background: activeTab === 'data' ? '#646cff' : 'transparent',
            color: activeTab === 'data' ? 'white' : 'black',
            border: 'none',
            borderBottom: activeTab === 'data' ? '3px solid #646cff' : 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          💾 Data Management
        </button>
        <button
          onClick={() => setActiveTab('payouts')}
          style={{
            padding: '1rem 2rem',
            background: activeTab === 'payouts' ? '#646cff' : 'transparent',
            color: activeTab === 'payouts' ? 'white' : 'black',
            border: 'none',
            borderBottom: activeTab === 'payouts' ? '3px solid #646cff' : 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          💰 Payout Approvals
        </button>
      </div>

      {/* Data Management Tab */}
      {activeTab === 'data' && <DataManagement />}

      {/* App Management Tab */}
      {activeTab === 'apps' && (
        <div>
          <h3>Application Management (20 Apps)</h3>
          <p style={{ color: '#666', marginBottom: '2rem' }}>Toggle apps on/off. Deactivated apps will not appear in the marketplace.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {apps.map(app => {
              const isActive = APP_CONFIG_DB.isActive(app.id)
              return (
                <div key={app.id} style={{ 
                  padding: '1.5rem', 
                  border: '2px solid #ddd', 
                  borderRadius: '8px',
                  background: isActive ? 'white' : '#f5f5f5',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: isActive ? 1 : 0.6
                }}>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0' }}>{app.name}</h4>
                    <span style={{ 
                      fontSize: '0.85rem', 
                      padding: '0.25rem 0.75rem', 
                      background: isActive ? '#28a745' : '#999',
                      color: 'white',
                      borderRadius: '12px'
                    }}>
                      {isActive ? '✓ Active' : '✗ Inactive'}
                    </span>
                  </div>
                  <button
                    onClick={() => toggleApp(app.id)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      background: isActive ? '#ff6b6b' : '#28a745',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: 'bold'
                    }}
                  >
                    {isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div>
          <h3>Registered Users ({users.length})</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white' }}>
              <thead>
                <tr style={{ background: '#f0f0f0' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Role</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Engagements</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Joined</th>
                  <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '1rem' }}>{u.name}</td>
                    <td style={{ padding: '1rem' }}>{u.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <select
                        value={u.role || 'user'}
                        onChange={(e) => updateUserRole(u.email, e.target.value)}
                        style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                    <td style={{ padding: '1rem' }}>{u.engagements?.length || 0}</td>
                    <td style={{ padding: '1rem' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem' }}>
                      <button
                        onClick={() => {
                          const newRole = u.role === 'admin' ? 'user' : 'admin'
                          updateUserRole(u.email, newRole)
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          background: u.role === 'admin' ? '#ff6b6b' : '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.85rem'
                        }}
                      >
                        {u.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payout Approvals Tab */}
      {activeTab === 'payouts' && (
        <div>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #646cff 0%, #764ba2 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{totalPendingReview}</div>
              <div>Pending Review</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #ffa500 0%, #ff6b6b 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>${totalPendingPayouts}</div>
              <div>Pending Payouts</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>${totalApprovedPayouts}</div>
              <div>Approved Payouts</div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            {['all', 'pending_review', 'pending_payout', 'approved_payout', 'rejected_payout'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: filter === f ? '#646cff' : 'white',
                  color: filter === f ? 'white' : 'black',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                {f.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>

          {/* Suggestions List */}
          <div style={{ display: 'grid', gap: '1rem' }}>
            {filteredSuggestions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
                No suggestions to review
              </div>
            ) : (
              filteredSuggestions.map(suggestion => (
                <div key={suggestion.id} style={{
                  padding: '1.5rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  background: 'white',
                  borderLeftWidth: '6px',
                  borderLeftColor: suggestion.payoutApproved === true ? '#28a745' : 
                                   suggestion.payoutApproved === false ? '#ff6b6b' : '#ffa500'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: '0 0 0.5rem 0' }}>{suggestion.title}</h4>
                      <div style={{ fontSize: '0.9rem', color: '#666' }}>
                        By {suggestion.submittedByName} • {suggestion.category} • {new Date(suggestion.submittedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>
                        ${suggestion.reward}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>Reward Amount</div>
                    </div>
                  </div>

                  <p style={{ marginBottom: '1rem' }}>{suggestion.description}</p>

                  {suggestion.estimatedSavings > 0 && (
                    <div style={{ padding: '0.75rem', background: '#d4edda', borderRadius: '4px', marginBottom: '1rem' }}>
                      <strong>💵 Estimated Savings:</strong> ${suggestion.estimatedSavings.toLocaleString()}
                    </div>
                  )}

                  {suggestion.aiEvaluation && (
                    <div style={{ padding: '0.75rem', background: '#f0f0ff', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                      <strong>🤖 AI Evaluation:</strong>
                      <div style={{ marginTop: '0.5rem' }}>{suggestion.aiEvaluation.slice(0, 200)}...</div>
                    </div>
                  )}

                  {suggestion.status === 'Pending Review' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        onClick={() => {
                          const notes = prompt('Admin notes (optional):')
                          updateStatus(suggestion.id, 'Approved', notes || '')
                        }}
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
                        ✅ Approve (+$2)
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Reason for rejection:')
                          if (notes) updateStatus(suggestion.id, 'Rejected', notes)
                        }}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
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
                          flex: 1,
                          padding: '0.75rem',
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

                  {suggestion.payoutApproved === undefined && suggestion.status === 'Implemented' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        onClick={() => {
                          const notes = prompt('Approval notes (optional):')
                          approvePayout(suggestion.id, true, notes)
                        }}
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
                        ✅ Approve Payout
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Rejection reason:')
                          if (notes) approvePayout(suggestion.id, false, notes)
                        }}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: '#ff6b6b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        ❌ Reject Payout
                      </button>
                    </div>
                  )}

                  {suggestion.payoutApproved !== undefined && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '1rem', 
                      background: suggestion.payoutApproved ? '#d4edda' : '#f8d7da',
                      borderRadius: '4px'
                    }}>
                      <strong>
                        {suggestion.payoutApproved ? '✅ Payout Approved' : '❌ Payout Rejected'}
                      </strong>
                      <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        By {suggestion.payoutApprovedBy} on {new Date(suggestion.payoutApprovedAt).toLocaleDateString()}
                      </div>
                      {suggestion.payoutNotes && (
                        <div style={{ fontSize: '0.9rem', marginTop: '0.5rem', fontStyle: 'italic' }}>
                          Notes: {suggestion.payoutNotes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
