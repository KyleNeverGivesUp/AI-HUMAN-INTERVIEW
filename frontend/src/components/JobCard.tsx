import { motion } from 'framer-motion';
import { MapPin, Clock, Users, Heart, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Job } from '@/types';
import { CircularProgress } from './CircularProgress';
import { useJobStore } from '@/store/useJobStore';
import { cn } from '@/utils/cn';

interface JobCardProps {
  job: Job;
  onClick?: () => void;
}

export function JobCard({ job, onClick }: JobCardProps) {
  const navigate = useNavigate();
  const { currentTab, toggleLike, applyToJob, unapplyJob, setSelectedJob } = useJobStore();

  const handleCardClick = () => {
    setSelectedJob(job);
    navigate(`/job/${job.id}`);
    if (onClick) onClick();
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    applyToJob(job.id);
  };

  const handleUnapply = (e: React.MouseEvent) => {
    e.stopPropagation();
    unapplyJob(job.id);
  };

  const handleMockInterview = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/digital-human');
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleLike(job.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, shadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
      className="card cursor-pointer group"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start space-x-4 flex-1">
          {/* Company Logo */}
          <div className="flex-shrink-0 w-16 h-16 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
            <img 
              src="/tmobile-logo.png" 
              alt={job.company}
              className="w-full h-full object-contain p-2"
            />
          </div>

          {/* Job Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
              {job.title}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
              <span className="font-medium">{job.company}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{job.location}</span>
              </div>
              <span className="text-gray-300">•</span>
              <span>{job.locationType}</span>
            </div>
          </div>
        </div>

        {/* Right side: Actions + Match Circle */}
        <div className="flex items-start space-x-4">
          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleToggleLike}
              className={cn(
                "p-2 rounded-lg transition-colors",
                job.isLiked
                  ? "text-red-500 bg-red-50 hover:bg-red-100"
                  : "text-gray-400 hover:text-red-500 hover:bg-red-50"
              )}
            >
              <Heart className={cn("w-5 h-5", job.isLiked && "fill-current")} />
            </button>
            <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <Edit className="w-5 h-5" />
            </button>
          </div>

          {/* Match Percentage Circle */}
          <div className="flex-shrink-0">
            <CircularProgress percentage={job.matchPercentage} size={80} />
          </div>
        </div>
      </div>

      {/* Job Details */}
      <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
        <span className="font-medium">{job.employmentType}</span>
        <span className="text-gray-300">•</span>
        <span>{job.experienceLevel}</span>
        <span className="text-gray-300">•</span>
        <span className="font-semibold text-gray-900">
          ${job.salary.min}{job.salary.currency} - ${job.salary.max}{job.salary.currency}
        </span>
      </div>

      {/* Meta Info */}
      <div className="flex items-center justify-between text-sm text-gray-500 mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-1">
          <Clock className="w-4 h-4" />
          <span>{job.postedAt}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>{job.applicants} applicants</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        {currentTab === 'applied' ? (
          // Show "Move to Matched" button in Applied tab
          <button
            onClick={handleUnapply}
            className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-all duration-200"
          >
            ← Move to Matched
          </button>
        ) : (
          // Show regular Apply button in other tabs
          <button
            onClick={handleApply}
            disabled={job.hasApplied}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200",
              job.hasApplied
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            {job.hasApplied ? 'Applied' : 'Apply'}
          </button>
        )}
        <button
          onClick={handleMockInterview}
          className="flex-1 px-4 py-2.5 rounded-lg font-semibold bg-accent text-white hover:bg-accent-dark transition-all duration-200 shadow-lg shadow-accent/20"
        >
          Mock Interview
        </button>
      </div>
    </motion.div>
  );
}
