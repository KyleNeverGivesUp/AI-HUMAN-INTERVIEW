"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# 数据库文件路径
DB_PATH = Path(__file__).resolve().parents[1] / "resumes.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"

# 创建引擎
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite 需要这个参数
    echo=False  # 生产环境设为 False
)

# 创建 Session 工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """
    Dependency for getting database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database tables
    """
    from .models.resume import Base as ResumeBase
    from .models.job import Base as JobBase
    from .models.interview_session import Base as InterviewSessionBase
    
    logger.info(f"Initializing database at {DB_PATH}")
    ResumeBase.metadata.create_all(bind=engine)
    JobBase.metadata.create_all(bind=engine)
    InterviewSessionBase.metadata.create_all(bind=engine)
    logger.info("Database initialized successfully")
