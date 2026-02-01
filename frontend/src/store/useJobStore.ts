import { create } from 'zustand';
import axios from 'axios';
import { Job, TabType, JobMatchResult } from '@/types';

interface JobStore {
  jobs: Job[];
  currentTab: TabType;
  selectedJob: Job | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setJobs: (jobs: Job[]) => void;
  setCurrentTab: (tab: TabType) => void;
  setSelectedJob: (job: Job | null) => void;
  fetchJobs: () => Promise<void>;
  toggleLike: (jobId: string) => Promise<void>;
  applyToJob: (jobId: string) => Promise<void>;
  unapplyJob: (jobId: string) => Promise<void>;
  matchResumeToJobs: (resumeId: string) => Promise<JobMatchResult[]>;
  getFilteredJobs: () => Job[];
}

// Empty initial jobs - will be loaded from API
const initialJobs: Job[] = [
  {
    id: '1',
    title: 'Web Application Developer',
    company: 'Bankd Business Funding',
    location: 'Austin, Texas Metropolitan Area',
    locationType: 'On-site',
    employmentType: 'Full time',
    experienceLevel: 'Mid Level',
    salary: { min: 650, max: 700, currency: 'k' },
    postedAt: '1 hours ago',
    applicants: 25,
    matchPercentage: 64,
    description: 'Job description Job description Job description Job description Job description Job description Job description Job description Job description Job description Job description Job description',
    qualifications: [
      'Accidental Death and Dismemberment (AD&D)',
      'Amazon Web Services (AWS)',
      'Analytic Skills',
      'DevOps',
      'Apache ActiveMQ',
      'Application Programming Interface (API)',
      'Cat Carrier',
      'Change Control'
    ],
    responsibilities: [
      '3+ years of design experience',
      '3+ years of delivering design solutions as a UX designer or interaction designer experience',
      'Have an available online portfolio',
      'Experience prototyping HTML, HTMLS, JavaScript, CSS, Flash (or Flash Catalyst, or Axure)'
    ],
    benefits: [
      'Remote Flexibility: Work from wherever you\'re most productive and happy.',
      'Equity Options: Become a shareholder through our stock options plan after 6 months.',
      'Meal Vouchers: Enjoy an €Marly lunch voucher for each workday to make your lunch break even better.',
      'Lunch at the Office: If you\'re in Bologna, we have lunch together at the office, and it\'s on us!'
    ],
    isLiked: false,
    hasApplied: false,
  },
  {
    id: '2',
    title: 'Software Engineer, Network Infrastructure',
    company: 'Cursor AI',
    location: 'Sunnyvale, CA',
    locationType: 'On-site',
    employmentType: 'Full time',
    experienceLevel: 'Senior Level',
    salary: { min: 160, max: 238, currency: 'k/yr' },
    postedAt: '2 hours ago',
    applicants: 25,
    matchPercentage: 93,
    description: 'We are seeking a talented Software Engineer to join our Network Infrastructure team.',
    qualifications: [
      '5+ years of experience in network engineering',
      'Strong knowledge of TCP/IP, routing protocols',
      'Experience with cloud infrastructure (AWS, GCP)',
      'Python or Go programming skills'
    ],
    responsibilities: [
      'Design and implement scalable network solutions',
      'Monitor and optimize network performance',
      'Collaborate with cross-functional teams',
      'Troubleshoot complex network issues'
    ],
    benefits: [
      'Comprehensive health coverage',
      'Equity options',
      'Flexible work arrangements',
      'Professional development budget'
    ],
    isLiked: true,
    hasApplied: false,
  },
  {
    id: '3',
    title: 'Full-Stack Software Engineer (Web Developer)',
    company: 'Obvious Foundation',
    location: 'New York, NY',
    locationType: 'On-site',
    employmentType: 'Full time',
    experienceLevel: 'Mid Level',
    salary: { min: 125, max: 150, currency: 'k/yr' },
    postedAt: '5 years ago',
    applicants: 0,
    matchPercentage: 82,
    description: 'Join our team to build innovative web applications that make a difference.',
    qualifications: [
      '3+ years of full-stack development experience',
      'Proficiency in React, Node.js, and PostgreSQL',
      'Strong understanding of RESTful APIs',
      'Experience with cloud deployment (AWS, Heroku)'
    ],
    responsibilities: [
      'Develop and maintain web applications',
      'Write clean, maintainable code',
      'Participate in code reviews',
      'Collaborate with designers and product managers'
    ],
    benefits: [
      'Competitive salary',
      'Health insurance',
      'Unlimited PTO',
      'Learning and development stipend'
    ],
    isLiked: false,
    hasApplied: true,
  },
  {
    id: '4',
    title: 'UX Designer',
    company: 'Google',
    location: 'Ann Arbor, MI',
    locationType: 'Remote',
    employmentType: 'Full time',
    experienceLevel: 'Mid Level',
    salary: { min: 100, max: 130, currency: 'k/yr' },
    postedAt: '2 hours ago',
    applicants: 27,
    matchPercentage: 93,
    description: 'Design the future of user experiences at Google.',
    qualifications: [
      '3+ years of design experience',
      'Strong portfolio demonstrating UX/UI skills',
      'Proficiency in Figma, Sketch, or Adobe XD',
      'Understanding of user-centered design principles'
    ],
    responsibilities: [
      'Create user flows, wireframes, and prototypes',
      'Conduct user research and usability testing',
      'Collaborate with product and engineering teams',
      'Present design concepts to stakeholders'
    ],
    benefits: [
      'World-class benefits',
      'Stock options',
      'Flexible work hours',
      'Amazing campus perks'
    ],
    isLiked: true,
    hasApplied: false,
  },
];

