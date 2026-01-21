import { create } from 'zustand';
import { Job, TabType } from '@/types';

interface JobStore {
  jobs: Job[];
  currentTab: TabType;
  selectedJob: Job | null;
  setJobs: (jobs: Job[]) => void;
  setCurrentTab: (tab: TabType) => void;
  setSelectedJob: (job: Job | null) => void;
  toggleLike: (jobId: string) => void;
  applyToJob: (jobId: string) => void;
  getFilteredJobs: () => Job[];
}

// Mock data
const mockJobs: Job[] = [
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
  jobs: mockJobs,
  currentTab: 'matched',
  selectedJob: null,
  
  setJobs: (jobs) => set({ jobs }),
  
  setCurrentTab: (tab) => set({ currentTab: tab }),
  
  setSelectedJob: (job) => set({ selectedJob: job }),
  
  toggleLike: (jobId) => set((state) => ({
    jobs: state.jobs.map((job) =>
      job.id === jobId ? { ...job, isLiked: !job.isLiked } : job
    ),
  })),
  
  applyToJob: (jobId) => set((state) => ({
    jobs: state.jobs.map((job) =>
      job.id === jobId ? { ...job, hasApplied: true } : job
    ),
  })),
  
  getFilteredJobs: () => {
    const { jobs, currentTab } = get();
    
    switch (currentTab) {
      case 'liked':
        return jobs.filter((job) => job.isLiked);
      case 'applied':
        return jobs.filter((job) => job.hasApplied);
      case 'matched':
      default:
        return jobs.filter((job) => !job.hasApplied);
    }
  },
}));
