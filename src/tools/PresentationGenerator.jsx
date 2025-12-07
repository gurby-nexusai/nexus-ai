import { useState } from 'react'
import { useAuth } from '../components/Auth'
import { callLLM } from '../services/llm'
import pptxgen from 'pptxgenjs'
import mammoth from 'mammoth'
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'
import { saveAs } from 'file-saver'

const TONES = ['Professional', 'Friendly', 'Persuasive', 'Technical', 'Executive', 'Educational']
const MODES = ['Business Pitch', 'Training', 'Report', 'Product Demo', 'Strategy', 'Research']

export default function PresentationGenerator() {
  const { user, logAction } = useAuth()
  const [content, setContent] = useState('')
  const [structuredContent, setStructuredContent] = useState(null)
  const [numSlides, setNumSlides] = useState(5)
  const [tone, setTone] = useState('Professional')
  const [mode, setMode] = useState('Business Pitch')
  const [slides, setSlides] = useState([])
  const [generating, setGenerating] = useState(false)

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.name.endsWith('.docx')) {
      const arrayBuffer = await file.arrayBuffer()
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer })
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlResult.value, 'text/html')
      
      const structure = []
      let currentSection = null
      let documentTitle = null
      let documentAuthor = null
      
      // Process all nodes in order
      Array.from(doc.body.childNodes).forEach(node => {
        const text = node.textContent?.trim()
        if (!text) return
        
        // Capture document title (first paragraph or very long title-like text)
        if (!documentTitle && (text.length > 30 && text.includes(':'))) {
          documentTitle = text
          return
        }
        
        // Capture author
        if (!documentAuthor && /^By[: ]/i.test(text)) {
          documentAuthor = text
          return
        }
        
        // Check if this is a heading
        const isHeading = node.nodeName === 'H1' || node.nodeName === 'H2' || node.nodeName === 'H3'
        const looksLikeHeading = node.nodeName === 'P' && (
          /^(Introduction|What |Trends|Technical |Strategic |Conclusion|Summary|Background|Overview|Abstract)/i.test(text) ||
          (text.length < 60 && text.split(' ').length <= 8)
        )
        
        if (isHeading || looksLikeHeading) {
          // Save previous section if it has content
          if (currentSection && currentSection.bullets.length > 0) {
            structure.push(currentSection)
          }
          // Start new section with this as title
          currentSection = { 
            title: text, 
            level: isHeading ? (node.nodeName === 'H1' ? 1 : node.nodeName === 'H2' ? 2 : 3) : 2, 
            bullets: [] 
          }
        } else if (node.nodeName === 'UL' || node.nodeName === 'OL') {
          // List items
          const bullets = Array.from(node.querySelectorAll('li')).map(li => li.textContent.trim())
          if (currentSection) {
            currentSection.bullets.push(...bullets)
          }
        } else if (node.nodeName === 'P') {
          // Regular paragraph
          if (currentSection) {
            // Add to current section
            const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]
            currentSection.bullets.push(...sentences.slice(0, 5).map(s => s.trim()))
          }
        }
      })
      
      // Don't forget the last section
      if (currentSection && currentSection.bullets.length > 0) {
        structure.push(currentSection)
      }
      
      // Store document metadata
      if (documentTitle || documentAuthor) {
        structure.unshift({
          title: documentTitle || 'Document Title',
          level: 0,
          bullets: documentAuthor ? [documentAuthor] : [],
          isDocTitle: true
        })
      }
      
      // Get plain text for fallback
      const textResult = await mammoth.extractRawText({ arrayBuffer })
      
      console.log('Parsed document structure:', structure)
      setStructuredContent(structure)
      setContent(textResult.value)
      
    } else if (file.name.endsWith('.txt')) {
      const text = await file.text()
      setContent(text)
      setStructuredContent(null)
    }
  }

  const extractKeyConceptsAsBullets = (text, targetSlides) => {
    // Calculate concepts needed
    const contentSlides = targetSlides - 2
    const targetConcepts = contentSlides * 4
    
    // Get sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || []
    
    // Extract all important phrases and terms
    const concepts = []
    
    sentences.forEach(sentence => {
      const lower = sentence.toLowerCase()
      
      // Extract numbers/data points as concepts
      const dataMatches = sentence.match(/\d+%|\$\d+[\d,]*|\d+[\d,]*\s*(million|billion|thousand|percent|increase|decrease|growth)/gi)
      if (dataMatches) {
        dataMatches.forEach(data => {
          concepts.push({ text: data.trim(), score: 10, type: 'data' })
        })
      }
      
      // Extract key phrases (noun phrases, action phrases)
      const words = sentence.split(/\s+/)
      
      // Look for important patterns
      const importantWords = ['increase', 'decrease', 'improve', 'reduce', 'achieve', 'goal', 'target', 'result', 'benefit', 'solution', 'strategy', 'key', 'main', 'primary', 'critical', 'essential', 'recommend', 'propose', 'implement', 'develop', 'create', 'launch', 'deliver', 'optimize', 'enhance', 'transform', 'drive', 'enable', 'support']
      
      words.forEach((word, idx) => {
        const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '')
        if (importantWords.includes(cleanWord) && idx + 3 < words.length) {
          // Extract 2-4 word phrase starting with this word
          const phrase = words.slice(idx, idx + 4).join(' ').replace(/[^a-zA-Z0-9\s%$]/g, '').trim()
          if (phrase.split(/\s+/).length <= 5) {
            concepts.push({ text: phrase, score: 5, type: 'phrase' })
          }
        }
      })
    })
    
    // Remove duplicates and sort by score
    const unique = [...new Map(concepts.map(c => [c.text.toLowerCase(), c])).values()]
    const sorted = unique.sort((a, b) => b.score - a.score)
    
    return sorted.slice(0, targetConcepts).map(c => c.text)
  }

  const generatePresentation = async () => {
    if (!content.trim() || generating) return
    
    setGenerating(true)
    
    let parsedSlides = []
    
    if (structuredContent && structuredContent.length > 0) {
      // Use document structure directly
      parsedSlides = createSlidesFromStructure(structuredContent)
    } else {
      // Extract key concepts from plain text
      const rawConcepts = extractKeyConceptsAsBullets(content, numSlides)
      const bulletConcepts = rawConcepts.map(c => condenseToBullet(c))
      
      const context = `
Content Length: ${content.length} characters
Target: ${numSlides} slides
Key Concepts (max 5 words each):
${bulletConcepts.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Tone: ${tone}
Mode: ${mode}
`
      
      const systemPrompt = `Create ${numSlides} slides for ${mode} presentation (${tone} tone).

Return ONLY valid JSON:
[
  {
    "slideNumber": 1,
    "title": "Main Topic Title",
    "bullets": ["5-7 words per point", "Keep concise and clear", "Action-oriented language"],
    "notes": "Speaker notes"
  }
]

STRICT RULES:
- Each bullet: 5-7 WORDS (not full sentences)
- Use concepts provided
- Slide 1: Title + overview
- Slides 2-${numSlides - 1}: Content (4 bullets each)
- Slide ${numSlides}: Conclusion + takeaways
- Keep data points (numbers, %)
- ${tone} language
- Action verbs preferred`
      
      try {
        const llmProvider = localStorage.getItem('llmProvider') || 'ollama'
        const apiKey = localStorage.getItem('llmApiKey') || ''
        const response = await callLLM('Create concise presentation', context, systemPrompt, llmProvider, apiKey)
        
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
          parsedSlides = JSON.parse(jsonMatch[0])
          // Enforce 7-word limit on all bullets
          parsedSlides = parsedSlides.map(slide => ({
            ...slide,
            bullets: slide.bullets.map(b => {
              const words = b.split(/\s+/)
              return words.length > 7 ? words.slice(0, 7).join(' ') : b
            })
          }))
        } else {
          parsedSlides = createSlidesFromConcepts(bulletConcepts, numSlides)
        }
      } catch (error) {
        console.error(error)
        parsedSlides = createSlidesFromConcepts(bulletConcepts, numSlides)
      }
    }
    
    setSlides(parsedSlides)
    logAction?.('generate_presentation', { slides: numSlides, tone, mode, hasStructure: !!structuredContent })
    setGenerating(false)
  }

  const createSlidesFromStructure = (structure) => {
    const slides = []
    
    const sectionsWithContent = structure.filter(s => s.bullets && s.bullets.length > 0)
    
    if (sectionsWithContent.length === 0) {
      alert('No content found')
      return []
    }
    
    let slideNum = 1
    
    // Slide 1: Use document title if available
    const docTitleSection = structure.find(s => s.isDocTitle)
    
    if (docTitleSection) {
      slides.push({
        slideNumber: slideNum++,
        title: 'Title',
        bullets: [
          docTitleSection.title,
          ...docTitleSection.bullets
        ].filter(b => b),
        notes: 'Title slide'
      })
    }
    
    // Content slides: All sections (skip doc title section)
    sectionsWithContent.filter(s => !s.isDocTitle).forEach(section => {
      const bullets = section.bullets
        .map(paragraph => {
          const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph]
          return sentences[0]?.trim()
        })
        .filter(b => b && !(/^By[: ]/i.test(b)))
        .slice(0, 6)
      
      if (bullets.length > 0) {
        slides.push({
          slideNumber: slideNum++,
          title: section.title,
          bullets: bullets,
          notes: section.title
        })
      }
    })
    
    return slides
  }

  const condenseToBullet = (text, maxWords = 8) => {
    if (!text) return ''
    let condensed = text.replace(/\s+/g, ' ').trim()
    const words = condensed.split(/\s+/)
    if (words.length <= maxWords) return condensed
    
    const important = []
    const actionVerbs = ['increase', 'decrease', 'improve', 'reduce', 'achieve', 'implement', 'develop', 'create', 'launch', 'deliver', 'optimize', 'enhance', 'transform', 'drive', 'enable', 'support', 'build', 'execute', 'manage', 'analyze', 'design', 'plan', 'provide', 'ensure', 'maintain']
    
    words.forEach((word, idx) => {
      const clean = word.replace(/[^a-zA-Z0-9%$]/g, '')
      if (/\d/.test(word) || (idx > 0 && /^[A-Z]/.test(word)) || actionVerbs.includes(clean.toLowerCase()) || /%|\$/.test(word)) {
        important.push(word)
      }
    })
    
    if (important.length >= 3 && important.length <= maxWords) return important.join(' ')
    return words.slice(0, maxWords).join(' ')
  }

  const createSlidesFromConcepts = (concepts, count) => {
    const slides = []
    const contentSlides = count - 2
    const conceptsPerSlide = Math.ceil(concepts.length / contentSlides)
    
    // Title slide
    slides.push({
      slideNumber: 1,
      title: concepts[0] || 'Presentation Overview',
      bullets: [
        `${concepts.length} key concepts`,
        `${count} focused slides`,
        'Data-driven insights',
        'Actionable recommendations'
      ],
      notes: 'Welcome and introduce presentation topic'
    })
    
    // Content slides
    for (let i = 0; i < contentSlides; i++) {
      const start = i * conceptsPerSlide
      const slideConcepts = concepts.slice(start, start + conceptsPerSlide).slice(0, 5)
      
      slides.push({
        slideNumber: i + 2,
        title: `Key Concept ${i + 1}`,
        bullets: slideConcepts,
        notes: `Elaborate on: ${slideConcepts[0]}`
      })
    }
    
    // Conclusion
    const lastConcepts = concepts.slice(-3)
    slides.push({
      slideNumber: count,
      title: 'Key Takeaways',
      bullets: [
        ...lastConcepts,
        'Questions and discussion'
      ].slice(0, 5),
      notes: 'Summarize and open for questions'
    })
    
    return slides
  }

  const downloadPowerPoint = async () => {
    const pptx = new pptxgen()
    
    pptx.author = user?.name || 'Author'
    pptx.title = slides[0]?.bullets[0] || 'Presentation'
    
    slides.forEach((slide, index) => {
      const pptxSlide = pptx.addSlide()
      pptxSlide.background = { color: 'FFFFFF' }
      
      if (index === 0 && slide.title === 'Title') {
        // Title slide - centered
        pptxSlide.addText(slide.bullets[0] || 'Title', {
          x: 0.5,
          y: 2.0,
          w: 9,
          h: 1.5,
          fontSize: 36,
          bold: true,
          color: '000000',
          align: 'center',
          valign: 'middle'
        })
        
        if (slide.bullets[1]) {
          pptxSlide.addText(slide.bullets[1], {
            x: 0.5,
            y: 3.8,
            w: 9,
            h: 0.5,
            fontSize: 18,
            color: '333333',
            align: 'center'
          })
        }
      } else {
        // Content slides
        pptxSlide.addText(slide.title, {
          x: 0.5,
          y: 0.5,
          w: 9,
          h: 0.8,
          fontSize: 28,
          bold: true,
          color: '000000'
        })
        
        slide.bullets.forEach((bullet, i) => {
          pptxSlide.addText(bullet, {
            x: 0.8,
            y: 1.5 + (i * 0.6),
            w: 8.5,
            h: 0.5,
            fontSize: 14,
            color: '000000',
            valign: 'top'
          })
        })
      }
    })
    
    await pptx.writeFile({ fileName: `Presentation-${Date.now()}.pptx` })
    logAction?.('download_powerpoint', { slides: slides.length })
  }

  const downloadWord = async () => {
    // Generate proper RTF with heading styles for PowerPoint import
    let rtf = '{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033\n'
    rtf += '{\\fonttbl{\\f0\\fnil\\fcharset0 Calibri;}}\n'
    rtf += '{\\*\\generator Riched20 10.0.19041}\\viewkind4\\uc1\n'
    
    // Define styles
    rtf += '{\\stylesheet{\\s1\\sb240\\sa120\\keepn\\widctlpar\\b\\f0\\fs32 Heading 1;}'
    rtf += '{\\s2\\sb120\\sa120\\widctlpar\\f0\\fs24 Heading 2;}}\n'
    
    slides.forEach(slide => {
      // Heading 1 for slide title
      rtf += `\\pard\\s1\\sb240\\sa120\\keepn\\widctlpar\\b\\f0\\fs32 ${escapeRTF(slide.title)}\\par\n`
      
      // Heading 2 for each bullet
      slide.bullets.forEach(bullet => {
        rtf += `\\pard\\s2\\sb120\\sa120\\widctlpar\\f0\\fs24 ${escapeRTF(bullet)}\\par\n`
      })
    })
    
    rtf += '}'
    
    const blob = new Blob([rtf], { type: 'application/rtf' })
    saveAs(blob, `Outline-${Date.now()}.rtf`)
    logAction?.('download_rtf', { slides: slides.length })
  }

  const escapeRTF = (text) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/{/g, '\\{')
      .replace(/}/g, '\\}')
      .replace(/\n/g, '\\par ')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1>📊 AI Presentation Generator</h1>
        <p style={{ color: '#666' }}>Upload Word doc with headings/bullets OR paste text - AI extracts key points</p>
        {user && <p style={{ fontSize: '0.9rem', color: '#666' }}>User: {user.name}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Controls */}
        <div>
          <div style={{ padding: '1.5rem', border: '2px solid #ddd', borderRadius: '8px', background: 'white', marginBottom: '1rem' }}>
            <h3>Presentation Settings</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {TONES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Presentation Mode</label>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                {MODES.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '1rem', padding: '1.5rem', border: '2px dashed #646cff', borderRadius: '8px', background: '#f9f9ff' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>📄 Upload Document (Recommended)</label>
            <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
              Word docs with headings & bullets work best!
            </p>
            <input
              type="file"
              accept=".docx,.txt"
              onChange={handleFileUpload}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px', background: 'white' }}
            />
            {structuredContent && (
              <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#d4edda', borderRadius: '4px', fontSize: '0.85rem', color: '#155724' }}>
                ✓ Document structure detected: {structuredContent.length} sections
              </div>
            )}
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Or Paste Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your document, report, or notes here..."
              rows={10}
              style={{ width: '100%', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '4px', resize: 'vertical', fontSize: '0.95rem' }}
            />
          </div>

          <button
            onClick={generatePresentation}
            disabled={generating || !content.trim()}
            style={{
              width: '100%',
              padding: '1rem',
              background: '#646cff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              cursor: generating ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {generating ? '🤖 Extracting Key Points...' : '✨ Generate Presentation'}
          </button>

          {slides.length > 0 && (
            <>
              <button
                onClick={downloadPowerPoint}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  marginBottom: '0.5rem'
                }}
              >
                📥 Download PowerPoint (.pptx)
              </button>
              <button
                onClick={downloadWord}
                style={{
                  width: '100%',
                  padding: '1rem',
                  background: '#2196F3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                📄 Download Rich Text Document
              </button>
            </>
          )}
        </div>

        {/* Slide Preview */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>Slide Preview</h3>
            {slides.length > 0 && (
              <span style={{ fontSize: '0.9rem', color: '#666' }}>
                {slides.length} production slides ready
              </span>
            )}
          </div>

          {slides.length === 0 ? (
            <div style={{ 
              padding: '4rem', 
              textAlign: 'center', 
              color: '#999', 
              border: '2px dashed #ddd', 
              borderRadius: '8px',
              background: '#f9f9f9'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📊</div>
              <div>Your production PowerPoint slides will appear here</div>
              <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>NLP will extract key points automatically</div>
            </div>
          ) : (
            <div style={{ maxHeight: '800px', overflowY: 'auto' }}>
              {slides.map((slide, i) => (
                <div key={i} style={{ 
                  marginBottom: '2rem',
                  border: '2px solid #ddd',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: 'white',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                  {/* Slide Header */}
                  <div style={{ 
                    padding: '1rem', 
                    background: i === 0 ? 'linear-gradient(135deg, #0D47A1 0%, #1976D2 100%)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 'bold' }}>Slide {slide.slideNumber}</span>
                    <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>{tone} • {mode}</span>
                  </div>

                  {/* Slide Content */}
                  <div style={{ padding: '2rem', minHeight: '300px', background: 'white' }}>
                    <h2 style={{ 
                      margin: '0 0 1.5rem 0', 
                      fontSize: '1.8rem',
                      color: '#333',
                      borderBottom: '3px solid #667eea',
                      paddingBottom: '0.5rem'
                    }}>
                      {slide.title}
                    </h2>
                    
                    <ul style={{ 
                      listStyle: 'none', 
                      padding: 0,
                      margin: 0
                    }}>
                      {slide.bullets.map((bullet, j) => (
                        <li key={j} style={{ 
                          marginBottom: '1rem',
                          fontSize: '1.1rem',
                          display: 'flex',
                          alignItems: 'start',
                          gap: '0.75rem'
                        }}>
                          <span style={{ 
                            color: '#667eea', 
                            fontSize: '1.5rem',
                            lineHeight: '1'
                          }}>•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Speaker Notes */}
                  <div style={{ 
                    padding: '1rem', 
                    background: '#f9f9f9',
                    borderTop: '1px solid #ddd'
                  }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#666' }}>
                      📝 Speaker Notes:
                    </div>
                    <div style={{ fontSize: '0.9rem', color: '#555', fontStyle: 'italic' }}>
                      {slide.notes}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
