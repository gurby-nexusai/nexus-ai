import { useState, useEffect } from 'react'
import './App.css'
import { AuthProvider, useAuth, AuthForm } from './components/Auth'
import { Analytics } from './services/analytics'
import DocumentAssistant from './tools/DocumentAssistant'
import CustomerSupport from './tools/CustomerSupport'
import AnalyticsPlatform from './tools/AnalyticsPlatform'
import ComplianceMonitor from './tools/ComplianceMonitor'
import WebsiteAnalytics from './tools/WebsiteAnalytics'
import SuggestionScheme from './tools/SuggestionScheme'
import PresentationGenerator from './tools/PresentationGenerator'
import AnonymousChat from './tools/AnonymousChat'
import EventManager from './tools/EventManager'
import VotingSystem from './tools/VotingSystem'
import OpenMeetingScheduler from './tools/OpenMeetingScheduler'
import AIROICalculator from './tools/AIROICalculator'
import AdminApp from './tools/AdminApp'
import ITSupport from './tools/ITSupport'
import WorkplanCollaboration from './tools/WorkplanCollaboration'
import KnowledgeManagement from './tools/KnowledgeManagement'
import ExternalCustomerSupport from './tools/ExternalCustomerSupport'
import ContractReview from './tools/ContractReview'
import RecruitmentAssistant from './tools/RecruitmentAssistant'
import PerformanceAssessment from './tools/PerformanceAssessment'

const AI_SOLUTIONS = [
  { id: 1, name: 'AI Writing Assistant', level: 'Starter', risk: 'Low', description: 'Powerful pitches, emotionally sensitive & formal writing', component: 'DocumentAssistant' },
  { id: 2, name: 'AI Presentation Generator', level: 'Starter', risk: 'Low', description: 'NLP slide extraction with PowerPoint export', component: 'PresentationGenerator' },
  { id: 3, name: 'AI Anonymous Idea Chat', level: 'Starter', risk: 'Low', description: 'Department-based anonymous discussions', component: 'AnonymousChat' },
  { id: 4, name: 'AI Event Manager', level: 'Starter', risk: 'Low', description: 'Create and manage company events with RSVP', component: 'EventManager' },
  { id: 5, name: 'AI Voting/Polling System', level: 'Starter', risk: 'Low', description: 'Anonymous department proposals with voting', component: 'VotingSystem' },
  { id: 6, name: 'AI Open Meeting Scheduler', level: 'Starter', risk: 'Low', description: 'Topic-based meetings with date voting', component: 'OpenMeetingScheduler' },
  { id: 7, name: 'AI ROI Calculator', level: 'Advanced', risk: 'Low', description: 'AI-powered productivity & ROI analysis', component: 'AIROICalculator' },
  { id: 8, name: 'AI Internal Customer Support', level: 'Intermediate', risk: 'Medium', description: 'Internal support chatbot with RAG', component: 'CustomerSupport' },
  { id: 9, name: 'AI IT/Technical Support', level: 'Intermediate', risk: 'Medium', description: 'AI support with human escalation option', component: 'ITSupport' },
  { id: 10, name: 'AI Analytics Platform', level: 'Advanced', risk: 'Medium', description: 'Smart analytics with Python backend', component: 'AnalyticsPlatform' },
  { id: 11, name: 'AI Compliance Monitor', level: 'Advanced', risk: 'Low', description: 'IT/Security compliance & violation tracking', component: 'ComplianceMonitor' },
  { id: 12, name: 'AI App Analytics & SEO', level: 'Intermediate', risk: 'Low', description: 'Auto-tracking visitor analytics & AI SEO', component: 'WebsiteAnalytics' },
  { id: 13, name: 'AI Suggestion Scheme', level: 'Starter', risk: 'Low', description: 'Employee ideas with rewards & AI evaluation', component: 'SuggestionScheme' },
  { id: 14, name: 'AI Workplan Collaboration', level: 'Advanced', risk: 'Low', description: 'Cross-department strategic planning & execution', component: 'WorkplanCollaboration' },
  { id: 15, name: 'AI Admin Dashboard', level: 'Advanced', risk: 'Low', description: 'User management & payout approvals', component: 'AdminApp' },
  { id: 16, name: 'AI Knowledge Management', level: 'Advanced', risk: 'Low', description: 'Document repository with AI search & Q&A', component: 'KnowledgeManagement' },
  { id: 17, name: 'AI External Customer Support', level: 'Advanced', risk: 'Medium', description: 'Agent dashboard for managing customer tickets (widget for website)', component: 'ExternalCustomerSupport', restrictedTo: ['admin', 'Customer Support'] },
  { id: 18, name: 'AI Contract Review', level: 'Advanced', risk: 'Medium', description: 'Legal contract analysis, risk assessment & redlining', component: 'ContractReview', restrictedTo: ['admin', 'Legal'] },
  { id: 19, name: 'AI Recruitment Assistant', level: 'Advanced', risk: 'Low', description: 'Resume screening, candidate ranking & interview questions', component: 'RecruitmentAssistant', restrictedTo: ['admin', 'HR'] },
  { id: 20, name: 'AI Annual Performance Assessment', level: 'Advanced', risk: 'Low', description: 'Comprehensive employee reviews with AI insights', component: 'PerformanceAssessment' },
]

const COMPONENTS = {
  DocumentAssistant,
  PresentationGenerator,
  AnonymousChat,
  EventManager,
  VotingSystem,
  OpenMeetingScheduler,
  AIROICalculator,
  CustomerSupport,
  ITSupport,
  AnalyticsPlatform,
  ComplianceMonitor,
  WebsiteAnalytics,
  SuggestionScheme,
  WorkplanCollaboration,
  AdminApp,
  KnowledgeManagement,
  ExternalCustomerSupport,
  ContractReview,
  RecruitmentAssistant,
  PerformanceAssessment
}

