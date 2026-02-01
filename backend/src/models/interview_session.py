"""
Interview Session database model
"""
from sqlalchemy import Column, String, Integer, Float, Text, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime, timezone
import json
import uuid

Base = declarative_base()


class InterviewSession(Base):
    """Interview session model with evaluation"""
    __tablename__ = "interview_sessions"
    
    # Basic info
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    room_name = Column(String, nullable=False)
    participant_name = Column(String, default="User")
    
    # Job and Resume context
    job_id = Column(String, nullable=True)
    job_title = Column(String, nullable=True)
    job_company = Column(String, nullable=True)
    resume_id = Column(String, nullable=True)
    
    # Session metadata
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Integer, default=0)
    
    # Conversation data
    conversation_history = Column(Text)  # JSON string of messages
    question_count = Column(Integer, default=0)
    
    # Evaluation scores (0-100)
    overall_score = Column(Float, default=0)
    technical_score = Column(Float, default=0)
    communication_score = Column(Float, default=0)
    problem_solving_score = Column(Float, default=0)
    
    # Evaluation feedback
    strengths = Column(Text)  # JSON array
    areas_for_improvement = Column(Text)  # JSON array
    detailed_feedback = Column(Text)
    recommendations = Column(Text)  # JSON array
    
    # Status
    is_evaluated = Column(Boolean, default=False)
    evaluation_model = Column(String, default="sonnet4")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary"""
        def _iso(dt):
            if not dt:
                return None
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()

        return {
            'id': self.id,
            'roomName': self.room_name,
            'participantName': self.participant_name,
            'jobId': self.job_id,
            'jobTitle': self.job_title,
            'jobCompany': self.job_company,
            'resumeId': self.resume_id,
            'startedAt': _iso(self.started_at),
            'endedAt': _iso(self.ended_at),
            'durationSeconds': self.duration_seconds,
            'conversationHistory': json.loads(self.conversation_history) if self.conversation_history else [],
            'questionCount': self.question_count,
            'overallScore': self.overall_score,
            'technicalScore': self.technical_score,
            'communicationScore': self.communication_score,
            'problemSolvingScore': self.problem_solving_score,
            'strengths': json.loads(self.strengths) if self.strengths else [],
            'areasForImprovement': json.loads(self.areas_for_improvement) if self.areas_for_improvement else [],
            'detailedFeedback': self.detailed_feedback,
            'recommendations': json.loads(self.recommendations) if self.recommendations else [],
            'isEvaluated': self.is_evaluated,
            'evaluationModel': self.evaluation_model,
            'createdAt': _iso(self.created_at),
            'updatedAt': _iso(self.updated_at),
        }

    def to_summary_dict(self):
        """Convert to lightweight summary dictionary for list views"""
        def _iso(dt):
            if not dt:
                return None
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()

        return {
            'id': self.id,
            'roomName': self.room_name,
            'participantName': self.participant_name,
            'jobId': self.job_id,
            'jobTitle': self.job_title,
            'jobCompany': self.job_company,
            'resumeId': self.resume_id,
            'startedAt': _iso(self.started_at),
            'endedAt': _iso(self.ended_at),
            'durationSeconds': self.duration_seconds,
            'questionCount': self.question_count,
            'overallScore': self.overall_score,
            'isEvaluated': self.is_evaluated,
            'createdAt': _iso(self.created_at),
            'updatedAt': _iso(self.updated_at),
        }
