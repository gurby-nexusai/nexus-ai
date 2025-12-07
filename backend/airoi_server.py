"""
AIROI - AI Return on Investment Assessment System
Backend Architecture for POC with Ollama/Llama 3.1

This system orchestrates multiple specialized agents to assess,
analyze, and roadmap AI transformation opportunities.
"""

import asyncio
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
from datetime import datetime
import httpx


class Phase(Enum):
    QUICK_WIN = "quick_win"
    FOUNDATION = "foundation"
    STRATEGIC = "strategic"


class ConfidenceLevel(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class Opportunity:
    """Represents an AI/automation opportunity"""
    title: str
    description: str
    phase: Phase
    can_do: List[str]  # What AI can reliably do
    cannot_do: List[str]  # What requires human judgment
    estimated_roi: float
    confidence: ConfidenceLevel
    timeframe_months: int
    risk_factors: List[str]
    dependencies: List[str]
    next_steps: List[str]


@dataclass
class AuditData:
    """Structured audit data from discovery"""
    company_name: str
    industry: str
    employee_count: int
    systems: List[Dict[str, Any]]
    processes: List[Dict[str, Any]]
    data_sources: List[Dict[str, Any]]
    pain_points: List[str]
    current_costs: Dict[str, float]
    technical_capabilities: Dict[str, str]
    compliance_requirements: List[str]


class LLMProvider:
    """Handles communication with different LLM providers"""
    
    def __init__(self, provider: str = "ollama", **config):
        self.provider = provider
        self.config = config
        
    async def call(self, messages: List[Dict], system_prompt: str) -> str:
        """Call the configured LLM provider"""
        
        if self.provider == "ollama":
            return await self._call_ollama(messages, system_prompt)
        elif self.provider == "groq":
            return await self._call_groq(messages, system_prompt)
        elif self.provider == "openrouter":
            return await self._call_openrouter(messages, system_prompt)
        else:
            raise ValueError(f"Unknown provider: {self.provider}")
    
    async def _call_ollama(self, messages: List[Dict], system_prompt: str) -> str:
        url = self.config.get('url', 'http://localhost:11434')
        model = self.config.get('model', 'llama3.1:latest')
        
        full_messages = [
            {"role": "system", "content": system_prompt}
        ] + messages
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{url}/api/chat",
                json={
                    "model": model,
                    "messages": full_messages,
                    "stream": False
                }
            )
            result = response.json()
            return result["message"]["content"]
    
    async def _call_groq(self, messages: List[Dict], system_prompt: str) -> str:
        api_key = self.config.get('api_key')
        
        full_messages = [
            {"role": "system", "content": system_prompt}
        ] + messages
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-70b-versatile",
                    "messages": full_messages
                }
            )
            result = response.json()
            return result["choices"][0]["message"]["content"]
    
    async def _call_openrouter(self, messages: List[Dict], system_prompt: str) -> str:
        api_key = self.config.get('api_key')
        
        full_messages = [
            {"role": "system", "content": system_prompt}
        ] + messages
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "meta-llama/llama-3.1-70b-instruct",
                    "messages": full_messages
                }
            )
            result = response.json()
            return result["choices"][0]["message"]["content"]


