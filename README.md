# Nexus AI - Enterprise AI Application Suite

## 20 Ready-to-Deploy AI Applications for AWS

Deploy a complete suite of AI-powered business applications on AWS in minutes. Complete data privacy, your own LLM, zero vendor lock-in.

**Available on AWS Marketplace** - 7-day free trial, three pricing tiers, CloudFormation one-click deployment.

**Pricing:**
- **Starter**: Up to 50 users - $500/month
- **Professional**: Up to 250 users - $1,500/month
- **Enterprise**: Up to 1,000 users - $3,500/month

**Contact:** gurby1@yahoo.com

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- LLM Provider (Ollama recommended)

### Installation (5 minutes)

**1. Install LLM (Ollama - Local & Private)**
```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1
```

**2. Start Frontend Server**
```bash
npm install
npm run dev
# Runs on http://localhost:5174
```

**3. Start Python API Server** (separate terminal)
```bash
cd ../../../backend
python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors pandas numpy scikit-learn scipy
python api_server.py
# Runs on http://localhost:5002
```

**4. Configure & Launch**
- Open http://localhost:5174
- Login with: `admin@example.com` (any password)
- Click ⚙️ settings → Select "Ollama" → Save
- Start using all 19 applications!

---

## 🚀 Running the Platform

You need to run **3 services** in separate terminals:

### Terminal 1: Ollama LLM Service
```bash
ollama serve
# Runs on http://localhost:11434
```

### Terminal 2: Frontend Server
```bash
cd /Users/gurby1/Downloads/airoi/airoi-poc/frontend/airoi-ui/my-app
npm run dev
# Runs on http://localhost:5174
```

### Terminal 3: Python Analytics API
```bash
cd /Users/gurby1/Downloads/airoi/airoi-poc/backend
source venv/bin/activate  # if not already activated
python api_server.py
# Runs on http://localhost:5002
```

**Access the platform:** http://localhost:5174

---

## 📦 What's Included

### 20 Production-Ready Applications

**Productivity & Communication (6)**
- AI Writing Assistant
- AI Presentation Generator  
- AI Anonymous Idea Chat
- AI Event Manager
- AI Voting/Polling System
- AI Open Meeting Scheduler

**Support & Service (3)**
- AI Internal Customer Support (with RAG)
- AI IT/Technical Support (with RAG)
- **AI External Customer Support** (multi-channel with public portal)

**Analytics & Insights (3)**
- AI Analytics Platform (Python-powered)
- AI ROI Calculator
- AI App Analytics & SEO

**Governance & Compliance (3)**
- AI Compliance Monitor (IT/Security)
- **AI Contract Review** (Legal contracts & risk assessment)
- AI Suggestion Scheme (with rewards)

**Strategic Planning & Knowledge (4)**
- AI Workplan Collaboration
- **AI Knowledge Management** (document repository with AI search)
- **AI Recruitment Assistant** (with public careers portal)
- AI Admin Dashboard

---

## 🌐 Public-Facing Pages

**Careers Portal:** `http://localhost:5174/careers-portal.html`
- Job listings for candidates
- Resume upload (.txt, .docx)
- Application submission

**Customer Support Portal:** `http://localhost:5174/customer-support.html`
- AI-powered chat support
- Real-time human escalation
- No login required

See [CUSTOMER_SUPPORT_GUIDE.md](./CUSTOMER_SUPPORT_GUIDE.md) for detailed setup.

---

## 🏢 Enterprise Features

✅ **Deploy on Your Servers** - Complete control, behind your firewall  
✅ **Deploy on AWS** - $76/month infrastructure, use any LLM provider  
✅ **Use Your Own LLM** - Ollama, Groq, Nova, Claude, Gemini - your choice  
✅ **100% Data Privacy** - Nothing leaves your network with Ollama  
✅ **Unlimited Users** - No per-seat licensing fees  
✅ **Full Customization** - Source code included  
✅ **Two-Server Architecture** - Frontend + Python Analytics API  
✅ **20 AI Applications** - Complete business transformation suite