function MarketplaceContent() {
  const { user, logout } = useAuth()
  const [selectedLevel, setSelectedLevel] = useState('All')
  const [activeTool, setActiveTool] = useState(null)
  const [llmProvider, setLlmProvider] = useState(localStorage.getItem('llmProvider') || 'ollama')
  const [apiKey, setApiKey] = useState(localStorage.getItem('llmApiKey') || '')
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    Analytics.init()
  }, [])

  useEffect(() => {
    localStorage.setItem('llmProvider', llmProvider)
    localStorage.setItem('llmApiKey', apiKey)
  }, [llmProvider, apiKey])

  const filtered = selectedLevel === 'All' 
    ? AI_SOLUTIONS 
    : AI_SOLUTIONS.filter(s => s.level === selectedLevel)

  // Filter out deactivated apps
  const appConfig = JSON.parse(localStorage.getItem('app_config') || '{}')
  const activeApps = filtered.filter(app => appConfig[app.id] !== false)

  const hasAccess = (solution) => {
    if (!solution.restrictedTo) return true
    return solution.restrictedTo.includes(user?.role) || 
           solution.restrictedTo.includes(user?.department)
  }

  const launchTool = (solution) => {
    setActiveTool(solution)
    Analytics.trackEvent('launch_tool', { tool: solution.name })
  }

  if (activeTool) {
    const ToolComponent = COMPONENTS[activeTool.component]
    return (
      <div>
        <div style={{ padding: '1rem', background: '#f0f0f0', borderBottom: '2px solid #ddd', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            onClick={() => {
              setActiveTool(null)
              Analytics.trackEvent('back_to_marketplace', {})
            }}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            ← Back to Marketplace
          </button>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem' }}>{user?.name} ({user?.email})</span>
            <button onClick={logout} style={{ padding: '0.5rem 1rem' }}>Logout</button>
          </div>
        </div>
        <ToolComponent />
      </div>
    )
  }

  return (
    <div className="app">
      <header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1400px', margin: '0 auto' }}>
          <div>
            <h1>🛡️ Safe AI Marketplace</h1>
            <p>Progressive AI adoption for enterprises - All engagement tracked & analyzed</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              style={{ padding: '0.5rem 1rem', background: '#646cff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              ⚙️ AI Settings
            </button>
            <span style={{ fontSize: '0.9rem' }}>Welcome, {user?.name}</span>
            <button onClick={logout} style={{ padding: '0.5rem 1rem' }}>Logout</button>
          </div>
        </div>
        
        {showSettings && (
          <div style={{ maxWidth: '1400px', margin: '1rem auto', padding: '1.5rem', background: '#f9f9f9', borderRadius: '8px', border: '2px solid #646cff' }}>
            <h3 style={{ margin: '0 0 1rem 0' }}>🤖 AI Model Configuration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '1rem', alignItems: 'center' }}>
              <label style={{ fontWeight: 'bold' }}>AI Provider:</label>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value)}
                style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="ollama">Ollama (llama3.1:latest) - Local</option>
                <option value="groq">Groq - Cloud API</option>
                <option value="openrouter">OpenRouter - Cloud API</option>
              </select>
              
              {llmProvider !== 'ollama' && (
                <>
                  <label style={{ fontWeight: 'bold' }}>API Key:</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={`Enter ${llmProvider} API key`}
                    style={{ padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </>
              )}
            </div>
            <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '1rem', marginBottom: 0 }}>
              This setting applies to all AI-powered features across the marketplace
            </p>
          </div>
        )}
      </header>

      <div className="filters">
        {['All', 'Starter', 'Intermediate', 'Advanced'].map(level => (
          <button 
            key={level}
            className={selectedLevel === level ? 'active' : ''}
            onClick={() => {
              setSelectedLevel(level)
              Analytics.trackEvent('filter_change', { level })
            }}
          >
            {level}
          </button>
        ))}
      </div>

      <div className="content">
        <div className="solutions" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {activeApps.map(solution => {
            const canAccess = hasAccess(solution)
            return (
              <div key={solution.id} className="card" style={{ opacity: canAccess ? 1 : 0.5, position: 'relative' }}>
                {!canAccess && (
                  <div style={{ 
                    position: 'absolute', 
                    top: '10px', 
                    right: '10px', 
                    background: '#ff6b6b', 
                    color: 'white', 
                    padding: '0.25rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem',
                    fontWeight: 'bold'
                  }}>
                    🔒 Restricted
                  </div>
                )}
                <div className="badge">{solution.level}</div>
                <h3>{solution.name}</h3>
                <p>{solution.description}</p>
                {solution.restrictedTo && (
                  <p style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                    Access: {solution.restrictedTo.join(', ')}
                  </p>
                )}
                <div className="meta">
                  <span className={`risk ${solution.risk.toLowerCase()}`}>Risk: {solution.risk}</span>
                </div>
                <button 
                  onClick={() => canAccess && launchTool(solution)} 
                  disabled={!canAccess}
                  style={{ 
                    width: '100%', 
                    background: canAccess ? '#28a745' : '#ccc', 
                    padding: '0.75rem', 
                    fontWeight: 'bold',
                    cursor: canAccess ? 'pointer' : 'not-allowed',
                    opacity: canAccess ? 1 : 0.6
                  }}
                >
                  {canAccess ? 'Launch App' : '🔒 Access Denied'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

function AppContent() {
  const { user } = useAuth()
  
  if (!user) {
    return <AuthForm />
  }
  
  return <MarketplaceContent />
}

export default App
