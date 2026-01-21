export interface Job {
  id: string;
  title: string;
  company: string;
  logo?: string;
  location: string;
  locationType: 'Remote' | 'On-site' | 'Hybrid';
  employmentType: 'Full time' | 'Part time' | 'Contract';
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
  isLiked?: boolean;
  hasApplied?: boolean;
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
