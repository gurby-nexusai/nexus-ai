# AI Recruitment Assistant - Integration Guide

## Overview

The AI Recruitment Assistant has two components:
1. **Public Careers Portal** - For candidates to apply (on your website)
2. **Internal HR Dashboard** - For HR to screen candidates (in AI ROI Platform)

---

## Architecture

```
Your Company Website
    ↓
Careers Portal (Public)
    ↓
Candidate Applies
    ↓
API Endpoint
    ↓
Internal HR Dashboard
    ↓
AI Screens & Ranks
    ↓
HR Reviews & Interviews
```

---

## Setup Instructions

### Step 1: Add Careers Portal to Your Website

**Option A: Standalone Page**

Host `careers-portal.html` on your website:
```
https://yourcompany.com/careers
```

**Option B: Embed in Existing Page**

Add this iframe to your careers page:
```html
<iframe 
  src="https://yourcompany.com/careers-portal.html" 
  width="100%" 
  height="800px" 
  frameborder="0">
</iframe>
```

### Step 2: Create API Endpoints

Add these endpoints to your backend:

#### GET /api/recruitment/jobs
Returns list of open positions

```javascript
// Example response
{
  "jobs": [
    {
      "id": 123,
      "title": "Senior Software Engineer",
      "description": "We're looking for...",
      "createdAt": "2025-12-06T10:00:00Z",
      "status": "Open"
    }
  ]
}
```

#### POST /api/recruitment/apply
Receives candidate applications

```javascript
// Request body
{
  "jobId": 123,
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "linkedin": "https://linkedin.com/in/johndoe",
  "resume": "...resume content...",
  "coverLetter": "...",
  "fileName": "john_doe_resume.pdf"
}

// Response
{
  "success": true,
  "candidateId": 456,
  "message": "Application received"
}
```

### Step 3: Sync with Internal Dashboard

When application is received via API:
1. Save to candidate database
2. Application appears in HR Dashboard automatically
3. HR can screen with AI

---

## Complete Flow

### For Candidates (Public)

1. **Visit Careers Page**
   - See all open positions
   - Read job descriptions

2. **Click "Apply Now"**
   - Fill out application form
   - Upload resume
   - Add cover letter (optional)

3. **Submit Application**
   - Instant confirmation
   - Application sent to HR

4. **Wait for Response**
   - HR reviews application
   - Candidate contacted if selected

### For HR Staff (Internal)

1. **Login to AI ROI Platform**
   - Access Recruitment Assistant app

2. **View Applications**
   - See all candidates by job
   - Sorted by submission date

3. **Screen with AI**
   - Click "Screen Candidate"
   - AI analyzes resume vs job requirements
   - Get match score and recommendation

4. **Review Results**
   - See strengths, gaps, red flags
   - Check bias detection
   - View ranked candidates

5. **Generate Interview Questions**
   - Click "Generate Questions"
   - Get 10 personalized questions
   - Prepare for interview

6. **Contact Candidates**
   - Reach out to top candidates
   - Schedule interviews
   - Make hiring decisions

---

## Data Flow

### Public Application
```
Candidate fills form
    ↓
Resume uploaded
    ↓
POST /api/recruitment/apply
    ↓
Saved to database
    ↓
Appears in HR Dashboard
```

### Internal Screening
```
HR clicks "Screen"
    ↓
AI analyzes resume
    ↓
Match score calculated
    ↓
Recommendation generated
    ↓
Results displayed
```

---

## API Implementation Example

### Node.js/Express

```javascript
const express = require('express');
const app = express();

// Get open jobs
app.get('/api/recruitment/jobs', (req, res) => {
  const jobs = getJobsFromDatabase(); // Your DB query
  res.json(jobs);
});

// Receive application
app.post('/api/recruitment/apply', async (req, res) => {
  const { jobId, name, email, phone, linkedin, resume, coverLetter, fileName } = req.body;
  
  // Save to database
  const candidate = await saveCandidateToDatabase({
    jobId,
    name,
    email,
    phone,
    linkedin,
    resume,
    coverLetter,
    fileName,
    uploadedAt: new Date(),
    status: 'Pending Review'
  });
  
  // Optional: Send confirmation email
  await sendConfirmationEmail(email, name);
  
  res.json({
    success: true,
    candidateId: candidate.id,
    message: 'Application received successfully'
  });
});
```

### Python/Flask

