import { useState, useEffect } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { saveAs } from 'file-saver'

const ASSESSMENT_DB = {
  getAll: () => JSON.parse(localStorage.getItem('performance_assessments') || '[]'),
  save: (assessment) => {
    const assessments = ASSESSMENT_DB.getAll()
    assessments.push(assessment)
    localStorage.setItem('performance_assessments', JSON.stringify(assessments))
  },
  update: (id, updates) => {
    const assessments = ASSESSMENT_DB.getAll()
    const idx = assessments.findIndex(a => a.id === id)
    if (idx !== -1) {
      assessments[idx] = { ...assessments[idx], ...updates }
      localStorage.setItem('performance_assessments', JSON.stringify(assessments))
    }
  },
  delete: (id) => {
    const assessments = ASSESSMENT_DB.getAll().filter(a => a.id !== id)
    localStorage.setItem('performance_assessments', JSON.stringify(assessments))
  }
}

const ATTRIBUTES = [
  { key: 'jobKnowledge', label: 'Job Knowledge & Skills' },
  { key: 'qualityOfWork', label: 'Quality of Work' },
  { key: 'productivity', label: 'Productivity & Efficiency' },
  { key: 'communication', label: 'Communication Skills' },
  { key: 'teamwork', label: 'Teamwork & Collaboration' },
  { key: 'leadership', label: 'Leadership & Initiative' },
  { key: 'problemSolving', label: 'Problem Solving & Innovation' },
  { key: 'attendance', label: 'Attendance & Punctuality' },
  { key: 'adaptability', label: 'Adaptability & Learning' },
  { key: 'customerService', label: 'Customer Service' }
]

