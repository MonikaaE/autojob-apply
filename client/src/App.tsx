import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { ProfileView } from './components/ProfileView';
import { SettingsView } from './components/SettingsView';
import { ApplicationDetailModal } from './components/ApplicationDetailModal';
import { PipelineProgressModal } from './components/PipelineProgressModal';
import type { UserProfile, ApplicationLog, PipelineProgress } from '@shared/types';
import { api } from './services/api';

export function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'profile' | 'settings'>('dashboard');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [masterCv, setMasterCv] = useState<any>(null);
  const [logs, setLogs] = useState<ApplicationLog[]>([]);
  const [stats, setStats] = useState({
    totalFoundToday: 0,
    matchedCount: 0,
    appliedCount: 0,
    needsActionCount: 0
  });
  const [selectedLog, setSelectedLog] = useState<ApplicationLog | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress>({
    stage: 'idle',
    message: 'Pipeline ready',
    totalJobs: 0,
    matchedCount: 0,
    appliedCount: 0,
    manualCount: 0,
    skippedCount: 0,
    logs: []
  });
  const [showProgressModal, setShowProgressModal] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Poll progress when running
  useEffect(() => {
    let interval: any;
    if (pipelineProgress.stage !== 'idle' && pipelineProgress.stage !== 'completed' && pipelineProgress.stage !== 'error') {
      interval = setInterval(async () => {
        try {
          const latestProgress = await api.getPipelineProgress();
          setPipelineProgress(latestProgress);
          if (latestProgress.stage === 'completed' || latestProgress.stage === 'error') {
            loadApplications();
          }
        } catch (err) {
          console.error('Error polling pipeline progress:', err);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [pipelineProgress.stage]);

  const loadInitialData = async () => {
    await Promise.all([loadProfile(), loadApplications()]);
  };

  const loadProfile = async () => {
    try {
      const data = await api.getProfile();
      setProfile(data.profile);
      setMasterCv(data.masterCv);
    } catch (err) {
      console.error('Failed to load profile:', err);
    }
  };

  const loadApplications = async () => {
    try {
      const data = await api.getApplications();
      setLogs(data.logs);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
  };

  const handleStartApply = async () => {
    setShowProgressModal(true);
    try {
      const res = await api.startPipeline();
      setPipelineProgress(res.progress);
    } catch (err) {
      alert('Failed to start pipeline execution');
    }
  };

  const handleUpdateStatus = async (id: string, status: string, notes?: string) => {
    try {
      await api.updateApplicationStatus(id, status, notes);
      loadApplications();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-400">Loading AutoApply System...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onStartApply={handleStartApply}
        pipelineProgress={pipelineProgress}
        isDryRun={profile.dryRunMode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' && (
          <Dashboard
            logs={logs}
            stats={stats}
            onSelectLog={(log) => setSelectedLog(log)}
            onRefresh={loadApplications}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            profile={profile}
            masterCv={masterCv}
            onProfileUpdated={loadProfile}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            profile={profile}
            onProfileUpdated={loadProfile}
          />
        )}
      </main>

      {/* Application Detail Modal */}
      {selectedLog && (
        <ApplicationDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onUpdateStatus={handleUpdateStatus}
          onRefresh={loadApplications}
        />
      )}

      {/* Pipeline Execution Progress Modal */}
      {showProgressModal && (
        <PipelineProgressModal
          progress={pipelineProgress}
          onClose={() => setShowProgressModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>AutoApply Engine • Dubai GST (UTC+4) • Daily Auto-Run 5:00 - 8:00 AM</span>
          <span className="text-slate-600">Built with React, Express, Playwright, Node-Cron & Claude AI</span>
        </div>
      </footer>

    </div>
  );
}
export default App;
