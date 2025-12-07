# AI ROI Platform - AWS Deployment Cost Estimate

## Overview

This document provides estimated AWS infrastructure costs for deploying the AI ROI Platform on Amazon Web Services. Costs are in addition to any licensing or support fees.

---

## AWS Infrastructure Options

### Option 1: Small Deployment (< 100 users)

**Recommended for**: Small organizations, pilot programs, departments

#### EC2 Instances
- **Frontend Server**: t3.medium (2 vCPU, 4GB RAM)
  - On-Demand: $0.0416/hour × 730 hours = **$30.37/month**
  - Reserved (1-year): $0.0270/hour × 730 hours = **$19.71/month**
  
- **Python API Server**: t3.medium (2 vCPU, 4GB RAM)
  - On-Demand: $0.0416/hour × 730 hours = **$30.37/month**
  - Reserved (1-year): $0.0270/hour × 730 hours = **$19.71/month**

#### Storage (EBS)
- 2 × 50GB gp3 volumes: $0.08/GB × 100GB = **$8.00/month**

#### Data Transfer
- Outbound data transfer: ~50GB/month = **$4.50/month**

#### Load Balancer (Optional)
- Application Load Balancer: **$16.20/month** + $0.008/LCU-hour

#### Total Monthly Cost (Small)
- **On-Demand**: ~$89/month
- **Reserved (1-year)**: ~$68/month
- **Reserved (3-year)**: ~$52/month

---

### Option 2: Medium Deployment (100-500 users)

**Recommended for**: Mid-size organizations, multiple departments

#### EC2 Instances
- **Frontend Servers**: 2 × t3.large (2 vCPU, 8GB RAM each)
  - On-Demand: 2 × $0.0832/hour × 730 hours = **$121.47/month**
  - Reserved (1-year): 2 × $0.0540/hour × 730 hours = **$78.84/month**
  
- **Python API Server**: t3.xlarge (4 vCPU, 16GB RAM)
  - On-Demand: $0.1664/hour × 730 hours = **$121.47/month**
  - Reserved (1-year): $0.1080/hour × 730 hours = **$78.84/month**

#### Storage (EBS)
- 3 × 100GB gp3 volumes: $0.08/GB × 300GB = **$24.00/month**

#### Data Transfer
- Outbound data transfer: ~200GB/month = **$18.00/month**

#### Load Balancer
- Application Load Balancer: **$16.20/month** + ~$20/month LCU = **$36.20/month**

#### RDS (Optional - for persistent storage)
- db.t3.medium PostgreSQL: **$61.32/month**

#### Total Monthly Cost (Medium)
- **On-Demand**: ~$382/month (without RDS), ~$443/month (with RDS)
- **Reserved (1-year)**: ~$256/month (without RDS), ~$317/month (with RDS)

---

### Option 3: Large Deployment (500-2000 users)

**Recommended for**: Large organizations, enterprise-wide deployment

#### EC2 Instances
- **Frontend Servers**: 3 × t3.xlarge (4 vCPU, 16GB RAM each)
  - On-Demand: 3 × $0.1664/hour × 730 hours = **$364.42/month**
  - Reserved (1-year): 3 × $0.1080/hour × 730 hours = **$236.52/month**
  
- **Python API Servers**: 2 × t3.xlarge (4 vCPU, 16GB RAM each)
  - On-Demand: 2 × $0.1664/hour × 730 hours = **$242.94/month**
  - Reserved (1-year): 2 × $0.1080/hour × 730 hours = **$157.68/month**

#### Storage (EBS)
- 5 × 200GB gp3 volumes: $0.08/GB × 1000GB = **$80.00/month**

#### Data Transfer
- Outbound data transfer: ~500GB/month = **$45.00/month**

#### Load Balancer
- Application Load Balancer: **$16.20/month** + ~$50/month LCU = **$66.20/month**

#### RDS (Recommended)
- db.r5.large PostgreSQL (Multi-AZ): **$292.80/month**

#### ElastiCache Redis (Optional - for session management)
- cache.t3.medium: **$49.64/month**

#### Total Monthly Cost (Large)
- **On-Demand**: ~$1,157/month (full stack)
- **Reserved (1-year)**: ~$928/month (full stack)

---

## LLM Provider Costs (Separate from AWS)

### Ollama (Self-Hosted on AWS)
- **Additional EC2**: g4dn.xlarge (GPU instance)
  - On-Demand: $0.526/hour × 730 hours = **$384.00/month**
  - Reserved (1-year): $0.342/hour × 730 hours = **$249.66/month**