export default function PerformanceAssessment() {
  const { user, logAction } = useAuth()
  const [assessments, setAssessments] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [generating, setGenerating] = useState(false)
  
  const [newAssessment, setNewAssessment] = useState({
    employeeName: '',
    employeeEmail: '',
    department: '',
    position: '',
    reviewPeriod: new Date().getFullYear(),
    ratings: {},
    comments: {},
    goals: '',
    overallSummary: '',
    developmentPlan: ''
  })

  const departments = ['Executive', 'Sales', 'Marketing', 'Engineering', 'Operations', 'Finance', 'HR', 'IT', 'Customer Success']

  useEffect(() => {
    loadAssessments()
  }, [])

  const loadAssessments = () => {
    setAssessments(ASSESSMENT_DB.getAll())
  }

  const createAssessment = async () => {
    if (!newAssessment.employeeName || !newAssessment.department) {
      alert('Please fill in employee name and department')
      return
    }

    const assessment = {
      id: Date.now(),
      ...newAssessment,
      createdBy: user?.name,
      createdAt: new Date().toISOString(),
      status: 'Draft',
      acknowledged: false
    }

    ASSESSMENT_DB.save(assessment)
    loadAssessments()
    setShowCreate(false)
    setNewAssessment({
      employeeName: '',
      employeeEmail: '',
      department: '',
      position: '',
      reviewPeriod: new Date().getFullYear(),
      ratings: {},
      comments: {},
      goals: '',
      overallSummary: '',
      developmentPlan: ''
    })
    logAction?.('create_assessment', { employee: assessment.employeeName })
  }

  const generateAISummary = async () => {
    if (!selectedAssessment) return

    setGenerating(true)
    
    const ratingsText = ATTRIBUTES.map(attr => 
      `${attr.label}: ${selectedAssessment.ratings[attr.key] || 'N/A'}/5 - ${selectedAssessment.comments[attr.key] || 'No comment'}`
    ).join('\n')

    const summaryPrompt = `Based on this annual performance assessment, generate a professional overall performance summary (3-4 paragraphs):

${ratingsText}

Employee: ${selectedAssessment.employeeName}
Position: ${selectedAssessment.position}
Department: ${selectedAssessment.department}

Provide a balanced summary highlighting strengths, areas for improvement, and overall contribution.`

    const developmentPrompt = `Based on the same assessment data, suggest a development plan with 3-5 specific, actionable recommendations for professional growth and skill improvement.`

    const summary = await callLLM(summaryPrompt)
    const development = await callLLM(developmentPrompt)

    ASSESSMENT_DB.update(selectedAssessment.id, {
      overallSummary: summary,
      developmentPlan: development
    })

    loadAssessments()
    setSelectedAssessment({ ...selectedAssessment, overallSummary: summary, developmentPlan: development })
    setGenerating(false)
  }

  const generateCommentAI = async (attrKey, attrLabel) => {
    const rating = selectedAssessment.ratings[attrKey]
    if (!rating) {
      alert('Please select a rating first')
      return
    }

    setGenerating(true)
    const prompt = `Generate a professional performance review comment for "${attrLabel}" with a rating of ${rating}/5 for ${selectedAssessment.employeeName} (${selectedAssessment.position}). Include specific examples and constructive feedback. Keep it 2-3 sentences.`
    
    const comment = await callLLM(prompt)
    updateComment(attrKey, comment)
    setGenerating(false)
  }

  const generateGoalsAI = async () => {
    setGenerating(true)
    
    const ratingsText = ATTRIBUTES.map(attr => 
      `${attr.label}: ${selectedAssessment.ratings[attr.key] || 'N/A'}/5`
    ).join('\n')

    const prompt = `Based on this performance assessment, suggest 3-5 SMART goals for ${selectedAssessment.employeeName} (${selectedAssessment.position}) for the next year:

${ratingsText}

Focus on areas for improvement and career development.`
    
    const goals = await callLLM(prompt)
    setSelectedAssessment({ ...selectedAssessment, goals })
    setGenerating(false)
  }

  const updateRating = (attrKey, value) => {
    setSelectedAssessment({
      ...selectedAssessment,
      ratings: { ...selectedAssessment.ratings, [attrKey]: value }
    })
  }

  const updateComment = (attrKey, value) => {
    setSelectedAssessment({
      ...selectedAssessment,
      comments: { ...selectedAssessment.comments, [attrKey]: value }
    })
  }

  const saveAssessment = () => {
    ASSESSMENT_DB.update(selectedAssessment.id, selectedAssessment)
    loadAssessments()
    alert('✓ Assessment saved')
  }

  const finalizeAssessment = () => {
    if (!selectedAssessment.overallSummary || !selectedAssessment.overallSummary.trim()) {
      alert('Please generate the Overall Performance Summary before finalizing')
      return
    }
    if (!confirm('Finalize this assessment? Employee will be able to view it.')) return
    ASSESSMENT_DB.update(selectedAssessment.id, { ...selectedAssessment, status: 'Finalized' })
    loadAssessments()
    setSelectedAssessment(null)
    alert('✓ Assessment finalized')
  }

  const exportToWord = async (assessment) => {
    const sections = [
      new Paragraph({ 
        text: 'ANNUAL PERFORMANCE ASSESSMENT', 
        heading: HeadingLevel.HEADING_1, 
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({ 
        text: `Review Period: ${assessment.reviewPeriod}`, 
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      
      new Paragraph({ text: 'EMPLOYEE INFORMATION', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
      new Paragraph({ text: `Name: ${assessment.employeeName}`, spacing: { after: 100 } }),
      new Paragraph({ text: `Position: ${assessment.position || 'N/A'}`, spacing: { after: 100 } }),
      new Paragraph({ text: `Department: ${assessment.department}`, spacing: { after: 100 } }),
      new Paragraph({ text: `Reviewer: ${assessment.createdBy}`, spacing: { after: 100 } }),
      new Paragraph({ text: `Date: ${new Date(assessment.createdAt).toLocaleDateString()}`, spacing: { after: 400 } }),
      
      new Paragraph({ text: 'PERFORMANCE RATINGS', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } })
    ]

    // Add ratings table
    ATTRIBUTES.forEach(attr => {
      const rating = assessment.ratings[attr.key] || 'N/A'
      const comment = assessment.comments[attr.key] || 'No comment provided'
      
      sections.push(
        new Paragraph({ 
          children: [
            new TextRun({ text: attr.label, bold: true }),
            new TextRun({ text: `: ${rating}/5`, bold: true })
          ],
          spacing: { before: 200, after: 100 }
        }),
        new Paragraph({ text: comment, spacing: { after: 200 } })
      )
    })

    // Average rating
    sections.push(
      new Paragraph({ 
        children: [
          new TextRun({ text: 'OVERALL AVERAGE RATING: ', bold: true, size: 28 }),
          new TextRun({ text: `${averageRating(assessment)}/5`, bold: true, size: 28 })
        ],
        spacing: { before: 400, after: 400 },
        alignment: AlignmentType.CENTER
      })
    )

    // Overall summary
    if (assessment.overallSummary) {
      sections.push(
        new Paragraph({ text: 'OVERALL PERFORMANCE SUMMARY', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
        new Paragraph({ text: assessment.overallSummary, spacing: { after: 400 } })
      )
    }

    // Development plan
    if (assessment.developmentPlan) {
      sections.push(
        new Paragraph({ text: 'DEVELOPMENT PLAN', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
        new Paragraph({ text: assessment.developmentPlan, spacing: { after: 400 } })
      )
    }

    // Goals for next year
    if (assessment.goals) {
      sections.push(
        new Paragraph({ text: 'GOALS FOR NEXT YEAR', heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 200 } }),
        new Paragraph({ text: assessment.goals, spacing: { after: 400 } })
      )
    }

    // Signatures
    sections.push(
      new Paragraph({ text: '', spacing: { before: 600 } }),
      new Paragraph({ text: '_'.repeat(50), spacing: { after: 100 } }),
      new Paragraph({ text: `Reviewer Signature: ${assessment.createdBy}`, spacing: { after: 400 } }),
      new Paragraph({ text: '_'.repeat(50), spacing: { after: 100 } }),
      new Paragraph({ text: `Employee Signature: ${assessment.employeeName}`, spacing: { after: 100 } }),
      new Paragraph({ text: 'Date: _______________' })
    )

    const doc = new Document({ 
      sections: [{ 
        properties: {},
        children: sections 
      }] 
    })
    
    const blob = await Packer.toBlob(doc)
    saveAs(blob, `Performance_Assessment_${assessment.employeeName.replace(/\s+/g, '_')}_${assessment.reviewPeriod}.docx`)
  }

  const averageRating = (assessment) => {
    const ratings = Object.values(assessment.ratings).filter(r => r)
    if (ratings.length === 0) return 0
    return (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
  }

  const stats = {
    total: assessments.length,
    draft: assessments.filter(a => a.status === 'Draft').length,
    finalized: assessments.filter(a => a.status === 'Finalized').length,
    avgRating: assessments.length > 0 ? (assessments.reduce((sum, a) => sum + parseFloat(averageRating(a)), 0) / assessments.length).toFixed(1) : 0
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <h1>📊 AI Annual Performance Assessment</h1>
      <p style={{ color: '#666' }}>Comprehensive employee performance reviews with AI-powered insights</p>
      {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name} • Role: {user.role}</p>}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.total}</div>
          <div>Total Assessments</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.draft}</div>
          <div>Draft</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.finalized}</div>
          <div>Finalized</div>
        </div>
        <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', borderRadius: '8px', color: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>{stats.avgRating}</div>
          <div>Average Rating</div>
        </div>
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
        + Create New Assessment
      </button>

      {/* Create Form */}
      {showCreate && (
        <div style={{ padding: '2rem', border: '2px solid #28a745', borderRadius: '8px', marginBottom: '2rem', background: '#f0fff0' }}>
          <h3>Create New Annual Assessment</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Employee Name *</label>
              <input
                type="text"
                value={newAssessment.employeeName}
                onChange={(e) => setNewAssessment({ ...newAssessment, employeeName: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Employee Email</label>
              <input
                type="email"
                value={newAssessment.employeeEmail}
                onChange={(e) => setNewAssessment({ ...newAssessment, employeeEmail: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Department *</label>
              <select
                value={newAssessment.department}
                onChange={(e) => setNewAssessment({ ...newAssessment, department: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="">Select Department</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Position</label>
              <input
                type="text"
                value={newAssessment.position}
                onChange={(e) => setNewAssessment({ ...newAssessment, position: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Review Period (Year)</label>
              <input
                type="number"
                value={newAssessment.reviewPeriod}
                onChange={(e) => setNewAssessment({ ...newAssessment, reviewPeriod: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={createAssessment}
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
              Create Assessment
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

      {/* Assessment Detail View */}
      {selectedAssessment && (
        <div style={{ padding: '2rem', border: '2px solid #667eea', borderRadius: '8px', marginBottom: '2rem', background: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
            <div>
              <h2 style={{ margin: '0 0 0.5rem 0' }}>{selectedAssessment.employeeName}</h2>
              <p style={{ margin: 0, color: '#666' }}>
                {selectedAssessment.position} • {selectedAssessment.department} • Review Period: {selectedAssessment.reviewPeriod}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
              <button
                onClick={() => setSelectedAssessment(null)}
                style={{ padding: '0.5rem 1rem', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                ← Back
              </button>
            </div>
          </div>

          <h3>Performance Attributes (Rate 1-5)</h3>
          <div style={{ display: 'grid', gap: '1.5rem', marginBottom: '2rem' }}>
            {ATTRIBUTES.map(attr => (
              <div key={attr.key} style={{ padding: '1rem', background: '#f9f9f9', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <label style={{ fontWeight: 'bold' }}>{attr.label}</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => updateRating(attr.key, rating)}
                        style={{
                          width: '40px',
                          height: '40px',
                          background: selectedAssessment.ratings[attr.key] === rating ? '#667eea' : 'white',
                          color: selectedAssessment.ratings[attr.key] === rating ? 'white' : '#333',
                          border: '2px solid #667eea',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'start' }}>
                  <textarea
                    value={selectedAssessment.comments[attr.key] || ''}
                    onChange={(e) => updateComment(attr.key, e.target.value)}
                    placeholder="Comments and examples (optional)..."
                    rows={4}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical' }}
                  />
                  <button
                    onClick={() => generateCommentAI(attr.key, attr.label)}
                    disabled={generating}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    🤖 AI
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h3 style={{ margin: 0 }}>Goals for Next Year</h3>
            <button
              onClick={generateGoalsAI}
              disabled={generating}
              style={{
                padding: '0.5rem 1rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              🤖 Generate Goals with AI
            </button>
          </div>
          <textarea
            value={selectedAssessment.goals}
            onChange={(e) => setSelectedAssessment({ ...selectedAssessment, goals: e.target.value })}
            placeholder="Set goals and objectives for the next review period..."
            rows={4}
            style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', marginBottom: '2rem', resize: 'vertical' }}
          />

          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <button
              onClick={generateAISummary}
              disabled={generating}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {generating ? 'Generating...' : '🤖 Generate AI Summary & Development Plan'}
            </button>
          </div>

          {selectedAssessment.overallSummary && (
            <>
              <h3>Overall Performance Summary</h3>
              <textarea
                value={selectedAssessment.overallSummary}
                onChange={(e) => setSelectedAssessment({ ...selectedAssessment, overallSummary: e.target.value })}
                rows={8}
                style={{ width: '100%', padding: '1rem', background: '#f0f4ff', border: '1px solid #2196F3', borderRadius: '8px', marginBottom: '2rem', resize: 'vertical', fontSize: '0.95rem', lineHeight: '1.5' }}
              />

              <h3>Development Plan</h3>
              <textarea
                value={selectedAssessment.developmentPlan}
                onChange={(e) => setSelectedAssessment({ ...selectedAssessment, developmentPlan: e.target.value })}
                rows={6}
                style={{ width: '100%', padding: '1rem', background: '#f0fff0', border: '1px solid #28a745', borderRadius: '8px', marginBottom: '2rem', resize: 'vertical', fontSize: '0.95rem', lineHeight: '1.5' }}
              />
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={saveAssessment}
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
              💾 Save Assessment
            </button>
            <button
              onClick={() => exportToWord(selectedAssessment)}
              style={{
                flex: 1,
                padding: '0.75rem',
                background: '#ff9800',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              📥 Download Word
            </button>
            {selectedAssessment.status === 'Draft' && (
              <button
                onClick={finalizeAssessment}
                style={{
                  flex: 1,
                  padding: '0.75rem',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✓ Finalize Assessment
              </button>
            )}
          </div>
        </div>
      )}

      {/* Assessments List */}
      {!selectedAssessment && (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {assessments.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#999', border: '2px dashed #ddd', borderRadius: '8px' }}>
              No assessments yet. Create your first annual performance assessment.
            </div>
          ) : (
            assessments.map(assessment => (
              <div key={assessment.id} style={{ 
                padding: '1.5rem', 
                border: '2px solid #ddd', 
                borderRadius: '8px',
                background: 'white',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedAssessment(assessment)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{assessment.employeeName}</h3>
                    <div style={{ fontSize: '0.9rem', color: '#666' }}>
                      {assessment.position} • {assessment.department} • {assessment.reviewPeriod}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>
                      Created by {assessment.createdBy} • {new Date(assessment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#667eea' }}>{averageRating(assessment)}</div>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>Avg Rating</div>
                    </div>
                    <div style={{
                      padding: '0.5rem 1rem',
                      background: assessment.status === 'Finalized' ? '#28a745' : '#ffa500',
                      color: 'white',
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      fontSize: '0.9rem'
                    }}>
                      {assessment.status}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); exportToWord(assessment); }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#ff9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      📥 Download
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this assessment?')) { ASSESSMENT_DB.delete(assessment.id); loadAssessments(); } }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: '#ff6b6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
