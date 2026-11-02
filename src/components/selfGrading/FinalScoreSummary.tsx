import React from 'react';
import {
  Trophy,
  AlertCircle,
  RotateCcw,
  BookOpen,
  FileDown,
  ListCheck,
  Check,
  Minus,
  X as XIcon,
} from 'lucide-react';
import type { ExamAttempt, Exam } from '../../types';

interface FinalScoreSummaryProps {
  attempt: ExamAttempt;
  exam: Exam;
  onRetakeExam: () => void;
  onBackToCatalog: () => void;
  onScrollToReview: () => void;
  onDownloadPdf?: () => void;
  isDownloadingPdf?: boolean;
}

export const FinalScoreSummary: React.FC<FinalScoreSummaryProps> = ({
  attempt,
  exam,
  onRetakeExam,
  onBackToCatalog,
  onScrollToReview,
  onDownloadPdf,
  isDownloadingPdf = false,
}) => {
  const passingScore = exam.passingScorePercent || 60;
  const isPassed = attempt.percentage >= passingScore;

  const fullyCorrectCount = attempt.fullyCorrectCount || 0;
  const partiallyCorrectCount = attempt.partiallyCorrectCount || 0;
  const incorrectCount = attempt.incorrectCount || 0;

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s}s`;
  };

  return (
    <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-8 space-y-6 transition-colors">
      {/* Result banner */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
              isPassed ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/80 text-red-700 dark:text-red-300'
            }`}
          >
            {isPassed ? <Trophy className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
          </div>
          <div>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-1 ${
                isPassed
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-red-50 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}
            >
              {isPassed ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
              {isPassed ? 'Passed' : 'Not yet passed'}
            </span>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{attempt.examTitle}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pass threshold: {passingScore}% · Your score: {attempt.percentage}%
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {onDownloadPdf && (
            <button
              id="download-pdf-btn"
              type="button"
              onClick={onDownloadPdf}
              disabled={isDownloadingPdf}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 min-h-[40px] cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-purple-700 dark:text-purple-400" />
              <span>{isDownloadingPdf ? 'Generating…' : 'Download PDF'}</span>
            </button>
          )}
          <button
            id="retake-exam-btn"
            type="button"
            onClick={onRetakeExam}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-500 rounded-lg transition-all shadow-xs min-h-[40px] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake exam</span>
          </button>
        </div>
      </div>

      {/* Score cards — percentage first */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide block mb-1">Score</span>
          <span className={`text-3xl font-bold font-mono ${isPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {attempt.percentage}%
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 block mt-0.5">{attempt.score} / {attempt.maxScore} marks</span>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60">
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300 uppercase tracking-wide flex items-center gap-1 mb-1">
            <Check className="w-3 h-3" /> Full marks
          </span>
          <span className="text-3xl font-bold font-mono text-emerald-900 dark:text-emerald-200">{fullyCorrectCount}</span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 block mt-0.5">stations (1.0 pt)</span>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800/60">
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1 mb-1">
            <Minus className="w-3 h-3" /> Partial
          </span>
          <span className="text-3xl font-bold font-mono text-amber-900 dark:text-amber-200">{partiallyCorrectCount}</span>
          <span className="text-xs text-amber-600 dark:text-amber-400 block mt-0.5">stations (0.5 pt)</span>
        </div>

        <div className="bg-red-50 dark:bg-red-950/40 p-4 rounded-xl border border-red-200 dark:border-red-800/60">
          <span className="text-[11px] font-medium text-red-700 dark:text-red-300 uppercase tracking-wide flex items-center gap-1 mb-1">
            <XIcon className="w-3 h-3" /> Incorrect
          </span>
          <span className="text-3xl font-bold font-mono text-red-900 dark:text-red-200">{incorrectCount}</span>
          <span className="text-xs text-red-600 dark:text-red-400 block mt-0.5">stations (0.0 pt)</span>
        </div>
      </div>

      {/* Next actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <span>
          Time spent: <strong className="text-slate-800 dark:text-slate-200">{formatDuration(attempt.totalTimeSpentSeconds)}</strong>
          {' · '}Result saved to your local history.
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onScrollToReview}
            className="flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white font-semibold cursor-pointer"
          >
            <ListCheck className="w-3.5 h-3.5" />
            Detailed review
          </button>
          <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
          <button
            id="back-to-catalog-btn"
            type="button"
            onClick={onBackToCatalog}
            className="flex items-center gap-1 text-purple-700 dark:text-purple-400 hover:underline font-semibold cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Exam Library
          </button>
        </div>
      </div>
    </div>
  );
};
