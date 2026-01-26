import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { useJobStore } from '@/store/useJobStore';
import { TabType } from '@/types';
import { JobCard } from './JobCard';
import { cn } from '@/utils/cn';

const tabs: { id: TabType; label: string; count?: number }[] = [
  { id: 'matched', label: 'Matched' },
  { id: 'liked', label: 'Liked', count: 1 },
  { id: 'applied', label: 'Applied', count: 1 },
];

export function JobList() {
  const { currentTab, setCurrentTab, getFilteredJobs, setSelectedJob } = useJobStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredJobs = getFilteredJobs();
  const displayedJobs = filteredJobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 min-w-0">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            1 hours 🔥{' '}
            <span className="text-primary">JobSeeker</span>
          </h1>
          <button className="btn-primary w-full sm:w-auto">
            🔄 Change Job Reference
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={cn(
                "px-3 py-2 text-sm sm:px-6 sm:py-2.5 sm:text-base rounded-lg font-medium transition-all duration-200 relative text-center",
                currentTab === tab.id
                  ? "bg-white text-gray-900 shadow-md"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    "ml-2 px-2 py-0.5 rounded-full text-xs font-semibold",
                    currentTab === tab.id
                      ? "bg-accent text-white"
                      : "bg-gray-200 text-gray-600"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
          <button className="px-3 py-2 text-sm sm:px-6 sm:py-2.5 sm:text-base rounded-lg font-medium transition-all duration-200 text-center text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            Top matched
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search jobs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          </div>
          <button className="w-full sm:w-auto p-2.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors">
            <SlidersHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Job Count */}
      <div className="text-sm text-gray-600 mb-4">
        {displayedJobs.length} applicants
      </div>

      {/* Jobs Grid */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {displayedJobs.length > 0 ? (
            displayedJobs.map((job, index) => (
              <motion.div
                key={job.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
              >
                <JobCard 
                  job={job} 
                  onClick={() => setSelectedJob(job)}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <p className="text-gray-500">No jobs found</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
