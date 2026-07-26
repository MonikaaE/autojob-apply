import React, { useState } from 'react';
import { Search, Filter, Briefcase, CheckCircle2, AlertTriangle, ExternalLink, Download, Sparkles, Building, MapPin, Eye, RefreshCw, Send } from 'lucide-react';
import type { ApplicationLog } from '@shared/types';
import { api } from '../services/api';

interface DashboardProps {
  logs: ApplicationLog[];
  stats: {
    totalFoundToday: number;
    matchedCount: number;
    appliedCount: number;
    needsActionCount: number;
  };
  onSelectLog: (log: ApplicationLog) => void;
  onRefresh: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ logs, stats, onSelectLog, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [isApplyingAll, setIsApplyingAll] = useState(false);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.job?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.job?.company.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'applied' && log.status === 'applied') ||
      (statusFilter === 'needs_manual_review' && log.status === 'needs_manual_review') ||
      (statusFilter === 'skipped' && log.status === 'skipped');

    const matchesSource =
      sourceFilter === 'all' || log.job?.source.toLowerCase() === sourceFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesSource;
  });

  const handleBatchAutoApplyAll = async () => {
    setIsApplyingAll(true);
    try {
      await api.triggerAutoApplyAll();
      onRefresh();
    } catch (err) {
      alert('Batch auto-apply failed.');
    } finally {
      setIsApplyingAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Application Log & Activity</h1>
          <p className="text-sm text-slate-400 mt-1">
            Recent job applications in Dubai & UAE (Last 2 Days Filter • 5:00 - 8:00 AM GST Schedule Window)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stats.needsActionCount > 0 && (
            <button
              onClick={handleBatchAutoApplyAll}
              disabled={isApplyingAll}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isApplyingAll ? 'Auto-Applying...' : `Auto-Apply All Pending (${stats.needsActionCount})`}</span>
            </button>
          )}

          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white">{stats.totalFoundToday}</span>
            <span className="block text-xs text-slate-400">Recent Jobs (2 Days)</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white">{stats.matchedCount}</span>
            <span className="block text-xs text-slate-400">AI Matched (≥70%)</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white">{stats.appliedCount}</span>
            <span className="block text-xs text-slate-400">Auto-Applied</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-2xl font-bold text-white">{stats.needsActionCount}</span>
            <span className="block text-xs text-slate-400">Pending Apply</span>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by job title or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
          >
            <option value="all">All Application Statuses</option>
            <option value="applied">Applied (Auto)</option>
            <option value="needs_manual_review">Pending Apply / Review</option>
            <option value="skipped">Skipped (&lt;70% Match)</option>
          </select>
        </div>

        {/* Source Filter */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition w-full md:w-auto"
        >
          <option value="all">All Job Sources</option>
          <option value="linkedin">LinkedIn</option>
          <option value="indeed">Indeed</option>
          <option value="bayt">Bayt.com</option>
          <option value="naukrigulf">Naukrigulf</option>
        </select>
      </div>

      {/* Applications Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-xs text-slate-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Posted Date</th>
                <th className="py-3.5 px-4">Job Title & Company</th>
                <th className="py-3.5 px-4">Match Score</th>
                <th className="py-3.5 px-4">Tailored CV</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 italic">
                    No applications recorded yet. Click "Start Apply Now" to run the automated pipeline.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    
                    {/* Posted Date */}
                    <td className="py-4 px-4 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.job?.postedAt || log.appliedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <span className="block text-[10px] text-slate-500">
                        {new Date(log.job?.postedAt || log.appliedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>

                    {/* Job Title & Company */}
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white hover:text-indigo-400 transition cursor-pointer" onClick={() => onSelectLog(log)}>
                        {log.job?.title}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1"><Building className="w-3 h-3 text-indigo-400" /> {log.job?.company}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-500" /> {log.job?.location}</span>
                        <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400 rounded">
                          {log.job?.source}
                        </span>
                      </div>
                    </td>

                    {/* Match Score */}
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        (log.match?.matchScore || 0) >= 85
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : (log.match?.matchScore || 0) >= 70
                          ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        <span>{log.match?.matchScore || 0}/100</span>
                      </div>
                    </td>

                    {/* Tailored CV */}
                    <td className="py-4 px-4">
                      {log.tailoredCv?.pdfUrl ? (
                        <button
                          onClick={() => onSelectLog(log)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded"
                        >
                          <Eye className="w-3 h-3" /> View & Edit
                        </button>
                      ) : (
                        <span className="text-xs text-slate-600">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        log.status === 'applied'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : log.status === 'needs_manual_review'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {log.status === 'applied' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Auto-Applied
                          </>
                        ) : log.status === 'needs_manual_review' ? (
                          <>
                            <AlertTriangle className="w-3 h-3" /> Pending Apply
                          </>
                        ) : (
                          log.status
                        )}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {log.status !== 'applied' && (
                          <button
                            onClick={async () => {
                              await api.triggerAutoApply(log.id);
                              onRefresh();
                            }}
                            className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                          >
                            Auto-Apply
                          </button>
                        )}
                        <button
                          onClick={() => onSelectLog(log)}
                          className="p-1.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
                          title="View & Edit Application Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {log.job?.url && (
                          <a
                            href={log.job.url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-slate-400 hover:text-indigo-400 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
                            title="Open Job Listing"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
