"""
Job database model
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime
import json

Base = declarative_base()


class Job(Base):
    """Job posting model"""
    __tablename__ = "jobs"
    
    # Basic info
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    logo = Column(String, nullable=True)
    location = Column(String)
    location_type = Column(String)  # Remote, On-site, Hybrid
    
    # Job type
    employment_type = Column(String)  # Full time, Part time, Contract, Intern
    experience_level = Column(String)  # Entry Level, Mid Level, Senior Level
    
    # Salary
    salary_min = Column(Float, default=0)
    salary_max = Column(Float, default=0)
    salary_currency = Column(String, default='k')
    
    # Job details
    description = Column(Text)
    qualifications = Column(Text)  # JSON string
    responsibilities = Column(Text)  # JSON string
    benefits = Column(Text)  # JSON string
    skills = Column(Text)  # JSON string
    
    # Visa sponsorship
    sponsors_h1b = Column(Boolean, default=False)
    sponsors_cpt = Column(Boolean, default=False)
    sponsors_opt = Column(Boolean, default=False)
    no_sponsorship = Column(Boolean, default=False)
    requires_citizenship = Column(Boolean, default=False)
    
    # Job source
    source = Column(String, default='internal')  # internal, github, simplify
    application_url = Column(String)
    
    # Stats
    posted_at = Column(String)
    applicants = Column(Integer, default=0)
    match_percentage = Column(Float, default=0)
    
    # User interaction
    is_liked = Column(Boolean, default=False)
    has_applied = Column(Boolean, default=False)
    
    # Interview
    default_question = Column(Text, nullable=True)  # Cached default interview question
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary format"""
        return {
            'id': self.id,
            'title': self.title,
            'company': self.company,
            'logo': self.logo,
            'location': self.location,
            'locationType': self.location_type,
            'employmentType': self.employment_type,
            'experienceLevel': self.experience_level,
            'salary': {
                'min': self.salary_min,
                'max': self.salary_max,
                'currency': self.salary_currency
            },
            'description': self.description,
            'qualifications': json.loads(self.qualifications) if self.qualifications else [],
            'responsibilities': json.loads(self.responsibilities) if self.responsibilities else [],
            'benefits': json.loads(self.benefits) if self.benefits else [],
            'skills': json.loads(self.skills) if self.skills else [],
            'sponsorsH1B': self.sponsors_h1b,
            'sponsorsCPT': self.sponsors_cpt,
            'sponsorsOPT': self.sponsors_opt,
            'noSponsorship': self.no_sponsorship,
            'requiresCitizenship': self.requires_citizenship,
            'source': self.source,
            'applicationUrl': self.application_url,
            'postedAt': self.posted_at,
            'applicants': self.applicants,
            'matchPercentage': self.match_percentage,
            'isLiked': self.is_liked,
            'hasApplied': self.has_applied,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