export const useJobStore = create<JobStore>((set, get) => ({
  jobs: initialJobs,
  currentTab: 'matched',
  selectedJob: null,
  isLoading: false,
  error: null,
  
  setJobs: (jobs) => set({ jobs }),
  
  setCurrentTab: (tab) => set({ currentTab: tab }),
  
  setSelectedJob: (job) => set({ selectedJob: job }),
  
  // Fetch jobs from API
  fetchJobs: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.get('/api/jobs');
      set({ jobs: response.data.jobs, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
      set({ error: 'Failed to load jobs', isLoading: false });
    }
  },
  
  // Toggle like status with API call
  toggleLike: async (jobId) => {
    try {
      const response = await axios.post(`/api/jobs/${jobId}/like`);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === jobId ? { ...job, isLiked: response.data.liked } : job
        ),
      }));
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  },
  
  // Apply to job with API call
  applyToJob: async (jobId) => {
    try {
      await axios.post(`/api/jobs/${jobId}/apply`);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === jobId ? { ...job, hasApplied: true } : job
        ),
      }));
    } catch (error) {
      console.error('Failed to apply to job:', error);
    }
  },
  
  // Unapply to job (move back from Applied to Matched)
  unapplyJob: async (jobId) => {
    try {
      await axios.post(`/api/jobs/${jobId}/unapply`);
      set((state) => ({
        jobs: state.jobs.map((job) =>
          job.id === jobId ? { ...job, hasApplied: false } : job
        ),
      }));
    } catch (error) {
      console.error('Failed to unapply job:', error);
    }
  },
  
  // Match resume to jobs using LLM
  matchResumeToJobs: async (resumeId: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`/api/jobs/match/${resumeId}`);
      const matchResults: JobMatchResult[] = response.data.matches;
      
      // Update jobs with match scores
      set((state) => ({
        jobs: state.jobs.map((job) => {
          const match = matchResults.find((m) => m.jobId === job.id);
          return match ? { ...job, matchPercentage: match.matchScore } : job;
        }),
        isLoading: false,
      }));
      
      return matchResults;
    } catch (error) {
      console.error('Failed to match resume to jobs:', error);
      set({ error: 'Failed to analyze job matches', isLoading: false });
      throw error;
    }
  },
  
  getFilteredJobs: () => {
    const { jobs, currentTab } = get();
    
    switch (currentTab) {
      case 'liked':
        return jobs.filter((job) => job.isLiked && !job.hasApplied);
      case 'applied':
        return jobs.filter((job) => job.hasApplied);
      case 'matched':
      default:
        return jobs.filter((job) => !job.hasApplied && !job.isLiked);
    }
  },
}));
