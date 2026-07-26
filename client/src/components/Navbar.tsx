import React, { useState, useEffect } from 'react';
import { Bot, Play, Clock, User, LayoutDashboard, Settings, ShieldCheck } from 'lucide-react';
import type { PipelineProgress } from '@shared/types';

interface NavbarProps {
  activeTab: 'dashboard' | 'profile' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'profile' | 'settings') => void;
  onStartApply: () => void;
  pipelineProgress: PipelineProgress;
  isDryRun: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onStartApply,
  pipelineProgress,
  isDryRun
}) => {
  const [dubaiTime, setDubaiTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const timeStr = new Date().toLocaleTimeString('en-US', {
        timeZone: 'Asia/Dubai',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      setDubaiTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isRunning = pipelineProgress.stage !== 'idle' && pipelineProgress.stage !== 'completed' && pipelineProgress.stage !== 'error';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xl tracking-tight text-white">Auto<span className="text-indigo-400">Apply</span></span>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-full">
                  Dubai AI
                </span>
                {isDryRun && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Dry Run Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-cyan-400 inline" /> GST (UTC+4): <span className="text-slate-200 font-mono">{dubaiTime || '05:00 AM'}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard & Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Profile & CV</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Trigger Pipeline Action */}
          <div className="flex items-center gap-3">
            <button
              onClick={onStartApply}
              disabled={isRunning}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl shadow-lg transition-all ${
                isRunning
                  ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-98'
              }`}
            >
              {isRunning ? (
                <>
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span>Pipeline Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Apply Now</span>
                </>
              )}
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
