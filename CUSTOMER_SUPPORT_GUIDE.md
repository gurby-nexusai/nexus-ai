# AI External Customer Support - Setup & Usage Guide

## Overview

The AI External Customer Support system provides a complete customer service solution with AI-first responses and seamless human escalation.

---

## 🌐 Public Customer Portal

**URL:** `http://localhost:5174/customer-support.html`

### Features
- Customer enters name and email to start chat
- AI assistant responds automatically to questions
- Real-time messaging (1-second polling)
- Seamless handoff to human agents when escalated
- Status indicator shows "Online" or "Connected to [Agent Name]"

### Customer Experience
1. Visit the customer support portal
2. Enter name and email address
3. Click "Start Chat"
4. Ask questions - AI responds instantly
5. If escalated, human agent takes over (no AI responses)
6. Continue conversation with human agent in real-time

---

## 👨‍💼 Internal Agent Dashboard

**Access:** Login to main app → Click "AI External Customer Support"

### Features
- View all support tickets (Open, AI Resolved, Escalated, In Progress, Resolved)
- Real-time message updates (1-second polling)
- Agent workload management with auto-assignment
- Manual escalation to human agents
- Reply directly to customers
- Resolve tickets

### Agent Workflow

#### 1. **AI-First Support**
- Customer messages are automatically answered by AI
- AI confidence score shown for each response
- Low confidence (<70%) triggers automatic escalation

#### 2. **Manual Escalation**
- Click "🚨 Escalate" button on any ticket
- Sets `escalated: true` flag permanently
- Button disappears and never returns
- Customer's next message goes to agent (not AI)
- Status updates to "Escalated"

#### 3. **Two-Way Communication**
- Customer messages appear in real-time
- Click "💬 Reply" to respond
- Type message and click "Send Reply"
- Customer sees agent message instantly
- Status automatically changes to "In Progress"

#### 4. **Resolve Ticket**
- Click "✓ Resolve" when issue is fixed
- Status changes to "Resolved"
- Ticket moves to resolved filter

---

## 🤖 Auto-Assignment System

When tickets are escalated (manually or automatically):

1. System finds all agents with status "Available"
2. Counts `activeTickets` for each available agent
3. Assigns ticket to agent with lowest count
4. Updates agent's `activeTickets` counter
5. Sets `assignedAgent` field on ticket

**Agent Status Toggle:**
- Available (green) - Receives new tickets
- Busy (red) - Skipped in auto-assignment

---

## 🔄 Real-Time Synchronization

Both customer portal and agent dashboard poll localStorage every 1 second:

**Customer Portal:**
- Checks for new agent messages
- Updates escalation status
- Shows agent name when connected

**Agent Dashboard:**
- Checks for new customer messages
- Updates ticket list
- Refreshes message threads

---

## 📊 Ticket Lifecycle

```
1. Open (AI responding)
   ↓
2. AI Resolved (AI solved issue)
   OR
   Escalated (manual or auto)
   ↓
3. In Progress (agent replying)
   ↓
4. Resolved (issue fixed)
```

**Important:** Once `escalated: true` is set, it never changes. This prevents:
- Escalate button from reappearing
- AI from responding to customer messages
- Confusion about who is handling the ticket

---

## 🎯 Key Technical Details

### Ticket Structure
```javascript
{
  id: timestamp,
  customerId: number,
  customerName: string,
  customerEmail: string,
  subject: string,
  status: 'Open' | 'AI Resolved' | 'Escalated' | 'In Progress' | 'Resolved',
  priority: 'Low' | 'Medium' | 'High',
  escalated: boolean,  // Permanent flag - never resets
  assignedAgent: string,
  createdAt: ISO timestamp,
  messages: [
    {
      type: 'user' | 'ai' | 'agent',
      text: string,
      timestamp: ISO timestamp
    }
  ]
}
```

### Message Types
- `user` - Customer message (👤 avatar)
- `ai` - AI assistant response (🤖 avatar)
- `agent` - Human agent reply (👨‍💼 avatar)

### Storage
- All data stored in `localStorage`
- Key: `external_tickets`
- Shared between customer portal and agent dashboard
- Persists across browser sessions

---

## 🚀 Deployment

### Development
```bash
# Terminal 1: Ollama (for AI responses)
ollama serve

# Terminal 2: Frontend
cd /Users/gurby1/Downloads/airoi/airoi-poc/frontend/airoi-ui/my-app
npm run dev
```

### Public URLs
- **Customer Portal:** `http://localhost:5174/customer-support.html`
- **Agent Dashboard:** `http://localhost:5174` (login required)

### Production
- Deploy customer portal as standalone HTML page
- Can be embedded in existing website
- No backend required (uses Ollama API directly)
- Consider adding authentication for agent dashboard

---

## 💡 Best Practices

### For Agents
1. Monitor AI confidence scores - low scores may need escalation
2. Toggle status to "Busy" when handling complex issues
3. Escalate early if AI is struggling
4. Use clear, concise language in replies
5. Resolve tickets promptly to free up workload

### For Administrators
1. Keep agent count balanced with ticket volume
2. Monitor escalation rates (high = AI needs improvement)
3. Review AI Resolved tickets for quality
4. Train agents on escalation criteria
5. Ensure at least one agent is "Available" during business hours

---

## 🔧 Customization

### Change AI Model
Edit `customer-support.html` line ~430:
```javascript
model: 'llama3.1'  // Change to 'mistral', 'llama2', etc.
```

### Adjust Polling Interval
Edit both files (default: 1000ms = 1 second):
```javascript
setInterval(checkForNewMessages, 1000)  // Customer portal
setInterval(() => { loadTickets() }, 1000)  // Agent dashboard
```

### Modify AI System Prompt
Edit `customer-support.html` line ~435:
```javascript
{ role: 'system', content: 'Your custom instructions here' }
```

---

## 📈 Metrics & Analytics

Track these KPIs from the dashboard:
- **Open Tickets** - Current AI-handled tickets
- **AI Resolved** - Successfully solved by AI
- **Escalated** - Requiring human intervention
- **Resolved** - Total closed tickets
- **Avg AI Confidence** - AI response quality indicator

---

## 🐛 Troubleshooting

**Customer messages not appearing:**
- Check localStorage is enabled
- Verify both pages use same domain/port
- Check browser console for errors

**AI not responding:**
- Ensure Ollama is running (`ollama serve`)
- Verify model is installed (`ollama list`)
- Check network tab for API errors

**Agent replies not showing:**
- Verify `type: 'agent'` is set in message
- Check polling is active (console logs)
- Refresh both customer and agent pages

**Escalate button keeps appearing:**
- Check `escalated: true` flag is set
- Verify condition uses `!ticket.escalated` not status
- Clear localStorage and test fresh ticket

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Verify all 3 services are running (Ollama, Frontend, Python API)
3. Test with fresh localStorage (clear and retry)
4. Review this documentation for configuration options

---

**Last Updated:** December 6, 2025
