import axios from 'axios';
import type { UserProfile, ParsedCV, ApplicationLog, PipelineProgress, ScheduleConfig } from '@shared/types';

const API_BASE = '/api';

export const api = {
  // Profile & Master CV
  getProfile: async (): Promise<{ profile: UserProfile; masterCv: any }> => {
    const res = await axios.get(`${API_BASE}/profile`);
    return res.data;
  },

  updateProfile: async (data: Partial<UserProfile>): Promise<void> => {
    await axios.put(`${API_BASE}/profile`, data);
  },

  uploadMasterCv: async (file?: File, rawText?: string): Promise<{ parsedData: ParsedCV }> => {
    const formData = new FormData();
    if (file) formData.append('cvFile', file);
    if (rawText) formData.append('rawText', rawText);

    const res = await axios.post(`${API_BASE}/profile/cv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  // Applications & Logs
  getApplications: async (): Promise<{
    logs: ApplicationLog[];
    stats: {
      totalFoundToday: number;
      matchedCount: number;
      appliedCount: number;
      needsActionCount: number;
    };
  }> => {
    const res = await axios.get(`${API_BASE}/applications`);
    return res.data;
  },

  updateApplicationStatus: async (id: string, status: string, notes?: string): Promise<void> => {
    await axios.put(`${API_BASE}/applications/${id}/status`, { status, notes });
  },

  // Edit & Regenerate Tailored CV PDF
  updateTailoredCv: async (id: string, tailoredSummary: string, tailoredSkills: string[]): Promise<{ pdfUrl: string; tailoredSummary: string; tailoredSkills: string[] }> => {
    const res = await axios.put(`${API_BASE}/applications/${id}/tailored-cv`, { tailoredSummary, tailoredSkills });
    return res.data;
  },

  // Trigger Auto-Apply
  triggerAutoApply: async (id: string): Promise<void> => {
    await axios.post(`${API_BASE}/applications/${id}/auto-apply`);
  },

  triggerAutoApplyAll: async (): Promise<void> => {
    await axios.post(`${API_BASE}/applications/auto-apply-all`);
  },

  // Pipeline execution
  startPipeline: async (): Promise<{ progress: PipelineProgress }> => {
    const res = await axios.post(`${API_BASE}/pipeline/run`);
    return res.data;
  },

  getPipelineProgress: async (): Promise<PipelineProgress> => {
    const res = await axios.get(`${API_BASE}/pipeline/progress`);
    return res.data;
  },

  // Scheduler
  getSchedule: async (): Promise<ScheduleConfig> => {
    const res = await axios.get(`${API_BASE}/schedule`);
    return res.data;
  },

  updateSchedule: async (data: Partial<ScheduleConfig>): Promise<ScheduleConfig> => {
    const res = await axios.put(`${API_BASE}/schedule`, data);
    return res.data;
  }
};
