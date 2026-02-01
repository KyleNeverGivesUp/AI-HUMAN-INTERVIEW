"""
Job API routes
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json
import logging

from ..database import get_db
from ..models.job import Job
from ..models.resume import Resume
from ..services.resume_matcher import resume_matcher
from ..services.interview_question_generator import question_generator

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/")
async def get_jobs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    source: Optional[str] = None,
    work_type: Optional[str] = None,
    h1b: bool = False,
    cpt: bool = False,
    opt: bool = False,
    db: Session = Depends(get_db)
):
    """Get jobs list with optional filters"""
    query = db.query(Job)
    
    # Apply filters
    if source:
        query = query.filter(Job.source == source)
    if work_type:
        query = query.filter(Job.employment_type == work_type)
    if h1b:
        query = query.filter(Job.sponsors_h1b == True)
    if cpt:
        query = query.filter(Job.sponsors_cpt == True)
    if opt:
        query = query.filter(Job.sponsors_opt == True)
    
    total = query.count()
    jobs = query.order_by(Job.match_percentage.desc()).offset(offset).limit(limit).all()
    
    return {
        "total": total,
        "jobs": [job.to_dict() for job in jobs]
    }


@router.get("/{job_id}")
async def get_job(job_id: str, db: Session = Depends(get_db)):
    """Get single job details"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_dict()


@router.post("/{job_id}/like")
async def toggle_like(job_id: str, db: Session = Depends(get_db)):
    """Toggle job like status"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.is_liked = not job.is_liked
    db.commit()
    
    return {"liked": job.is_liked}


@router.post("/{job_id}/apply")
async def apply_to_job(job_id: str, db: Session = Depends(get_db)):
    """Mark job as applied"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.has_applied = True
    db.commit()
    
    return {"applied": True}


@router.post("/{job_id}/unapply")
async def unapply_to_job(job_id: str, db: Session = Depends(get_db)):
    """Unapply job (move back to Matched)"""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    job.has_applied = False
    db.commit()
    
    return {"applied": False}


@router.post("/match/{resume_id}")
async def match_resume_to_jobs(
    resume_id: str,
    job_ids: Optional[List[str]] = None,
    model: Optional[str] = Query(None, description="Model to use: 'haiku' (fast) or 'sonnet4' (accurate)"),
    db: Session = Depends(get_db)
):
    """
    Match a resume to jobs using LLM analysis
    
    Args:
        resume_id: ID of the resume to analyze
        job_ids: Optional list of specific job IDs to match against.
                 If not provided, matches against all jobs.
        model: Model to use: 'haiku' (1-2s, default) or 'sonnet4' (3-5s)
    """
    # Get resume
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.parsed_data:
        raise HTTPException(
            status_code=400, 
            detail="Resume has no parsed data. Please upload a valid resume."
        )
    
    # Get jobs
    if job_ids:
        jobs = db.query(Job).filter(Job.id.in_(job_ids)).all()
    else:
        jobs = db.query(Job).all()
    
    if not jobs:
        raise HTTPException(status_code=404, detail="No jobs found")
    
    logger.info(f"Matching resume {resume_id} against {len(jobs)} jobs with model {model or 'default'}")
    
    # Convert jobs to dict format
    jobs_data = [job.to_dict() for job in jobs]
    
    # Analyze matches using LLM with model selection
    match_results = await resume_matcher.batch_analyze(
        resume_text=resume.parsed_data,
        jobs=jobs_data,
        model=model
    )
    
    # Update match percentages in database
    for result in match_results:
        job = db.query(Job).filter(Job.id == result['jobId']).first()
        if job:
            job.match_percentage = result['matchScore']
    
    db.commit()
    
    return {
        "resumeId": resume_id,
        "totalJobs": len(match_results),
        "matches": match_results,
        "model": model or "default"
    }


