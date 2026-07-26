export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  location?: string;
  targetTitles: string[];
  targetSeniority: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  targetLocations: string[];
  minSalary?: number;
  keywordsInclude: string[];
  keywordsExclude: string[];
  autoSubmitAnswers: boolean;
  matchThreshold: number; // 0 - 100
  dryRunMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkExperience {
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate: string;
  description: string[];
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  graduationYear?: string;
}

export interface ParsedCV {
  summary: string;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  certifications?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
  };
}

export interface MasterCV {
  id: string;
  userId: string;
  originalFilename: string;
  filePath: string;
  rawText: string;
  parsedData: ParsedCV;
  updatedAt: string;
}

export type JobSource = 'LinkedIn' | 'Indeed' | 'Bayt' | 'Naukrigulf' | 'Mock';
export type ApplicationMethod = 'easy_apply' | 'external_form' | 'direct_link';

export interface JobListing {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  source: JobSource;
  applicationMethod: ApplicationMethod;
  dedupHash: string;
  postedAt: string;
  createdAt: string;
}

export type MatchStatus = 'matched' | 'skipped' | 'rejected';

export interface JobMatch {
  id: string;
  jobId: string;
  userId: string;
  matchScore: number; // 0 - 100
  reasoning: string;
  pros: string[];
  flags: string[];
  status: MatchStatus;
  createdAt: string;
  job?: JobListing;
}

export interface TailoredCV {
  id: string;
  matchId: string;
  pdfPath: string;
  pdfUrl: string;
  summaryDiff: string;
  tailoredSummary: string;
  tailoredSkills: string[];
  createdAt: string;
}

export type ApplicationStatus = 'applied' | 'needs_manual_review' | 'skipped' | 'failed';

export interface CustomAnswer {
  question: string;
  answer: string;
  requiresReview: boolean;
  reviewed: boolean;
}

export interface ApplicationLog {
  id: string;
  userId: string;
  matchId: string;
  status: ApplicationStatus;
  answers: CustomAnswer[];
  notes?: string;
  errorMessage?: string;
  appliedAt: string;
  job?: JobListing;
  match?: JobMatch;
  tailoredCv?: TailoredCV;
}

export interface ScheduleConfig {
  id: string;
  timezone: string; // Default: "Asia/Dubai"
  windowStart: string; // Default: "05:00"
  windowEnd: string; // Default: "08:00"
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
}

export type PipelineStage = 'idle' | 'aggregating' | 'matching' | 'tailoring' | 'applying' | 'completed' | 'error';

export interface PipelineProgress {
  stage: PipelineStage;
  message: string;
  totalJobs: number;
  matchedCount: number;
  appliedCount: number;
  manualCount: number;
  skippedCount: number;
  logs: string[];
}
