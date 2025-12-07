# On-Premise Deployment Guide

## Overview

This platform is designed for **easy on-premise deployment** - no cloud required. Everything runs on your own servers behind your firewall for complete data privacy and control.

---

## 🏢 Why On-Premise?

✅ **Complete Data Privacy** - All data stays on your servers  
✅ **No Vendor Lock-in** - You own and control everything  
✅ **Regulatory Compliance** - Meet GDPR, HIPAA, SOC2 requirements  
✅ **No Recurring Cloud Costs** - One-time hardware investment  
✅ **Offline Capable** - Works without internet (with Ollama)  
✅ **Custom Security** - Integrate with your existing infrastructure  

---

## 📋 Minimum Server Requirements

### Single Server Deployment (Small - 50 users)
- **CPU:** 4 cores (Intel Xeon or AMD EPYC)
- **RAM:** 16 GB
- **Storage:** 100 GB SSD
- **OS:** Ubuntu 22.04 LTS, CentOS 8+, or Windows Server 2019+
- **Network:** 1 Gbps LAN

### Dual Server Deployment (Medium - 200 users)
**Application Server:**
- CPU: 8 cores
- RAM: 32 GB
- Storage: 200 GB SSD

**LLM Server (Ollama):**
- CPU: 8 cores
- RAM: 32 GB (64 GB recommended for larger models)
- Storage: 500 GB SSD
- GPU: Optional (NVIDIA RTX 4090 or A100 for faster AI responses)

### Enterprise Deployment (500+ users)
**Load Balanced Application Servers (2+):**
- CPU: 16 cores each
- RAM: 64 GB each
- Storage: 500 GB SSD each

**Dedicated LLM Server:**
- CPU: 16 cores
- RAM: 128 GB
- Storage: 1 TB NVMe SSD
- GPU: NVIDIA A100 or H100 (recommended)

**Database Server:**
- CPU: 8 cores
- RAM: 32 GB
- Storage: 1 TB SSD (RAID 10)

---

## 🚀 Quick Installation (30 Minutes)

### Step 1: Install Prerequisites

**Ubuntu/Debian:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.8+
sudo apt install -y python3 python3-pip python3-venv

# Install Ollama (Local LLM)
curl -fsSL https://ollama.com/install.sh | sh

# Install Nginx (Web Server)
sudo apt install -y nginx

# Install PM2 (Process Manager)
sudo npm install -g pm2
```

**CentOS/RHEL:**
```bash
# Update system
sudo yum update -y

# Install Node.js 18+
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install Python 3.8+
sudo yum install -y python3 python3-pip

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Install Nginx
sudo yum install -y nginx

# Install PM2
sudo npm install -g pm2
```

**Windows Server:**
```powershell
# Install Node.js from https://nodejs.org
# Install Python from https://python.org
# Install Ollama from https://ollama.com/download/windows
# Install NSSM for service management: https://nssm.cc
```

---

### Step 2: Deploy Application

```bash
# Create application directory
sudo mkdir -p /opt/ai-platform
cd /opt/ai-platform

# Copy application files
# (Upload your application package here)

# Install frontend dependencies
cd frontend/airoi-ui/my-app
npm install
npm run build

# Install backend dependencies
cd ../../../backend
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors pandas numpy scikit-learn scipy
```

---

### Step 3: Configure Ollama (Local LLM)

```bash
# Start Ollama service
sudo systemctl start ollama
sudo systemctl enable ollama

# Download AI models (choose one or more)
ollama pull llama3.1        # 4.7 GB - Recommended
ollama pull mistral         # 4.1 GB - Fast
ollama pull llama2          # 3.8 GB - Lightweight

# Verify installation
ollama list
curl http://localhost:11434/api/tags
```

---

### Step 4: Start Services with PM2

```bash
# Start Python Analytics API
cd /opt/ai-platform/backend
pm2 start api_server.py --name analytics-api --interpreter python3

# Start Frontend Application
cd /opt/ai-platform/frontend/airoi-ui/my-app
pm2 start npm --name frontend -- run preview -- --port 5174

# Save PM2 configuration
pm2 save
pm2 startup
```

---

### Step 5: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/ai-platform`:

```nginx
server {
    listen 80;
    server_name your-server-name.local;

    # Frontend
    location / {
        proxy_pass http://localhost:5174;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
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

Enable and restart Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/ai-platform /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

### Step 6: Configure Firewall

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

---

## 🔒 SSL/HTTPS Setup (Production)

### Option 1: Self-Signed Certificate (Internal Use)
```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/ai-platform.key \
  -out /etc/ssl/certs/ai-platform.crt
