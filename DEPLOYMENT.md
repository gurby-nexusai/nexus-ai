# AI ROI Platform - Corporate Deployment Guide

## Overview

The AI ROI Platform is a suite of 20 ready-to-deploy AI applications designed for immediate corporate installation. All applications run on your own infrastructure with your own LLM providers - ensuring complete data privacy and security.

## System Architecture

The platform consists of two separate servers:

### 1. Frontend Application Server (React + Vite)
- Hosts all 20 AI applications
- User authentication and management
- Real-time UI interactions
- Port: 5174 (default)

### 2. Python Analytics API Server
- Advanced analytics processing
- Data analysis and visualization
- Statistical computations
- Port: 5002 (default)

## Prerequisites

### Required Software
- **Node.js** 18+ and npm
- **Python** 3.8+
- **LLM Provider** (choose one):
  - Ollama (local, recommended for privacy)
  - Groq API (cloud)
  - OpenRouter API (cloud)

### System Requirements
- **RAM**: 8GB minimum (16GB recommended for Ollama)
- **Storage**: 10GB minimum
- **OS**: Linux, macOS, or Windows

## Installation Steps

### Step 1: Install LLM Provider

#### Option A: Ollama (Recommended - Local & Private)
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull recommended model
ollama pull llama3.1

# Verify installation
ollama list
```

#### Option B: Groq (Cloud API)
1. Sign up at https://console.groq.com
2. Generate API key
3. Configure in application settings

#### Option C: OpenRouter (Cloud API)
1. Sign up at https://openrouter.ai
2. Generate API key
3. Configure in application settings

### Step 2: Install Frontend Application Server

```bash
# Navigate to application directory
cd /path/to/airoi-poc/frontend/airoi-ui/my-app

# Install dependencies
npm install

# Start development server
npm run dev

# For production build
npm run build
npm run preview
```

**Frontend will run on:** http://localhost:5174

### Step 3: Install Python Analytics API Server

```bash
# Navigate to backend directory
cd /path/to/airoi-poc/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install flask flask-cors pandas numpy scikit-learn scipy

# Start API server
python api_server.py
```

**API Server will run on:** http://localhost:5002

### Step 4: Configure LLM Provider in Application

1. Access the application at http://localhost:5174
2. Create admin account: `admin@example.com` (any password)
3. Click the ⚙️ settings icon in the top-right header
4. Select your LLM provider:
   - **Ollama**: No API key needed (runs locally)
   - **Groq**: Enter your Groq API key
   - **OpenRouter**: Enter your OpenRouter API key
5. Click "Save Settings"

## Available Applications (20 Total)

### Starter Level (Low Risk)
1. **AI Writing Assistant** - Professional document creation
2. **AI Presentation Generator** - Word to PowerPoint conversion
3. **AI Anonymous Idea Chat** - Department discussions
4. **AI Event Manager** - Company event coordination
5. **AI Voting/Polling System** - Anonymous voting
6. **AI Open Meeting Scheduler** - Meeting coordination
7. **AI Suggestion Scheme** - Employee innovation rewards

### Intermediate Level
8. **AI Internal Customer Support** - Context-aware chatbot with RAG
9. **AI IT/Technical Support** - Ticket management with RAG
10. **AI App Analytics & SEO** - Visitor tracking and optimization
11. **AI ROI Calculator** - Productivity analysis

### Advanced Level
12. **AI Analytics Platform** - Statistical analysis with Python
13. **AI Compliance Monitor** - Document compliance tracking
14. **AI Workplan Collaboration** - Strategic planning with RAG
15. **AI Admin Dashboard** - User, app, and data management
16. **AI Knowledge Management** - Document repository with AI search
17. **AI External Customer Support** - Multi-channel support with public portal
18. **AI Contract Review** - Legal contract analysis and risk assessment
19. **AI Recruitment Assistant** - Resume screening with careers portal
20. **AI Annual Performance Assessment** - Employee reviews with AI insights


## Production Deployment

### Frontend (React Application)

#### Using Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    root /path/to/airoi-poc/frontend/airoi-ui/my-app/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:5002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Using PM2 (Node.js Process Manager)
```bash
npm install -g pm2
pm2 start npm --name "airoi-frontend" -- run preview
pm2 save
pm2 startup
```

### Backend (Python API)

#### Using systemd (Linux)
Create `/etc/systemd/system/airoi-api.service`:
```ini
[Unit]
Description=AI ROI Analytics API
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/airoi-poc/backend
Environment="PATH=/path/to/airoi-poc/backend/venv/bin"
ExecStart=/path/to/airoi-poc/backend/venv/bin/python api_server.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable airoi-api
sudo systemctl start airoi-api
sudo systemctl status airoi-api
```

#### Using Gunicorn (Production WSGI)
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5002 api_server:app
```