- **Storage**: 100GB for models = **$8.00/month**
- **Total**: ~$392/month (On-Demand), ~$258/month (Reserved)

### Groq API (Cloud)
- **Cost**: ~$0.10 per 1M tokens
- **Estimated usage** (100 users, 50 queries/day):
  - 100 users × 50 queries × 30 days × 500 tokens = 75M tokens/month
  - Cost: **$7.50/month**

### OpenRouter API (Cloud)
- **Cost**: Varies by model ($0.06-$1.50 per 1M tokens)
- **Estimated usage** (llama3.1-8b at $0.06/1M):
  - 75M tokens/month × $0.06 = **$4.50/month**

---

## Complete Cost Breakdown by Deployment Size

### Starter Package (up to 50 users)
| Component | Monthly Cost |
|-----------|-------------|
| AWS Infrastructure (Reserved) | $68 |
| LLM - Groq API | $7.50 |
| **Total Infrastructure** | **$75.50** |
| **Safe AI Marketplace Fee** | **$500** |
| **Total Monthly Cost** | **$575.50** |

### Professional Package (up to 200 users)
| Component | Monthly Cost |
|-----------|-------------|
| AWS Infrastructure (Reserved) | $317 |
| LLM - Groq API | $30 |
| **Total Infrastructure** | **$347** |
| **Safe AI Marketplace Fee** | **$1,500** |
| **Total Monthly Cost** | **$1,847** |

### Enterprise Package (unlimited users)
| Component | Monthly Cost |
|-----------|-------------|
| AWS Infrastructure (Reserved) | $928 |
| LLM - Self-hosted Ollama | $258 |
| **Total Infrastructure** | **$1,186** |
| **Safe AI Marketplace Fee** | **$5,000** |
| **Total Monthly Cost** | **$6,186** |

---

## Three-Tier Service Package Pricing

### 🥉 Starter Package
**Target**: Small organizations (up to 50 users)

**Included:**
- Platform installation and configuration
- Email support (48-hour response)
- Quarterly updates
- Documentation access
- 20 AI applications

**AWS Infrastructure Cost**: ~$76/month
**Safe AI Marketplace Fee**: $500/month
**Total Monthly Cost**: $576/month

---

### 🥈 Professional Package
**Target**: Mid-size organizations (up to 200 users)

**Included:**
- Everything in Starter
- Priority email support (24-hour response)
- Monthly updates
- Custom branding
- Training materials
- Quarterly health checks

**AWS Infrastructure Cost**: ~$347/month
**Safe AI Marketplace Fee**: $1,500/month
**Total Monthly Cost**: $1,847/month

---

### 🥇 Enterprise Package
**Target**: Large organizations (unlimited users)

**Included:**
- Everything in Professional
- Dedicated support (4-hour response)
- Weekly updates
- Custom feature development (10 hours/month)
- On-site training (annual)
- 99.9% SLA
- Monthly health checks
- Dedicated account manager

**AWS Infrastructure Cost**: ~$1,186/month
**Safe AI Marketplace Fee**: $5,000/month
**Total Monthly Cost**: $6,186/month

---

## Cost Comparison: Safe AI Marketplace vs. Traditional Vendors

### For 50 Users (Starter Package)

| Solution | Monthly Cost | Annual Cost |
|----------|-------------|-------------|
| **Traditional AI Vendor** ($50/user) | $2,500 | $30,000 |
| **Safe AI Marketplace (Starter)** | $576 | $6,912 |
| **Savings** | $1,924/month | $23,088/year |
| **Cost Reduction** | **77%** | **77%** |

### For 200 Users (Professional Package)

| Solution | Monthly Cost | Annual Cost |
|----------|-------------|-------------|
| **Traditional AI Vendor** ($50/user) | $10,000 | $120,000 |
| **Safe AI Marketplace (Professional)** | $1,847 | $22,164 |
| **Savings** | $8,153/month | $97,836/year |
| **Cost Reduction** | **82%** | **82%** |

### For 1000 Users (Enterprise Package)

| Solution | Monthly Cost | Annual Cost |
|----------|-------------|-------------|
| **Traditional AI Vendor** ($50/user) | $50,000 | $600,000 |
| **Safe AI Marketplace (Enterprise)** | $6,186 | $74,232 |
| **Savings** | $43,814/month | $525,768/year |
| **Cost Reduction** | **88%** | **88%** |

---

## Additional AWS Services (Optional)

### Backup & Disaster Recovery
- **AWS Backup**: ~$50/month (automated backups)
- **S3 Storage**: ~$23/month (1TB backup storage)

