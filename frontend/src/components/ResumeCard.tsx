import { FileText, Download, Trash2, FileType, Calendar, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import type { Resume } from '../types';
import { useResumeStore } from '../store/useResumeStore';
import { useJobStore } from '../store/useJobStore';

interface ResumeCardProps {
  resume: Resume;
}

export function ResumeCard({ resume }: ResumeCardProps) {
  const { deleteResume, downloadResume } = useResumeStore();
  const { matchResumeToJobs } = useJobStore();
  const navigate = useNavigate();
  const [isMatching, setIsMatching] = useState(false);
  
  const handleDownload = async () => {
    try {
      await downloadResume(resume.id, resume.originalName);
    } catch (error) {
      // Error already handled in store
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm(`确定要删除 "${resume.originalName}" 吗？`)) {
      try {
        await deleteResume(resume.id);
      } catch (error) {
        // Error already handled in store
      }
    }
  };
  
  const handleMatch = async () => {
    if (!resume.parsedData) {
      alert('❌ 简历数据不完整，无法匹配');
      return;
    }
    
    setIsMatching(true);
    try {
      const results = await matchResumeToJobs(resume.id);
      alert(`✅ 成功匹配 ${results.length} 个职位！正在跳转到职位列表...`);
      setTimeout(() => navigate('/jobs'), 1000);
    } catch (error) {
      alert('❌ 匹配失败，请确保后端服务正在运行');
    } finally {
      setIsMatching(false);
    }
  };
  
  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // 格式化日期
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // 文件类型图标颜色
  const getFileTypeColor = (type: string): string => {
    switch (type) {
      case 'pdf':
        return 'text-red-600 bg-red-100';
      case 'doc':
      case 'docx':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
    >
      {/* 文件图标 */}
      <div className="flex items-start space-x-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${getFileTypeColor(resume.fileType)}`}>
          <FileText className="w-6 h-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* 文件名 */}
          <h3 className="text-base font-semibold text-gray-900 truncate mb-1">
            {resume.originalName}
          </h3>
          
          {/* 文件信息 */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <FileType className="w-4 h-4" />
              <span>{resume.fileType.toUpperCase()}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>{formatFileSize(resume.fileSize)}</span>
            </div>
            
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(resume.createdAt)}</span>
            </div>
          </div>
          
          {/* 状态标签 */}
          <div className="mt-3">
            {resume.status === 'ready' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ 就绪
              </span>
            )}
            {resume.status === 'processing' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                ⌛ 处理中
              </span>
            )}
            {resume.status === 'error' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                ✗ 错误
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between space-x-2">
        {/* 匹配职位按钮 */}
        <button
          onClick={handleMatch}
          disabled={isMatching || resume.status !== 'ready'}
          className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
        >
          {isMatching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              匹配中...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1.5" />
              匹配职位
            </>
          )}
        </button>
        
        {/* 其他按钮 */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4 mr-1.5" />
            下载
          </button>
          
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            删除
          </button>
        </div>
      </div>
    </motion.div>
  );
}
