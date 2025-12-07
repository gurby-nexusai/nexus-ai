const OLLAMA_URL = 'http://localhost:11434'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export async function callLLM(prompt, context = '', systemPrompt = '', provider = 'ollama', apiKey = '') {
  try {
    if (provider === 'ollama') {
      const response = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3.1:latest',
          prompt: `${systemPrompt}\n\nContext: ${context}\n\nUser: ${prompt}`,
          stream: false
        })
      })
      const data = await response.json()
      return data.response
    } else if (provider === 'groq') {
      const response = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Context: ${context}\n\n${prompt}` }
          ]
        })
      })
      const data = await response.json()
      return data.choices[0].message.content
    } else if (provider === 'openrouter') {
      const response = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'AI Suggestion Scheme'
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.1-70b-instruct',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Context: ${context}\n\n${prompt}` }
          ]
        })
      })
      const data = await response.json()
      return data.choices[0].message.content
    }
  } catch (error) {
    console.error('LLM Error:', error)
    return `Error connecting to ${provider}. ${provider === 'ollama' ? 'Make sure Ollama is running on localhost:11434' : 'Check your API key.'}`
  }
}

export async function generateWithRAG(query, documents, userEngagements = [], provider = 'ollama', apiKey = '') {
  const context = documents.map(d => `Document: ${d.name}\n${d.content}`).join('\n\n')
  const engagementContext = userEngagements.length > 0 
    ? `\n\nUser History: ${userEngagements.slice(-5).map(e => `${e.action}: ${JSON.stringify(e.data)}`).join(', ')}`
    : ''
  
  const systemPrompt = `You are an AI assistant. Use the provided documents and user history to give detailed, contextual answers.`
  
  return await callLLM(query, context + engagementContext, systemPrompt, provider, apiKey)
}