class DiscoveryAgent:
    """
    Phase 1: Discovery & Audit Agent
    
    Capabilities:
    - Structured information gathering through conversation
    - System and process documentation
    - Cost baseline establishment
    
    Limitations:
    - Cannot access systems directly (requires human input)
    - Cannot guarantee complete discovery
    - Requires validation of critical systems
    """
    
    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.system_prompt = """You are the Discovery Agent of AIROI, an AI ROI assessment system.

Your role is to conduct a thorough audit of the client's current state through structured questioning.

FOCUS AREAS:
1. Technology Infrastructure: What systems, platforms, databases are in use?
2. Business Processes: What are the key workflows? Where are bottlenecks?
3. Data Landscape: What data is available? What's its quality and accessibility?
4. Pain Points: Where is the team spending manual effort? What's frustrating?
5. Costs: Current IT costs, operational costs, staffing costs
6. Capabilities: Team's technical skills, existing automation, change readiness

IMPORTANT PRINCIPLES:
- Ask 3-5 targeted questions at a time, not overwhelming lists
- Probe for specifics: "Can you give an example?" "How long does that take?"
- Acknowledge what you've learned and build on it
- Flag areas needing deeper investigation
- Be conversational but systematic

When you have sufficient information, output a structured JSON summary with:
{
  "company_name": "",
  "industry": "",
  "employee_count": 0,
  "systems": [...],
  "processes": [...],
  "data_sources": [...],
  "pain_points": [...],
  "current_costs": {...},
  "technical_capabilities": {...},
  "compliance_requirements": [...]
}"""
    
    async def start_audit(self) -> str:
        """Begin the discovery process"""
        messages = [{
            "role": "user",
            "content": "Begin the discovery audit. Introduce yourself and ask the first set of questions."
        }]
        return await self.llm.call(messages, self.system_prompt)
    
    async def continue_audit(self, conversation_history: List[Dict]) -> str:
        """Continue the audit conversation"""
        return await self.llm.call(conversation_history, self.system_prompt)
    
    async def extract_audit_data(self, conversation_history: List[Dict]) -> Optional[AuditData]:
        """Extract structured audit data from the conversation"""
        messages = conversation_history + [{
            "role": "user",
            "content": "Based on our conversation, please provide the complete structured JSON audit summary."
        }]
        
        response = await self.llm.call(messages, self.system_prompt)
        
        try:
            # Try to extract JSON from the response
            json_start = response.find('{')
            json_end = response.rfind('}') + 1
            if json_start >= 0 and json_end > json_start:
                data = json.loads(response[json_start:json_end])
                return AuditData(**data)
        except:
            return None
        
        return None


class OpportunityAnalyzer:
    """
    Phase 2: Opportunity Analysis Agent
    
    Capabilities:
    - Pattern matching against proven AI use cases
    - ROI calculation with confidence intervals
    - Risk assessment based on industry patterns
    - Priority ranking
    
    Limitations:
    - Cannot predict market disruptions or external factors
    - ROI estimates are projections, not guarantees
    - Cannot fully assess organizational change readiness
    - Cannot replace domain expertise in specialized fields
    """
    
    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.system_prompt = """You are the Opportunity Analyzer of AIROI.

Given audit data about a business, identify AI/automation opportunities with brutal honesty about what AI can and cannot do.

ANALYSIS FRAMEWORK:

For each opportunity, you MUST clearly specify:

1. WHAT AI CAN DO (Concrete Capabilities):
   - Specific tasks AI can reliably automate
   - Pattern recognition capabilities
   - Data processing abilities
   - Quality thresholds it can achieve

2. WHAT AI CANNOT DO (Critical Limitations):
   - Tasks requiring human judgment
   - Edge cases needing human review
   - Compliance/legal decisions
   - Complex negotiations or ethical choices
   - Areas where errors would be unacceptable

3. ROI ESTIMATION:
   - Time savings (hours/week)
   - Cost reduction ($/month)
   - Revenue opportunity (if applicable)
   - Confidence level: LOW (50-70%), MEDIUM (70-85%), HIGH (85%+)
   - Payback period

4. PHASE CLASSIFICATION:
   - QUICK WIN (0-3 months): Simple, proven, low-risk
   - FOUNDATION (3-12 months): Infrastructure, moderate complexity
   - STRATEGIC (1-3+ years): Transformational, high complexity

5. RISK FACTORS:
   - Technical risks
   - Organizational risks
   - Compliance/regulatory risks
   - Vendor/dependency risks

6. DEPENDENCIES & PREREQUISITES:
   - What must be in place first?
   - What other systems/processes must work?

OUTPUT FORMAT: JSON array of opportunities

CRITICAL: Be conservative in estimates. Under-promise and over-deliver."""
    
    async def analyze(self, audit_data: AuditData) -> List[Opportunity]:
        """Analyze audit data and identify opportunities"""
        
        messages = [{
            "role": "user",
            "content": f"""Analyze this business audit and identify AI/automation opportunities:

{json.dumps(asdict(audit_data), indent=2)}

Provide a detailed analysis with concrete opportunities."""
        }]
        
        response = await self.llm.call(messages, self.system_prompt)
        
        # Parse opportunities from response
        opportunities = []
        try:
            json_start = response.find('[')
            json_end = response.rfind(']') + 1
            if json_start >= 0 and json_end > json_start:
                data = json.loads(response[json_start:json_end])
                for item in data:
                    opp = Opportunity(
                        title=item['title'],
                        description=item['description'],
                        phase=Phase(item['phase']),
                        can_do=item['can_do'],
                        cannot_do=item['cannot_do'],
                        estimated_roi=item['estimated_roi'],
                        confidence=ConfidenceLevel(item['confidence']),
                        timeframe_months=item['timeframe_months'],
                        risk_factors=item['risk_factors'],
                        dependencies=item['dependencies'],
                        next_steps=item['next_steps']
                    )
                    opportunities.append(opp)
        except Exception as e:
            print(f"Error parsing opportunities: {e}")
        
        return opportunities