## Security Considerations

### Data Privacy
- All data stored in browser localStorage (client-side)
- No external data transmission (when using Ollama)
- LLM processing happens on your infrastructure

### Network Security
- Run behind corporate firewall
- Use HTTPS in production (SSL/TLS certificates)
- Implement rate limiting on API endpoints
- Configure CORS appropriately

### Access Control
- Admin accounts: `admin@example.com`
- User authentication via email/password
- Role-based access control (admin, manager, user, viewer)

## Monitoring & Maintenance

### Health Checks
```bash
# Check frontend
curl http://localhost:5174

# Check Python API
curl http://localhost:5002/health

# Check Ollama (if using)
curl http://localhost:11434/api/tags
```

### Logs
```bash
# Frontend logs (PM2)
pm2 logs airoi-frontend

# Backend logs (systemd)
sudo journalctl -u airoi-api -f

# Ollama logs
journalctl -u ollama -f
```

### Backup
```bash
# Backup localStorage data (export from browser)
# Backup uploaded documents (if stored server-side)
# Backup configuration files
```

## Troubleshooting

### Frontend won't start
- Check Node.js version: `node --version` (need 18+)
- Clear node_modules: `rm -rf node_modules && npm install`
- Check port 5174 availability: `lsof -i :5174`

### Python API errors
- Verify Python version: `python3 --version`
- Check dependencies: `pip list`
- Verify port 5002: `lsof -i :5002`
- Check API logs for errors

### LLM connection issues
- **Ollama**: Verify service running: `systemctl status ollama`
- **Groq/OpenRouter**: Verify API key is correct
- Check network connectivity
- Review browser console for errors

### Analytics Platform not working
- Ensure Python API server is running
- Check CORS configuration
- Verify CSV upload size limits
- Check Python dependencies installed

## Scaling Recommendations

### Small Organization (< 100 users)
- Single server deployment
- Ollama with llama3.1 model
- 16GB RAM, 4 CPU cores

### Medium Organization (100-1000 users)
- Separate frontend and backend servers
- Load balancer for frontend
- Ollama or cloud LLM provider
- 32GB RAM, 8 CPU cores per server

### Large Organization (1000+ users)
- Kubernetes cluster deployment
- Multiple frontend replicas
- Dedicated analytics server
- Cloud LLM provider (Groq/OpenRouter)
- Redis for session management
- PostgreSQL for persistent storage

## Support & Customization

### Configuration Files
- Frontend: `src/App-Marketplace.jsx` - App catalog
- Backend: `api_server.py` - Analytics endpoints
- LLM: `src/services/llm.js` - Provider configuration

### Customization Options
- Add/remove applications from marketplace
- Modify reward amounts in Suggestion Scheme
- Customize department lists
- Adjust analytics algorithms
- Brand with company logo and colors

## License & Usage

This platform is designed for corporate internal use. Each organization should:
- Deploy on their own infrastructure
- Use their own LLM provider
- Maintain their own data
- Customize to their needs

## Quick Start Checklist

- [ ] Install Node.js 18+
- [ ] Install Python 3.8+
- [ ] Install LLM provider (Ollama recommended)
- [ ] Clone/download application code
- [ ] Run `npm install` in frontend directory
- [ ] Run `pip install` in backend directory
- [ ] Start Python API: `python api_server.py`
- [ ] Start frontend: `npm run dev`
- [ ] Access http://localhost:5174
- [ ] Create admin account
- [ ] Configure LLM provider in settings
- [ ] Test applications

## Contact & Support

For deployment assistance or customization inquiries, contact your system administrator or IT department.
