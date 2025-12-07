"""
AIROI FastAPI Server
Complete REST API for the AIROI assessment system
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import asyncio
import json
from datetime import datetime
import sqlite3
from contextlib import asynccontextmanager

#Import the AIROI backend (assuming it's in airoi_backend.py)
from airoi_backend import (
    AIROIOrchestrator, LLMProvider, Phase, ConfidenceLevel
 )


# Database setup
def init_db():
    """Initialize SQLite database"""
    conn = sqlite3.connect('airoi.db')
    cursor = conn.cursor()
    
    # Sessions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            company_name TEXT,
            created_at TIMESTAMP,
            updated_at TIMESTAMP,
            status TEXT
        )
    ''')
    
    # Conversations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            role TEXT,
            agent TEXT,
            content TEXT,
            timestamp TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    ''')
    
    # Assessments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            audit_data TEXT,
            opportunities TEXT,
            roadmap TEXT,
            created_at TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    ''')
    
    conn.commit()
    conn.close()


# Pydantic models
class LLMConfig(BaseModel):
    provider: str = "ollama"
    url: Optional[str] = "http://localhost:11434"
    model: Optional[str] = "llama3.1"
    api_key: Optional[str] = None


class ChatMessage(BaseModel):
    role: str
    content: str
    agent: Optional[str] = None


class SessionCreate(BaseModel):
    company_name: str
    llm_config: LLMConfig


class SessionResponse(BaseModel):
    session_id: str
    company_name: str
    created_at: str
    status: str


class AssessmentResponse(BaseModel):
    session_id: str
    audit_data: Dict[str, Any]
    opportunities: List[Dict[str, Any]]
    roadmap: Dict[str, Any]
    generated_at: str


# Initialize FastAPI app
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    yield
    # Shutdown
    pass


app = FastAPI(
    title="AIROI API",
    description="AI Return on Investment Assessment System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# In-memory storage for active sessions (use Redis in production)
active_sessions: Dict[str, Any] = {}


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AIROI",
        "version": "1.0.0",
        "status": "operational"
    }


@app.post("/sessions", response_model=SessionResponse)
async def create_session(session_data: SessionCreate):
    """Create a new assessment session"""
    
    import uuid
    session_id = str(uuid.uuid4())
    
    # Initialize LLM provider
    llm_config = session_data.llm_config
    llm = None  # LLMProvider implementation here
    
    # Store in database
    conn = sqlite3.connect('airoi.db')
    cursor = conn.cursor()
    
    now = datetime.now().isoformat()
    cursor.execute(
        "INSERT INTO sessions (id, company_name, created_at, updated_at, status) VALUES (?, ?, ?, ?, ?)",
        (session_id, session_data.company_name, now, now, "active")
    )
    conn.commit()
    conn.close()
    
    # Store in memory
    active_sessions[session_id] = {
        "company_name": session_data.company_name,
        "llm_config": llm_config.dict(),
        "conversation_history": [],
        "created_at": now
    }
    
    return SessionResponse(
        session_id=session_id,
        company_name=session_data.company_name,
        created_at=now,
        status="active"
    )


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get session information"""
    
    conn = sqlite3.connect('airoi.db')
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, company_name, created_at, status FROM sessions WHERE id = ?",
        (session_id,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "session_id": row[0],
        "company_name": row[1],
        "created_at": row[2],
        "status": row[3]
    }