class RoadmapStrategist:
    """
    Phase 3: Roadmap Strategist Agent
    
    Capabilities:
    - Create phased implementation plans
    - Ensure forward compatibility
    - Design progressive capability building
    - Plan for rollback strategies
    
    Limitations:
    - Cannot predict future technology disruptions
    - Assumes reasonable organizational cooperation
    - Requires periodic human strategic review
    - Cannot account for unforeseen business changes
    """
    
    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.system_prompt = """You are the Roadmap Strategist of AIROI.

Create a phased implementation roadmap that:

1. BUILDS PROGRESSIVELY:
   - Quick wins fund foundation projects
   - Foundation enables strategic initiatives
   - Each phase prepares for the next
   - No dead-end investments

2. ENSURES FUTURE-PROOFING:
   - Modular architecture
   - API-first approach
   - Cloud-native where appropriate
   - Vendor flexibility

3. MANAGES RISK:
   - Rollback plans for each phase
   - Pilot programs before full deployment
   - Parallel running during transitions
   - Clear success metrics

4. MAINTAINS MOMENTUM:
   - Early wins build confidence
   - Consistent progress demonstrations
   - Regular ROI reporting
   - Stakeholder engagement strategy

5. HUMAN OVERSIGHT POINTS:
   - Decision gates requiring approval
   - Quality review checkpoints
   - Compliance validation
   - Performance assessment

OUTPUT: Detailed roadmap with timelines, dependencies, success metrics, and governance."""
    
    async def create_roadmap(
        self, 
        audit_data: AuditData, 
        opportunities: List[Opportunity]
    ) -> Dict[str, Any]:
        """Create implementation roadmap"""
        
        opps_data = [asdict(o) for o in opportunities]
        
        messages = [{
            "role": "user",
            "content": f"""Create a detailed implementation roadmap for these opportunities:

AUDIT DATA:
{json.dumps(asdict(audit_data), indent=2)}

OPPORTUNITIES:
{json.dumps(opps_data, indent=2)}

Provide a comprehensive phased roadmap."""
        }]
        
        response = await self.llm.call(messages, self.system_prompt)
        
        return {
            "roadmap": response,
            "created_at": datetime.now().isoformat()
        }


