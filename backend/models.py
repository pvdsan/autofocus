# AutoFocus Database Models
# Using SQLAlchemy for future extensibility (currently using raw SQL for simplicity)

from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import json

Base = declarative_base()

class FocusSession(Base):
    __tablename__ = 'focus_sessions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    project_name = Column(String, nullable=False)
    allowed_domains = Column(Text, nullable=False)  # JSON array stored as text
    mode = Column(String, nullable=False)  # 'nudge', 'guardrail', 'monk'
    duration_minutes = Column(Integer, nullable=True)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    distractions_blocked = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    def __init__(self, project_name, allowed_domains, mode, duration_minutes=None):
        self.project_name = project_name
        self.allowed_domains = json.dumps(allowed_domains)
        self.mode = mode
        self.duration_minutes = duration_minutes
        self.start_time = datetime.utcnow()

    def get_allowed_domains(self):
        """Get allowed domains as list"""
        return json.loads(self.allowed_domains)

    def set_allowed_domains(self, domains):
        """Set allowed domains from list"""
        self.allowed_domains = json.dumps(domains)

    def end_session(self):
        """Mark session as ended"""
        self.end_time = datetime.utcnow()

    def get_duration_minutes(self):
        """Get actual session duration in minutes"""
        if not self.end_time:
            return (datetime.utcnow() - self.start_time).total_seconds() / 60
        return (self.end_time - self.start_time).total_seconds() / 60

# Database setup functions for future use
def create_engine_and_session(db_path='sqlite:///autofocus.db'):
    """Create database engine and session factory"""
    engine = create_engine(db_path, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine, SessionLocal

def create_tables(engine):
    """Create all database tables"""
    Base.metadata.create_all(bind=engine)

# Analytics helper functions
def calculate_session_stats(sessions):
    """Calculate statistics from a list of sessions"""
    if not sessions:
        return {
            'total_sessions': 0,
            'total_focus_time_minutes': 0,
            'average_session_length_minutes': 0,
            'total_distractions_blocked': 0
        }

    total_focus_time = sum(session.get_duration_minutes() for session in sessions)
    total_distractions = sum(session.distractions_blocked for session in sessions)

    return {
        'total_sessions': len(sessions),
        'total_focus_time_minutes': int(total_focus_time),
        'average_session_length_minutes': round(total_focus_time / len(sessions), 2),
        'total_distractions_blocked': total_distractions
    }
