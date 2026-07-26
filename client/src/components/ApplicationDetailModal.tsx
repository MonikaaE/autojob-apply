import React, { useState, useEffect } from 'react';
import { X, ExternalLink, Download, CheckCircle2, AlertTriangle, Building, MapPin, Calendar, FileText, Sparkles, Edit3, Save, Send, Eye } from 'lucide-react';
import type { ApplicationLog } from '@shared/types';
import { api } from '../services/api';

interface ApplicationDetailModalProps {
  log: ApplicationLog | null;
  onClose: () => void;
  onUpdateStatus: (id: string, status: string, notes?: string) => void;
  onRefresh: () => void;
}

export const ApplicationDetailModal: React.FC<ApplicationDetailModalProps> = ({
  log,
  onClose,
  onUpdateStatus,
  onRefresh
}) => {
  if (!log) return null;

  const { job, match, tailoredCv, status, answers, notes, appliedAt } = log;

  const [isEditingCv, setIsEditingCv] = useState(false);
  const [editedSummary, setEditedSummary] = useState(tailoredCv?.tailoredSummary || '');
  const [editedSkillsStr, setEditedSkillsStr] = useState((tailoredCv?.tailoredSkills || []).join(', '));
  const [currentPdfUrl, setCurrentPdfUrl] = useState(tailoredCv?.pdfUrl || '');
  const [isSavingCv, setIsSavingCv] = useState(false);
  const [isAutoApplying, setIsAutoApplying] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (tailoredCv) {
      setEditedSummary(tailoredCv.tailoredSummary || '');
      setEditedSkillsStr((tailoredCv.tailoredSkills || []).join(', '));
      setCurrentPdfUrl(tailoredCv.pdfUrl || '');
    }
  }, [log]);

  const handleSaveAndRegeneratePdf = async () => {
    setIsSavingCv(true);
    setSaveSuccess(false);
    try {
      const skillsArray = editedSkillsStr.split(',').map((s) => s.trim()).filter(Boolean);
      const updated = await api.updateTailoredCv(log.id, editedSummary, skillsArray);
      setCurrentPdfUrl(updated.pdfUrl);
      setSaveSuccess(true);
      setIsEditingCv(false);
      onRefresh();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert('Failed to update and regenerate PDF.');
    } finally {
      setIsSavingCv(false);
    }
  };

  const handleExecuteAutoApply = async () => {
    setIsAutoApplying(true);
    try {
      await api.triggerAutoApply(log.id);
      onRefresh();
      onClose();
    } catch (err) {
      alert('Auto-apply submission failed.');
    } finally {
      setIsAutoApplying(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!currentPdfUrl) return;
    try {
      const response = await fetch(currentPdfUrl);
      if (!response.ok) throw new Error('Failed to fetch PDF');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `Tailored_CV_${job?.company || 'Application'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      // Fallback: open in new tab
      window.open(currentPdfUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between bg-slate-950/40">
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {job?.source || 'LinkedIn'}
              </span>
              <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                status === 'applied'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : status === 'needs_manual_review'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  : 'bg-slate-700 text-slate-300'
              }`}>
                {status === 'applied' ? '✓ Auto-Applied' : status === 'needs_manual_review' ? '⚠️ Pending Review / Apply' : status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5">{job?.title}</h2>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1"><Building className="w-3.5 h-3.5 text-indigo-400" /> {job?.company}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-cyan-400" /> {job?.location}</span>
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-500" /> {new Date(appliedAt).toLocaleDateString()}</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/50 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Match Score Card */}
          <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center font-bold text-xl shrink-0 ${
              (match?.matchScore || 0) >= 85
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : (match?.matchScore || 0) >= 70
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'bg-slate-800 text-slate-400'
            }`}>
              <span>{match?.matchScore || 0}</span>
              <span className="text-[10px] font-normal text-slate-400 uppercase">Score</span>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 font-semibold text-white">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>Claude AI Match Assessment</span>
              </div>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{match?.reasoning}</p>

              {/* Pros & Flags */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {match?.pros && match.pros.length > 0 && (
                  <div className="bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                    <span className="text-xs font-semibold text-emerald-400 block mb-1">Matching Highlights:</span>
                    <ul className="text-[11px] text-slate-300 space-y-1">
                      {match.pros.map((pro, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {match?.flags && match.flags.length > 0 && (
                  <div className="bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                    <span className="text-xs font-semibold text-amber-400 block mb-1">Noteworthy Considerations:</span>
                    <ul className="text-[11px] text-slate-300 space-y-1">
                      {match.flags.map((flag, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TAILORED CV VIEWER & EDITOR */}
          <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-white">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Tailored ATS Resume (View & Edit)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsEditingCv(!isEditingCv)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                >
                  <Edit3 className="w-3.5 h-3.5" /> {isEditingCv ? 'Cancel Editing' : 'Edit Resume Text'}
                </button>

                {currentPdfUrl && (
                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition shadow-md shadow-indigo-600/20"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Tailored PDF
                  </button>
                )}
              </div>
            </div>

            {saveSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Tailored CV text updated & PDF regenerated successfully!
              </div>
            )}

            {/* Editable Mode */}
            {isEditingCv ? (
              <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Tailored Executive Summary</label>
                  <textarea
                    rows={3}
                    value={editedSummary}
                    onChange={(e) => setEditedSummary(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Tailored Core Skills (comma separated)</label>
                  <input
                    type="text"
                    value={editedSkillsStr}
                    onChange={(e) => setEditedSkillsStr(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={handleSaveAndRegeneratePdf}
                    disabled={isSavingCv}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition"
                  >
                    <Save className="w-3.5 h-3.5" /> Save Edits & Regenerate PDF
                  </button>
                </div>
              </div>
            ) : (
              /* PDF View Embed & Summary */
              <div className="space-y-3">
                <div className="p-3 bg-slate-900 rounded-lg text-xs text-slate-300 border border-slate-800">
                  <span className="font-semibold text-indigo-400 block mb-1">ATS Tailored Executive Summary:</span>
                  "{editedSummary || tailoredCv?.tailoredSummary}"
                </div>

                {/* Embedded PDF Viewer */}
                {currentPdfUrl && (
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                    <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-cyan-400" /> In-Browser PDF Document Preview</span>
                      <a href={currentPdfUrl} target="_blank" rel="noreferrer" className="hover:text-indigo-400">Open Full Screen ↗</a>
                    </div>
                    <iframe
                      src={`${currentPdfUrl}#toolbar=0`}
                      className="w-full h-72 border-none"
                      title="Tailored Resume Preview"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Custom Questions & Answers */}
          {answers && answers.length > 0 && (
            <div className="bg-slate-950/60 p-5 rounded-xl border border-slate-800">
              <h3 className="font-semibold text-white text-xs mb-3">Generated Form Answers</h3>
              <div className="space-y-3">
                {answers.map((ans, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-900 rounded-lg border border-slate-800">
                    <p className="text-xs font-semibold text-slate-200 mb-1">Q: {ans.question}</p>
                    <p className="text-xs text-indigo-300">A: {ans.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Notes */}
          {notes && (
            <div className="p-3.5 bg-slate-950/40 rounded-xl border border-slate-800 text-xs text-slate-400">
              <span className="font-semibold text-slate-300">Audit Notes: </span>
              <span>{notes}</span>
            </div>
          )}

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          {job?.url && (
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Job Portal
            </a>
          )}

          <div className="flex items-center gap-2">
            {status !== 'applied' && (
              <button
                onClick={handleExecuteAutoApply}
                disabled={isAutoApplying}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-lg transition shadow-lg shadow-emerald-600/20"
              >
                <Send className="w-3.5 h-3.5" /> {isAutoApplying ? 'Submitting...' : '🚀 Execute Auto-Apply Now'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
