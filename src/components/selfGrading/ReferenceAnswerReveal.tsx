import React from 'react';
import { Eye, CheckCircle2, FileText } from 'lucide-react';
import type { Question } from '../../types';

interface ReferenceAnswerRevealProps {
  question: Question;
  isRevealed: boolean;
  onReveal: () => void;
}

export const ReferenceAnswerReveal: React.FC<ReferenceAnswerRevealProps> = ({
  question,
  isRevealed,
  onReveal,
}) => {
  const correctOption = question.options?.find((o) => o.isCorrect);
  const correctOptionLetter = question.options
    ? String.fromCharCode(65 + Math.max(0, question.options.findIndex((o) => o.isCorrect)))
    : '';

  const acceptableKeys = question.acceptableAnswers || [];
  const referenceAnswerText =
    question.referenceAnswer ||
    (acceptableKeys.length > 0 ? acceptableKeys.join(' / ') : '') ||
    (correctOption ? `Option ${correctOptionLetter}: ${correctOption.text}` : 'No key specified');

  if (!isRevealed) {
    return (
      <div className="p-5 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-center space-y-3">
        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mx-auto">
          <Eye className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Official answer hidden</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            The reference answer is concealed so you can evaluate your own response first.
            When you're ready, reveal it to compare and grade this station.
          </p>
        </div>
        <button
          id="reveal-answer-btn"
          type="button"
          onClick={onReveal}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-500 rounded-lg shadow-xs transition-all min-h-[44px] cursor-pointer"
        >
          <Eye className="w-4 h-4" />
          <span>Show official answer</span>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 overflow-hidden space-y-0">
      {/* Official answer */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Official answer</span>
        </div>
        <p className="text-sm font-bold text-slate-900 dark:text-white font-mono">{referenceAnswerText}</p>
        {acceptableKeys.length > 1 && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Also accepted: {acceptableKeys.join(' · ')}
          </p>
        )}
      </div>

      {/* Marking rubric */}
      {question.markingRubric && (
        <div className="px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>Marking guide</span>
          </div>
          <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed whitespace-pre-line">
            {question.markingRubric}
          </p>
        </div>
      )}

      {/* Explanation */}
      {question.explanation && (
        <div className="px-4 py-3">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
            Explanation
          </p>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
};
