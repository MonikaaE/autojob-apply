import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, User, Plus, X, Sparkles, Save, ShieldAlert } from 'lucide-react';
import type { UserProfile, ParsedCV } from '@shared/types';
import { api } from '../services/api';

interface ProfileViewProps {
  profile: UserProfile;
  masterCv: any;
  onProfileUpdated: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, masterCv, onProfileUpdated }) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newKeywordInc, setNewKeywordInc] = useState('');
  const [newKeywordExc, setNewKeywordExc] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const parsedCvData: ParsedCV | null = masterCv?.parsedData || null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await api.uploadMasterCv(file);
      onProfileUpdated();
    } catch (err) {
      alert('Error parsing uploaded CV. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateProfile(formData);
      setSaveSuccess(true);
      onProfileUpdated();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save profile changes');
    } finally {
      setIsSaving(false);
    }
  };

  const addTag = (field: 'targetTitles' | 'keywordsInclude' | 'keywordsExclude', val: string, setter: (v: string) => void) => {
    if (!val.trim()) return;
    setFormData((prev) => ({
      ...prev,
      [field]: [...prev[field], val.trim()]
    }));
    setter('');
  };

  const removeTag = (field: 'targetTitles' | 'keywordsInclude' | 'keywordsExclude', index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-fade-in pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">User Profile & Master CV</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload your master CV for Claude AI parsing and configure job matching preferences.
        </p>
      </div>

      {/* Guardrail Notice */}
      <div className="bg-indigo-950/40 border border-indigo-500/20 p-4 rounded-2xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-indigo-200 leading-relaxed">
          <span className="font-semibold text-indigo-300">Non-Negotiable AI Guardrails Enabled: </span>
          The AutoApply AI engine only re-orders and re-phrases your verified experience to highlight job keywords for ATS filters. It will <strong className="text-white">never fabricate skills, dates, degrees, or employers</strong> on your tailored CVs.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Master CV Upload & Parsed View */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-400" />
              Master CV Upload
            </h2>

            <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950/60 p-6 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition group">
              <Upload className="w-8 h-8 text-slate-400 group-hover:text-indigo-400 mb-2 transition" />
              <span className="text-xs font-semibold text-slate-300">Click or Drag & Drop PDF Resume</span>
              <span className="text-[10px] text-slate-500 mt-1">Supported: PDF, DOCX, TXT (Max 10MB)</span>
              <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileUpload} className="hidden" />
            </label>

            {isUploading && (
              <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-2 text-xs text-indigo-300">
                <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                Parsing CV text with Claude AI...
              </div>
            )}

            {masterCv && (
              <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Uploaded: <strong>{masterCv.originalFilename}</strong></span>
              </div>
            )}
          </div>

          {/* Parsed CV Info Preview */}
          {parsedCvData && (
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>AI Parsed Master Resume</span>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Parsed Summary</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                  {parsedCvData.summary}
                </p>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">Parsed Skills ({parsedCvData.skills?.length || 0})</span>
                <div className="flex flex-wrap gap-1.5">
                  {parsedCvData.skills?.map((skill, idx) => (
                    <span key={idx} className="px-2 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {parsedCvData.experience && parsedCvData.experience.length > 0 && (
                <div>
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">Work Experience & Current Role</span>
                  <div className="space-y-2">
                    {parsedCvData.experience.map((exp, idx) => {
                      const isPresent = !exp.endDate || exp.endDate.toLowerCase().includes('present');
                      return (
                        <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                          <div className="flex items-center justify-between font-semibold text-white">
                            <span>{exp.role}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] ${isPresent ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'}`}>
                              {exp.startDate || '2023'} - {exp.endDate || 'Present'}
                            </span>
                          </div>
                          <div className="text-slate-400 text-[11px] mt-0.5">{exp.company} {exp.location ? `• ${exp.location}` : ''}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Preferences & Controls Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-400" />
              Candidate Profile & Job Match Criteria
            </h2>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Phone Number (Dubai format)</label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">LinkedIn Profile URL</label>
                <input
                  type="text"
                  value={formData.linkedinUrl || ''}
                  onChange={(e) => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Target Job Titles */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">Target Job Titles</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add target title (e.g. Full Stack Developer)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTag('targetTitles', newTitle, setNewTitle)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => addTag('targetTitles', newTitle, setNewTitle)}
                  className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.targetTitles.map((title, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-lg text-xs">
                    {title}
                    <button onClick={() => removeTag('targetTitles', i)} className="hover:text-white"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>

            {/* Seniority & Minimum Salary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Target Seniority Level</label>
                <select
                  value={formData.targetSeniority}
                  onChange={(e) => setFormData({ ...formData, targetSeniority: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="entry">Entry Level</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Level</option>
                  <option value="lead">Lead / Principal</option>
                  <option value="executive">Executive</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Minimum Monthly Salary (AED)</label>
                <input
                  type="number"
                  value={formData.minSalary || ''}
                  onChange={(e) => setFormData({ ...formData, minSalary: Number(e.target.value) })}
                  placeholder="e.g. 25000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Match Score Threshold */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-300">Minimum AI Match Threshold</label>
                <span className="text-xs font-bold text-indigo-400">{formData.matchThreshold}% Score</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                step="5"
                value={formData.matchThreshold}
                onChange={(e) => setFormData({ ...formData, matchThreshold: Number(e.target.value) })}
                className="w-full accent-indigo-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">Jobs below this match score will be skipped automatically.</p>
            </div>

            {/* Keywords Include & Exclude */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Keywords to Include</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. TypeScript"
                    value={newKeywordInc}
                    onChange={(e) => setNewKeywordInc(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag('keywordsInclude', newKeywordInc, setNewKeywordInc)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button type="button" onClick={() => addTag('keywordsInclude', newKeywordInc, setNewKeywordInc)} className="p-1.5 bg-indigo-600 text-white rounded-lg"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.keywordsInclude.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded text-[11px]">
                      {kw} <button onClick={() => removeTag('keywordsInclude', i)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Keywords to Exclude</label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="e.g. Unpaid"
                    value={newKeywordExc}
                    onChange={(e) => setNewKeywordExc(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag('keywordsExclude', newKeywordExc, setNewKeywordExc)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button type="button" onClick={() => addTag('keywordsExclude', newKeywordExc, setNewKeywordExc)} className="p-1.5 bg-indigo-600 text-white rounded-lg"><Plus className="w-3.5 h-3.5" /></button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {formData.keywordsExclude.map((kw, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-500/10 text-red-300 border border-red-500/20 rounded text-[11px]">
                      {kw} <button onClick={() => removeTag('keywordsExclude', i)}><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              {saveSuccess ? (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Profile saved successfully!
                </span>
              ) : <div />}

              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition"
              >
                <Save className="w-4 h-4" /> Save Profile Preferences
              </button>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
