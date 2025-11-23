from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, timedelta
import sqlite3
import json
from contextlib import contextmanager
from openai_service import analyze_page_relevance

app = FastAPI(title="AutoFocus API", version="0.1")

# CORS middleware to allow requests from Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your extension's origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database connection helper
@contextmanager
def get_db():
    conn = sqlite3.connect('autofocus.db')
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# Initialize database
def init_db():
    with get_db() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS focus_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_name TEXT NOT NULL,
                project_description TEXT,
                mode TEXT NOT NULL,
                duration_minutes INTEGER,
                start_time TIMESTAMP NOT NULL,
                end_time TIMESTAMP,
                distractions_blocked INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create page analyses table for caching
        conn.execute('''
            CREATE TABLE IF NOT EXISTS page_analyses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                project_description TEXT NOT NULL,
                relevance_score REAL NOT NULL,
                reasoning TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

# Call init on startup
init_db()

# Pydantic models
class FocusSessionCreate(BaseModel):
    project_name: str
    project_description: Optional[str] = None
    allowed_domains: Optional[List[str]] = [] # Keeping for backward compatibility but optional
    mode: str
    duration_minutes: Optional[int] = None
    distractions_blocked: int = 0

class FocusSessionResponse(BaseModel):
    id: int
    project_name: str
    project_description: Optional[str]
    mode: str
    duration_minutes: Optional[int]
    start_time: datetime
    end_time: Optional[datetime]
    distractions_blocked: int
    created_at: datetime

class PageAnalysisRequest(BaseModel):
    project_description: str
    url: str
    title: str
    content_preview: str

class PageAnalysisResponse(BaseModel):
    relevance_score: float
    reasoning: str

class AnalyticsResponse(BaseModel):
    total_sessions: int
    total_focus_time_minutes: int
    average_session_length_minutes: float
    total_distractions_blocked: int
    sessions_this_week: int
    focus_time_this_week_minutes: int

# Routes
@app.get("/")
def read_root():
    return {"status": "ok", "message": "AutoFocus API is running"}

@app.post("/sessions/", response_model=FocusSessionResponse)
def create_session(session: FocusSessionCreate):
    """Create a new focus session"""
    with get_db() as conn:
        cursor = conn.execute(
            '''
            INSERT INTO focus_sessions
            (project_name, project_description, mode, duration_minutes, start_time, distractions_blocked)
            VALUES (?, ?, ?, ?, ?, ?)
            ''',
            (
                session.project_name,
                session.project_description,
                session.mode,
                session.duration_minutes,
                datetime.now(),
                session.distractions_blocked
            )
        )
        session_id = cursor.lastrowid
        conn.commit()

        # Fetch the created session
        row = conn.execute(
            'SELECT * FROM focus_sessions WHERE id = ?',
            (session_id,)
        ).fetchone()

        return FocusSessionResponse(
            id=row['id'],
            project_name=row['project_name'],
            project_description=row['project_description'],
            mode=row['mode'],
            duration_minutes=row['duration_minutes'],
            start_time=datetime.fromisoformat(row['start_time']),
            end_time=datetime.fromisoformat(row['end_time']) if row['end_time'] else None,
            distractions_blocked=row['distractions_blocked'],
            created_at=datetime.fromisoformat(row['created_at'])
        )

@app.post("/analyze/page", response_model=PageAnalysisResponse)
async def analyze_page(request: PageAnalysisRequest):
    """Analyze if a page is relevant to the project"""
    # Determine if allowed by legacy domain list (handled in extension, but we could check here too)
    
    # Use OpenAI service to analyze
    result = await analyze_page_relevance(
        request.project_description, 
        request.url, 
        request.title, 
        request.content_preview
    )
    
    return PageAnalysisResponse(
        relevance_score=result.get("relevance_score", 0.0),
        reasoning=result.get("reasoning", "No reasoning provided")
    )

@app.put("/sessions/{session_id}/end")
def end_session(session_id: int):
    """End a focus session"""
    with get_db() as conn:
        # Check if session exists and is not already ended
        row = conn.execute(
            'SELECT * FROM focus_sessions WHERE id = ? AND end_time IS NULL',
            (session_id,)
        ).fetchone()

        if not row:
            raise HTTPException(status_code=404, detail="Active session not found")

        # Update the session with end time
        conn.execute(
            'UPDATE focus_sessions SET end_time = ? WHERE id = ?',
            (datetime.now(), session_id)
        )
        conn.commit()

        return {"message": "Session ended successfully"}

@app.put("/sessions/{session_id}/distractions")
def update_distraction_count(session_id: int, count: int):
    """Update distraction count for a session"""
    with get_db() as conn:
        conn.execute(
            'UPDATE focus_sessions SET distractions_blocked = ? WHERE id = ?',
            (count, session_id)
        )
        conn.commit()

        return {"message": "Distraction count updated"}

@app.get("/analytics/weekly", response_model=AnalyticsResponse)
def get_weekly_analytics():
    """Get weekly analytics"""
    with get_db() as conn:
        # Get date 7 days ago
        week_ago = datetime.now() - timedelta(days=7)

        # Query for all sessions
        all_sessions = conn.execute(
            'SELECT * FROM focus_sessions WHERE created_at >= ?',
            (week_ago,)
        ).fetchall()

        # Calculate analytics
        total_sessions = len(all_sessions)
        total_focus_time = 0
        total_distractions = 0
        sessions_this_week = 0
        focus_time_this_week = 0

        for session in all_sessions:
            sessions_this_week += 1

            # Calculate focus time
            start_time = datetime.fromisoformat(session['start_time'])
            end_time = datetime.fromisoformat(session['end_time']) if session['end_time'] else datetime.now()

            session_duration = (end_time - start_time).total_seconds() / 60  # minutes
            focus_time_this_week += session_duration
            total_focus_time += session_duration

            total_distractions += session['distractions_blocked']

        average_session_length = total_focus_time / total_sessions if total_sessions > 0 else 0

        return AnalyticsResponse(
            total_sessions=total_sessions,
            total_focus_time_minutes=int(total_focus_time),
            average_session_length_minutes=round(average_session_length, 2),
            total_distractions_blocked=total_distractions,
            sessions_this_week=sessions_this_week,
            focus_time_this_week_minutes=int(focus_time_this_week)
        )

@app.get("/sessions/", response_model=List[FocusSessionResponse])
def get_sessions(limit: int = 50, offset: int = 0):
    """Get list of focus sessions"""
    with get_db() as conn:
        rows = conn.execute(
            'SELECT * FROM focus_sessions ORDER BY created_at DESC LIMIT ? OFFSET ?',
            (limit, offset)
        ).fetchall()

        sessions = []
        for row in rows:
            sessions.append(FocusSessionResponse(
                id=row['id'],
                project_name=row['project_name'],
                project_description=row['project_description'],
                mode=row['mode'],
                duration_minutes=row['duration_minutes'],
                start_time=datetime.fromisoformat(row['start_time']),
                end_time=datetime.fromisoformat(row['end_time']) if row['end_time'] else None,
                distractions_blocked=row['distractions_blocked'],
                created_at=datetime.fromisoformat(row['created_at'])
            ))

        return sessions

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)