import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapPin, 
  Briefcase, 
  DollarSign, 
  Clock, 
  Users,
  ArrowLeft,
  Heart,
  Share2
} from 'lucide-react';
import { useJobStore } from '@/store/useJobStore';
import { useResumeStore } from '@/store/useResumeStore';
import { JobMatchAnalysis } from '@/components/JobMatchAnalysis';
import { cn } from '@/utils/cn';

export function JobDetail() {
  const navigate = useNavigate();
  const { selectedJob, toggleLike, applyToJob } = useJobStore();
  const { resumes, fetchResumes } = useResumeStore();
  const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>();

  // Fetch resumes on mount
  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // Auto-select first resume if available
  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      setSelectedResumeId(resumes[0].id);
    }
  }, [resumes, selectedResumeId]);

  useEffect(() => {
    if (!selectedJob) {
      navigate('/');
    }
  }, [selectedJob, navigate]);

  if (!selectedJob) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gray-50 pb-12"
    >
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Jobs</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="card"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200">
                    <img
                      src="/tmobile-logo.png"
                      alt={selectedJob.company}
                      className="w-full h-full object-contain p-2"
                    />
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {selectedJob.title}
                    </h1>
                    <p className="text-lg text-gray-600 mb-3">{selectedJob.company}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <MapPin className="w-4 h-4" />
                        <span>{selectedJob.location}</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{selectedJob.postedAt}</span>
                      </div>
                      <span className="text-gray-300">•</span>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{selectedJob.applicants} applicants</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => toggleLike(selectedJob.id)}
                    className={cn(
                      "p-3 rounded-lg transition-colors",
                      selectedJob.isLiked
                        ? "text-red-500 bg-red-50 hover:bg-red-100"
                        : "text-gray-400 hover:text-red-500 hover:bg-red-50"
                    )}
                  >
                    <Heart className={cn("w-6 h-6", selectedJob.isLiked && "fill-current")} />
                  </button>
                  <button className="p-3 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                    <Share2 className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg">
                  <Briefcase className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium">{selectedJob.employmentType}</span>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg">
                  <span className="text-sm font-medium">{selectedJob.locationType}</span>
                </div>
                <div className="flex items-center space-x-2 px-4 py-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-600">
                    ${selectedJob.salary.min}{selectedJob.salary.currency} - ${selectedJob.salary.max}{selectedJob.salary.currency}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-3">Job description</h2>
                <p className="text-gray-600 leading-relaxed">
                  {selectedJob.description}
                </p>
              </div>

              {/* Qualifications */}
              {selectedJob.qualifications && selectedJob.qualifications.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Qualification</h2>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Discover how your skills align with the requirements of this position. Below is a detailed list of the essential skills needed for the role:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedJob.qualifications.map((qual, index) => (
                        <span
                          key={index}
                          className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-primary hover:text-primary transition-colors cursor-default"
                        >
                          {qual}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Required */}
              {selectedJob.responsibilities && selectedJob.responsibilities.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Required</h2>
                  <ul className="space-y-2">
                    {selectedJob.responsibilities.map((resp, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-primary mt-1">•</span>
                        <span className="text-gray-600">{resp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Benefits */}
              {selectedJob.benefits && selectedJob.benefits.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-3">Benefits</h2>
                  <p className="text-sm text-gray-600 mb-3">
                    We believe happy team members create amazing work. Here's what we offer to make that happen:
                  </p>
                  <ul className="space-y-2">
                    {selectedJob.benefits.map((benefit, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-accent mt-1">✓</span>
                        <span className="text-gray-600">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>

            {/* Company Info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="card"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-3">Company</h2>
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-200">
                  <img
                    src="/tmobile-logo.png"
                    alt={selectedJob.company}
                    className="w-full h-full object-contain p-2"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    {selectedJob.company}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Founded in 1876 • Sunnyvale, California, US • 1001-5000 employees
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    KNova has a client that is seeking a UI/UX Developer in Madison, WI. Overview: In brief, a handful of AI-powered tools for our workflow which could use a facelift and improved user experience. It all built instance Extension (JavaScript, currently no web application (python) currently but we'd be open to migrating this to some web based framework if there was good reason), and running in local environment (although some parts are stored in angular/other framework), and finally backend stored basic backend using the Python package "eel".
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="sticky top-24 space-y-6"
            >
              {/* Match Score Analysis */}
              <JobMatchAnalysis job={selectedJob} resumeId={selectedResumeId} />

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={() => {
                    if (selectedJob.applicationUrl) {
                      window.open(selectedJob.applicationUrl, '_blank');
                      applyToJob(selectedJob.id);
                    }
                  }}
                  disabled={selectedJob.hasApplied}
                  className={cn(
                    "w-full px-6 py-3 rounded-lg font-semibold transition-all duration-200",
                    selectedJob.hasApplied
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary-dark shadow-lg hover:shadow-xl"
                  )}
                >
                  {selectedJob.hasApplied ? 'Applied ✓' : 'Apply Now'}
                </button>
                <button 
                  onClick={() => {
                    if (selectedResumeId) {
                      navigate(`/digital-human?jobId=${selectedJob.id}&resumeId=${selectedResumeId}`);
                    } else {
                      alert('Please upload a resume first to start interview with JD matching');
                      navigate('/resume');
                    }
                  }}
                  className="w-full px-6 py-3 rounded-lg font-semibold bg-accent text-white hover:bg-accent-dark transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  🎥 Start Interview
                </button>
              </div>

              {/* Tips */}
              <div className="card bg-gradient-to-br from-purple-50 to-blue-50 border-purple-100">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Relevant Experience 📈
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start space-x-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>You have substantial experience as a UX/UI Designer, Interaction Designer, and User Research Specialist.</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>Your role at Sofar aligns with several user experience design for digital products.</span>
                  </li>
                </ul>
              </div>

              {/* Education */}
              <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  Education ✅
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span>While you hold a Master's degree from Politecnico di Milano in Digital and Interaction Design</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="text-green-600 mt-1">•</span>
                    <span>Your education strictly align with the specified fields of Computer Science</span>
                  </li>
                </ul>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
