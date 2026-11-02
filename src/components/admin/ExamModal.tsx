import React, { useState, useEffect } from 'react';
import { X, Clock, Bell, CheckCircle2 } from 'lucide-react';
import type { Exam, Subject, TimingMode } from '../../types';
import { v4 as uuidv4 } from '../../db/uuid';

interface ExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exam: Exam) => Promise<void>;
  subjects: Subject[];
  initialExam?: Exam | null;
  defaultSubjectId?: string;
}

export const ExamModal: React.FC<ExamModalProps> = ({
  isOpen,
  onClose,
  onSave,
  subjects,
  initialExam,
  defaultSubjectId,
}) => {
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [timingMode, setTimingMode] = useState<TimingMode>('flexible');
  const [stationDurationSeconds, setStationDurationSeconds] = useState<number>(90);
  const [totalDurationMinutes, setTotalDurationMinutes] = useState<number>(20);
  const [passingScorePercent, setPassingScorePercent] = useState<number>(60);
  const [status, setStatus] = useState<'draft' | 'review' | 'published'>('draft');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialExam) {
      setSubjectId(initialExam.subjectId);
      setTitle(initialExam.title);
      setCode(initialExam.code);
      setDescription(initialExam.description || '');
      setStatus(initialExam.status || 'draft');
      setTimingMode(initialExam.timingMode || 'flexible');
      setStationDurationSeconds(initialExam.stationDurationSeconds || 90);
      setTotalDurationMinutes(initialExam.totalDurationMinutes || 20);
      setPassingScorePercent(initialExam.passingScorePercent || 60);
      setInstructions(initialExam.instructions || '');
    } else {
      setSubjectId(defaultSubjectId || (subjects.length > 0 ? subjects[0].id : ''));
      setTitle('');
      setCode('');
      setDescription('');
      setStatus('draft');
      setTimingMode('flexible');
      setStationDurationSeconds(90);
      setTotalDurationMinutes(20);
      setPassingScorePercent(60);
      setInstructions(
        'Observe each specimen carefully. Answer in the allocated time. The bell will chime when rotation time has elapsed.'
      );
    }
    setError(null);
  }, [initialExam, defaultSubjectId, subjects, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      setError('Please select a subject');
      return;
    }
    if (!title.trim()) {
      setError('Exam title is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = Date.now();
      const examToSave: Exam = {
        id: initialExam ? initialExam.id : uuidv4(),
        subjectId,
        title: title.trim(),
        code: (code.trim() || 'EXAM').toUpperCase(),
        description: description.trim(),
        status,
        timingMode,
        stationDurationSeconds: Number(stationDurationSeconds),
        totalDurationMinutes: Number(totalDurationMinutes),
        passingScorePercent: Number(passingScorePercent),
        instructions: instructions.trim(),
        createdAt: initialExam ? initialExam.createdAt : now,
        updatedAt: now,
      };

      await onSave(examToSave);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save exam');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {initialExam ? 'Edit Practical Exam Settings' : 'Create New Practical Exam'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Subject *
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id} className="dark:bg-slate-800">
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Exam Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pathology Midterm OSPE"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Exam Code
              </label>
              <input
                type="text"
                placeholder="e.g. OSPE-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Short clinical summary of stations and topics tested."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Timing Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Timing Engine &amp; Pacing Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTimingMode('flexible')}
                className={`p-3 text-left border rounded-lg transition-colors flex flex-col gap-1 cursor-pointer ${
                  timingMode === 'flexible'
                    ? 'border-purple-700 bg-purple-50/70 dark:bg-purple-950/40 ring-1 ring-purple-700 dark:border-purple-600'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-950 dark:text-purple-300">
                  <Clock className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                  <span>Flexible (Recommended)</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Both station bell timer and total exam countdown.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTimingMode('bell_ring')}
                className={`p-3 text-left border rounded-lg transition-colors flex flex-col gap-1 cursor-pointer ${
                  timingMode === 'bell_ring'
                    ? 'border-purple-700 bg-purple-50/70 dark:bg-purple-950/40 ring-1 ring-purple-700 dark:border-purple-600'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-950 dark:text-purple-300">
                  <Bell className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                  <span>Station Bell Ring</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Strict OSPE station rotation with automatic chime.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTimingMode('total_timer')}
                className={`p-3 text-left border rounded-lg transition-colors flex flex-col gap-1 cursor-pointer ${
                  timingMode === 'total_timer'
                    ? 'border-purple-700 bg-purple-50/70 dark:bg-purple-950/40 ring-1 ring-purple-700 dark:border-purple-600'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs text-purple-950 dark:text-purple-300">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                  <span>Total Exam Timer</span>
                </div>
                <span className="text-[11px] text-slate-600 dark:text-slate-400">
                  Single countdown for entire paper, student-paced.
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Per-Station Time (sec)
              </label>
              <input
                type="number"
                min="15"
                max="600"
                step="5"
                value={stationDurationSeconds}
                onChange={(e) => setStationDurationSeconds(Math.max(15, parseInt(e.target.value) || 60))}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Total Exam Time (min)
              </label>
              <input
                type="number"
                min="1"
                max="300"
                value={totalDurationMinutes}
                onChange={(e) => setTotalDurationMinutes(Math.max(1, parseInt(e.target.value) || 10))}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Passing Score (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={passingScorePercent}
                onChange={(e) => setPassingScorePercent(Math.max(1, Math.min(100, parseInt(e.target.value) || 60)))}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Examination Lifecycle Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Lifecycle Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('draft')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                  status === 'draft'
                    ? 'bg-amber-100/70 dark:bg-amber-950/40 border-amber-400 dark:border-amber-600 text-amber-950 dark:text-amber-200 font-bold shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                Draft (Work in progress)
              </button>
              <button
                type="button"
                onClick={() => setStatus('review')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                  status === 'review'
                    ? 'bg-indigo-100/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 text-indigo-950 dark:text-indigo-200 font-bold shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                Needs Review
              </button>
              <button
                type="button"
                onClick={() => setStatus('published')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-colors cursor-pointer ${
                  status === 'published'
                    ? 'bg-emerald-100/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-950 dark:text-emerald-200 font-bold shadow-2xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                Published
              </button>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Note: Published exams require all specimen slides to be present and all stations to be valid.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Candidate Instructions
            </label>
            <textarea
              rows={2}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : initialExam ? 'Update Exam Settings' : 'Create Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
