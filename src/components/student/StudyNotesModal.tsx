import React, { useState, useEffect } from 'react';
import { X, FileText, Check, Sparkles, BookOpen } from 'lucide-react';
import { db } from '../../db';
import type { ExamAttempt } from '../../types';

interface StudyNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  attempt: ExamAttempt | null;
  onSaved: (attemptId: string, updatedNotes: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const StudyNotesModal: React.FC<StudyNotesModalProps> = ({
  isOpen,
  onClose,
  attempt,
  onSaved,
  onShowToast,
}) => {
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (attempt) {
      setNotes(attempt.notes || '');
    } else {
      setNotes('');
    }
  }, [attempt, isOpen]);

  if (!isOpen || !attempt) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const cleanNotes = notes.trim();
      await db.attempts.update(attempt.id, { notes: cleanNotes });
      onSaved(attempt.id, cleanNotes);
      onShowToast('Personal study notes saved to IndexedDB', 'success');
      onClose();
    } catch (err: unknown) {
      onShowToast((err as Error).message || 'Failed to save notes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTemplate = (templateType: 'reflection' | 'mnemonics' | 'action_items') => {
    let snippet = '';
    if (templateType === 'reflection') {
      snippet = '\n• Concepts mastered: \n• Missed visual pointers: \n• Differential diagnoses to review: ';
    } else if (templateType === 'mnemonics') {
      snippet = '\n• High-yield mnemonics: \n• Anatomical landmarks: ';
    } else if (templateType === 'action_items') {
      snippet = '\n[ ] Re-read textbook chapter on \n[ ] Practice histology slides at 400x \n[ ] Retake this OSPE rotation before exam week';
    }

    setNotes((prev) => (prev ? prev + '\n' + snippet : snippet.trim()));
  };

  const attemptDate = new Date(attempt.completedAt).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-950 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Personal Study Notes</h3>
              <p className="text-[11px] text-slate-500">
                {attempt.examTitle} · {attemptDate}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* Attempt Recap Strip */}
          <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
            <span className="text-slate-600 font-medium">{attempt.subjectName}</span>
            <div className="flex items-center gap-2 font-mono">
              <span className={attempt.passed ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                {attempt.percentage}% ({attempt.score}/{attempt.maxScore} marks)
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  attempt.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {attempt.passed ? 'PASS' : 'REVISE'}
              </span>
            </div>
          </div>

          {/* Quick Note Helper Templates */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Insert Revision Prompts:
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleAddTemplate('reflection')}
                className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-rose-900" />
                <span>+ Reflection Prompts</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddTemplate('mnemonics')}
                className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-rose-900" />
                <span>+ Mnemonics</span>
              </button>
              <button
                type="button"
                onClick={() => handleAddTemplate('action_items')}
                className="text-[11px] px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3 text-rose-900" />
                <span>+ Action Checklist</span>
              </button>
            </div>
          </div>

          {/* Textarea */}
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">
              Study Log &amp; Clinical Insights:
            </label>
            <textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Record your personal notes on this attempt... e.g. 'Pay closer attention to Reed-Sternberg owl-eye nucleoli vs tuberculosis Langhans giant cells. Remember the diaphragm caval opening is at T8 inside the central tendon.'"
              className="w-full p-3 text-xs sm:text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900 font-sans leading-relaxed"
            />
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Saved permanently in local IndexedDB alongside your attempt</span>
              <span>{notes.length} characters</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Study Notes'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
