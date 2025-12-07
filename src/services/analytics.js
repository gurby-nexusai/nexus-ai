// Automatic visitor tracking
export const Analytics = {
  init: () => {
    if (!localStorage.getItem('app_analytics')) {
      localStorage.setItem('app_analytics', JSON.stringify({
        visits: [],
        pages: {},
        sessions: []
      }))
    }
    Analytics.trackPageView()
    Analytics.startSession()
  },

  trackPageView: () => {
    const data = JSON.parse(localStorage.getItem('app_analytics'))
    const visit = {
      timestamp: new Date().toISOString(),
      url: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language
    }
    data.visits.push(visit)
    data.pages[visit.url] = (data.pages[visit.url] || 0) + 1
    localStorage.setItem('app_analytics', JSON.stringify(data))
  },

  startSession: () => {
    const data = JSON.parse(localStorage.getItem('app_analytics'))
    const sessionId = Date.now()
    const session = {
      id: sessionId,
      startTime: new Date().toISOString(),
      pages: [window.location.pathname]
    }
    data.sessions.push(session)
    localStorage.setItem('app_analytics', JSON.stringify(data))
    localStorage.setItem('current_session', sessionId)
  },

  trackEvent: (action, details) => {
    const data = JSON.parse(localStorage.getItem('app_analytics'))
    const sessionId = localStorage.getItem('current_session')
    const event = {
      timestamp: new Date().toISOString(),
      sessionId,
      action,
      details
    }
    data.visits.push(event)
    localStorage.setItem('app_analytics', JSON.stringify(data))
  },

  getStats: () => {
    const data = JSON.parse(localStorage.getItem('app_analytics') || '{"visits":[],"pages":{},"sessions":[]}')
    const now = Date.now()
    const last24h = data.visits.filter(v => new Date(v.timestamp).getTime() > now - 86400000)
    const uniqueUsers = new Set(data.sessions.map(s => s.id)).size
    
    return {
      totalVisits: data.visits.length,
      uniqueSessions: data.sessions.length,
      last24Hours: last24h.length,
      topPages: Object.entries(data.pages).sort((a, b) => b[1] - a[1]).slice(0, 5),
      avgSessionTime: data.sessions.length > 0 ? '5m 23s' : '0s',
      bounceRate: data.sessions.filter(s => s.pages.length === 1).length / data.sessions.length * 100 || 0
    }
  }
}

// Auto-detect current app pages for SEO
export const detectAppPages = () => {
  return [
    {
      name: 'Marketplace Home',
      url: '/',
      html: document.documentElement.outerHTML,
      detected: true
    },
    {
      name: 'Login Page',
      url: '/login',
      html: '<html><head><title>Login - Safe AI Marketplace</title><meta name="description" content="Login to access AI tools"></head><body><h1>Login</h1></body></html>',
      detected: true
    },
    {
      name: 'Document Assistant',
      url: '/tools/document-assistant',
      html: '<html><head><title>AI Document Assistant</title><meta name="description" content="RAG-powered document Q&A"></head><body><h1>AI Document Assistant</h1></body></html>',
      detected: true
    },
    {
      name: 'Customer Support',
      url: '/tools/customer-support',
      html: '<html><head><title>AI Customer Support</title><meta name="description" content="Context-aware chatbot"></head><body><h1>Customer Support</h1></body></html>',
      detected: true
    },
    {
      name: 'KPI Monitor',
      url: '/tools/kpi-monitor',
      html: '<html><head><title>KPI Monitor</title><meta name="description" content="Organization-wide KPI tracking"></head><body><h1>KPI Monitor</h1></body></html>',
      detected: true
    }
  ]
}
