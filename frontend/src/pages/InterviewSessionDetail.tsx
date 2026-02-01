import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import {
  ArrowLeft, Award, TrendingUp, CheckCircle, AlertTriangle,
  Lightbulb, Loader2, MessageSquare, Calendar, Clock, RefreshCw
} from 'lucide-react';
import { CircularProgress } from '@/components/CircularProgress';

interface InterviewSession {
  id: string;
  jobTitle?: string;
  jobCompany?: string;
  startedAt: string;
  durationSeconds: number;
  questionCount: number;
  overallScore: number;
  technicalScore: number;
  communicationScore: number;
  problemSolvingScore: number;
  strengths: string[];
  areasForImprovement: string[];
  detailedFeedback: string;
  recommendations: string[];
  isEvaluated: boolean;
  createdAt: string;
}

export function InterviewSessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  const fetchSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/interviews/${sessionId}`);
      setSession(response.data);
    } catch (err) {
      console.error('Failed to fetch session:', err);
      setError('Failed to load interview session');
    } finally {
      setIsLoading(false);
    }
  };

  const evaluateSession = async () => {
    setIsEvaluating(true);
    setError(null);

    try {
      await axios.post(`/api/interviews/${sessionId}/evaluate`);
      await fetchSession(); // Refresh data
    } catch (err) {
      console.error('Failed to evaluate session:', err);
      setError('Failed to evaluate interview');
    } finally {
      setIsEvaluating(false);
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
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error || 'Session not found'}</div>
          <button
            onClick={() => navigate('/interview-evaluate')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Back to List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/interview-evaluate')}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Evaluations</span>
        </button>

        {/* Header Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
        >
          {session.jobTitle && session.jobCompany ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {session.jobTitle}
              </h1>
              <p className="text-lg text-gray-600 mb-4">{session.jobCompany}</p>
            </>
          ) : (
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              General Interview
            </h1>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
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
        </motion.div>

        {/* Not Evaluated State */}
        {!session.isEvaluated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6 text-center"
          >
            <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Interview Not Yet Evaluated
            </h3>
            <p className="text-gray-600 mb-6">
              Click below to generate AI-powered feedback and scores
            </p>
            <button
              onClick={evaluateSession}
              disabled={isEvaluating}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center space-x-2"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Award className="w-5 h-5" />
                  <span>Evaluate Interview</span>
                </>
              )}
            </button>
          </motion.div>
        )}

        {/* Evaluation Results */}
        {session.isEvaluated && (
          <>
            {/* Score Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">Performance Overview</h2>
                <button
                  onClick={evaluateSession}
                  disabled={isEvaluating}
                  className="flex items-center space-x-1 text-sm text-purple-600 hover:text-purple-700"
                >
                  <RefreshCw className={`w-4 h-4 ${isEvaluating ? 'animate-spin' : ''}`} />
                  <span>Re-evaluate</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Overall Score */}
                <div className="text-center">
                  <CircularProgress percentage={session.overallScore} size={120} />
                  <p className="mt-3 text-sm font-medium text-gray-900">Overall Score</p>
                </div>

                {/* Dimension Scores */}
                <div className="text-center">
                  <CircularProgress percentage={session.technicalScore} size={100} />
                  <p className="mt-3 text-sm font-medium text-gray-900">Technical Knowledge</p>
                </div>

                <div className="text-center">
                  <CircularProgress percentage={session.communicationScore} size={100} />
                  <p className="mt-3 text-sm font-medium text-gray-900">Communication Skills</p>
                </div>

                <div className="text-center">
                  <CircularProgress percentage={session.problemSolvingScore} size={100} />
                  <p className="mt-3 text-sm font-medium text-gray-900">Problem Solving</p>
                </div>
              </div>
            </motion.div>

            {/* Detailed Feedback */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
            >
              <h2 className="text-xl font-bold text-gray-900 mb-4">Detailed Feedback</h2>
              <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                {session.detailedFeedback}
              </p>
            </motion.div>

            {/* Strengths */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-bold text-gray-900">Strengths</h2>
              </div>
              <ul className="space-y-3">
                {session.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{strength}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Areas for Improvement */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
                <h2 className="text-xl font-bold text-gray-900">Areas for Improvement</h2>
              </div>
              <ul className="space-y-3">
                {session.areasForImprovement.map((area, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{area}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-center space-x-2 mb-4">
                <Lightbulb className="w-6 h-6 text-purple-600" />
                <h2 className="text-xl font-bold text-gray-900">Recommendations</h2>
              </div>
              <ul className="space-y-3">
                {session.recommendations.map((recommendation, index) => (
                  <li key={index} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-gray-700">{recommendation}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
