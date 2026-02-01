import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Sparkles, Loader2, Zap, Brain } from 'lucide-react';
import { CircularProgress } from './CircularProgress';
import { useJobStore } from '@/store/useJobStore';
import type { Job } from '@/types';

interface JobMatchAnalysisProps {
  job: Job;
  resumeId?: string;
}

interface MatchAnalysis {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  cached?: boolean;
  model?: string;
}

type ModelType = 'sonnet4';

export function JobMatchAnalysis({ job, resumeId }: JobMatchAnalysisProps) {
  const [analysis, setAnalysis] = useState<MatchAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelType>('sonnet4');
  const { jobs, setJobs } = useJobStore();

  // Auto-load analysis if job already has matchPercentage > 0
  useEffect(() => {
    if (resumeId && job.matchPercentage > 0 && !analysis && !isLoading) {
      loadAnalysis();
    }
  }, [resumeId, job.matchPercentage]);

  const loadAnalysis = async (model?: ModelType) => {
    if (!resumeId) {
      setError('No resume selected');
      return;
    }

    setIsLoading(true);
    setError(null);

    const modelToUse = model || selectedModel;
    const startTime = Date.now();

    try {
      const response = await axios.get(
        `/api/jobs/${job.id}/match-analysis/${resumeId}`,
        { params: { model: modelToUse } }
      );
      
      const elapsedTime = Date.now() - startTime;
      const isCached = response.data.analysis.cached;
      
      // If cached and too fast, wait 1 second for better UX
      if (isCached && elapsedTime < 1000) {
        await new Promise(resolve => setTimeout(resolve, 1000 - elapsedTime));
      }
      
      const analysisData = response.data.analysis;
      setAnalysis(analysisData);
      setSelectedModel(modelToUse);
      
      // Update job matchPercentage in store for persistence across pages
      const matchScore = analysisData.matchScore;
      const updatedJobs = jobs.map(j => 
        j.id === job.id ? { ...j, matchPercentage: matchScore } : j
      );
      setJobs(updatedJobs);
    } catch (err) {
      console.error('Failed to load match analysis:', err);
      setError('Failed to load analysis');
    } finally {
      setIsLoading(false);
    }
  };

  if (!resumeId) {
    return (
      <div className="card text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Why is this job a good fit for me?
        </h3>
        <div className="text-gray-500 text-sm">
          <p className="mb-4">Upload a resume to see match analysis</p>
          <button
            onClick={() => window.location.href = '/resume'}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Upload Resume
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="card text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Why is this job a good fit for me?
        </h3>
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
          <p className="text-sm text-gray-600">Analyzing with AI...</p>
        </div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="card text-center">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Why is this job a good fit for me?
        </h3>
        <div className="text-red-500 text-sm mb-4">{error}</div>
        <button
          onClick={loadAnalysis}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          Why is this job a good fit for me?
        </h3>
        {analysis && analysis.cached && (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
            ⚡ Cached
          </span>
        )}
      </div>

      {!analysis ? (
        <div className="text-center py-8">
          <Sparkles className="w-12 h-12 text-purple-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-4">
            Get AI-powered match analysis
          </p>
          
          <p className="text-sm text-gray-600 mb-4">
            Using <strong>Claude Sonnet 4</strong>
            <br />
            <span className="text-xs text-gray-500">First analysis: &lt; 1 min • Cached: ⚡ &lt;50ms</span>
          </p>

          <button
            onClick={() => loadAnalysis()}
            disabled={isLoading}
            className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 font-semibold shadow-md disabled:opacity-50"
          >
            Analyze Match
          </button>
        </div>
      ) : (
        <>
          {/* Match Score */}
          <div className="flex justify-center mb-6">
            <CircularProgress percentage={analysis.matchScore} size={120} />
          </div>

          {/* Matched Skills */}
          {analysis.matchedSkills.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">✅ Matched Skills</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.matchedSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-md border border-green-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Missing Skills */}
          {analysis.missingSkills.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">⚠️ Missing Skills</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.missingSkills.map((skill, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-red-50 text-red-700 text-xs rounded-md border border-red-200"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Strengths */}
          {analysis.strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">💪 Strengths</h4>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start space-x-2 text-xs text-gray-600">
                    <span className="text-green-600 mt-0.5">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps */}
          {analysis.gaps.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">🎯 Areas to Improve</h4>
              <ul className="space-y-2">
                {analysis.gaps.map((gap, index) => (
                  <li key={index} className="flex items-start space-x-2 text-xs text-gray-600">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>{gap}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">💡 Recommendations</h4>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2 text-xs text-gray-600">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Model Info & Re-analyze */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">
                Model: {analysis.model || 'unknown'}
                {analysis.cached && ' • ⚡ Cached'}
              </span>
              <div className="flex gap-2">
                {selectedModel !== analysis.model && (
                  <button
                    onClick={() => loadAnalysis(selectedModel)}
                    disabled={isLoading}
                    className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
                  >
                    Try {selectedModel}
                  </button>
                )}
              </div>
            </div>
            
            
            <button
              onClick={() => loadAnalysis()}
              disabled={isLoading}
              className="w-full mt-2 px-4 py-2 text-sm text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50"
            >
              🔄 Re-analyze
            </button>
          </div>
        </>
      )}
    </div>
  );
}
