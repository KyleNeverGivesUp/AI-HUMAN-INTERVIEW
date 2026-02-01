import { FileText, Download, Trash2, FileType, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Resume } from '../types';
import { useResumeStore } from '../store/useResumeStore';

interface ResumeCardProps {
  resume: Resume;
}

export function ResumeCard({ resume }: ResumeCardProps) {
  const { deleteResume, downloadResume } = useResumeStore();
  const handleDownload = async () => {
    try {
      await downloadResume(resume.id, resume.originalName);
    } catch (error) {
      // Error already handled in store
    }
  };
  
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${resume.originalName}"?`)) {
      try {
        await deleteResume(resume.id);
      } catch (error) {
        // Error already handled in store
      }
    }
  };
  
  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  // Format date
  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // File type icon colors
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
                ✓ Ready
              </span>
            )}
            {resume.status === 'processing' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                ⌛ Processing
              </span>
            )}
            {resume.status === 'error' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                ✗ Error
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* 操作按钮 */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end space-x-2">
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Download
          </button>
          
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <Trash2 className="w-4 h-4 mr-1.5" />
            Delete
          </button>
      </div>
    </motion.div>
  );
}