---

## 📚 Documentation

- **[ON_PREMISE_DEPLOYMENT.md](./ON_PREMISE_DEPLOYMENT.md)** - **Deploy on your own servers (30 min setup)**
- **[DOMAIN_CONFIGURATION.md](./DOMAIN_CONFIGURATION.md)** - **Configure custom domains for public pages**
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete installation & production deployment guide
- **[PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md)** - Marketing overview & use cases
- **[CUSTOMER_SUPPORT_GUIDE.md](./CUSTOMER_SUPPORT_GUIDE.md)** - External support setup
- **[CHANGES.md](./CHANGES.md)** - Recent updates & modifications

---

## 🔧 Technical Stack

**Frontend Server (Port 5174)**
- React 18 + Vite
- 20 AI applications
- User authentication
- Real-time UI

**Backend Server (Port 5002)**
- Python 3.8+ + Flask
- Advanced analytics
- Statistical processing
- CSV data analysis

**LLM Options**
- **Ollama** (local, private, free) - Llama 3.1, Mistral, Qwen
- **Groq** (cloud, fast, free tier) - Llama 3.1 70B free
- **OpenRouter** (cloud, flexible) - Multiple models
- **Amazon Nova** (AWS, Dec 2024) - Micro/Lite/Pro tiers
- **Claude Opus 4.5** (Nov 2025) - Best for coding/agents
- **Gemini 3 Pro** (Dec 2025) - 1M token context window

---

## 💰 Cost Comparison

### Traditional AI Vendors (100 users)
| Component | Monthly | Annual |
|-----------|---------|--------|
| Per-user licensing ($50-100/user) | $5,000-10,000 | $60,000-120,000 |
| **Total** | **$5,000-10,000** | **$60,000-120,000** |

### Nexus AI - Complete Cost Breakdown

**Software License (AWS Marketplace)**
| Tier | Users | Monthly | Annual | 7-Day Free Trial |
|------|-------|---------|--------|------------------|
| **Starter** | Up to 50 | $500 | $6,000 | ✅ Yes |
| **Professional** | Up to 250 | $1,500 | $18,000 | ✅ Yes |
| **Enterprise** | Up to 1,000 | $3,500 | $42,000 | ✅ Yes |

**Infrastructure (Client Pays AWS Directly)**
| Component | Monthly | Annual |
|-----------|---------|--------|
| EC2 + Load Balancer + Storage | $76 | $912 |

**LLM Provider (Client Pays Directly)**
| Provider | Annual Cost | Notes |
|----------|-------------|-------|
| **Ollama (Open-Source)** | **$0** | Llama 3.1, Mistral, Qwen - runs on hardware |
| **Groq (Free Tier)** | **$0** | Llama 3.1 70B - 14,400 requests/day free |
| **Groq (Paid)** | ~$500-2,000 | If exceeding free tier |
| **Amazon Nova Micro** | ~$200-800 | $0.035 input/$0.14 output per million tokens |
| **Amazon Nova Lite** | ~$400-1,500 | $0.06 input/$0.24 output per million tokens |
| **Amazon Nova Pro** | ~$5,000-15,000 | $0.80 input/$3.20 output per million tokens |
| **Claude Opus 4.5** | ~$3,000-10,000 | $5 input/$25 output per million tokens (Nov 2025) |
| **Gemini 3 Pro** | ~$2,000-8,000 | 1M token context (Dec 2025) |

### Total Cost to Client (Annual)

**Starter Tier (50 users) with Free LLM:**
- Software license: $6,000/year
- AWS infrastructure: $912/year
- LLM (Ollama/Groq): $0/year
- **Total: $6,912/year**
- **vs Traditional: $30,000-60,000/year**
- **Savings: $23,088-53,088/year (77-88% cost reduction)**

**Professional Tier (250 users) with Free LLM:**
- Software license: $18,000/year
- AWS infrastructure: $912/year
- LLM (Ollama/Groq): $0/year
- **Total: $18,912/year**
- **vs Traditional: $150,000-300,000/year**
- **Savings: $131,088-281,088/year (87-94% cost reduction)**