@router.get("/{job_id}/match-analysis/{resume_id}")
async def get_detailed_match_analysis(
    job_id: str,
    resume_id: str,
    model: Optional[str] = Query(None, description="Model to use: 'haiku' (fast) or 'sonnet4' (accurate)"),
    db: Session = Depends(get_db)
):
    """
    Get detailed LLM analysis for a specific job-resume pair
    
    Query parameters:
    - model: 'haiku' (1-2s, default) or 'sonnet4' (3-5s, more accurate)
    
    Returns cached result if resume content hasn't changed (< 50ms)
    """
    
    # Get job and resume
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    if not resume.parsed_data:
        raise HTTPException(
            status_code=400,
            detail="Resume has no parsed data"
        )
    
    # Get detailed analysis with model selection
    job_dict = job.to_dict()
    analysis = await resume_matcher.analyze_match(
        resume_text=resume.parsed_data,
        job_id=job_id,
        job_title=job_dict['title'],
        job_company=job_dict['company'],
        job_description=job_dict['description'],
        job_qualifications=job_dict['qualifications'],
        job_responsibilities=job_dict['responsibilities'],
        model=model
    )
    
    # Save match percentage to database for persistence
    match_score = analysis.get('matchScore', 0)
    if job.match_percentage != match_score:
        job.match_percentage = match_score
        db.commit()
        logger.info(f"Updated match percentage for job {job_id}: {match_score}%")
    
    return {
        "jobId": job_id,
        "resumeId": resume_id,
        "analysis": analysis
    }


@router.get("/models")
async def get_available_models():
    """Get available LLM models for resume matching"""
    from ..services.resume_matcher import ResumeMatcher
    return {
        "defaultModel": "haiku",
        "models": ResumeMatcher.get_available_models()
    }


@router.post("/{job_id}/generate-question")
async def generate_default_question(
    job_id: str,
    db: Session = Depends(get_db)
):
    """Generate and cache default interview question for a job"""
    
    # Get job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Check if already has default question
    if job.default_question:
        return {
            "jobId": job_id,
            "question": job.default_question,
            "cached": True
        }
    
    # Generate question
    job_dict = job.to_dict()
    question = await question_generator.generate_default_question(
        job_title=job_dict['title'],
        job_company=job_dict['company'],
        job_description=job_dict['description'],
        job_qualifications=job_dict['qualifications'],
        job_responsibilities=job_dict['responsibilities']
    )
    
    # Save to database
    job.default_question = question
    db.commit()
    
    logger.info(f"Generated and cached default question for job {job_id}")
    
    return {
        "jobId": job_id,
        "question": question,
        "cached": False
    }


@router.get("/{job_id}/default-question")
async def get_default_question(
    job_id: str,
    db: Session = Depends(get_db)
):
    """Get cached default interview question for a job"""
    
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if not job.default_question:
        # Generate if not exists
        return await generate_default_question(job_id, db)
    
    return {
        "jobId": job_id,
        "question": job.default_question,
        "cached": True
    }


