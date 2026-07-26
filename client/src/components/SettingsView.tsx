import React, { useState, useEffect } from 'react';
import { Clock, ShieldCheck, Key, Save, CheckCircle2, AlertCircle, Bot, Sliders } from 'lucide-react';
import type { ScheduleConfig, UserProfile } from '@shared/types';
import { api } from '../services/api';

interface SettingsViewProps {
  profile: UserProfile;
  onProfileUpdated: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ profile, onProfileUpdated }) => {
  const [schedule, setSchedule] = useState<ScheduleConfig | null>(null);
  const [autoSubmit, setAutoSubmit] = useState<boolean>(profile.autoSubmitAnswers);
  const [dryRun, setDryRun] = useState<boolean>(profile.dryRunMode);
  const [apiKey, setApiKey] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      const data = await api.getSchedule();
      setSchedule(data);
    } catch (err) {
      console.error('Failed to load schedule config:', err);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      // Save schedule
      if (schedule) {
        await api.updateSchedule(schedule);
      }

      // Save user settings (autoSubmit & dryRun)
      await api.updateProfile({
        autoSubmitAnswers: autoSubmit,
        dryRunMode: dryRun
      });

      setSaveSuccess(true);
      onProfileUpdated();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-fade-in pb-12">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">System Settings & Scheduler</h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure daily Asia/Dubai schedule windows, auto-apply guardrails, and dry-run testing modes.
        </p>
      </div>

      {/* Scheduler Card */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Daily Dubai Auto-Run Schedule</h2>
              <p className="text-xs text-slate-400">Timezone: Asia/Dubai (GST, UTC+4)</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={schedule?.enabled ?? true}
              onChange={(e) => schedule && setSchedule({ ...schedule, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Window Start Time (Dubai GST)</label>
            <input
              type="text"
              value={schedule?.windowStart || '05:00'}
              onChange={(e) => schedule && setSchedule({ ...schedule, windowStart: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">Window End Time (Dubai GST)</label>
            <input
              type="text"
              value={schedule?.windowEnd || '08:00'}
              onChange={(e) => schedule && setSchedule({ ...schedule, windowEnd: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {schedule?.nextRunAt && (
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Next Scheduled Execution (Dubai GST):</span>
            <span className="font-mono text-cyan-400 font-semibold">{schedule.nextRunAt}</span>
          </div>
        )}
      </div>

      {/* Safety Guardrails & Dry Run Mode */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          Safety & Application Guardrails
        </h2>

        {/* Dry Run Toggle */}
        <div className="flex items-start justify-between bg-slate-950/60 p-4 rounded-xl border border-slate-800 gap-4">
          <div>
            <span className="font-semibold text-sm text-white block">Dry-Run Simulation Mode</span>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulates job aggregation, AI matching, CV tailoring, and Playwright form steps without submitting live applications or spending API credits. Recommended for testing!
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>

        {/* Auto-Submit Answers Toggle */}
        <div className="flex items-start justify-between bg-slate-950/60 p-4 rounded-xl border border-slate-800 gap-4">
          <div>
            <span className="font-semibold text-sm text-white block">Auto-Submit AI Custom Question Answers</span>
            <p className="text-xs text-slate-400 mt-0.5">
              When disabled (default), AI-generated answers for custom form questions (e.g. "Why do you want this role?") are flagged for your review before Playwright submits.
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
            <input
              type="checkbox"
              checked={autoSubmit}
              onChange={(e) => setAutoSubmit(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {/* Anthropic API Key Optional Configuration */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            Anthropic API Key (Optional)
          </h2>
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded">
            Built-in High Quality Mock LLM Active
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Provide your Anthropic API Key to use Claude 3.5 Sonnet & Haiku for live LLM match scoring & CV tailoring. If left empty, AutoApply uses its built-in realistic mock LLM engine.
        </p>

        <input
          type="password"
          placeholder="sk-ant-api03-..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Save Settings Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800">
        {saveSuccess ? (
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4" /> Settings updated successfully!
          </span>
        ) : <div />}

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl shadow-lg shadow-indigo-600/20 transition"
        >
          <Save className="w-4 h-4" /> Save System Settings
        </button>
      </div>

    </div>
  );
};
