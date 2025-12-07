# Customer Support Widget - Setup Guide

## Overview

The AI Customer Support Widget allows external customers to chat with your AI assistant and request human agents. Customers must sign up with name and email before chatting.

---

## Quick Setup (3 Steps)

### Step 1: Host the Widget Files

Upload these files to your web server:
- `support-widget.js` (from `/public/support-widget.js`)
- `customer-widget.html` (standalone demo from `/public/customer-widget.html`)

### Step 2: Add Widget to Your Website

Add this code before the closing `</body>` tag on your website:

```html
<script src="https://your-domain.com/support-widget.js"></script>
<script>
  AISupportWidget.init({
    apiUrl: 'https://your-api-domain.com/api/support',
    companyName: 'Your Company Name'
  });
</script>
```

### Step 3: Test It

1. Visit your website
2. Click the chat bubble (bottom-right)
3. Enter name and email
4. Start chatting!

---

## How It Works

### Customer Flow

```
1. Customer visits your website
   ↓
2. Sees chat bubble (bottom-right corner)
   ↓
3. Clicks bubble → Signup form appears
   ↓
4. Enters name + email → Chat opens
   ↓
5. Types question → AI responds instantly
   ↓
6. If needed → Clicks "Talk to Human Agent"
   ↓
7. Human agent joins conversation
```

### Features

✅ **Customer Signup Required**
- Name and email collected
- Session saved in browser
- No password needed

✅ **AI First**
- AI responds to all initial questions
- Fast, instant responses
- 60-80% of questions resolved

✅ **Human Escalation**
- Customer can request human agent anytime
- AI auto-suggests human for complex questions
- Seamless handoff

✅ **Session Persistence**
- Customer info saved in browser
- No need to re-enter details
- Conversation history maintained

---

## Configuration Options

```javascript
AISupportWidget.init({
  // Required
  apiUrl: 'https://your-api.com/api/support',
  
  // Optional
  companyName: 'Your Company',        // Shown in header
  primaryColor: '#667eea',            // Widget color theme
  position: 'bottom-right',           // Widget position
  welcomeMessage: 'How can we help?', // Initial message
  requireEmail: true,                 // Require email signup
  requireName: true                   // Require name signup
});
```

---

## API Endpoints Required

Your backend needs these endpoints:

### POST /api/support/message

**Request:**
```json
{
  "sessionId": "1234567890",
  "message": "How do I reset my password?",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "mode": "ai"
}
```

**Response:**
```json
{
  "success": true,
  "response": "To reset your password, click 'Forgot Password' on the login page...",
  "confidence": 0.95,
  "ticketId": "TICKET-123"
}
```

### POST /api/support/escalate

**Request:**
```json
{
  "sessionId": "1234567890",
  "ticketId": "TICKET-123",
  "reason": "Customer requested human agent"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Escalated to human agent",
  "estimatedWaitTime": "2 minutes"
}
```

---

## Customization

### Change Colors

```javascript
// In support-widget.js, modify the CSS:
background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);
```

### Change Position

```javascript
// Modify bubble position in CSS:
.ai-support-bubble {
  bottom: 20px;  // Change this
  right: 20px;   // Change this
}
```

### Add Company Logo

```javascript
// In injectHTML function, add logo:
<div class="ai-support-header">
  <img src="your-logo.png" style="height: 24px;">
  <h3>${this.config.companyName} Support</h3>
</div>
```

---

## Testing

### Test Locally

1. Open `customer-widget.html` in browser
2. Enter test name and email
3. Send test messages
4. Click "Talk to Human Agent"

### Test on Website

1. Add widget code to your site
2. Open browser DevTools → Console
3. Check for errors
4. Test signup flow
5. Test AI responses
6. Test human escalation

---

## Troubleshooting

### Widget Not Appearing

**Check:**
- Widget script loaded? (View page source)
- JavaScript errors? (Browser console)
- CSS conflicts? (Inspect element)

**Fix:**
```javascript
// Add to widget init:
console.log('Widget loaded');
```

### API Errors

**Check:**
- API URL correct?
- CORS enabled?
- API responding?

**Fix:**
```javascript
// Test API directly:
fetch('https://your-api.com/api/support/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: true })
})
.then(r => r.json())
.then(console.log);
```

### Signup Not Working

**Check:**
- Email validation working?
- LocalStorage enabled?
- Form submission prevented?

**Fix:**
```javascript
// Debug auth:
console.log('Name:', name);
console.log('Email:', email);
console.log('Session saved:', localStorage.getItem('aiSupportSession'));
```

---

## Security

### Input Sanitization

```javascript
// Sanitize user input before sending to API
function sanitize(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### Rate Limiting

```javascript
// Limit messages per minute
let messageCount = 0;
let lastReset = Date.now();

function checkRateLimit() {
  if (Date.now() - lastReset > 60000) {
    messageCount = 0;
    lastReset = Date.now();
  }
  
  if (messageCount >= 10) {
    alert('Too many messages. Please wait.');
    return false;
  }
  
  messageCount++;
  return true;
}
```

### Email Validation

```javascript
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

---

## Analytics

Track widget usage:

```javascript
// Add to sendMessage function:
if (window.gtag) {
  gtag('event', 'support_message_sent', {
    'event_category': 'support',
    'event_label': this.chatMode
  });
}

// Track escalations:
if (window.gtag) {
  gtag('event', 'support_escalated', {
    'event_category': 'support',
    'event_label': 'human_requested'
  });
}
```

---

## Mobile Optimization

The widget is mobile-responsive by default:

```css
@media (max-width: 768px) {
  .ai-support-window {
    width: 100%;
    height: 100%;
    bottom: 0;
    right: 0;
    border-radius: 0;
  }
  
  .ai-support-bubble {
    bottom: 10px;
    right: 10px;
    width: 50px;
    height: 50px;
  }
}
```

---

## Production Checklist

- [ ] Widget files hosted on CDN
- [ ] API endpoints deployed
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Error handling tested
- [ ] Mobile responsive verified
- [ ] Analytics tracking added
- [ ] Security measures implemented
- [ ] Knowledge base uploaded
- [ ] Support agents trained
- [ ] Monitoring dashboard setup

---

## Support

For issues or questions:
1. Check browser console for errors
2. Verify API endpoints are working
3. Test with demo HTML file first
4. Review this guide thoroughly

---

## Example Implementation

See `customer-widget.html` for a complete standalone example that you can test immediately.
