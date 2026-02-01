import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { ResumeUpload } from '../components/ResumeUpload';
import { ResumeList } from '../components/ResumeList';
import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';

export function ResumeManager() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);
  
  return (
    <div className="min-h-[100dvh] bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content */}
      <div className="flex flex-col lg:pl-64">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">JN</span>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                JobSeeker
              </span>
            </div>
            <div className="w-10" />
          </div>
        </div>
        
        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center space-x-3 mb-2">
                <FileText className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-gray-900">Resume Manager</h1>
              </div>
              <p className="text-gray-600">
                Upload and manage your resume files
              </p>
            </motion.div>
            
            {/* Upload */}
            <div className="mb-8">
              <ResumeUpload />
            </div>
            
            {/* Resume List */}
            <ResumeList />
          </div>
        </div>
      </div>
    </div>
  );
}
