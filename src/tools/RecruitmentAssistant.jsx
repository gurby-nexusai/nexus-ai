import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'

const CANDIDATE_DB = {
  getAll: () => JSON.parse(localStorage.getItem('candidates') || '[]'),
  save: (candidate) => {
    const candidates = CANDIDATE_DB.getAll()
    candidates.push(candidate)
    localStorage.setItem('candidates', JSON.stringify(candidates))
  },
  update: (id, updates) => {
    const candidates = CANDIDATE_DB.getAll()
    const idx = candidates.findIndex(c => c.id === id)
    if (idx !== -1) {
      candidates[idx] = { ...candidates[idx], ...updates }
      localStorage.setItem('candidates', JSON.stringify(candidates))
    }
  },
  delete: (id) => {
    const candidates = CANDIDATE_DB.getAll().filter(c => c.id !== id)
    localStorage.setItem('candidates', JSON.stringify(candidates))
  }
}

const JOB_DB = {
  getAll: () => JSON.parse(localStorage.getItem('job_postings') || '[]'),
  save: (job) => {
    const jobs = JOB_DB.getAll()
    jobs.push(job)
    localStorage.setItem('job_postings', JSON.stringify(jobs))
  },
  update: (id, updates) => {
    const jobs = JOB_DB.getAll()
    const idx = jobs.findIndex(j => j.id === id)
    if (idx !== -1) {
      jobs[idx] = { ...jobs[idx], ...updates }
      localStorage.setItem('job_postings', JSON.stringify(jobs))
    }
  },
  delete: (id) => {
    const jobs = JOB_DB.getAll().filter(j => j.id !== id)
    localStorage.setItem('job_postings', JSON.stringify(jobs))
  }
}

