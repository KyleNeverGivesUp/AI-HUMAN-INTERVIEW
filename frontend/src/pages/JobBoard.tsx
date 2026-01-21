import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { JobList } from '@/components/JobList';
import { MockInterviewPromo } from '@/components/MockInterviewPromo';
import { motion } from 'framer-motion';

export function JobBoard() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
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
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Job List Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 p-4 lg:p-6 overflow-auto"
        >
          <div className="max-w-5xl mx-auto">
            <JobList />
          </div>
        </motion.div>

        {/* Mock Interview Promo Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="hidden xl:block w-96 p-6 bg-gray-50 border-l border-gray-200 overflow-auto"
        >
          <MockInterviewPromo />
        </motion.div>
      </div>
    </div>
  );
}
