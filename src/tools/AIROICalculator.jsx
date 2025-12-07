import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'

export default function AIROICalculator() {
  const { user, logAction } = useAuth()
  const [calculating, setCalculating] = useState(false)
  const [roiData, setRoiData] = useState(null)
  const [insights, setInsights] = useState(null)

  const collectUsageData = () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]')
    const suggestions = JSON.parse(localStorage.getItem('suggestions') || '[]')
    const chatTopics = JSON.parse(localStorage.getItem('chat_topics') || '[]')
    const events = JSON.parse(localStorage.getItem('events') || '[]')
    const votes = JSON.parse(localStorage.getItem('votes') || '[]')
    const openMeetings = JSON.parse(localStorage.getItem('open_meetings') || '[]')
    const csvRepository = JSON.parse(localStorage.getItem('csv_repository') || '[]')
    const analytics = JSON.parse(localStorage.getItem('app_analytics') || '{"visits":[],"sessions":[]}')

    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.engagements?.length > 0).length,
      totalEngagements: users.reduce((sum, u) => sum + (u.engagements?.length || 0), 0),
      
      suggestions: {
        total: suggestions.length,
        implemented: suggestions.filter(s => s.status === 'Implemented').length,
        totalSavings: suggestions.reduce((sum, s) => sum + (s.estimatedSavings || 0), 0),
        totalRewards: suggestions.reduce((sum, s) => sum + (s.reward || 0), 0)
      },
      
      chat: {
        topics: chatTopics.length,
        messages: chatTopics.reduce((sum, t) => sum + (t.messages?.length || 0), 0),
        participants: chatTopics.reduce((sum, t) => sum + (t.participants || 0), 0)
      },
      
      events: {
        total: events.length,
        totalAttendees: events.reduce((sum, e) => sum + (e.attendees?.length || 0), 0),
        avgAttendance: events.length > 0 ? (events.reduce((sum, e) => sum + (e.attendees?.length || 0), 0) / events.length).toFixed(1) : 0
      },
      
      voting: {
        proposals: votes.length,
        totalVotes: votes.reduce((sum, v) => sum + Object.values(v.votes || {}).reduce((a, b) => a + b, 0), 0),
        participation: votes.length > 0 ? (votes.reduce((sum, v) => sum + (v.voters?.length || 0), 0) / votes.length).toFixed(1) : 0
      },
      
      meetings: {
        scheduled: openMeetings.length,
        participants: openMeetings.reduce((sum, m) => sum + (m.participants?.length || 0), 0),
        avgParticipants: openMeetings.length > 0 ? (openMeetings.reduce((sum, m) => sum + (m.participants?.length || 0), 0) / openMeetings.length).toFixed(1) : 0
      },
      
      kpi: {
        csvFiles: csvRepository.length,
        totalRows: csvRepository.reduce((sum, f) => sum + (f.rows || 0), 0)
      },
      
      website: {
        totalVisits: analytics.visits.length,
        uniqueSessions: analytics.sessions.length
      }
    }
  }

  const calculateROI = async () => {
    setCalculating(true)
    
    const usageData = collectUsageData()
    
    // Calculate productivity metrics
    const avgEngagementsPerUser = usageData.totalUsers > 0 
      ? (usageData.totalEngagements / usageData.totalUsers).toFixed(1) 
      : 0
    
    const participationRate = usageData.totalUsers > 0
      ? ((usageData.activeUsers / usageData.totalUsers) * 100).toFixed(1)
      : 0
    
    // Time savings calculations
    const suggestionTimeSaved = usageData.suggestions.implemented * 40 // 40 hours per implemented suggestion
    const meetingTimeSaved = usageData.meetings.scheduled * parseInt(usageData.meetings.avgParticipants) * 0.5 // 30 min saved per meeting
    const chatTimeSaved = usageData.chat.messages * 0.25 // 15 min saved per async chat vs meeting
    const totalTimeSaved = suggestionTimeSaved + meetingTimeSaved + chatTimeSaved
    
    // Cost savings (assuming $50/hour average)
    const costSavings = totalTimeSaved * 50
    const suggestionSavings = usageData.suggestions.totalSavings
    const totalSavings = costSavings + suggestionSavings
    
    const roi = {
      participation: {
        totalUsers: usageData.totalUsers,
        activeUsers: usageData.activeUsers,
        participationRate: participationRate + '%',
        avgEngagements: avgEngagementsPerUser
      },
      productivity: {
        timeSavedHours: totalTimeSaved.toFixed(0),
        costSavings: '$' + costSavings.toFixed(0),
        suggestionSavings: '$' + suggestionSavings.toFixed(0),
        totalSavings: '$' + totalSavings.toFixed(0)
      },
      engagement: {
        suggestions: usageData.suggestions.total,
        implementedIdeas: usageData.suggestions.implemented,
        chatTopics: usageData.chat.topics,
        chatMessages: usageData.chat.messages,
        events: usageData.events.total,
        eventAttendees: usageData.events.totalAttendees,
        proposals: usageData.voting.proposals,
        votes: usageData.voting.totalVotes,
        meetings: usageData.meetings.scheduled
      },
      quality: {
        avgEventAttendance: usageData.events.avgAttendance,
        avgMeetingParticipants: usageData.meetings.avgParticipants,
        avgVotingParticipation: usageData.voting.participation,
        implementationRate: usageData.suggestions.total > 0 
          ? ((usageData.suggestions.implemented / usageData.suggestions.total) * 100).toFixed(1) + '%'
          : '0%'
      }
    }
    
    setRoiData(roi)
    
    // Get AI insights
    const context = `
Organization AI Platform Usage Data:

Participation:
- Total Users: ${roi.participation.totalUsers}
- Active Users: ${roi.participation.activeUsers}
- Participation Rate: ${roi.participation.participationRate}
- Avg Engagements per User: ${roi.participation.avgEngagements}

Productivity Impact:
- Time Saved: ${roi.productivity.timeSavedHours} hours
- Cost Savings: ${roi.productivity.costSavings}
- Suggestion Savings: ${roi.productivity.suggestionSavings}
- Total Savings: ${roi.productivity.totalSavings}

Engagement Metrics:
- Suggestions: ${roi.engagement.suggestions}
- Implemented Ideas: ${roi.engagement.implementedIdeas}
- Chat Topics: ${roi.engagement.chatTopics}
- Events: ${roi.engagement.events}
- Proposals: ${roi.engagement.proposals}
- Meetings: ${roi.engagement.meetings}

Quality Metrics:
- Event Attendance: ${roi.quality.avgEventAttendance}
- Meeting Participation: ${roi.quality.avgMeetingParticipants}
- Implementation Rate: ${roi.quality.implementationRate}
`
    
    const systemPrompt = `You are an AI ROI analyst. Analyze this organization's AI platform usage and provide:

1. Overall ROI Assessment (Excellent/Good/Fair/Poor)
2. Top 3 Strengths
3. Top 3 Areas for Improvement
4. Productivity Score (0-100)
5. Engagement Score (0-100)
6. Quality Score (0-100)
7. Specific Recommendations (3-5 actionable items)
8. Predicted 12-month ROI

Be specific, data-driven, and actionable.`
    
    try {
      const analysis = await callLLM('Analyze ROI and provide insights', context, systemPrompt)
      setInsights(analysis)
      logAction?.('calculate_roi', { totalSavings })
    } catch (error) {
      setInsights('AI analysis unavailable. Make sure Ollama is running with llama3.1:latest')
    }
    
    setCalculating(false)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>📈 AI ROI Calculator</h1>
        <p style={{ color: '#666' }}>Calculate return on investment based on usage and participation quality across all apps</p>
        {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}
      </div>

      <button
        onClick={calculateROI}
        disabled={calculating}
        style={{
          padding: '1rem 2rem',
          background: '#646cff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '1.1rem',
          fontWeight: 'bold',
          cursor: calculating ? 'not-allowed' : 'pointer',
          marginBottom: '2rem'
        }}
      >
        {calculating ? '🤖 Calculating ROI...' : '✨ Calculate AI ROI'}
      </button>

      {roiData && (
        <>
          {/* Participation Metrics */}
          <div style={{ marginBottom: '2rem' }}>
            <h3>👥 Participation Metrics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{roiData.participation.totalUsers}</div>
                <div>Total Users</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{roiData.participation.activeUsers}</div>
                <div>Active Users</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{roiData.participation.participationRate}</div>
                <div>Participation Rate</div>
              </div>
              <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{roiData.participation.avgEngagements}</div>
                <div>Avg Engagements</div>
              </div>
            </div>
          </div>

          {/* Productivity Impact */}
          <div style={{ marginBottom: '2rem' }}>
            <h3>💰 Productivity Impact</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div style={{ padding: '1.5rem', border: '2px solid #28a745', borderRadius: '8px', background: 'white' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Time Saved</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{roiData.productivity.timeSavedHours}h</div>
              </div>
              <div style={{ padding: '1.5rem', border: '2px solid #28a745', borderRadius: '8px', background: 'white' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Cost Savings</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{roiData.productivity.costSavings}</div>
              </div>
              <div style={{ padding: '1.5rem', border: '2px solid #28a745', borderRadius: '8px', background: 'white' }}>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '0.5rem' }}>Suggestion Savings</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#28a745' }}>{roiData.productivity.suggestionSavings}</div>
              </div>
              <div style={{ padding: '1.5rem', border: '2px solid #28a745', borderRadius: '8px', background: '#d4edda' }}>
                <div style={{ fontSize: '0.9rem', color: '#155724', marginBottom: '0.5rem' }}>Total Savings</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#155724' }}>{roiData.productivity.totalSavings}</div>
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div style={{ marginBottom: '2rem' }}>
            <h3>📊 Engagement Across Apps</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {Object.entries(roiData.engagement).map(([key, value]) => (
                <div key={key} style={{ padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white' }}>
                  <div style={{ fontSize: '0.85rem', color: '#666', textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#646cff' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Metrics */}
          <div style={{ marginBottom: '2rem' }}>
            <h3>⭐ Quality Metrics</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              {Object.entries(roiData.quality).map(([key, value]) => (
                <div key={key} style={{ padding: '1.5rem', border: '2px solid #ffa500', borderRadius: '8px', background: 'white', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ffa500' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          {insights && (
            <div style={{ padding: '2rem', border: '2px solid #646cff', borderRadius: '8px', background: '#f0f0ff' }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>🤖 AI-Powered Insights (llama3.1:latest)</h3>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', fontSize: '0.95rem' }}>
                {insights}
              </div>
            </div>
          )}
        </>
      )}

      {!roiData && (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
          <div>Click "Calculate AI ROI" to analyze your organization's AI platform usage</div>
          <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>AI will evaluate productivity, engagement, and quality metrics</div>
        </div>
      )}
    </div>
  )
}