```python
from flask import Flask, request, jsonify
from datetime import datetime

app = Flask(__name__)

@app.route('/api/recruitment/jobs', methods=['GET'])
def get_jobs():
    jobs = get_jobs_from_database()  # Your DB query
    return jsonify(jobs)

@app.route('/api/recruitment/apply', methods=['POST'])
def apply():
    data = request.json
    
    # Save to database
    candidate = save_candidate_to_database({
        'jobId': data['jobId'],
        'name': data['name'],
        'email': data['email'],
        'phone': data.get('phone'),
        'linkedin': data.get('linkedin'),
        'resume': data['resume'],
        'coverLetter': data.get('coverLetter'),
        'fileName': data['fileName'],
        'uploadedAt': datetime.now(),
        'status': 'Pending Review'
    })
    
    # Optional: Send confirmation email
    send_confirmation_email(data['email'], data['name'])
    
    return jsonify({
        'success': True,
        'candidateId': candidate['id'],
        'message': 'Application received successfully'
    })
```

---

## Configuration

### Update API URL in Careers Portal

Edit `careers-portal.html`:
```javascript
const API_URL = 'https://your-api-domain.com/api/recruitment';
```

### Customize Branding

Edit `careers-portal.html`:
```css
/* Change colors */
background: linear-gradient(135deg, #YOUR_COLOR_1 0%, #YOUR_COLOR_2 100%);

/* Add company logo */
<div class="header">
  <img src="your-logo.png" style="height: 60px; margin-bottom: 1rem;">
  <h1>Join Our Team</h1>
</div>
```

---

## Security Considerations

### File Upload Validation

```javascript
// Validate file type
const allowedTypes = ['.txt', '.pdf', '.doc', '.docx'];
const fileExt = fileName.substring(fileName.lastIndexOf('.'));
if (!allowedTypes.includes(fileExt)) {
  return res.status(400).json({ error: 'Invalid file type' });
}

// Validate file size (e.g., max 5MB)
if (resume.length > 5 * 1024 * 1024) {
  return res.status(400).json({ error: 'File too large' });
}
```

### Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const applyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // 3 applications per 15 minutes
  message: 'Too many applications. Please try again later.'
});

app.post('/api/recruitment/apply', applyLimiter, async (req, res) => {
  // ...
});
```

### Email Validation

```javascript
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
```

---

## Email Notifications

### Confirmation Email to Candidate

```javascript
async function sendConfirmationEmail(email, name) {
  await sendEmail({
    to: email,
    subject: 'Application Received - [Company Name]',
    body: `
      Hi ${name},
      
      Thank you for applying! We've received your application and our team will review it shortly.
      
      We'll contact you within 5-7 business days if your qualifications match our requirements.
      
      Best regards,
      HR Team
    `
  });
}
```

### Notification to HR

```javascript
async function notifyHR(candidateName, jobTitle) {
  await sendEmail({
    to: 'hr@company.com',
    subject: `New Application: ${jobTitle}`,
    body: `
      New candidate application received:
      
      Candidate: ${candidateName}
      Position: ${jobTitle}
      
      Review in HR Dashboard: https://your-platform.com/recruitment
    `
  });
}
```

---

## Testing

### Test Careers Portal

1. Open `careers-portal.html` in browser
2. Verify jobs load correctly
3. Click "Apply Now"
4. Fill out form with test data
5. Upload sample resume
6. Submit application
7. Check for success message

### Test API Endpoints

```bash
# Test GET jobs
curl https://your-api.com/api/recruitment/jobs

# Test POST application
curl -X POST https://your-api.com/api/recruitment/apply \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": 123,
    "name": "Test Candidate",
    "email": "test@example.com",
    "resume": "Test resume content",
    "fileName": "test_resume.txt"
  }'
```

### Test HR Dashboard

1. Login to AI ROI Platform
2. Open Recruitment Assistant
3. Verify test application appears
4. Click "Screen Candidate"
5. Check AI analysis results
6. Generate interview questions

---

## Troubleshooting

### Applications Not Appearing in Dashboard

**Check:**
- API endpoint returning success?
- Database saving correctly?
- Correct jobId being sent?

**Fix:**
- Check API logs
- Verify database connection
- Test API endpoint directly

### Resume Upload Failing

**Check:**
- File size within limits?
- File type allowed?
- FileReader working?

**Fix:**
- Increase file size limit
- Add more file types
- Check browser console for errors

### AI Screening Not Working

**Check:**
- LLM provider configured?
- API key valid?
- Resume content readable?

**Fix:**
- Configure LLM in settings
- Verify API key
- Test with simple resume

---

## Summary

**Public Side:**
- Candidates apply via careers portal on your website
- Simple form with resume upload
- Instant confirmation

**Internal Side:**
- Applications appear in HR Dashboard
- AI screens and ranks automatically
- HR reviews top candidates

**No Manual Work:**
- Applications flow automatically
- AI does initial screening
- HR focuses on best candidates

This saves HR 80% of screening time and ensures no good candidates are missed!