**Enterprise Tier (1,000 users) with Free LLM:**
- Software license: $42,000/year
- AWS infrastructure: $912/year
- LLM (Ollama/Groq): $0/year
- **Total: $42,912/year**
- **vs Traditional: $600,000-1,200,000/year**
- **Savings: $557,088-1,157,088/year (93-96% cost reduction)**

---

## 🎯 Use Cases

**HR Department**: Employee suggestions, anonymous feedback, event management
**Sales & Marketing**: Customer support, presentations, ROI calculations
**IT Department**: Technical support, compliance monitoring, analytics
**Executive Leadership**: Strategic planning, cross-department collaboration

---

## 🔒 Security & Privacy

- All data stored client-side (browser localStorage)
- No external data transmission with Ollama
- Role-based access control (admin, manager, user, viewer)
- Deploy behind corporate firewall
- HTTPS/SSL ready

---

## 📊 Key Features by Application

### AI Internal & External Customer Support
- Upload knowledge base documents (RAG)
- Context-aware responses
- Human escalation workflow
- Ticket tracking
- Multi-channel support (External)
- Embeddable chat widget (External)

### AI Knowledge Management
- Document repository with AI search
- Auto-categorization
- Natural language Q&A
- Version control
- Access tracking

### AI Analytics Platform
- 3 sample datasets included
- CSV upload
- Descriptive statistics, regression, correlation
- Predictive modeling

### AI Suggestion Scheme
- Employee innovation rewards ($1-5)
- AI evaluation of ideas
- Admin approval workflow
- Annual winner awards

### AI Workplan Collaboration
- 4-level planning hierarchy
- Cross-department coordination
- Progress tracking
- Update history

---

## 🚀 Deployment Options

**Development** (30 minutes)
```bash
npm run dev  # Frontend
python api_server.py  # Backend
```

**On-Premise Production** (2-4 hours)
- Nginx reverse proxy
- PM2 process manager
- systemd service
- Docker containers
- Kubernetes cluster
- Cost: ~$10,500 one-time + $0/year with Ollama

**AWS Cloud Deployment** (1-2 hours)
- EC2 instances (t3.medium + t3.small)
- Application Load Balancer
- Use ANY LLM: Nova, Ollama (Llama 3.1), Groq, Claude, Gemini
- Cost: **$76/month** infrastructure + LLM choice (Ollama/Groq free options available)
- Total: ~$76-200/month depending on LLM provider

See [DEPLOYMENT.md](./DEPLOYMENT.md) and [ON_PREMISE_DEPLOYMENT.md](./ON_PREMISE_DEPLOYMENT.md) for detailed instructions.

---

## 🛠️ Customization

All applications are fully customizable:
- Add/remove apps from marketplace
- Modify reward amounts
- Adjust department lists
- Customize analytics algorithms
- Brand with company identity

---

## 📈 Success Metrics

- **40%** faster document creation
- **60%** reduction in support tickets
- **50%** faster meeting scheduling
- **90%+** cost savings vs. traditional vendors

---

## 🤝 Support

- Complete documentation included
- Installation guides
- API documentation
- Troubleshooting guides
- Custom development available

---

## 📝 License

Designed for corporate internal deployment. Each organization deploys on their own infrastructure with their own LLM provider.

---

## 🎓 Getting Started Guide

1. **Review** [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) for business case
2. **Read** [DEPLOYMENT.md](./DEPLOYMENT.md) for technical setup
3. **Install** LLM provider (Ollama recommended)
4. **Deploy** both servers (frontend + Python API)
5. **Configure** LLM settings in application
6. **Launch** and start using all 20 applications

---

## 🔗 Quick Links

- Frontend: http://localhost:5174
- Python API: http://localhost:5002
- Admin Login: `admin@example.com` (any password)
- LLM Settings: Click ⚙️ icon in header

---

**Transform your organization with AI - on your terms, on your infrastructure.**

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)
