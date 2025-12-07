import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'

const DEPARTMENTS = ['HR', 'Finance', 'Operations', 'Sales', 'Marketing', 'IT', 'Product', 'Customer Service', 'Executive']

const VOTE_DB = {
  getAll: () => JSON.parse(localStorage.getItem('votes') || '[]'),
  save: (vote) => {
    const votes = VOTE_DB.getAll()
    votes.push(vote)
    localStorage.setItem('votes', JSON.stringify(votes))
  },
  update: (id, updates) => {
    const votes = VOTE_DB.getAll()
    const idx = votes.findIndex(v => v.id === id)
    if (idx !== -1) {
      votes[idx] = { ...votes[idx], ...updates }
      localStorage.setItem('votes', JSON.stringify(votes))
    }
  }
}

export default function VotingSystem() {
  const { user, logAction } = useAuth()
  const [proposals, setProposals] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState('active')
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    department: 'HR',
    options: ['Yes', 'No'],
    endDate: '',
    anonymous: false
  })

  useEffect(() => {
    loadProposals()
  }, [])

  const loadProposals = () => {
    setProposals(VOTE_DB.getAll())
  }

  const createProposal = () => {
    if (!newProposal.title || !newProposal.endDate) return

    const proposal = {
      id: Date.now(),
      ...newProposal,
      createdBy: user?.email,
      createdByName: user?.name,
      createdAt: new Date().toISOString(),
      votes: {},
      voters: [],
      status: 'Active'
    }

    VOTE_DB.save(proposal)
    loadProposals()
    setNewProposal({
      title: '',
      description: '',
      department: 'HR',
      options: ['Yes', 'No'],
      endDate: '',
      anonymous: false
    })
    setShowCreate(false)
    logAction?.('create_proposal', { title: proposal.title, department: proposal.department })
  }

  const castVote = (proposalId, option) => {
    const proposal = proposals.find(p => p.id === proposalId)
    if (!proposal) return

    // Create anonymous voter ID
    const anonymousId = `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Check if already voted (using anonymous tracking)
    const hasVoted = localStorage.getItem(`voted_${proposalId}_${user?.email}`)
    if (hasVoted) {
      alert('You have already voted on this proposal')
      return
    }

    // Check if expired
    if (new Date(proposal.endDate) < new Date()) {
      alert('Voting has ended')
      return
    }

    const updatedVotes = { ...proposal.votes }
    updatedVotes[option] = (updatedVotes[option] || 0) + 1

    // Store anonymous vote tracking
    localStorage.setItem(`voted_${proposalId}_${user?.email}`, 'true')

    VOTE_DB.update(proposalId, {
      votes: updatedVotes,
      voters: [...proposal.voters, anonymousId] // Store anonymous ID only
    })

    loadProposals()
    logAction?.('cast_vote', { proposalId, option: 'anonymous' })
  }

  const closeProposal = (proposalId) => {
    VOTE_DB.update(proposalId, { status: 'Closed' })
    loadProposals()
  }

  const addOption = () => {
    setNewProposal({
      ...newProposal,
      options: [...newProposal.options, '']
    })
  }

  const updateOption = (index, value) => {
    const updated = [...newProposal.options]
    updated[index] = value
    setNewProposal({ ...newProposal, options: updated })
  }

  const removeOption = (index) => {
    if (newProposal.options.length <= 2) return
    const updated = newProposal.options.filter((_, i) => i !== index)
    setNewProposal({ ...newProposal, options: updated })
  }

  const getFilteredProposals = () => {
    return proposals.filter(p => {
      const isExpired = new Date(p.endDate) < new Date()
      if (filter === 'active') return !isExpired && p.status === 'Active'
      if (filter === 'closed') return isExpired || p.status === 'Closed'
      if (filter === 'myVotes') return localStorage.getItem(`voted_${p.id}_${user?.email}`) === 'true'
      return true
    })
  }

  const getTotalVotes = (proposal) => {
    return Object.values(proposal.votes).reduce((sum, count) => sum + count, 0)
  }

  const getPercentage = (proposal, option) => {
    const total = getTotalVotes(proposal)
    if (total === 0) return 0
    return ((proposal.votes[option] || 0) / total * 100).toFixed(1)
  }

  const filteredProposals = getFilteredProposals()

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>🗳️ Voting System</h1>
        <p style={{ color: '#666' }}>Create and vote on proposals from any department</p>
        {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setFilter('active')}
          style={{
            padding: '0.75rem 1.5rem',
            background: filter === 'active' ? '#646cff' : 'white',
            color: filter === 'active' ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Active Votes
        </button>
        <button
          onClick={() => setFilter('myVotes')}
          style={{
            padding: '0.75rem 1.5rem',
            background: filter === 'myVotes' ? '#646cff' : 'white',
            color: filter === 'myVotes' ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          My Votes
        </button>
        <button
          onClick={() => setFilter('closed')}
          style={{
            padding: '0.75rem 1.5rem',
            background: filter === 'closed' ? '#646cff' : 'white',
            color: filter === 'closed' ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Closed
        </button>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            marginLeft: 'auto',
            padding: '0.75rem 1.5rem',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          + Create Proposal
        </button>
      </div>

      {showCreate && (
        <div style={{ padding: '2rem', border: '2px solid #28a745', borderRadius: '8px', marginBottom: '2rem', background: '#f0fff0' }}>
          <h3 style={{ margin: '0 0 1.5rem 0' }}>Create New Proposal</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Proposal Title *</label>
            <input
              type="text"
              value={newProposal.title}
              onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
              placeholder="e.g., Should we implement flexible work hours?"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
            <textarea
              value={newProposal.description}
              onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
              placeholder="Provide details about the proposal..."
              rows={4}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Department</label>
              <select
                value={newProposal.department}
                onChange={(e) => setNewProposal({ ...newProposal, department: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Voting Ends *</label>
              <input
                type="date"
                value={newProposal.endDate}
                onChange={(e) => setNewProposal({ ...newProposal, endDate: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Voting Options</label>
            {newProposal.options.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                {newProposal.options.length > 2 && (
                  <button
                    onClick={() => removeOption(index)}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addOption}
              style={{
                padding: '0.5rem 1rem',
                background: '#646cff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              + Add Option
            </button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={newProposal.anonymous}
                onChange={(e) => setNewProposal({ ...newProposal, anonymous: e.target.checked })}
              />
              <span>Anonymous voting (hide voter identities)</span>
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={createProposal}
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
              Create Proposal
            </button>
            <button
              onClick={() => setShowCreate(false)}
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

      <div style={{ display: 'grid', gap: '1.5rem' }}>
        {filteredProposals.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
            No proposals found
          </div>
        ) : (
          filteredProposals.map(proposal => {
            const hasVoted = localStorage.getItem(`voted_${proposal.id}_${user?.email}`) === 'true'
            const isExpired = new Date(proposal.endDate) < new Date()
            const isClosed = isExpired || proposal.status === 'Closed'
            const isCreator = proposal.createdBy === user?.email
            const totalVotes = getTotalVotes(proposal)

            return (
              <div key={proposal.id} style={{
                padding: '2rem',
                border: '2px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                borderLeftWidth: '6px',
                borderLeftColor: isClosed ? '#999' : '#646cff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{proposal.title}</h3>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      🏢 {proposal.department} • By {proposal.createdByName} • Ends {new Date(proposal.endDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      background: isClosed ? '#f8d7da' : '#d4edda',
                      color: isClosed ? '#721c24' : '#155724',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold'
                    }}>
                      {isClosed ? 'Closed' : 'Active'}
                    </span>
                    {proposal.anonymous && (
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        background: '#e0e0ff',
                        color: '#333',
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}>
                        🔒 Anonymous
                      </span>
                    )}
                  </div>
                </div>

                {proposal.description && (
                  <p style={{ marginBottom: '1.5rem', color: '#555' }}>{proposal.description}</p>
                )}

                <div style={{ marginBottom: '1rem', padding: '1rem', background: '#f9f9f9', borderRadius: '4px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
                    📊 {totalVotes} total votes
                  </div>
                  {proposal.options.map(option => (
                    <div key={option} style={{ marginBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                        <span>{option}</span>
                        <span style={{ fontWeight: 'bold' }}>
                          {proposal.votes[option] || 0} ({getPercentage(proposal, option)}%)
                        </span>
                      </div>
                      <div style={{ height: '8px', background: '#e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${getPercentage(proposal, option)}%`,
                          background: '#646cff',
                          transition: 'width 0.3s'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                {!isClosed && !hasVoted && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {proposal.options.map(option => (
                      <button
                        key={option}
                        onClick={() => castVote(proposal.id, option)}
                        style={{
                          flex: 1,
                          minWidth: '120px',
                          padding: '0.75rem',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        Vote: {option}
                      </button>
                    ))}
                  </div>
                )}

                {hasVoted && (
                  <div style={{ padding: '0.75rem', background: '#d4edda', color: '#155724', borderRadius: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                    ✓ You have voted on this proposal
                  </div>
                )}

                {isCreator && !isClosed && (
                  <button
                    onClick={() => closeProposal(proposal.id)}
                    style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      background: '#ff6b6b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    Close Voting
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