export default function RecruitmentAssistant() {
  const { user, logAction } = useAuth()
  const [candidates, setCandidates] = useState([])
  const [jobs, setJobs] = useState([])
  const [activeTab, setActiveTab] = useState('candidates')
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobTitle, setJobTitle] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [showJobModal, setShowJobModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadJobId, setUploadJobId] = useState(null)

  const llmProvider = localStorage.getItem('llmProvider') || 'ollama'
  const apiKey = localStorage.getItem('llmApiKey') || ''

  useEffect(() => {
    loadCandidates()
    loadJobs()
  }, [])

  const loadCandidates = () => {
    setCandidates(CANDIDATE_DB.getAll())
  }

  const loadJobs = () => {
    setJobs(JOB_DB.getAll())
  }

  const handleFileSelect = (e, jobId) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      setUploadJobId(jobId)
    }
  }

  const handleResumeUpload = async () => {
    if (!selectedFile || !uploadJobId) return

    setUploading(true)
    
    try {
      let resumeText = ''
      
      if (selectedFile.name.endsWith('.docx')) {
        const arrayBuffer = await selectedFile.arrayBuffer()
        const mammoth = await import('mammoth')
        const result = await mammoth.extractRawText({ arrayBuffer })
        resumeText = result.value
      } else {
        resumeText = await selectedFile.text()
      }
      
      if (!resumeText.trim()) {
        alert('Error: Could not extract text from file.')
        setUploading(false)
        return
      }
      
      const candidate = {
        id: Date.now(),
        name: selectedFile.name.replace(/\.(txt|docx)$/i, ''),
        resume: resumeText,
        jobId: uploadJobId,
        uploadedAt: new Date().toISOString(),
        status: 'Pending Review'
      }

      CANDIDATE_DB.save(candidate)
      loadCandidates()
      setUploading(false)
      setSelectedFile(null)
      setUploadJobId(null)
      
      // Clear file input
      const fileInputs = document.querySelectorAll('input[type="file"]')
      fileInputs.forEach(input => input.value = '')
      
      alert('✓ Resume uploaded successfully. Click "Screen" to analyze.')
      logAction?.('upload_resume', { name: candidate.name, jobId: uploadJobId })
    } catch (error) {
      console.error('Error processing file:', error)
      setUploading(false)
      alert('Error processing file: ' + error.message)
    }
  }

  const screenCandidate = async (candidateId) => {
    const candidate = candidates.find(c => c.id === candidateId)
    const job = jobs.find(j => j.id === candidate.jobId)
    if (!candidate || !job) return

    console.log('Screening candidate:', candidate.name)
    console.log('Resume length:', candidate.resume?.length || 0)
    console.log('Resume preview:', candidate.resume?.substring(0, 200))
    console.log('Job:', job.title)

    if (!candidate.resume || candidate.resume.trim().length === 0) {
      alert('Error: Resume content is empty. Please re-upload the resume.')
      return
    }

    setProcessing(true)

    const context = `Job Title: ${job.title}\n\nJob Requirements:\n${job.description}\n\nCandidate Resume:\n${candidate.resume}`
    
    const systemPrompt = `You are an AI recruitment assistant. Screen this candidate and provide:

1. MATCH SCORE: Rate 0-100 how well candidate matches job requirements
2. KEY QUALIFICATIONS: List relevant skills and experience
3. STRENGTHS: What makes this candidate strong
4. GAPS: Missing qualifications or experience
5. RED FLAGS: Any concerns (employment gaps, job hopping, etc.)
6. BIAS CHECK: Note any potential bias in evaluation
7. RECOMMENDATION: Reject, Maybe, or Strong Candidate

Be objective and focus on qualifications, not demographics.`

    try {
      const screening = await callLLM('Screen this candidate', context, systemPrompt, llmProvider, apiKey)
      
      // Extract match score
      const scoreMatch = screening.match(/match score:?\s*(\d+)/i)
      const matchScore = scoreMatch ? parseInt(scoreMatch[1]) : 50

      // Extract recommendation
      let recommendation = 'Maybe'
      if (screening.toLowerCase().includes('strong candidate')) recommendation = 'Strong Candidate'
      if (screening.toLowerCase().includes('reject')) recommendation = 'Reject'

      CANDIDATE_DB.update(candidateId, {
        screening: screening,
        matchScore: matchScore,
        recommendation: recommendation,
        status: 'Screened',
        screenedAt: new Date().toISOString()
      })

      loadCandidates()
      setProcessing(false)
      alert('✓ Candidate screening complete')
      logAction?.('screen_candidate', { candidateId, matchScore, recommendation })
    } catch (error) {
      setProcessing(false)
      alert('Error screening candidate. Check LLM settings.')
    }
  }

  const generateInterviewQuestions = async (candidateId) => {
    const candidate = candidates.find(c => c.id === candidateId)
    const job = jobs.find(j => j.id === candidate.jobId)
    if (!candidate || !job) return

    setProcessing(true)

    const context = `Job: ${job.title}\nCandidate Resume:\n${candidate.resume}\nScreening Results:\n${candidate.screening || 'Not screened yet'}`
    
    const systemPrompt = `Generate 10 targeted interview questions for this candidate:
- 3 technical/skill questions
- 3 behavioral questions
- 2 questions about gaps or concerns
- 2 questions to assess cultural fit

Make questions specific to their background and the role.`

    try {
      const questions = await callLLM('Generate interview questions', context, systemPrompt, llmProvider, apiKey)
      
      CANDIDATE_DB.update(candidateId, {
        interviewQuestions: questions,
        questionsGeneratedAt: new Date().toISOString()
      })

      loadCandidates()
      setProcessing(false)
      alert('✓ Interview questions generated')
    } catch (error) {
      setProcessing(false)
      alert('Error generating questions. Check LLM settings.')
    }
  }

  const optimizeJobDescription = async (jobId) => {
    const job = jobs.find(j => j.id === jobId)
    if (!job) return

    setProcessing(true)

    const context = `Job Title: ${job.title}\n\nCurrent Description:\n${job.description}`
    
    const systemPrompt = `Optimize this job description:
1. Make it more inclusive and bias-free
2. Highlight key requirements clearly
3. Add compelling company benefits
4. Use action-oriented language
5. Remove unnecessary jargon
6. Ensure ATS-friendly keywords
7. Check for gender-coded language

Provide the optimized version and explain changes made.`

    try {
      const optimized = await callLLM('Optimize job description', context, systemPrompt, llmProvider, apiKey)
      
      JOB_DB.update(jobId, {
        optimizedDescription: optimized,
        optimizedAt: new Date().toISOString()
      })

      loadJobs()
      setProcessing(false)
      alert('✓ Job description optimized')
    } catch (error) {
      setProcessing(false)
      alert('Error optimizing. Check LLM settings.')
    }
  }

  const createJob = () => {
    if (!jobTitle.trim() || !jobDescription.trim()) {
      alert('Please enter job title and description')
      return
    }

    const job = {
      id: Date.now(),
      title: jobTitle,
      description: jobDescription,
      createdBy: user?.name,
      createdAt: new Date().toISOString(),
      status: 'Open'
    }

    JOB_DB.save(job)
    loadJobs()
    setJobTitle('')
    setJobDescription('')
    setShowJobModal(false)
    alert('✓ Job posting created')
  }

  const deleteCandidate = (id) => {
    if (confirm('Delete this candidate?')) {
      CANDIDATE_DB.delete(id)
      loadCandidates()
    }
  }

  const deleteJob = (id) => {
    if (confirm('Delete this job posting?')) {
      JOB_DB.delete(id)
      loadJobs()
      // Also delete associated candidates
      candidates.filter(c => c.jobId === id).forEach(c => CANDIDATE_DB.delete(c.id))
      loadCandidates()
    }
  }

  const stats = {
    totalJobs: jobs.length,
    totalCandidates: candidates.length,
    screened: candidates.filter(c => c.status === 'Screened').length,
    strongCandidates: candidates.filter(c => c.recommendation === 'Strong Candidate').length
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>👔 AI Recruitment Assistant</h1>
      <p style={{ color: '#666' }}>AI-powered resume screening and candidate ranking</p>
      {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalJobs}</div>
          <div>Open Positions</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.totalCandidates}</div>
          <div>Total Candidates</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.screened}</div>
          <div>Screened</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.strongCandidates}</div>
          <div>Strong Candidates</div>
        </div>
      </div>

      {/* Public Portal Link */}
      <div style={{ marginBottom: '2rem', padding: '1rem', border: '2px solid #667eea', borderRadius: '8px', background: '#f0f4ff' }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>🌐 Public Careers Portal</h3>
        <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1rem' }}>Share this link with job seekers to apply</p>
        <input
          value="http://localhost:5174/careers-portal.html"
          readOnly
          style={{ width: '100%', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.95rem', border: '1px solid #ddd', borderRadius: '4px' }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '2px solid #ddd' }}>
        <button
          onClick={() => setActiveTab('candidates')}
          style={{
            padding: '1rem 2rem',
            background: activeTab === 'candidates' ? '#646cff' : 'transparent',
            color: activeTab === 'candidates' ? 'white' : 'black',
            border: 'none',
            borderBottom: activeTab === 'candidates' ? '3px solid #646cff' : 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          📄 Candidates ({candidates.length})
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '1rem 2rem',
            background: activeTab === 'jobs' ? '#646cff' : 'transparent',
            color: activeTab === 'jobs' ? 'white' : 'black',
            border: 'none',
            borderBottom: activeTab === 'jobs' ? '3px solid #646cff' : 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          💼 Job Postings ({jobs.length})
        </button>
      </div>

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div>
          {jobs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
              Create a job posting first to start screening candidates
            </div>
          ) : (
            <>
              {jobs.map(job => {
                const jobCandidates = candidates.filter(c => c.jobId === job.id).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
                return (
                  <div key={job.id} style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '8px' }}>
                      <div>
                        <h3 style={{ margin: '0 0 0.25rem 0' }}>💼 {job.title} ({jobCandidates.length} candidates)</h3>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Convert resume to .txt format (File → Save As → Plain Text)</p>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input 
                          type="file" 
                          accept=".txt,.docx"
                          onChange={(e) => handleFileSelect(e, job.id)}
                          disabled={uploading}
                        />
                        {selectedFile && uploadJobId === job.id && (
                          <button
                            onClick={handleResumeUpload}
                            disabled={uploading}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#28a745',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: uploading ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {uploading ? 'Uploading...' : 'Upload Resume'}
                          </button>
                        )}
                      </div>
                    </div>

                    {jobCandidates.length === 0 ? (
                      <div style={{ padding: '2rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
                        No candidates yet. Upload resumes to get started.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        {jobCandidates.map(candidate => (
                          <div key={candidate.id} style={{
                            padding: '1.5rem',
                            border: '2px solid #ddd',
                            borderRadius: '8px',
                            background: 'white',
                            borderLeftWidth: '6px',
                            borderLeftColor: 
                              candidate.recommendation === 'Strong Candidate' ? '#28a745' :
                              candidate.recommendation === 'Reject' ? '#ff6b6b' : '#ffa500'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                              <div style={{ flex: 1 }}>
                                <h4 style={{ margin: '0 0 0.5rem 0' }}>👤 {candidate.name}</h4>
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                                  Uploaded {new Date(candidate.uploadedAt).toLocaleDateString()}
                                </div>
                                {candidate.matchScore !== undefined && (
                                  <div style={{ marginTop: '0.5rem' }}>
                                    <span style={{
                                      padding: '0.25rem 0.75rem',
                                      background: candidate.matchScore >= 70 ? '#28a745' : candidate.matchScore >= 50 ? '#ffa500' : '#ff6b6b',
                                      color: 'white',
                                      borderRadius: '4px',
                                      fontSize: '0.85rem',
                                      fontWeight: 'bold',
                                      marginRight: '0.5rem'
                                    }}>
                                      {candidate.matchScore}% Match
                                    </span>
                                    <span style={{
                                      padding: '0.25rem 0.75rem',
                                      background: '#f0f0f0',
                                      borderRadius: '4px',
                                      fontSize: '0.85rem'
                                    }}>
                                      {candidate.recommendation}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => deleteCandidate(candidate.id)}
                                style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '1.5rem' }}
                              >
                                ×
                              </button>
                            </div>

                            {candidate.screening && (
                              <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px', marginBottom: '1rem' }}>
                                <strong>🤖 AI Screening:</strong>
                                <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                                  {candidate.screening}
                                </div>
                              </div>
                            )}

                            {candidate.interviewQuestions && (
                              <div style={{ padding: '1rem', background: '#e3f2fd', borderRadius: '4px', marginBottom: '1rem' }}>
                                <strong>❓ Interview Questions:</strong>
                                <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                                  {candidate.interviewQuestions}
                                </div>
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {!candidate.screening && (
                                <button
                                  onClick={() => screenCandidate(candidate.id)}
                                  disabled={processing}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: '#646cff',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: processing ? 'not-allowed' : 'pointer',
                                    fontWeight: 'bold'
                                  }}
                                >
                                  {processing ? '🤖 Screening...' : '🔍 Screen Candidate'}
                                </button>
                              )}
                              
                              {candidate.screening && !candidate.interviewQuestions && (
                                <button
                                  onClick={() => generateInterviewQuestions(candidate.id)}
                                  disabled={processing}
                                  style={{
                                    padding: '0.5rem 1rem',
                                    background: '#28a745',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: processing ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  ❓ Generate Interview Questions
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <div>
          <div style={{ marginBottom: '2rem' }}>
            <button
              onClick={() => setShowJobModal(true)}
              style={{ padding: '0.75rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              + Create Job Posting
            </button>
          </div>

          {jobs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
              No job postings yet. Create one to start screening candidates.
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {jobs.map(job => (
                <div key={job.id} style={{ padding: '1.5rem', border: '2px solid #ddd', borderRadius: '8px', background: 'white' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.5rem 0' }}>💼 {job.title}</h3>
                      <div style={{ fontSize: '0.85rem', color: '#666' }}>
                        Created by {job.createdBy} • {new Date(job.createdAt).toLocaleDateString()} • {candidates.filter(c => c.jobId === job.id).length} candidates
                      </div>
                    </div>
                    <button
                      onClick={() => deleteJob(job.id)}
                      style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '1.5rem' }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '4px', marginBottom: '1rem' }}>
                    <strong>Job Description:</strong>
                    <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                      {job.description}
                    </div>
                  </div>

                  {job.optimizedDescription && (
                    <div style={{ padding: '1rem', background: '#d4edda', borderRadius: '4px', marginBottom: '1rem' }}>
                      <strong>✨ Optimized Description:</strong>
                      <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap', fontSize: '0.9rem' }}>
                        {job.optimizedDescription}
                      </div>
                    </div>
                  )}

                  {!job.optimizedDescription && (
                    <button
                      onClick={() => optimizeJobDescription(job.id)}
                      disabled={processing}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#646cff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: processing ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                      }}
                    >
                      {processing ? '✨ Optimizing...' : '✨ Optimize Description'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Job Modal */}
      {showJobModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '600px', width: '90%' }}>
            <h3>Create Job Posting</h3>
            <div style={{ marginBottom: '1rem', marginTop: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Job Title</label>
              <input
                type="text"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g., Senior Software Engineer"
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Job Description</label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Enter job requirements, responsibilities, qualifications..."
                rows={8}
                style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowJobModal(false); setJobTitle(''); setJobDescription(''); }}
                style={{ padding: '0.75rem 1.5rem', background: '#ddd', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={createJob}
                style={{ padding: '0.75rem 1.5rem', background: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Create Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
