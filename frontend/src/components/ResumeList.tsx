import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { ResumeCard } from './ResumeCard';
import { useResumeStore } from '../store/useResumeStore';

export function ResumeList() {
  const { resumes, isLoading, error, fetchResumes, clearError } = useResumeStore();
  
  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-800 mb-4">{error}</p>
        <button
          onClick={() => {
            clearError();
            fetchResumes();
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (resumes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gray-50 rounded-xl p-12 text-center"
      >
        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
          <FileText className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No resumes yet
        </h3>
        <p className="text-gray-600 text-sm">
          Upload your first resume to get started
        </p>
      </motion.div>
    );
  }
  
  return (
    <div>
      {/* 头部统计 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">My Resumes</h2>
          <p className="text-sm text-gray-600 mt-1">
            Total {resumes.length} resumes
          </p>
        </div>
      </div>
      
      {/* 简历网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {resumes.map((resume) => (
          <ResumeCard key={resume.id} resume={resume} />
        ))}
      </div>
    </div>
  );
}
