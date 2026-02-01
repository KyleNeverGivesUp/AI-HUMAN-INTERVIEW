"""
Re-parse existing resumes to extract text content
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from pypdf import PdfReader
from src.database import get_db
from src.models.resume import Resume
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def reparse_resumes():
    """Re-parse all resumes without parsed_data"""
    db = next(get_db())
    
    resumes = db.query(Resume).filter(
        (Resume.parsed_data == None) | (Resume.parsed_data == '')
    ).all()
    
    logger.info(f"Found {len(resumes)} resumes to reparse")
    
    for resume in resumes:
        try:
            file_path = Path(resume.file_path)
            
            if not file_path.exists():
                logger.warning(f"File not found: {file_path}")
                continue
            
            if resume.file_type == 'pdf':
                reader = PdfReader(file_path)
                parsed_text = "\n".join([
                    page.extract_text() 
                    for page in reader.pages 
                    if page.extract_text()
                ])
                
                resume.parsed_data = parsed_text
                db.commit()
                
                logger.info(f"✅ Parsed {resume.original_name}: {len(parsed_text)} chars")
            else:
                logger.warning(f"Unsupported file type: {resume.file_type}")
                
        except Exception as e:
            logger.error(f"Failed to parse {resume.original_name}: {e}")
    
    logger.info("Reparsing complete!")


if __name__ == "__main__":
    reparse_resumes()