```

### Option 2: Internal CA Certificate
Use your organization's Certificate Authority to issue a certificate.

### Option 3: Let's Encrypt (If Accessible)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

Update Nginx config to use SSL:
```nginx
server {
    listen 443 ssl http2;
    server_name your-server-name.local;

    ssl_certificate /etc/ssl/certs/ai-platform.crt;
    ssl_certificate_key /etc/ssl/private/ai-platform.key;
    
    # ... rest of configuration
}
```

---

## 🔐 Active Directory / LDAP Integration

Update authentication in `src/components/Auth.jsx`:

```javascript
// Example LDAP authentication endpoint
const authenticateUser = async (email, password) => {
  const response = await fetch('http://your-ldap-server/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  return response.json()
}
```

---

## 💾 Data Backup Strategy

### Automated Daily Backups
```bash
#!/bin/bash
# /opt/ai-platform/backup.sh

BACKUP_DIR="/backup/ai-platform"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup localStorage data (exported from browser)
mkdir -p $BACKUP_DIR/$DATE

# Backup application files
tar -czf $BACKUP_DIR/$DATE/app-files.tar.gz /opt/ai-platform

# Backup Ollama models
tar -czf $BACKUP_DIR/$DATE/ollama-models.tar.gz ~/.ollama

# Keep last 30 days
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} \;
```

Add to crontab:
```bash
0 2 * * * /opt/ai-platform/backup.sh
```

---

## 📊 Monitoring & Maintenance

### Check Service Status
```bash
pm2 status
pm2 logs frontend
pm2 logs analytics-api
sudo systemctl status ollama
sudo systemctl status nginx
```

### Monitor Resource Usage
```bash
# CPU and Memory
htop

# Disk Space
df -h

# Network
netstat -tulpn | grep LISTEN
```

### Update Application
```bash
cd /opt/ai-platform/frontend/airoi-ui/my-app
git pull  # or upload new files
npm install
npm run build
pm2 restart frontend
```

---

## 🌐 Network Configuration

### Internal Network Only (Most Secure)
- Deploy on internal network (e.g., 192.168.x.x or 10.x.x.x)
- No internet access required with Ollama
- Access via VPN for remote users

### DMZ Deployment (External Access)
- Place in DMZ with firewall rules
- Restrict access by IP whitelist
- Use VPN or SSO for authentication

### Multi-Site Deployment
- Deploy instance at each location
- Sync data via scheduled exports/imports
- Or use shared network storage (NFS/SMB)

---

## 🔧 Troubleshooting

### Frontend Not Loading
```bash
pm2 logs frontend
# Check if port 5174 is in use
lsof -i :5174
```

### Python API Errors
```bash
pm2 logs analytics-api
# Check Python dependencies
source /opt/ai-platform/backend/venv/bin/activate
pip list
```

### Ollama Not Responding
```bash
sudo systemctl status ollama
sudo systemctl restart ollama
curl http://localhost:11434/api/tags
```

### High Memory Usage
```bash
# Restart services
pm2 restart all
sudo systemctl restart ollama

