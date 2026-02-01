"""
Interview session and evaluation API routes
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json
import logging
import asyncio

from ..database import get_db, SessionLocal
from ..models.interview_session import InterviewSession
from ..models.job import Job
from ..services.interview_evaluator import interview_evaluator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/interviews", tags=["interviews"])


async def _evaluate_session_async(session_id: str) -> None:
    """Run interview evaluation in the background without blocking requests."""
    db = SessionLocal()
    try:
        session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        if not session:
            logger.warning("Background evaluation skipped: session not found %s", session_id)
            return

        if session.is_evaluated:
            logger.info("Background evaluation skipped: already evaluated %s", session_id)
            return

        if not session.conversation_history:
            logger.info("Background evaluation skipped: no conversation history %s", session_id)
            return

        conversation = json.loads(session.conversation_history)

        job_description = None
        if session.job_id:
            job = db.query(Job).filter(Job.id == session.job_id).first()
            if job:
                job_dict = job.to_dict()
                job_description = job_dict.get('description', '')

        logger.info("Background evaluating interview session %s", session_id)
        evaluation = await interview_evaluator.evaluate_interview(
            conversation_history=conversation,
            job_title=session.job_title,
            job_company=session.job_company,
            job_description=job_description
        )

        session.overall_score = evaluation.get('overallScore', 0)
        session.technical_score = evaluation.get('technicalScore', 0)
        session.communication_score = evaluation.get('communicationScore', 0)
        session.problem_solving_score = evaluation.get('problemSolvingScore', 0)
        session.strengths = json.dumps(evaluation.get('strengths', []))
        session.areas_for_improvement = json.dumps(evaluation.get('areasForImprovement', []))
        session.detailed_feedback = evaluation.get('detailedFeedback', '')
        session.recommendations = json.dumps(evaluation.get('recommendations', []))
        session.is_evaluated = True

        db.commit()
        logger.info("Background evaluation completed: %s score=%s", session_id, session.overall_score)
    except Exception as e:
        logger.error("Background evaluation failed: %s error=%s", session_id, e)
        db.rollback()
    finally:
        db.close()




@router.get("/")
async def get_interview_sessions(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get list of all interview sessions"""
    query = db.query(InterviewSession).order_by(InterviewSession.created_at.desc())
    
    total = query.count()
    sessions = query.offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "sessions": [session.to_summary_dict() for session in sessions]
    }


@router.get("/{session_id}")
async def get_interview_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Get single interview session details"""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    return session.to_dict()


@router.post("/{session_id}/save")
async def save_interview_session(
    session_id: str,
    conversation: List[dict],
    job_id: Optional[str] = None,
    resume_id: Optional[str] = None,
    room_name: Optional[str] = None,
    participant_name: str = "User",
    db: Session = Depends(get_db)
):
    """
    Save interview session data
    
    Call this when interview ends to save conversation history
    """
    
    # Check if session exists
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    
    if not session:
        # Create new session
        session = InterviewSession(
            id=session_id,
            room_name=room_name or session_id,
            participant_name=participant_name
        )
        db.add(session)
    
    # Update session data
    session.job_id = job_id
    session.resume_id = resume_id
    session.conversation_history = json.dumps(conversation)
    session.question_count = len([m for m in conversation if m.get('role') == 'interviewer'])
    session.ended_at = datetime.utcnow()
    
    if session.started_at:
        duration = (session.ended_at - session.started_at).total_seconds()
        session.duration_seconds = int(duration)
    
    # Get job details if provided
    if job_id:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job_dict = job.to_dict()
            session.job_title = job_dict['title']
            session.job_company = job_dict['company']
    
    db.commit()
    db.refresh(session)
    
    logger.info(f"Saved interview session {session_id} with {session.question_count} questions")

    return {
        "success": True,
        "sessionId": session_id,
        "message": "Interview session saved successfully"
    }


@router.post("/{session_id}/evaluate")
async def evaluate_interview_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Evaluate interview session performance
    
    Uses LLM to analyze conversation and provide scores and feedback
    """
    
    # Get session
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    if not session.conversation_history:
        raise HTTPException(
            status_code=400,
            detail="No conversation history to evaluate"
        )
    
    if session.is_evaluated:
        return {
            "sessionId": session_id,
            "message": "Interview already evaluated"
        }

    asyncio.create_task(_evaluate_session_async(session_id))
    
    return {
        "sessionId": session_id,
        "message": "Evaluation requested"
    }


@router.delete("/{session_id}")
async def delete_interview_session(
    session_id: str,
    db: Session = Depends(get_db)
):
    """Delete interview session"""
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    db.delete(session)
    db.commit()
    
    return {"success": True, "message": "Interview session deleted"}
