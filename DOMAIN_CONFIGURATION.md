# Domain Configuration Guide

## Overview

This guide explains how to configure your own domain name for the AI platform, including setup for public-facing pages (careers portal and customer support).

---

## 🌐 Domain Setup Options

### Option 1: Internal Domain (Recommended for Most)
**Example:** `ai-platform.company.local` or `apps.company.internal`

- Use for internal employees only
- No external DNS required
- Works with Active Directory DNS
- Most secure option

### Option 2: Public Domain with VPN
**Example:** `ai.company.com` (requires VPN to access)

- Public DNS but private access
- Employees access via VPN
- Good for remote workers
- Moderate security

### Option 3: Public Domain with Subdirectories
**Example:** 
- Main app: `ai.company.com` (requires login)
- Careers: `ai.company.com/careers`
- Support: `ai.company.com/support`

- Public access to specific pages
- Main app requires authentication
- Best for external recruitment and customer support

---

## 📋 DNS Configuration

### Internal DNS (Active Directory)

Add A record in your DNS server:
```
ai-platform.company.local    A    192.168.1.100
```

Or add to `/etc/hosts` on each machine:
```
192.168.1.100    ai-platform.company.local
```

### Public DNS

Add DNS records with your domain registrar:
```
Type    Name              Value           TTL
A       ai                192.168.1.100   3600
CNAME   careers.ai        ai.company.com  3600
CNAME   support.ai        ai.company.com  3600
```

---

## 🔧 Nginx Configuration for Custom Domain

### Single Domain Setup

Edit `/etc/nginx/sites-available/ai-platform`:

```nginx
server {
    listen 80;
    server_name ai-platform.company.local;  # Your domain here

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ai-platform.company.local;  # Your domain here

    # SSL Certificate
    ssl_certificate /etc/ssl/certs/ai-platform.crt;
    ssl_certificate_key /etc/ssl/private/ai-platform.key;

    # Main Application (requires login)
    location / {
        proxy_pass http://localhost:5174;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Python Analytics API
    location /api/ {
        proxy_pass http://localhost:5002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Ollama LLM API
    location /ollama/ {
        proxy_pass http://localhost:11434/;
        proxy_set_header Host $host;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }
}
```

### Multi-Domain Setup (Separate Public Pages)

```nginx
# Main Application (Internal/VPN Only)
server {
    listen 443 ssl http2;
    server_name ai.company.com;

    ssl_certificate /etc/ssl/certs/ai-platform.crt;
    ssl_certificate_key /etc/ssl/private/ai-platform.key;

    # Restrict to internal IPs or VPN
    allow 192.168.0.0/16;
    allow 10.0.0.0/8;
    deny all;

    location / {
        proxy_pass http://localhost:5174;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/ {
        proxy_pass http://localhost:5002/;
    }
}

# Careers Portal (Public Access)
server {
    listen 443 ssl http2;
    server_name careers.company.com;

    ssl_certificate /etc/ssl/certs/careers.crt;
    ssl_certificate_key /etc/ssl/private/careers.key;

    # Public access - no IP restrictions
    location / {
        proxy_pass http://localhost:5174/careers-portal.html;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# Customer Support Portal (Public Access)
server {
    listen 443 ssl http2;
    server_name support.company.com;

    ssl_certificate /etc/ssl/certs/support.crt;
    ssl_certificate_key /etc/ssl/private/support.key;

    # Public access - no IP restrictions
    location / {
        proxy_pass http://localhost:5174/customer-support.html;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Allow Ollama API for customer support AI
    location /ollama/ {
        proxy_pass http://localhost:11434/;
        proxy_read_timeout 300s;
    }
}
```

Apply configuration:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔗 Update Application URLs

### Update Careers Portal Links

Edit `src/tools/RecruitmentAssistant.jsx`:

```javascript
<input
  value="https://careers.company.com"  // Your domain
  readOnly
  style={{ width: '100%', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.95rem', border: '1px solid #ddd', borderRadius: '4px' }}
/>
```

### Update Customer Support Portal Links

Edit `src/tools/ExternalCustomerSupport.jsx`:

```javascript
<input
  value="https://support.company.com"  // Your domain
  readOnly
  style={{ width: '100%', padding: '0.75rem', fontFamily: 'monospace', fontSize: '0.95rem', border: '1px solid #ddd', borderRadius: '4px' }}
/>
```

### Rebuild Frontend

```bash
cd /opt/ai-platform/frontend/airoi-ui/my-app
npm run build
pm2 restart frontend
```

---

## 📧 Email Integration for Job Applications

### Configure Email Notifications

Create `/opt/ai-platform/backend/email_notifier.py`:

```python
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_application_notification(candidate_name, job_title, hr_email):
    sender = "noreply@company.com"
    subject = f"New Job Application: {candidate_name} for {job_title}"
    
    body = f"""
    New job application received:
    
    Candidate: {candidate_name}
    Position: {job_title}
    
    View in AI Recruitment Assistant:
    https://ai.company.com (login required)
    """
    
    msg = MIMEMultipart()
    msg['From'] = sender
    msg['To'] = hr_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'plain'))
    
    # Configure your SMTP server
    server = smtplib.SMTP('smtp.company.com', 587)
    server.starttls()
    server.login('username', 'password')
    server.send_message(msg)
    server.quit()
```

---

## 🔒 SSL Certificate Setup

### Option 1: Internal CA Certificate (Recommended)

Request certificate from your IT department:
```
Common Name (CN): ai-platform.company.local
Subject Alternative Names (SAN):
  - ai-platform.company.local
  - careers.company.com
  - support.company.com
```

Install certificate:
```bash
sudo cp company-cert.crt /etc/ssl/certs/ai-platform.crt
sudo cp company-key.key /etc/ssl/private/ai-platform.key
sudo chmod 600 /etc/ssl/private/ai-platform.key
```

### Option 2: Let's Encrypt (Public Domains)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d careers.company.com -d support.company.com
```

### Option 3: Self-Signed (Development Only)

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/ai-platform.key \
  -out /etc/ssl/certs/ai-platform.crt \
  -subj "/CN=ai-platform.company.local"
```

---

## 🌍 Public Access Configuration

### Firewall Rules for Public Pages

```bash
# Allow HTTPS from anywhere for public pages
sudo ufw allow from any to any port 443 proto tcp

# Or restrict to specific IPs for main app
sudo ufw allow from 192.168.0.0/16 to any port 443
```

### Rate Limiting (Prevent Abuse)

Add to Nginx config:
```nginx
# Define rate limit zone
limit_req_zone $binary_remote_addr zone=careers:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=support:10m rate=30r/m;

server {
    server_name careers.company.com;
    
    location / {
        limit_req zone=careers burst=5;
        # ... rest of config
    }
}

server {
    server_name support.company.com;
    
    location / {
        limit_req zone=support burst=10;
        # ... rest of config
    }
}
```

---

## 📱 Mobile Access

### Responsive Design
Both careers and support portals are mobile-responsive and work on:
- iOS Safari
- Android Chrome
- Mobile browsers

### QR Code for Easy Access

Generate QR codes for:
- `https://careers.company.com` - Print on recruitment materials
- `https://support.company.com` - Print on product packaging

---

## 🔍 SEO Configuration (Careers Portal)

### Add to careers-portal.html

```html
<head>
  <title>Careers at Your Company | Join Our Team</title>
  <meta name="description" content="Explore career opportunities at Your Company. Apply online for open positions.">
  <meta name="keywords" content="jobs, careers, employment, your company">
  
  <!-- Open Graph for social sharing -->
  <meta property="og:title" content="Careers at Your Company">
  <meta property="og:description" content="Join our team! View open positions and apply online.">
  <meta property="og:url" content="https://careers.company.com">
  <meta property="og:type" content="website">
</head>
```

---

## 📊 Analytics Integration

### Google Analytics (Optional)

Add to public pages:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA-XXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA-XXXXXXXXX');
</script>
```

---

## ✅ Testing Checklist

- [ ] Internal domain resolves correctly
- [ ] SSL certificate valid and trusted
- [ ] Main application accessible at https://ai.company.com
- [ ] Careers portal accessible at https://careers.company.com
- [ ] Customer support accessible at https://support.company.com
- [ ] Job applications save to localStorage
- [ ] Support tickets create properly
- [ ] Mobile devices can access public pages
- [ ] Rate limiting works (test with multiple requests)
- [ ] Email notifications sent (if configured)
- [ ] Firewall rules allow appropriate access
- [ ] VPN users can access main app
- [ ] Public users cannot access main app

---

## 🚀 Quick Setup Commands

```bash
# 1. Update DNS (in your DNS server)
# ai-platform.company.local -> 192.168.1.100

# 2. Configure Nginx
sudo nano /etc/nginx/sites-available/ai-platform
# (paste configuration from above)

# 3. Enable site
sudo ln -s /etc/nginx/sites-available/ai-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 4. Update application URLs
cd /opt/ai-platform/frontend/airoi-ui/my-app
# Edit RecruitmentAssistant.jsx and ExternalCustomerSupport.jsx
npm run build
pm2 restart frontend

# 5. Test access
curl -k https://ai-platform.company.local
curl -k https://careers.company.com
curl -k https://support.company.com
```

---

## 📞 Support

For assistance with domain configuration:
- Check Nginx error logs: `sudo tail -f /var/log/nginx/error.log`
- Check application logs: `pm2 logs frontend`
- Verify DNS: `nslookup ai-platform.company.local`
- Test SSL: `openssl s_client -connect ai-platform.company.local:443`

---

**Your domains are now configured for internal employees and external candidates/customers!**
