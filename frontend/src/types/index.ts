export interface Job {
  id: string;
  title: string;
  company: string;
  logo?: string;
  location: string;
  locationType: 'Remote' | 'On-site' | 'Hybrid';
  employmentType: 'Full time' | 'Part time' | 'Contract' | 'Intern';
  experienceLevel: 'Entry Level' | 'Mid Level' | 'Senior Level';
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  postedAt: string;
  applicants: number;
  matchPercentage: number;
  description?: string;
  qualifications?: string[];
  responsibilities?: string[];
  benefits?: string[];
  skills?: string[];
  
  // Visa sponsorship
  sponsorsH1B?: boolean;
  sponsorsCPT?: boolean;
  sponsorsOPT?: boolean;
  noSponsorship?: boolean;
  requiresCitizenship?: boolean;
  
  // Job source
  source?: 'internal' | 'github' | 'simplify';
  applicationUrl?: string;
  
  // User interaction
  isLiked?: boolean;
  hasApplied?: boolean;
  
  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

// Job match analysis from LLM
export interface JobMatchAnalysis {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendations: string[];
}

// Job match result
export interface JobMatchResult {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  gaps: string[];
  recommendations: string[];
}

export type TabType = 'matched' | 'liked' | 'applied';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface MockInterviewSession {
  id: string;
  jobId: string;
  createdAt: string;
  status: 'pending' | 'in_progress' | 'completed';
}

// Resume types
export interface Resume {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  fileType: 'pdf' | 'doc' | 'docx';
  status: 'ready' | 'processing' | 'error';
  parsedData?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface ResumeListResponse {
  total: number;
  items: Resume[];
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'done' | 'error';
  error?: string;
}