@app.post("/sessions/{session_id}/chat")
async def chat(session_id: str, message: ChatMessage):
    """Send a message in the chat"""
    
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    
    # Add user message to history
    session["conversation_history"].append({
        "role": message.role,
        "content": message.content
    })
    
    # Store in database
    conn = sqlite3.connect('airoi.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO conversations (session_id, role, content, timestamp) VALUES (?, ?, ?, ?)",
        (session_id, message.role, message.content, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    
    # TODO: Call appropriate agent based on conversation state
    # For now, return a placeholder response
    
    response_content = "This is a placeholder response. Integrate with AIROI agents."
    
    # Add assistant response to history
    session["conversation_history"].append({
        "role": "assistant",
        "content": response_content,
        "agent": "general"
    })
    
    return {
        "role": "assistant",
        "content": response_content,
        "agent": "general"
    }


@app.get("/sessions/{session_id}/conversation")
async def get_conversation(session_id: str):
    """Get full conversation history"""
    
    conn = sqlite3.connect('airoi.db')
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT role, agent, content, timestamp FROM conversations WHERE session_id = ? ORDER BY timestamp",
        (session_id,)
    )
    rows = cursor.fetchall()
    conn.close()
    
    return {
        "session_id": session_id,
        "messages": [
            {
                "role": row[0],
                "agent": row[1],
                "content": row[2],
                "timestamp": row[3]
            }
            for row in rows
        ]
    }


@app.post("/sessions/{session_id}/start-discovery")
async def start_discovery(session_id: str):
    """Start the discovery audit process"""
    
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # TODO: Initialize DiscoveryAgent and get first message
    initial_message = """Hello! I'm the Discovery Agent of AIROI. I'll help you systematically assess your current systems and identify opportunities for AI-powered improvements.

Let's start with understanding your business:

1. What industry are you in, and what are your primary business activities?
2. Approximately how many employees do you have?
3. What are the main technology systems you currently use (e.g., CRM, ERP, databases)?

Please share what you're comfortable with, and we'll go from there."""
    
    session = active_sessions[session_id]
    session["conversation_history"].append({
        "role": "assistant",
        "content": initial_message,
        "agent": "discovery"
    })
    
    # Store in database
    conn = sqlite3.connect('airoi.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO conversations (session_id, role, agent, content, timestamp) VALUES (?, ?, ?, ?, ?)",
        (session_id, "assistant", "discovery", initial_message, datetime.now().isoformat())
    )
    conn.commit()
    conn.close()
    
    return {
        "role": "assistant",
        "agent": "discovery",
        "content": initial_message
    }


@app.post("/sessions/{session_id}/generate-assessment")
async def generate_assessment(session_id: str):
    """Generate full assessment from conversation history"""
    
    if session_id not in active_sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = active_sessions[session_id]
    
    # TODO: Run full assessment pipeline
    # orchestrator.run_full_assessment(session["conversation_history"])
    
    # Placeholder response
    assessment = {
        "session_id": session_id,
        "audit_data": {
            "company_name": session["company_name"],
            "industry": "Example Industry",
            "employee_count": 50
        },
        "opportunities": [
            {
                "title": "Email Response Automation",
                "phase": "quick_win",
                "estimated_roi": 25000,
                "confidence": "high"
            }
        ],
        "roadmap": {
            "phases": ["Quick Wins", "Foundation", "Strategic"]
        },
        "generated_at": datetime.now().isoformat()
    }
    
    # Store in database
    conn = sqlite3.connect('airoi.db')
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO assessments (session_id, audit_data, opportunities, roadmap, created_at) VALUES (?, ?, ?, ?, ?)",
        (
            session_id,
            json.dumps(assessment["audit_data"]),
            json.dumps(assessment["opportunities"]),
            json.dumps(assessment["roadmap"]),
            assessment["generated_at"]
        )
    )
    conn.commit()
    conn.close()
    
    return assessment


@app.get("/sessions/{session_id}/assessment")
async def get_assessment(session_id: str):
    """Get the generated assessment"""
    
    conn = sqlite3.connect('airoi.db')
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT audit_data, opportunities, roadmap, created_at FROM assessments WHERE session_id = ? ORDER BY created_at DESC LIMIT 1",
        (session_id,)
    )
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Assessment not found")
    
    return {
        "session_id": session_id,
        "audit_data": json.loads(row[0]),
        "opportunities": json.loads(row[1]),
        "roadmap": json.loads(row[2]),
        "generated_at": row[3]
    }


@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """WebSocket for real-time chat"""
    
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            message_data = json.loads(data)
            
            # Process message
            # TODO: Integrate with agents
            
            response = {
                "role": "assistant",
                "content": f"Received: {message_data['content']}",
                "agent": "general"
            }
            
            await websocket.send_text(json.dumps(response))
            
    except WebSocketDisconnect:
        print(f"WebSocket disconnected for session {session_id}")


# Agent-specific endpoints
@app.get("/capabilities")
async def get_capabilities():
    """Get information about what AI can and cannot do"""
    
    return {
        "quick_wins": {
            "can_do": [
                "Pattern recognition in documents",
                "Classify and route based on content",
                "Extract structured data from forms",
                "Answer questions from knowledge base"
            ],
            "cannot_do": [
                "Make legal or compliance decisions",
                "Replace human judgment in ambiguous cases",
                "Guarantee 100% accuracy without human review",
                "Handle complex negotiations"
            ]
        },
        "foundation": {
            "can_do": [
                "Consolidate data from multiple sources",
                "Create unified APIs for legacy systems",
                "Build searchable knowledge repositories",
                "Automate repetitive workflows"
            ],
            "cannot_do": [
                "Migrate without business validation",
                "Replace all legacy systems immediately",
                "Eliminate need for IT governance",
                "Automatically resolve data quality issues"
            ]
        },
        "strategic": {
            "can_do": [
                "Identify patterns and trends in data",
                "Provide data-driven recommendations",
                "Optimize complex workflows",
                "Personalize user experiences"
            ],
            "cannot_do": [
                "Replace executive decision-making",
                "Guarantee predictions in volatile markets",
                "Eliminate need for domain expertise",
                "Make ethical judgments"
            ]
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
