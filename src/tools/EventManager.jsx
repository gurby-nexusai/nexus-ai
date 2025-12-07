import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'

const DEPARTMENTS = ['HR', 'Finance', 'Operations', 'Sales', 'Marketing', 'IT', 'Product', 'Customer Service', 'All Company']
const EVENT_TYPES = ['Meeting', 'Training', 'Social', 'Conference', 'Workshop', 'Team Building', 'Town Hall', 'Other']

const EVENT_DB = {
  getAll: () => JSON.parse(localStorage.getItem('events') || '[]'),
  save: (event) => {
    const events = EVENT_DB.getAll()
    events.push(event)
    localStorage.setItem('events', JSON.stringify(events))
  },
  update: (id, updates) => {
    const events = EVENT_DB.getAll()
    const idx = events.findIndex(e => e.id === id)
    if (idx !== -1) {
      events[idx] = { ...events[idx], ...updates }
      localStorage.setItem('events', JSON.stringify(events))
    }
  }
}

export default function EventManager() {
  const { user, logAction } = useAuth()
  const [events, setEvents] = useState([])
  const [view, setView] = useState('upcoming')
  const [showCreate, setShowCreate] = useState(false)
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    department: 'All Company',
    type: 'Meeting',
    date: '',
    time: '',
    location: '',
    maxAttendees: ''
  })

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = () => {
    setEvents(EVENT_DB.getAll())
  }

  const createEvent = () => {
    if (!newEvent.title || !newEvent.date || !newEvent.time) return

    const event = {
      id: Date.now(),
      ...newEvent,
      createdBy: user?.email,
      createdByName: user?.name,
      createdAt: new Date().toISOString(),
      attendees: [],
      status: 'Upcoming'
    }

    EVENT_DB.save(event)
    loadEvents()
    setNewEvent({
      title: '',
      description: '',
      department: 'All Company',
      type: 'Meeting',
      date: '',
      time: '',
      location: '',
      maxAttendees: ''
    })
    setShowCreate(false)
    logAction?.('create_event', { title: event.title, department: event.department })
  }

  const rsvp = (eventId) => {
    const event = events.find(e => e.id === eventId)
    if (!event) return

    const isAttending = event.attendees.some(a => a.email === user?.email)
    
    if (isAttending) {
      // Remove RSVP
      EVENT_DB.update(eventId, {
        attendees: event.attendees.filter(a => a.email !== user?.email)
      })
    } else {
      // Add RSVP
      if (event.maxAttendees && event.attendees.length >= parseInt(event.maxAttendees)) {
        alert('Event is full!')
        return
      }
      EVENT_DB.update(eventId, {
        attendees: [...event.attendees, { email: user?.email, name: user?.name, rsvpAt: new Date().toISOString() }]
      })
    }
    
    loadEvents()
    logAction?.('event_rsvp', { eventId, action: isAttending ? 'cancel' : 'attend' })
  }

  const cancelEvent = (eventId) => {
    if (confirm('Cancel this event?')) {
      EVENT_DB.update(eventId, { status: 'Cancelled' })
      loadEvents()
    }
  }

  const getFilteredEvents = () => {
    const now = new Date()
    return events.filter(e => {
      const eventDate = new Date(e.date + ' ' + e.time)
      if (view === 'upcoming') return eventDate >= now && e.status === 'Upcoming'
      if (view === 'past') return eventDate < now || e.status === 'Cancelled'
      if (view === 'myEvents') return e.attendees.some(a => a.email === user?.email)
      return true
    }).sort((a, b) => new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time))
  }

  const filteredEvents = getFilteredEvents()

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>📅 Event Manager</h1>
        <p style={{ color: '#666' }}>Create and manage company events across all departments</p>
        {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={() => setView('upcoming')}
          style={{
            padding: '0.75rem 1.5rem',
            background: view === 'upcoming' ? '#646cff' : 'white',
            color: view === 'upcoming' ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Upcoming Events
        </button>
        <button
          onClick={() => setView('myEvents')}
          style={{
            padding: '0.75rem 1.5rem',
            background: view === 'myEvents' ? '#646cff' : 'white',
            color: view === 'myEvents' ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          My Events
        </button>
        <button
          onClick={() => setView('past')}
          style={{
            padding: '0.75rem 1.5rem',
            background: view === 'past' ? '#646cff' : 'white',
            color: view === 'past' ? 'white' : 'black',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Past Events
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
          + Create Event
        </button>
      </div>

      {showCreate && (
        <div style={{ padding: '2rem', border: '2px solid #28a745', borderRadius: '8px', marginBottom: '2rem', background: '#f0fff0' }}>
          <h3 style={{ margin: '0 0 1.5rem 0' }}>Create New Event</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Event Title *</label>
              <input
                type="text"
                value={newEvent.title}
                onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                placeholder="e.g., Q4 Planning Meeting"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Department</label>
              <select
                value={newEvent.department}
                onChange={(e) => setNewEvent({ ...newEvent, department: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Event Type</label>
              <select
                value={newEvent.type}
                onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Date *</label>
              <input
                type="date"
                value={newEvent.date}
                onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Time *</label>
              <input
                type="time"
                value={newEvent.time}
                onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Location</label>
              <input
                type="text"
                value={newEvent.location}
                onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                placeholder="e.g., Conference Room A or Zoom"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Max Attendees</label>
              <input
                type="number"
                value={newEvent.maxAttendees}
                onChange={(e) => setNewEvent({ ...newEvent, maxAttendees: e.target.value })}
                placeholder="Leave empty for unlimited"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                placeholder="Event details, agenda, etc."
                rows={4}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={createEvent}
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
              Create Event
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {filteredEvents.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
            No events found
          </div>
        ) : (
          filteredEvents.map(event => {
            const isAttending = event.attendees.some(a => a.email === user?.email)
            const isFull = event.maxAttendees && event.attendees.length >= parseInt(event.maxAttendees)
            const isCreator = event.createdBy === user?.email

            return (
              <div key={event.id} style={{
                padding: '1.5rem',
                border: '2px solid #ddd',
                borderRadius: '8px',
                background: 'white',
                borderLeftWidth: '6px',
                borderLeftColor: event.status === 'Cancelled' ? '#ff6b6b' : '#646cff'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    background: '#f0f0f0',
                    borderRadius: '4px'
                  }}>
                    {event.type}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.5rem',
                    background: event.status === 'Cancelled' ? '#f8d7da' : '#d4edda',
                    color: event.status === 'Cancelled' ? '#721c24' : '#155724',
                    borderRadius: '4px'
                  }}>
                    {event.status}
                  </span>
                </div>

                <h3 style={{ margin: '0 0 0.5rem 0' }}>{event.title}</h3>
                
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>
                  <div>📅 {new Date(event.date).toLocaleDateString()} at {event.time}</div>
                  {event.location && <div>📍 {event.location}</div>}
                  <div>🏢 {event.department}</div>
                  <div>👤 By {event.createdByName}</div>
                </div>

                {event.description && (
                  <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
                    {event.description}
                  </p>
                )}

                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#f9f9f9', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                    👥 {event.attendees.length} {event.maxAttendees ? `/ ${event.maxAttendees}` : ''} attending
                  </div>
                  {event.attendees.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>
                      {event.attendees.slice(0, 3).map(a => a.name).join(', ')}
                      {event.attendees.length > 3 && ` +${event.attendees.length - 3} more`}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {event.status === 'Upcoming' && (
                    <button
                      onClick={() => rsvp(event.id)}
                      disabled={!isAttending && isFull}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: isAttending ? '#ff6b6b' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: (!isAttending && isFull) ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {isAttending ? 'Cancel RSVP' : isFull ? 'Full' : 'RSVP'}
                    </button>
                  )}
                  {isCreator && event.status === 'Upcoming' && (
                    <button
                      onClick={() => cancelEvent(event.id)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: '#999',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel Event
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
