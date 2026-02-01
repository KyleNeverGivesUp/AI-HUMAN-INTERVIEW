"""
Resume API routes
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pathlib import Path
import uuid
import shutil
import logging
from pypdf import PdfReader

from ..database import get_db
from ..models.resume import Resume
from ..models.schemas import ResumeResponse, ResumeListResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/resumes", tags=["resumes"])

# 文件上传配置
UPLOAD_DIR = Path(__file__).resolve().parents[2] / "storage" / "resumes"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# 允许的文件类型
ALLOWED_TYPES = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx"
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


@router.post("/upload", response_model=ResumeResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a resume file (PDF or Word)
    """
    try:
        # 1. Validate file type
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Only PDF and Word files are supported (.pdf, .doc, .docx)"
            )
        
        # 2. Validate file size
        file.file.seek(0, 2)  # 移动到文件末尾
        file_size = file.file.tell()  # 获取文件大小
        file.file.seek(0)  # 回到开头
        
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File size must be <= {MAX_FILE_SIZE / (1024 * 1024)}MB"
            )
        
        # 3. 生成唯一文件名
        file_id = str(uuid.uuid4())
        file_ext = ALLOWED_TYPES[file.content_type]
        file_name = f"{file_id}{file_ext}"
        file_path = UPLOAD_DIR / file_name
        
        # 4. Save file to disk
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"File saved: {file_path}")
        except Exception as e:
            logger.error(f"Failed to save file: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")
        
        # 5. Parse file content
        parsed_text = ""
        try:
            if file_ext == ".pdf":
                reader = PdfReader(file_path)
                parsed_text = "\n".join([page.extract_text() for page in reader.pages if page.extract_text()])
                logger.info(f"Extracted {len(parsed_text)} characters from PDF")
            # TODO: Add Word document parsing with python-docx if needed
        except Exception as e:
            logger.warning(f"Failed to parse file content: {e}")
            # Continue without parsed_data - user can still upload
        
        # 6. Save metadata to database
        resume = Resume(
            id=file_id,
            file_name=file_name,
            original_name=file.filename,
            file_path=str(file_path),
            file_size=file_size,
            file_type=file_ext[1:],  # 去掉点号
            status="ready",
            parsed_data=parsed_text if parsed_text else None
        )
        
        db.add(resume)
        db.commit()
        db.refresh(resume)
        
        logger.info(f"Resume uploaded successfully: {file_id}")
        
        # 6. Return result
        return ResumeResponse(**resume.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("", response_model=ResumeListResponse)
async def list_resumes(
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db)
):
    """
    Get list of resumes with pagination
    """
    try:
        # Compute offset
        offset = (page - 1) * limit
        
        # Total count
        total = db.query(Resume).count()
        
        # Query data (latest first)
        resumes = (
            db.query(Resume)
            .order_by(Resume.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        
        # Convert to response format
        items = [ResumeResponse(**resume.to_dict()) for resume in resumes]
        
        return ResumeListResponse(total=total, items=items)
        
    except Exception as e:
        logger.error(f"Failed to list resumes: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch list: {str(e)}")


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: str,
    db: Session = Depends(get_db)
):
    """
    Get a single resume by ID
    """
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    return ResumeResponse(**resume.to_dict())


@router.get("/{resume_id}/download")
async def download_resume(
    resume_id: str,
    db: Session = Depends(get_db)
):
    """
    Download a resume file
    """
    # 从数据库获取简历信息
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    file_path = Path(resume.file_path)
    
    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        raise HTTPException(status_code=404, detail="File not found")
    
    # 返回文件
    return FileResponse(
        path=file_path,
        filename=resume.original_name,
        media_type='application/octet-stream'
    )


@router.delete("/{resume_id}")
async def delete_resume(
    resume_id: str,
    db: Session = Depends(get_db)
):
    """
    Delete a resume
    """
    # 查询简历
    resume = db.query(Resume).filter(Resume.id == resume_id).first()
    
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    
    # 删除文件
    file_path = Path(resume.file_path)
    try:
        if file_path.exists():
            file_path.unlink()
            logger.info(f"File deleted: {file_path}")
    except Exception as e:
        logger.warning(f"Failed to delete file: {e}")
    
    # 删除数据库记录
    db.delete(resume)
    db.commit()
    
    logger.info(f"Resume deleted: {resume_id}")
    
    return {"status": "success", "message": "Resume deleted"}
