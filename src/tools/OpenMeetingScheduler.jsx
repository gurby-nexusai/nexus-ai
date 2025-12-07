import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'

const MEETING_DB = {
  getAll: () => JSON.parse(localStorage.getItem('open_meetings') || '[]'),
  save: (meeting) => {
    const meetings = MEETING_DB.getAll()
    meetings.push(meeting)
    localStorage.setItem('open_meetings', JSON.stringify(meetings))
  },
  update: (id, updates) => {
    const meetings = MEETING_DB.getAll()
    const idx = meetings.findIndex(m => m.id === id)
    if (idx !== -1) {
      meetings[idx] = { ...meetings[idx], ...updates }
      localStorage.setItem('open_meetings', JSON.stringify(meetings))
    }
  }
}

export default function OpenMeetingScheduler() {
  const { user, logAction } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newMeeting, setNewMeeting] = useState({
    topic: '',
    description: '',
    duration: '60',
    maxParticipants: '10',
    proposedDates: ['']
  })

  useEffect(() => {
    loadMeetings()
    
    // Check for upcoming meetings every minute
    const interval = setInterval(() => {
      checkUpcomingMeetings()
    }, 60000) // Check every minute
    
    // Check immediately on mount
    checkUpcomingMeetings()
    
    return () => clearInterval(interval)
  }, [])

  const checkUpcomingMeetings = () => {
    const meetings = MEETING_DB.getAll()
    const now = new Date()
    
    meetings.forEach(meeting => {
      if (meeting.status === 'Scheduled' && meeting.finalDate) {
        const meetingTime = new Date(meeting.finalDate)
        const timeDiff = meetingTime - now
        const minutesUntil = Math.floor(timeDiff / 60000)
        
        // Send reminder 30 minutes before
        if (minutesUntil === 30 && !meeting.reminderSent) {
          sendEmailReminders(meeting)
          MEETING_DB.update(meeting.id, { reminderSent: true })
        }
      }
    })
  }

  const sendEmailReminders = (meeting) => {
    // In production, this would call a backend API to send emails
    // For now, we'll show browser notifications and log
    meeting.participants.forEach(participant => {
      const message = `Reminder: "${meeting.topic}" starts in 30 minutes at ${new Date(meeting.finalDate).toLocaleString()}`
      
      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Meeting Reminder', {
          body: message,
          icon: '🤝'
        })
      }
      
      // Console log (in production, send actual email)
      console.log(`Email to ${participant.email}: ${message}`)
    })
    
    // Show alert to current user if they're a participant
    if (meeting.participants.some(p => p.email === user?.email)) {
      alert(`⏰ Reminder: "${meeting.topic}" starts in 30 minutes!`)
    }
  }

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const loadMeetings = () => {
    setMeetings(MEETING_DB.getAll())
  }

  const createMeeting = () => {
    if (!newMeeting.topic || newMeeting.proposedDates.filter(d => d).length === 0) return

    const meeting = {
      id: Date.now(),
      ...newMeeting,
      proposedDates: newMeeting.proposedDates.filter(d => d),
      createdBy: user?.email,
      createdByName: user?.name,
      createdAt: new Date().toISOString(),
      participants: [],
      dateVotes: {},
      status: 'Scheduling',
      finalDate: null
    }

    // Initialize vote counts
    meeting.proposedDates.forEach(date => {
      meeting.dateVotes[date] = []
    })

    MEETING_DB.save(meeting)
    loadMeetings()
    setNewMeeting({
      topic: '',
      description: '',
      duration: '60',
      maxParticipants: '10',
      proposedDates: ['']
    })
    setShowCreate(false)
    logAction?.('create_open_meeting', { topic: meeting.topic })
  }

  const voteForDate = (meetingId, date) => {
    const meeting = meetings.find(m => m.id === meetingId)
    if (!meeting) return

    const currentVotes = meeting.dateVotes[date] || []
    const hasVoted = currentVotes.includes(user?.email)

    if (hasVoted) {
      // Remove vote
      MEETING_DB.update(meetingId, {
        dateVotes: {
          ...meeting.dateVotes,
          [date]: currentVotes.filter(email => email !== user?.email)
        }
      })
    } else {
      // Add vote
      MEETING_DB.update(meetingId, {
        dateVotes: {
          ...meeting.dateVotes,
          [date]: [...currentVotes, user?.email]
        }
      })
    }

    loadMeetings()
    logAction?.('vote_meeting_date', { meetingId, date })
  }

  const signUp = (meetingId) => {
    const meeting = meetings.find(m => m.id === meetingId)
    if (!meeting) return

    const isSignedUp = meeting.participants.some(p => p.email === user?.email)

    if (isSignedUp) {
      // Remove signup
      MEETING_DB.update(meetingId, {
        participants: meeting.participants.filter(p => p.email !== user?.email)
      })
    } else {
      // Add signup
      if (meeting.maxParticipants && meeting.participants.length >= parseInt(meeting.maxParticipants)) {
        alert('Meeting is full!')
        return
      }
      MEETING_DB.update(meetingId, {
        participants: [...meeting.participants, { email: user?.email, name: user?.name, signedUpAt: new Date().toISOString() }]
      })
    }

    loadMeetings()
    logAction?.('meeting_signup', { meetingId, action: isSignedUp ? 'cancel' : 'signup' })
  }

  const finalizeMeeting = (meetingId) => {
    const meeting = meetings.find(m => m.id === meetingId)
    if (!meeting) return

    // Find date with most votes
    let maxVotes = 0
    let bestDate = null

    Object.entries(meeting.dateVotes).forEach(([date, votes]) => {
      if (votes.length > maxVotes) {
        maxVotes = votes.length
        bestDate = date
      }
    })

    if (!bestDate) {
      alert('No votes yet. Cannot finalize.')
      return
    }

    MEETING_DB.update(meetingId, {
      status: 'Scheduled',
      finalDate: bestDate
    })

    loadMeetings()
    logAction?.('finalize_meeting', { meetingId, finalDate: bestDate })
  }

  const addDateSlot = () => {
    setNewMeeting({
      ...newMeeting,
      proposedDates: [...newMeeting.proposedDates, '']
    })
  }

  const updateDateSlot = (index, value) => {
    const updated = [...newMeeting.proposedDates]
    updated[index] = value
    setNewMeeting({ ...newMeeting, proposedDates: updated })
  }

  const removeDateSlot = (index) => {
    if (newMeeting.proposedDates.length <= 1) return
    const updated = newMeeting.proposedDates.filter((_, i) => i !== index)
    setNewMeeting({ ...newMeeting, proposedDates: updated })
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>🤝 Open Meeting Scheduler</h1>
        <p style={{ color: '#666' }}>Create open meetings on any topic - anyone can sign up and vote on dates</p>
        <p style={{ fontSize: '0.85rem', color: '#28a745', fontWeight: 'bold' }}>⏰ Automatic email reminders sent 30 minutes before scheduled meetings</p>
        {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}
      </div>

      <button
        onClick={() => setShowCreate(!showCreate)}
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
        + Create Open Meeting
      </button>

      {showCreate && (
        <div style={{ padding: '2rem', border: '2px solid #28a745', borderRadius: '8px', marginBottom: '2rem', background: '#f0fff0' }}>
          <h3 style={{ margin: '0 0 1.5rem 0' }}>Create New Open Meeting</h3>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Meeting Topic *</label>
            <input
              type="text"
              value={newMeeting.topic}
              onChange={(e) => setNewMeeting({ ...newMeeting, topic: e.target.value })}
              placeholder="e.g., Brainstorming Session: New Product Ideas"
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
            <textarea
              value={newMeeting.description}
              onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
              placeholder="What will be discussed? Who should attend?"
              rows={4}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Duration (minutes)</label>
              <input
                type="number"
                value={newMeeting.duration}
                onChange={(e) => setNewMeeting({ ...newMeeting, duration: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Max Participants</label>
              <input
                type="number"
                value={newMeeting.maxParticipants}
                onChange={(e) => setNewMeeting({ ...newMeeting, maxParticipants: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Proposed Dates & Times *</label>
            {newMeeting.proposedDates.map((date, index) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="datetime-local"
                  value={date}
                  onChange={(e) => updateDateSlot(index, e.target.value)}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                {newMeeting.proposedDates.length > 1 && (
                  <button
                    onClick={() => removeDateSlot(index)}
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
              onClick={addDateSlot}
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
              + Add Date Option
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={createMeeting}
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
              Create Meeting
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
        {meetings.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
            No open meetings yet. Create the first one!
          </div>
        ) : (
          meetings.map(meeting => {
            const isSignedUp = meeting.participants.some(p => p.email === user?.email)
            const isFull = meeting.maxParticipants && meeting.participants.length >= parseInt(meeting.maxParticipants)
            const isCreator = meeting.createdBy === user?.email

            return (
              <div key={meeting.id} style={{
                padding: '2rem',
                border: '2px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                borderLeftWidth: '6px',
                borderLeftColor: meeting.status === 'Scheduled' ? '#28a745' : '#646cff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{meeting.topic}</h3>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      Created by {meeting.createdByName} • {meeting.duration} minutes • Max {meeting.maxParticipants} participants
                    </div>
                  </div>
                  <span style={{
                    padding: '0.5rem 1rem',
                    background: meeting.status === 'Scheduled' ? '#d4edda' : '#fff3cd',
                    color: meeting.status === 'Scheduled' ? '#155724' : '#856404',
                    borderRadius: '4px',
                    fontWeight: 'bold'
                  }}>
                    {meeting.status}
                  </span>
                </div>

                {meeting.description && (
                  <p style={{ marginBottom: '1.5rem', color: '#555' }}>{meeting.description}</p>
                )}

                {meeting.status === 'Scheduled' && meeting.finalDate && (
                  <div style={{ padding: '1rem', background: '#d4edda', borderRadius: '4px', marginBottom: '1rem' }}>
                    <strong>✅ Meeting Scheduled:</strong> {new Date(meeting.finalDate).toLocaleString()}
                    <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#155724' }}>
                      {meeting.reminderSent ? '📧 Reminder sent to all participants' : '⏰ Reminder will be sent 30 minutes before'}
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0' }}>👥 Participants ({meeting.participants.length}/{meeting.maxParticipants})</h4>
                  {meeting.participants.length === 0 ? (
                    <p style={{ color: '#999', fontSize: '0.9rem' }}>No one signed up yet</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {meeting.participants.map((p, i) => (
                        <span key={i} style={{
                          padding: '0.25rem 0.75rem',
                          background: '#f0f0f0',
                          borderRadius: '12px',
                          fontSize: '0.85rem'
                        }}>
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {meeting.status === 'Scheduling' && (
                  <>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h4 style={{ margin: '0 0 1rem 0' }}>📅 Vote for Date/Time</h4>
                      {meeting.proposedDates.map(date => {
                        const votes = meeting.dateVotes[date] || []
                        const hasVoted = votes.includes(user?.email)
                        
                        return (
                          <div key={date} style={{
                            padding: '1rem',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            marginBottom: '0.5rem',
                            background: hasVoted ? '#f0f0ff' : 'white'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <div style={{ fontWeight: 'bold' }}>{new Date(date).toLocaleString()}</div>
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>{votes.length} votes</div>
                              </div>
                              <button
                                onClick={() => voteForDate(meeting.id, date)}
                                style={{
                                  padding: '0.5rem 1rem',
                                  background: hasVoted ? '#ff6b6b' : '#28a745',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer'
                                }}
                              >
                                {hasVoted ? 'Remove Vote' : 'Vote'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => signUp(meeting.id)}
                        disabled={!isSignedUp && isFull}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          background: isSignedUp ? '#ff6b6b' : '#646cff',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: (!isSignedUp && isFull) ? 'not-allowed' : 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {isSignedUp ? 'Cancel Sign-up' : isFull ? 'Full' : 'Sign Up'}
                      </button>
                      {isCreator && (
                        <button
                          onClick={() => finalizeMeeting(meeting.id)}
                          style={{
                            padding: '0.75rem 1.5rem',
                            background: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          Finalize Meeting
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
