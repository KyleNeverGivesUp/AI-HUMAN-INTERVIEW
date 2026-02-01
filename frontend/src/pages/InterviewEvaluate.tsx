import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  MessageSquare, Calendar, Clock, TrendingUp, 
  ChevronRight, Award, Menu, Loader2 
} from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';

interface InterviewSession {
  id: string;
  roomName: string;
  participantName: string;
  jobId?: string;
  jobTitle?: string;
  jobCompany?: string;
  startedAt: string;
  durationSeconds: number;
  questionCount: number;
  overallScore: number;
  isEvaluated: boolean;
  createdAt: string;
}

export function InterviewEvaluate() {
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [scoringSessions, setScoringSessions] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (scoringSessions.size === 0) return;

    const interval = window.setInterval(() => {
      fetchSessions({ silent: true });
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [scoringSessions.size]);

  useEffect(() => {
    if (scoringSessions.size === 0) return;
    const scoredIds = new Set(
      sessions.filter((session) => session.isEvaluated).map((session) => session.id)
    );
    if (scoredIds.size === 0) return;
    setScoringSessions((prev) => {
      const next = new Set(prev);
      scoredIds.forEach((id) => next.delete(id));
      return next;
    });
  }, [sessions]);

  const fetchSessions = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true);
    }
    setError(null);
    
    try {
      const response = await axios.get('/api/interviews/');
      setSessions(response.data.sessions);
    } catch (err) {
      console.error('Failed to fetch interview sessions:', err);
      setError('Failed to load interview sessions');
    } finally {
      if (!options?.silent) {
        setIsLoading(false);
      }
    }
  };

  const requestEvaluation = async (sessionId: string) => {
    setActionError(null);
    setScoringSessions((prev) => new Set(prev).add(sessionId));
    try {
      await axios.post(`/api/interviews/${sessionId}/evaluate`);
    } catch (err) {
      console.error('Failed to request evaluation:', err);
      setActionError('Failed to request evaluation');
      setScoringSessions((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 75) return 'bg-green-100';
    if (score >= 50) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

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
            <h1 className="text-lg font-bold">Interview Evaluation</h1>
            <div className="w-10" />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-6xl mx-auto"
          >
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2 hidden lg:block">
                Interview Evaluations
              </h1>
              <p className="text-gray-600">
                Review your past interview performance and feedback
              </p>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
                {error}
              </div>
            )}
            {actionError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 mb-4">
                {actionError}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && sessions.length === 0 && (
              <div className="text-center py-12">
                <MessageSquare className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No interview sessions yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Complete an interview to see your evaluation here
                </p>
                <button
                  onClick={() => navigate('/digital-human')}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Start Interview
                </button>
              </div>
            )}

            {/* Sessions List */}
            {!isLoading && !error && sessions.length > 0 && (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/interview-evaluate/${session.id}`)}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer border border-gray-200 p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Job Info */}
                        {session.jobTitle && session.jobCompany ? (
                          <div className="mb-3">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {session.jobTitle}
                            </h3>
                            <p className="text-sm text-gray-600">{session.jobCompany}</p>
                          </div>
                        ) : (
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            General Interview
                          </h3>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(session.createdAt)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{formatDuration(session.durationSeconds)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageSquare className="w-4 h-4" />
                            <span>{session.questionCount} questions</span>
                          </div>
                        </div>

                        {/* Score Badge */}
                        {session.isEvaluated ? (
                          <div className="flex items-center space-x-2">
                            <Award className="w-5 h-5 text-purple-600" />
                            <span className="text-sm text-gray-600">Overall Score:</span>
                            <span
                              className={`text-2xl font-bold ${getScoreColor(
                                session.overallScore
                              )}`}
                            >
                              {session.overallScore}
                            </span>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await axios.delete(`/api/interviews/${session.id}`);
                                  setSessions((prev) => prev.filter((item) => item.id !== session.id));
                                } catch (err) {
                                  console.error('Failed to delete interview session:', err);
                                  setActionError('Failed to delete interview session');
                                }
                              }}
                              className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm hover:bg-red-100 transition-colors"
                            >
                              Delete Evaluation
                            </button>
                          </div>
                        ) : scoringSessions.has(session.id) ? (
                          <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-sm">
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                            Scoring...
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestEvaluation(session.id);
                              }}
                              className="inline-flex items-center px-3 py-1 rounded-full bg-purple-600 text-white text-sm hover:bg-purple-700 transition-colors"
                            >
                              Request Evaluation
                            </button>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await axios.delete(`/api/interviews/${session.id}`);
                                  setSessions((prev) => prev.filter((item) => item.id !== session.id));
                                } catch (err) {
                                  console.error('Failed to delete interview session:', err);
                                  setActionError('Failed to delete interview session');
                                }
                              }}
                              className="inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm hover:bg-red-100 transition-colors"
                            >
                              Delete Evaluation
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Score Circle & Arrow */}
                      <div className="flex items-center space-x-4 ml-4">
                        {session.isEvaluated ? (
                          <div
                            className={`w-16 h-16 rounded-full ${getScoreBgColor(
                              session.overallScore
                            )} flex items-center justify-center`}
                          >
                            <span
                              className={`text-xl font-bold ${getScoreColor(
                                session.overallScore
                              )}`}
                            >
                              {session.overallScore}
                            </span>
                          </div>
                        ) : scoringSessions.has(session.id) ? (
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-gray-500 text-center leading-tight">
                              Scoring...
                            </span>
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <span className="text-[10px] font-semibold text-gray-400 text-center leading-tight">
                              --
                            </span>
                          </div>
                        )}
                        <ChevronRight className="w-6 h-6 text-gray-400" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