@router.post("/seed")
async def seed_initial_jobs(db: Session = Depends(get_db)):
    """Clear existing jobs and seed with 3 new T-Mobile job postings"""
    
    # Clear all existing jobs
    existing_count = db.query(Job).count()
    if existing_count > 0:
        db.query(Job).delete()
        db.commit()
        logger.info(f"Cleared {existing_count} existing jobs from database")
    
    jobs = [
        # T-Mobile Machine Learning Engineering Intern
        Job(
            id="tmobile-ml-engineering-intern-2026",
            title="Machine Learning Engineering Intern",
            company="T-Mobile",
            location="Atlanta, GA / Bellevue, WA",
            location_type="On-site",
            employment_type="Intern",
            experience_level="Entry Level",
            salary_min=20,
            salary_max=40,
            salary_currency="/hour",
            description="11-week paid internship building AI solutions that improve customer experience. Focus on ML engineering projects, building scalable training and inference pipelines, APIs, and service integrations. Work on AI observability by developing tools and frameworks to monitor, evaluate, and improve machine learning and LLM-based systems.",
            qualifications=json.dumps([
                "Experience building or experimenting with real-world ML systems, not just models",
                "Exposure to LLMs or applied AI tools (prompting, RAG, fine-tuning)",
                "Participation in research, hackathons, or open-source ML projects",
                "At least 18 years of age",
                "Legally authorized to work in the United States",
                "Must be actively enrolled in a Bachelors or Graduate degree program"
            ]),
            responsibilities=json.dumps([
                "Build and maintain scalable ML training and inference pipelines, APIs, and service integrations",
                "Develop and optimize model serving and inference workflows, focusing on performance, latency, and scalability",
                "Implement MLOps best practices, including model versioning, CI/CD workflows, and drift detection",
                "Convert research ideas and prototypes into production-ready machine learning systems",
                "Design and run model evaluations (Evals), including offline and online testing",
                "Contribute to MLOps and reliability efforts by implementing monitoring and evaluation frameworks"
            ]),
            benefits=json.dumps([
                "Paid internship ($20-40/hour based on experience/location)",
                "11-week program duration",
                "Relocation assistance for those 50+ miles away",
                "Work on AI solutions at scale for millions of customers",
                "Mentorship and networking opportunities"
            ]),
            skills=json.dumps(["Machine Learning", "Python", "LLMs", "MLOps", "CI/CD", "Model Serving", "API Development", "Model Evaluation", "RAG", "Fine-tuning"]),
            sponsors_h1b=False,
            sponsors_cpt=False,
            sponsors_opt=False,
            no_sponsorship=True,
            requires_citizenship=False,
            source="T-Mobile Careers",
            application_url="https://tmobile.wd1.myworkdayjobs.com/External/job/Atlanta-Georgia/Summer-2026-Machine-Learning-Engineering-Internship_REQ342733?utm_source=Simplify&ref=Simplify",
            posted_at="3 days ago",
            applicants=0,
            match_percentage=0
        ),
        
        # T-Mobile Associate Software Engineer Intern
        Job(
            id="tmobile-associate-swe-intern-2026",
            title="Associate Software Engineer Intern",
            company="T-Mobile",
            location="Philadelphia, PA",
            location_type="On-site",
            employment_type="Intern",
            experience_level="Entry Level",
            salary_min=26,
            salary_max=47,
            salary_currency="/hour",
            description="11-week paid learning experience in a collaborative, fast-paced engineering environment. Work alongside experienced software engineers, product managers, and designers on real-world software projects. Gain hands-on experience building software, exposure to modern development practices, and opportunities to contribute to projects that make an impact.",
            qualifications=json.dumps([
                "Currently pursuing a bachelor's degree in Computer Science, Software Engineering, or a related field",
                "Basic knowledge of one or more programming languages (such as Java, Python, JavaScript, or TypeScript)",
                "Familiarity with data structures, algorithms, and object-oriented programming concepts",
                "Interest in learning new technologies and solving technical problems",
                "Strong communication skills and the ability to work effectively in a team environment",
                "Eagerness to learn, take feedback, and grow as a software engineer",
                "At least 18 years of age",
                "Legally authorized to work in the United States",
                "Must be actively enrolled in a Bachelor's degree program"
            ]),
            responsibilities=json.dumps([
                "Assist in designing, developing, testing, and maintaining software applications",
                "Write clean, readable, and well-documented code under the guidance of senior engineers",
                "Participate in code reviews and incorporate feedback to improve code quality",
                "Collaborate with cross-functional teams to understand requirements and deliver solutions",
                "Debug issues and help improve system performance and reliability",
                "Learn and apply modern development tools, frameworks, and methodologies (e.g., Agile, CI/CD)",
                "Contribute ideas to improve products, processes, and engineering practices"
            ]),
            benefits=json.dumps([
                "Paid internship ($26-47/hour based on education/STEM vs non-STEM designation)",
                "11-week program duration",
                "Relocation assistance for those 50+ miles away",
                "Mentorship from experienced engineers",
                "Connect and network with other interns and leaders"
            ]),
            skills=json.dumps(["Java", "Python", "JavaScript", "TypeScript", "Data Structures", "Algorithms", "OOP", "Agile", "CI/CD", "Code Reviews", "Problem Solving"]),
            sponsors_h1b=False,
            sponsors_cpt=False,
            sponsors_opt=False,
            no_sponsorship=True,
            requires_citizenship=False,
            source="T-Mobile Careers",
            application_url="https://tmobile.wd1.myworkdayjobs.com/External/job/Philadelphia-Pennsylvania/Summer-2026-Associate-Software-Engineer-Internship_REQ343873?utm_source=Simplify&ref=Simplify",
            posted_at="2 days ago",
            applicants=0,
            match_percentage=0
        ),
        
        # T-Mobile Product Owner Intern
        Job(
            id="tmobile-product-owner-intern-2026",
            title="Product Owner Intern",
            company="T-Mobile",
            location="Frisco, TX / Bellevue, WA",
            location_type="On-site",
            employment_type="Intern",
            experience_level="Entry Level",
            salary_min=26,
            salary_max=47,
            salary_currency="/hour",
            description="11-week paid learning experience gaining hands-on exposure to AI product development at T-Mobile. Work with experienced product owners and engineers to bring real features from concept to production. Join a team focused on delivering AI-enabled experiences for customers while learning how modern product management operates in a fast-paced environment.",
            qualifications=json.dumps([
                "Curiosity and a passion for learning about AI-driven product development",
                "Strong analytical thinking and the ability to use data to inform decisions",
                "Interest in agile practices, product ownership, and the intersection of technology and customer experience",
                "Comfort collaborating with technical and non-technical partners",
                "Ability to communicate clearly, manage details, and follow through on commitments",
                "Currently pursuing a bachelor's or graduate degree in a technology-related field, or equivalent experience",
                "At least 18 years of age",
                "Legally authorized to work in the United States",
                "High School Diploma or GED",
                "Must be actively enrolled in a degree program or graduated within the last year"
            ]),
            responsibilities=json.dumps([
                "Own features end to end, from discovery and definition through delivery and post-launch validation",
                "Partner with engineers to drive development, triage bugs, and help remove blockers",
                "Support agile ceremonies by ensuring features are in a development-ready state",
                "Contribute to Jira hygiene by helping maintain clear and accurate documentation of stories, dependencies, and progress",
                "Analyze delivery data to identify opportunities to improve team velocity and efficiency",
                "Explore automation opportunities within agile tools and processes to streamline product delivery",
                "Work across teams to align on goals, technical direction, and support experimentation efforts"
            ]),
            benefits=json.dumps([
                "Paid internship ($26-47/hour based on experience/location)",
                "11-week program duration",
                "Relocation reimbursement for those 50+ miles away",
                "Mentorship from experienced product owners",
                "Connect and network with other interns and leaders",
                "Learn product ownership, agile practices, and AI product development"
            ]),
            skills=json.dumps(["Product Ownership", "Agile", "Jira", "Data Analysis", "Feature Definition", "Stakeholder Management", "AI Products", "User Stories", "Team Collaboration"]),
            sponsors_h1b=False,
            sponsors_cpt=False,
            sponsors_opt=False,
            no_sponsorship=True,
            requires_citizenship=False,
            source="T-Mobile Careers",
            application_url="https://tmobile.wd1.myworkdayjobs.com/External/job/Frisco-Texas/Summer-2026-Product-Owner-Internship_REQ343401?utm_source=Simplify&ref=Simplify",
            posted_at="2 days ago",
            applicants=0,
            match_percentage=0
        )
    ]
    
    # Add all jobs to database
    for job in jobs:
        db.add(job)
    
    db.commit()
    
    logger.info("Successfully seeded 3 T-Mobile job postings")
    
    return {
        "message": "Successfully cleared old jobs and seeded 3 new T-Mobile job postings",
        "cleared": existing_count,
        "jobs": [
            {"id": job.id, "title": job.title, "company": job.company}
            for job in jobs
        ]
    }
