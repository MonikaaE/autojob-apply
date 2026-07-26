import React from 'react';
import { Bot, CheckCircle2, AlertCircle, Sparkles, FileText, Send, X, Terminal } from 'lucide-react';
import type { PipelineProgress } from '@shared/types';

interface PipelineProgressModalProps {
  progress: PipelineProgress;
  onClose: () => void;
}

export const PipelineProgressModal: React.FC<PipelineProgressModalProps> = ({ progress, onClose }) => {
  const isRunning = progress.stage !== 'idle' && progress.stage !== 'completed' && progress.stage !== 'error';

  const stages = [
    { key: 'aggregating', label: '1. Scrape Jobs (Dubai)', icon: Bot },
    { key: 'matching', label: '2. Claude Match Score', icon: Sparkles },
    { key: 'tailoring', label: '3. ATS CV Tailor', icon: FileText },
    { key: 'applying', label: '4. Auto-Apply Playwright', icon: Send }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">AutoApply Pipeline Execution</h3>
              <p className="text-xs text-slate-400">Target Region: Dubai / UAE (GST UTC+4)</p>
            </div>
          </div>
          {!isRunning && (
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/50">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="p-6 space-y-6">
          
          {/* Pipeline Stage Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {stages.map((stg) => {
              const Icon = stg.icon;
              const isActive = progress.stage === stg.key;
              const isPast = ['matching', 'tailoring', 'applying', 'completed'].includes(progress.stage) && stg.key === 'aggregating'
                || ['tailoring', 'applying', 'completed'].includes(progress.stage) && stg.key === 'matching'
                || ['applying', 'completed'].includes(progress.stage) && stg.key === 'tailoring'
                || progress.stage === 'completed' && stg.key === 'applying';

              return (
                <div
                  key={stg.key}
                  className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                    isActive
                      ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 shadow-md shadow-indigo-500/10'
                      : isPast
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'animate-bounce' : ''}`} />
                  <span className="text-[11px] font-semibold">{stg.label}</span>
                </div>
              );
            })}
          </div>

          {/* Progress Counters */}
          <div className="grid grid-cols-4 gap-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-center">
            <div>
              <span className="text-xl font-bold text-white">{progress.totalJobs}</span>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Jobs Found</span>
            </div>
            <div>
              <span className="text-xl font-bold text-indigo-400">{progress.matchedCount}</span>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Matched (≥70%)</span>
            </div>
            <div>
              <span className="text-xl font-bold text-emerald-400">{progress.appliedCount}</span>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Applied</span>
            </div>
            <div>
              <span className="text-xl font-bold text-amber-400">{progress.manualCount}</span>
              <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Needs Action</span>
            </div>
          </div>

          {/* Live Terminal Log Stream */}
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs font-mono text-slate-400">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Real-Time Execution Logs</span>
            </div>
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-300 h-48 overflow-y-auto space-y-1 select-text">
              {progress.logs.length === 0 ? (
                <p className="text-slate-600 italic">Initializing pipeline runner...</p>
              ) : (
                progress.logs.map((logLine, idx) => (
                  <div key={idx} className="leading-relaxed">
                    <span className="text-indigo-400">&gt;</span> {logLine}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            {isRunning ? 'Pipeline active... Do not close window.' : 'Pipeline run complete.'}
          </p>
          {!isRunning && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
            >
              Done & Return to Dashboard
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