### Monitoring & Logging
- **CloudWatch**: ~$10/month (basic monitoring)
- **CloudWatch Logs**: ~$5/month (log retention)

### Security
- **AWS WAF**: ~$5/month + $1/million requests
- **AWS Shield Standard**: Free
- **AWS Certificate Manager**: Free (SSL/TLS certificates)

### CI/CD Pipeline
- **CodePipeline**: $1/pipeline/month
- **CodeBuild**: $0.005/build minute

---

## Cost Optimization Tips

### 1. Use Reserved Instances
- Save 30-40% with 1-year commitment
- Save 50-60% with 3-year commitment

### 2. Use Savings Plans
- Flexible alternative to Reserved Instances
- Commit to consistent usage amount

### 3. Right-Size Instances
- Start small and scale up based on actual usage
- Use AWS Compute Optimizer recommendations

### 4. Use Spot Instances (Non-Production)
- Save up to 90% for dev/test environments
- Not recommended for production

### 5. Optimize Data Transfer
- Use CloudFront CDN to reduce data transfer costs
- Keep traffic within same AWS region

### 6. Use Auto Scaling
- Scale down during off-hours
- Pay only for what you use

---

## AWS Free Tier Benefits (First 12 Months)

- **EC2**: 750 hours/month of t2.micro or t3.micro
- **EBS**: 30GB of storage
- **Data Transfer**: 15GB outbound per month
- **RDS**: 750 hours/month of db.t2.micro
- **Load Balancer**: 750 hours/month

**Potential First-Year Savings**: ~$50-100/month

---

## Deployment Assistance

### DIY Deployment (Included in All Packages)
- Complete documentation
- Installation scripts
- Configuration templates
- Video tutorials

### Managed Deployment (Add-On Service)
- **One-Time Setup Fee**: 
  - Starter: $1,000
  - Professional: $2,500
  - Enterprise: $5,000
- Includes:
  - AWS account setup
  - Infrastructure provisioning
  - Application deployment
  - LLM configuration
  - Initial training session
  - 30-day post-launch support

---

## Billing & Payment

### AWS Costs
- Billed directly by Amazon Web Services
- Customer's own AWS account
- Pay-as-you-go or Reserved Instances

### Safe AI Marketplace Fees
- Billed monthly in advance
- Annual payment option (10% discount)
  - Starter: $5,400/year (save $600)
  - Professional: $16,200/year (save $1,800)
  - Enterprise: $54,000/year (save $6,000)
- No long-term contracts (month-to-month available)

---

## ROI Calculator

### Example: 200-User Organization (Professional Package)

**Traditional AI Vendor:**
- Monthly cost: $10,000 ($50/user)
- Annual cost: $120,000

**Safe AI Marketplace (Professional Package):**
- AWS Infrastructure: $347/month
- Safe AI Marketplace Fee: $1,500/month
- Total: $1,847/month
- Annual: $22,164

**Annual Savings**: $97,836
**ROI**: 82% cost reduction
**Payback Period**: Immediate (lower monthly cost from day 1)

---

## Frequently Asked Questions

**Q: Can we use our existing AWS credits?**
A: Yes, AWS infrastructure costs can be paid with AWS credits.

**Q: What if we need to scale beyond 2000 users?**
A: Contact us for custom enterprise pricing and architecture.

**Q: Can we deploy in multiple AWS regions?**
A: Yes, multi-region deployment available (additional infrastructure costs apply).

**Q: Do you offer AWS marketplace listing?**
A: Coming soon - will simplify billing and procurement.

**Q: What about data egress costs?**
A: Estimates included above. Actual costs depend on usage patterns.

**Q: Can we use AWS GovCloud?**
A: Yes, platform is compatible with GovCloud regions.

---

## Next Steps

1. **Estimate Your Needs**: Determine user count and usage patterns
2. **Choose Package**: Select Basic, Professional, or Enterprise
3. **Calculate Total Cost**: AWS infrastructure + service fee
4. **Request Quote**: Contact us for custom pricing
5. **Start Free Trial**: 30-day trial available (AWS costs apply)

---

## Contact for Custom Pricing

For organizations with:
- 2000+ users
- Multi-region requirements
- Custom SLA requirements
- Special compliance needs
- Volume discounts

Contact us for custom enterprise pricing.

---

**Note**: All AWS prices are estimates based on US East (N. Virginia) region and are subject to change. Actual costs may vary based on usage patterns, region selection, and AWS pricing updates. Use the [AWS Pricing Calculator](https://calculator.aws) for precise estimates.