class ImplementationAssistant:
    """
    Phase 4: Implementation Assistant Agent
    
    Capabilities:
    - Generate infrastructure code (Terraform, CloudFormation)
    - Create API integration specifications
    - Provide testing frameworks
    - Monitor implementation progress
    
    Limitations:
    - Cannot execute without human approval
    - Cannot guarantee zero-downtime migrations
    - Requires human oversight for production
    - Cannot replace DevOps expertise
    """
    
    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.system_prompt = """You are the Implementation Assistant of AIROI.

Help execute the roadmap by:

1. GENERATING CODE:
   - Infrastructure as Code (Terraform/CloudFormation)
   - API integration code
   - Data pipeline scripts
   - Testing frameworks

2. CREATING SPECIFICATIONS:
   - API contracts
   - Data schemas
   - Integration patterns
   - Security requirements

3. PROVIDING GUIDANCE:
   - Step-by-step implementation guides
   - Best practices
   - Common pitfalls to avoid
   - Rollback procedures

CRITICAL SAFETY PRINCIPLES:
- All code is for review, not direct execution
- Include extensive comments explaining decisions
- Provide multiple implementation options when appropriate
- Highlight security considerations
- Emphasize testing requirements
- Always include rollback mechanisms

OUTPUT: Clear, well-documented code and specifications."""
    
    async def generate_implementation_guide(
        self, 
        opportunity: Opportunity
    ) -> str:
        """Generate implementation guide for an opportunity"""
        
        messages = [{
            "role": "user",
            "content": f"""Generate a detailed implementation guide for this opportunity:

{json.dumps(asdict(opportunity), indent=2)}

Include code examples, architecture diagrams (in text/ASCII), and step-by-step instructions."""
        }]
        
        return await self.llm.call(messages, self.system_prompt)


class AIROIOrchestrator:
    """
    Main orchestrator that coordinates all agents
    """
    
    def __init__(self, llm_provider: LLMProvider):
        self.llm = llm_provider
        self.discovery = DiscoveryAgent(llm_provider)
        self.analyzer = OpportunityAnalyzer(llm_provider)
        self.strategist = RoadmapStrategist(llm_provider)
        self.implementer = ImplementationAssistant(llm_provider)
    
    async def run_full_assessment(
        self, 
        conversation_history: List[Dict]
    ) -> Dict[str, Any]:
        """
        Run complete assessment workflow
        
        Returns comprehensive assessment package
        """
        
        # Extract audit data
        audit_data = await self.discovery.extract_audit_data(conversation_history)
        if not audit_data:
            return {"error": "Could not extract audit data"}
        
        # Analyze opportunities
        opportunities = await self.analyzer.analyze(audit_data)
        
        # Create roadmap
        roadmap = await self.strategist.create_roadmap(audit_data, opportunities)
        
        # Generate implementation guides for quick wins
        quick_wins = [o for o in opportunities if o.phase == Phase.QUICK_WIN]
        implementation_guides = {}
        
        for qw in quick_wins[:3]:  # Limit to top 3 quick wins
            guide = await self.implementer.generate_implementation_guide(qw)
            implementation_guides[qw.title] = guide
        
        return {
            "audit_data": asdict(audit_data),
            "opportunities": [asdict(o) for o in opportunities],
            "roadmap": roadmap,
            "implementation_guides": implementation_guides,
            "generated_at": datetime.now().isoformat()
        }


# Example usage
async def main():
    """Example of using the AIROI system"""
    
    # Initialize with Ollama
    llm = LLMProvider(
        provider="ollama",
        url="http://localhost:11434",
        model="llama3.1"
    )
    
    # Or with Groq
    # llm = LLMProvider(provider="groq", api_key="your-groq-key")
    
    orchestrator = AIROIOrchestrator(llm)
    
    # Start discovery
    print("Starting discovery audit...")
    initial_message = await orchestrator.discovery.start_audit()
    print(initial_message)
    
    # In a real implementation, this would be interactive
    # conversation_history = [...]
    
    # Run full assessment
    # assessment = await orchestrator.run_full_assessment(conversation_history)
    # print(json.dumps(assessment, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
