"""
Resume database models
"""
from sqlalchemy import Column, String, Integer, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


class Resume(Base):
    """Resume model for storing resume metadata"""
    __tablename__ = "resumes"
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    file_name = Column(String(255), nullable=False)  # 存储的文件名 (uuid.pdf)
    original_name = Column(String(255), nullable=False)  # 用户上传的原始文件名
    file_path = Column(String(500), nullable=False)  # 文件磁盘路径
    file_size = Column(Integer, nullable=False)  # 文件大小（字节）
    file_type = Column(String(10), nullable=False)  # 文件类型 (pdf/doc/docx)
    status = Column(String(20), default='ready')  # 状态 (ready/processing/error)
    
    # 预留字段：简历解析结果 (JSON 格式)
    parsed_data = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    def to_dict(self):
        """Convert model to dictionary"""
        return {
            "id": self.id,
            "fileName": self.file_name,
            "originalName": self.original_name,
            "filePath": self.file_path,
            "fileSize": self.file_size,
            "fileType": self.file_type,
            "status": self.status,
            "parsedData": self.parsed_data,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