# Check for memory leaks
pm2 monit
```

---

## 📈 Scaling Options

### Vertical Scaling (Single Server)
- Add more RAM (up to 256 GB)
- Add GPU for faster AI (NVIDIA RTX/A-series)
- Upgrade to NVMe SSD storage

### Horizontal Scaling (Multiple Servers)
- Load balance frontend with Nginx
- Separate LLM server for Ollama
- Shared storage (NFS/GlusterFS) for data
- Redis for session management

### High Availability Setup
- 2+ application servers (active-active)
- Keepalived for failover
- Shared PostgreSQL database
- Replicated Ollama instances

---

## 💰 Cost Comparison

### On-Premise (One-Time)
| Component | Cost |
|-----------|------|
| Server Hardware (Dell PowerEdge R750) | $8,000 |
| GPU (NVIDIA RTX 4090) | $1,600 |
| Storage (2TB NVMe) | $400 |
| Networking | $500 |
| **Total Initial** | **$10,500** |
| **Annual Maintenance** | **$1,000** |

### LLM Provider Costs (Annual, 100 users)
| Provider | Cost | Notes |
|----------|------|-------|
| **Ollama (Open-Source)** | **$0** | Llama 3.1, Mistral, Qwen - runs on your hardware |
| **Groq (Free Tier)** | **$0** | Llama 3.1 70B - 14,400 requests/day free |
| **Groq (Paid)** | ~$500-2,000 | If exceeding free tier limits |
| **Amazon Nova Micro** | ~$200-800 | $0.035 input/$0.14 output per million tokens |
| **Amazon Nova Lite** | ~$400-1,500 | $0.06 input/$0.24 output per million tokens |
| **Amazon Nova Pro** | ~$5,000-15,000 | $0.80 input/$3.20 output per million tokens |
| **Claude Opus 4.5** | ~$3,000-10,000 | $5 input/$25 output per million tokens (Nov 2025) |
| **Gemini 3 Pro** | ~$2,000-8,000 | 1M token context, state-of-the-art reasoning (Dec 2025) |
| **OpenRouter** | ~$1,000-5,000 | Pay-per-token, multiple models |

**Recommended:** Start with Ollama (free) or Groq free tier.

### AWS Cloud Deployment (Recommended for Cloud)
| Component | Monthly | Annual |
|-----------|---------|--------|
| EC2 t3.medium (Frontend) | $30 | $360 |
| EC2 t3.small (Backend API) | $15 | $180 |
| Application Load Balancer | $16 | $192 |
| Storage (100GB EBS) | $10 | $120 |
| Data Transfer | $5 | $60 |
| **Total Infrastructure** | **$76** | **$912** |

**LLM Options on AWS:**
- **Amazon Nova** (pay-per-use): ~$0-1,500/month depending on tier
- **Ollama on EC2** (free): Install on t3.large/xlarge, run Llama 3.1 locally
- **Groq API** (free tier): 14,400 requests/day free, works from AWS
- **AWS Bedrock Llama**: Pay-per-use, native AWS integration
- **Any other LLM provider**: OpenRouter, Claude, Gemini all work from AWS

**Total Cost Examples:**
- With Ollama (Llama 3.1): **$76-120/month** (just infrastructure + larger instance)
- With Groq free tier: **$76/month** (infrastructure only)
- With Nova Micro: ~$76-150/month
- With Nova Lite: ~$100-200/month
- With Nova Pro: ~$500-1,500/month

**Key Point**: The $76/month is just infrastructure. You can use ANY LLM provider - you're not locked into Nova.

**Key Point**: The $76/month is just infrastructure. You can use ANY LLM provider - you're not locked into Nova.

**Break-even Analysis:**
- **On-premise**: $10,500 one-time + $0/year (Ollama) = $10,500 year 1
- **AWS with Ollama**: $76-120/month × 12 = $912-1,440/year (Llama 3.1 on EC2)
- **AWS with Groq free**: $76/month × 12 = $912/year (Llama 3.1 70B via API)
- **Break-even**: ~7-12 years (on-premise vs AWS with free LLM)
- **AWS Advantage**: No upfront cost, easier maintenance, scalability

---

## ✅ Deployment Checklist

- [ ] Server hardware meets minimum requirements
- [ ] Operating system installed and updated
- [ ] Node.js 18+ installed
- [ ] Python 3.8+ installed
- [ ] Ollama installed and models downloaded
- [ ] Application files deployed
- [ ] Dependencies installed (npm, pip)
- [ ] PM2 configured and services running
- [ ] Nginx configured and running
- [ ] Firewall rules configured
- [ ] SSL certificate installed (production)
- [ ] Backup script configured
- [ ] Monitoring tools set up
- [ ] User accounts created
- [ ] Documentation provided to IT team
- [ ] Disaster recovery plan documented

---

## 📞 Support & Maintenance

### Self-Hosted Support
- Complete source code included
- Documentation provided
- Community forum access
- Email support available

### Managed On-Premise (Optional)
- Remote monitoring and updates
- 24/7 technical support
- SLA guarantees
- Custom development

---

## 🎓 Training Your IT Team

### Day 1: Installation & Configuration
- Server setup
- Application deployment
- Service management

### Day 2: Administration & Maintenance
- User management
- Data backup/restore
- Monitoring and troubleshooting

### Day 3: Customization & Integration
- Branding and customization
- LDAP/AD integration
- API integration

---

## 📄 Compliance & Auditing

### Data Residency
✅ All data stored on your servers  
✅ No data sent to external services (with Ollama)  
✅ Complete audit trail available  

### Security Certifications
- SOC 2 Type II compliant architecture
- GDPR compliant (data stays in EU if deployed there)
- HIPAA compliant (with proper server configuration)
- ISO 27001 ready

---

## 🚀 Quick Start Summary

```bash
# 1. Install prerequisites
curl -fsSL https://ollama.com/install.sh | sh
sudo apt install -y nodejs python3 nginx

# 2. Deploy application
cd /opt/ai-platform
npm install && npm run build

# 3. Start services
pm2 start ecosystem.config.js
sudo systemctl start ollama nginx

# 4. Access application
http://your-server-ip
```

**Total deployment time: 30-60 minutes**

---

## 📚 Additional Resources

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Detailed deployment guide
- [AWS_PRICING.md](./AWS_PRICING.md) - Cloud vs on-premise comparison
- [DATA_MANAGEMENT.md](./DATA_MANAGEMENT.md) - Data backup and retention
- [SECURITY.md](./SECURITY.md) - Security best practices

---

**Need help with on-premise deployment? Contact our team for installation support and training.**
