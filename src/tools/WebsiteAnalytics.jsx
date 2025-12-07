import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'
import { Analytics, detectAppPages } from '../services/analytics'

export default function WebsiteAnalytics() {
  const { user, logAction } = useAuth()
  const [liveStats, setLiveStats] = useState(null)
  const [appPages, setAppPages] = useState([])
  const [seoResults, setSeoResults] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)

  useEffect(() => {
    loadLiveData()
    const interval = autoRefresh ? setInterval(loadLiveData, 5000) : null
    return () => interval && clearInterval(interval)
  }, [autoRefresh])

  const loadLiveData = () => {
    const stats = Analytics.getStats()
    setLiveStats(stats)
    
    const pages = detectAppPages()
    setAppPages(pages)
  }

  const analyzeSEO = async () => {
    setAnalyzing(true)
    const results = []
    
    for (const page of appPages) {
      const seo = extractSEOData(page.html)
      
      const context = `
Current App Page: ${page.name}
URL: ${page.url}
Auto-detected: ${page.detected ? 'Yes' : 'No'}

SEO Data:
- Title: ${seo.title || 'MISSING'}
- Meta Description: ${seo.description || 'MISSING'}
- H1 Tags: ${seo.h1Count}
- Images without alt: ${seo.imagesWithoutAlt}
- Word Count: ${seo.wordCount}
- Internal Links: ${seo.internalLinks}

HTML Preview:
${page.html.slice(0, 500)}
`
      
      const systemPrompt = `You are an SEO expert analyzing a React SPA. Provide:
1. SEO Score (0-100)
2. Top 3 critical issues
3. Top 3 specific recommendations for React apps
Be actionable and specific.`
      
      try {
        const response = await callLLM('Analyze SEO for this React page', context, systemPrompt)
        
        results.push({
          page: page.name,
          url: page.url,
          seoData: seo,
          aiAnalysis: response,
          score: extractScore(response) || calculateBasicScore(seo),
          autoDetected: page.detected
        })
      } catch (error) {
        results.push({
          page: page.name,
          url: page.url,
          seoData: seo,
          aiAnalysis: 'Error: Make sure Ollama is running with llama3.1:latest',
          score: calculateBasicScore(seo),
          autoDetected: page.detected
        })
      }
    }
    
    setSeoResults(results)
    logAction?.('seo_analysis', { pages: results.length })
    setAnalyzing(false)
  }

  const extractSEOData = (html) => {
    const titleMatch = html.match(/<title>(.*?)<\/title>/i)
    const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i)
    const h1Matches = html.match(/<h1[^>]*>.*?<\/h1>/gi) || []
    const imgMatches = html.match(/<img[^>]*>/gi) || []
    const imgsWithoutAlt = imgMatches.filter(img => !img.includes('alt=')).length
    const words = html.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(w => w.length > 0).length
    const internalLinks = (html.match(/href=["']\/[^"']*["']/gi) || []).length
    const externalLinks = (html.match(/href=["']https?:\/\/[^"']*["']/gi) || []).length
    
    return {
      title: titleMatch?.[1] || null,
      description: descMatch?.[1] || null,
      h1Count: h1Matches.length,
      imagesWithoutAlt: imgsWithoutAlt,
      wordCount: words,
      internalLinks,
      externalLinks
    }
  }

  const calculateBasicScore = (seo) => {
    let score = 100
    if (!seo.title) score -= 20
    if (!seo.description) score -= 20
    if (seo.h1Count === 0) score -= 15
    if (seo.h1Count > 1) score -= 10
    if (seo.imagesWithoutAlt > 0) score -= 10
    if (seo.wordCount < 300) score -= 15
    if (seo.internalLinks < 3) score -= 10
    return Math.max(0, score)
  }

  const extractScore = (text) => {
    const match = text.match(/score[:\s]+(\d+)/i)
    return match ? parseInt(match[1]) : null
  }

  const exportReport = () => {
    const report = {
      liveStats,
      seoResults,
      appPages: appPages.map(p => ({ name: p.name, url: p.url })),
      exportedAt: new Date().toISOString(),
      exportedBy: user?.email
    }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `website-analytics-${Date.now()}.json`
    a.click()
    logAction?.('export_analytics', {})
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1>🌐 Website Analytics & SEO</h1>
          <p style={{ color: '#666' }}>Auto-tracking current app with AI-powered SEO (llama3.1:latest)</p>
          {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.9rem' }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            {' '}Auto-refresh (5s)
          </label>
          <button onClick={exportReport}>Export Report</button>
        </div>
      </div>

      {/* Live Statistics */}
      {liveStats && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>📊 Live App Statistics</h3>
            <span style={{ fontSize: '0.85rem', color: '#28a745', fontWeight: 'bold' }}>
              🟢 Auto-tracking active
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{liveStats.totalVisits}</div>
              <div>Total Visits</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{liveStats.uniqueSessions}</div>
              <div>Unique Sessions</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{liveStats.last24Hours}</div>
              <div>Last 24 Hours</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{liveStats.avgSessionTime}</div>
              <div>Avg Session Time</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{liveStats.bounceRate.toFixed(1)}%</div>
              <div>Bounce Rate</div>
            </div>
          </div>

          <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '8px', background: 'white' }}>
            <h4>Top Pages (Auto-detected)</h4>
            {liveStats.topPages.map(([url, count], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: i < liveStats.topPages.length - 1 ? '1px solid #eee' : 'none' }}>
                <span style={{ fontSize: '0.95rem' }}>{url}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ width: '200px', height: '8px', background: '#f0f0f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(count / liveStats.topPages[0][1]) * 100}%`, background: '#646cff' }} />
                  </div>
                  <strong style={{ minWidth: '60px', textAlign: 'right' }}>{count} visits</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-detected Pages */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3>🔍 Auto-detected App Pages ({appPages.length})</h3>
          <button 
            onClick={analyzeSEO}
            disabled={analyzing}
            style={{ padding: '0.75rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', fontSize: '1rem' }}
          >
            {analyzing ? '🤖 Analyzing SEO...' : '🤖 AI SEO Analysis'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
          {appPages.map((page, i) => (
            <div key={i} style={{ padding: '1rem', border: '2px solid #ddd', borderRadius: '8px', background: '#f9f9f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>✅</span>
                <strong>{page.name}</strong>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>{page.url}</div>
              <div style={{ fontSize: '0.75rem', color: '#28a745', marginTop: '0.5rem' }}>
                Auto-detected
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SEO Results */}
      {seoResults.length > 0 && (
        <div>
          <h3>🎯 SEO Analysis Results (llama3.1:latest)</h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {seoResults.map((result, i) => (
              <div key={i} style={{ 
                padding: '1.5rem', 
                border: '2px solid #ddd', 
                borderRadius: '8px',
                borderLeftWidth: '6px',
                borderLeftColor: result.score >= 80 ? '#28a745' : result.score >= 60 ? '#ffa500' : '#ff6b6b',
                background: 'white'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0 }}>{result.page}</h4>
                      {result.autoDetected && <span style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', background: '#28a745', color: 'white', borderRadius: '4px' }}>AUTO</span>}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{result.url}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ 
                      fontSize: '2.5rem', 
                      fontWeight: 'bold',
                      color: result.score >= 80 ? '#28a745' : result.score >= 60 ? '#ffa500' : '#ff6b6b'
                    }}>
                      {result.score}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>SEO Score</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  <div>
                    <strong>Title:</strong> {result.seoData.title ? '✅ Present' : '❌ Missing'}
                  </div>
                  <div>
                    <strong>Description:</strong> {result.seoData.description ? '✅ Present' : '❌ Missing'}
                  </div>
                  <div>
                    <strong>H1 Tags:</strong> {result.seoData.h1Count} {result.seoData.h1Count === 1 ? '✅' : '⚠️'}
                  </div>
                  <div>
                    <strong>Word Count:</strong> {result.seoData.wordCount} {result.seoData.wordCount >= 300 ? '✅' : '⚠️'}
                  </div>
                </div>

                <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                  <strong>🤖 AI Analysis:</strong><br/>
                  {result.aiAnalysis}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
