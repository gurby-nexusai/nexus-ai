# Changes - December 6, 2025

## RAG Knowledge Base Added

### IT/Technical Support (ITSupport.jsx)
- Added document upload functionality for IT documentation, guides, and FAQs
- Documents stored in localStorage under 'it_knowledge'
- RAG context automatically included in AI analysis (first 2000 chars per doc)
- Upload section displays at top with document count and delete options
- Supports .txt, .md, .doc, .docx files

### AI Customer Support (CustomerSupport.jsx)
- Added document upload functionality for product docs, FAQs, and policies
- Documents stored in localStorage under 'cs_knowledge'
- RAG context automatically included in AI responses (first 2000 chars per doc)
- Upload section displays at top with document count and delete options
- Supports .txt, .md, .doc, .docx files

## Organization KPI Monitor Removed

### App-Marketplace.jsx
- Removed KPIMonitor import
- Removed "Organization KPI Monitor" from AI_SOLUTIONS array (was id: 11)
- Removed KPIMonitor from COMPONENTS object
- Reason: KPI monitoring should access real-time data automatically, not require document uploads

## Technical Details

### Knowledge Base Storage
```javascript
const KNOWLEDGE_DB = {
  getAll: () => JSON.parse(localStorage.getItem('it_knowledge') || '[]'),
  save: (doc) => { /* saves to localStorage */ },
  delete: (id) => { /* removes from localStorage */ }
}
```

### RAG Context Integration
- Documents are concatenated into context string
- Limited to 2000 characters per document to manage token usage
- Included in LLM prompt alongside user query and system prompt
- AI can reference knowledge base content in responses

### UI Components
- Blue bordered section at top of each app
- File input with upload progress state
- Document chips with delete buttons
- Document count display in header
