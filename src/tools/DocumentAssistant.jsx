import { useState } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'

const WRITING_MODES = {
  'Powerful Pitch': 'Create a compelling, persuasive pitch that captures attention and drives action',
  'Emotionally Sensitive': 'Write with empathy, understanding, and emotional intelligence',
  'Formal Communication': 'Professional, structured, and appropriate for business settings',
  'Tonal Sensitivity': 'Adapt tone to audience and context with cultural awareness',
  'Urgent': 'Convey urgency and importance while maintaining professionalism'
}

const TONES = ['Professional', 'Friendly', 'Empathetic', 'Assertive', 'Diplomatic', 'Enthusiastic']

export default function DocumentAssistant() {
  const { user, logAction } = useAuth()
  const [mode, setMode] = useState('Powerful Pitch')
  const [tone, setTone] = useState('Professional')
  const [urgency, setUrgency] = useState(3)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [generating, setGenerating] = useState(false)
  const [history, setHistory] = useState([])

  const generateContent = async () => {
    if (!input.trim() || generating) return
    
    setGenerating(true)
    
    const context = `
Writing Mode: ${mode}
Tone: ${tone}
Urgency Level: ${urgency}/5
User Input: ${input}

User Engagement History: ${user?.engagements?.slice(-3).map(e => e.action).join(', ') || 'None'}
`
    
    const systemPrompt = `You are an expert AI writing assistant. ${WRITING_MODES[mode]}

Guidelines:
- Tone: ${tone}
- Urgency: ${urgency === 5 ? 'Extremely urgent - immediate action required' : 
              urgency === 4 ? 'High urgency - time-sensitive' :
              urgency === 3 ? 'Moderate urgency - important but not critical' :
              urgency === 2 ? 'Low urgency - informational' :
              'No urgency - casual communication'}

${mode === 'Powerful Pitch' ? `
Create a compelling pitch that:
- Opens with a hook
- Clearly states the value proposition
- Addresses pain points
- Includes a strong call-to-action
- Uses persuasive language and power words
` : ''}

${mode === 'Emotionally Sensitive' ? `
Write with emotional intelligence:
- Acknowledge feelings and concerns
- Use empathetic language
- Validate emotions
- Offer support and understanding
- Be gentle and considerate
` : ''}

${mode === 'Formal Communication' ? `
Maintain professional standards:
- Use formal language and structure
- Follow business communication conventions
- Be clear, concise, and respectful
- Include proper greetings and closings
- Avoid colloquialisms
` : ''}

${mode === 'Tonal Sensitivity' ? `
Adapt tone appropriately:
- Consider cultural context
- Match audience expectations
- Balance formality and approachability
- Be aware of power dynamics
- Adjust language for sensitivity
` : ''}

${mode === 'Urgent' ? `
Convey urgency effectively:
- State time constraints clearly
- Emphasize consequences
- Use action-oriented language
- Maintain professionalism despite urgency
- Provide clear next steps
` : ''}

Generate the content now.`
    
    try {
      const result = await callLLM(input, context, systemPrompt)
      setOutput(result)
      
      const entry = {
        timestamp: new Date().toISOString(),
        mode,
        tone,
        urgency,
        input: input.slice(0, 100),
        output: result.slice(0, 100)
      }
      setHistory([entry, ...history].slice(0, 10))
      
      logAction?.('generate_content', { mode, tone, urgency })
    } catch (error) {
      setOutput('Error: Make sure Ollama is running with llama3.1:latest')
    }
    
    setGenerating(false)
  }

  const refineContent = async (instruction) => {
    if (!output || generating) return
    
    setGenerating(true)
    
    const context = `
Original Content:
${output}

Refinement Request: ${instruction}
`
    
    const systemPrompt = `You are refining existing content. Apply the requested changes while maintaining the overall message and ${tone} tone.`
    
    try {
      const result = await callLLM(instruction, context, systemPrompt)
      setOutput(result)
      logAction?.('refine_content', { instruction })
    } catch (error) {
      setOutput('Error refining content')
    }
    
    setGenerating(false)
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output)
    alert('Copied to clipboard!')
  }

  const exportDocument = () => {
    const doc = `
AI Writing Assistant Output
Generated: ${new Date().toLocaleString()}
Mode: ${mode}
Tone: ${tone}
Urgency: ${urgency}/5

---

${output}
`
    const blob = new Blob([doc], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ai-writing-${Date.now()}.txt`
    a.click()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>✍️ AI Writing Assistant</h1>
        <p style={{ color: '#666' }}>Create powerful pitches, emotionally sensitive messages, and formal communications (llama3.1:latest)</p>
        {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Input Section */}
        <div>
          <div style={{ marginBottom: '2rem', padding: '1.5rem', border: '2px solid #ddd', borderRadius: '8px', background: 'white' }}>
            <h3>Writing Controls</h3>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Writing Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {Object.keys(WRITING_MODES).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                {WRITING_MODES[mode]}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Tone</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                {TONES.map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    style={{
                      padding: '0.5rem',
                      background: tone === t ? '#646cff' : 'white',
                      color: tone === t ? 'white' : 'black',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Urgency Level: {urgency}/5
              </label>
              <input
                type="range"
                min="1"
                max="5"
                value={urgency}
                onChange={(e) => setUrgency(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#666' }}>
                <span>Casual</span>
                <span>Moderate</span>
                <span>Critical</span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Your Content / Brief</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter your message, key points, or brief description of what you want to communicate..."
              rows={12}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical', fontSize: '0.95rem' }}
            />
          </div>

          <button
            onClick={generateContent}
            disabled={generating || !input.trim()}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: generating ? 'not-allowed' : 'pointer'
            }}
          >
            {generating ? '🤖 Generating...' : '✨ Generate Content'}
          </button>

          {/* Quick Refinements */}
          {output && (
            <div style={{ marginTop: '1rem', padding: '1rem', border: '1px solid #ddd', borderRadius: '4px', background: '#f9f9f9' }}>
              <strong style={{ display: 'block', marginBottom: '0.5rem' }}>Quick Refinements:</strong>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                <button onClick={() => refineContent('Make it shorter and more concise')} style={{ padding: '0.5rem', fontSize: '0.85rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>
                  ✂️ Shorten
                </button>
                <button onClick={() => refineContent('Make it more detailed and elaborate')} style={{ padding: '0.5rem', fontSize: '0.85rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>
                  📝 Expand
                </button>
                <button onClick={() => refineContent('Make it more persuasive and compelling')} style={{ padding: '0.5rem', fontSize: '0.85rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>
                  💪 Stronger
                </button>
                <button onClick={() => refineContent('Make it softer and more gentle')} style={{ padding: '0.5rem', fontSize: '0.85rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>
                  🤝 Softer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Output Section */}
        <div>
          <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Generated Content</h3>
            {output && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={copyToClipboard} style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>
                  📋 Copy
                </button>
                <button onClick={exportDocument} style={{ padding: '0.5rem 1rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>
                  💾 Export
                </button>
              </div>
            )}
          </div>

          <div style={{ 
            minHeight: '400px', 
            padding: '1.5rem', 
            border: '2px solid #ddd', 
            borderRadius: '8px', 
            background: 'white',
            whiteSpace: 'pre-wrap',
            fontSize: '0.95rem',
            lineHeight: '1.6'
          }}>
            {output || (
              <div style={{ color: '#999', textAlign: 'center', paddingTop: '3rem' }}>
                Your AI-generated content will appear here...
              </div>
            )}
          </div>

          {/* History */}
          {history.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h4>Recent Generations</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {history.map((entry, i) => (
                  <div key={i} style={{ 
                    padding: '0.75rem', 
                    border: '1px solid #ddd', 
                    borderRadius: '4px',
                    marginBottom: '0.5rem',
                    background: '#f9f9f9',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    setMode(entry.mode)
                    setTone(entry.tone)
                    setUrgency(entry.urgency)
                  }}>
                    <div style={{ fontSize: '0.85rem', color: '#666', marginBottom: '0.25rem' }}>
                      {new Date(entry.timestamp).toLocaleString()} • {entry.mode} • {entry.tone}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{entry.input}...</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
