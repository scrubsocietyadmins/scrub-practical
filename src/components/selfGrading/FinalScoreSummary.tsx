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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Result banner */}
      <div className="flex flex-col sm:flex-row items-start justify-between gap-5 pb-5 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
              isPassed ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {isPassed ? <Trophy className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
          </div>
          <div>
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full mb-1 ${
                isPassed
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {isPassed ? <Check className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
              {isPassed ? 'Passed' : 'Not yet passed'}
            </span>
            <h2 className="text-xl font-bold text-slate-900">{attempt.examTitle}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
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
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-sm disabled:opacity-50 min-h-[40px]"
            >
              <FileDown className="w-4 h-4 text-rose-900" />
              <span>{isDownloadingPdf ? 'Generating…' : 'Download PDF'}</span>
            </button>
          )}
          <button
            id="retake-exam-btn"
            type="button"
            onClick={onRetakeExam}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg transition-colors shadow-sm min-h-[40px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake exam</span>
          </button>
        </div>
      </div>

      {/* Score cards — percentage first */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
          <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide block mb-1">Score</span>
          <span className={`text-3xl font-bold font-mono ${isPassed ? 'text-green-700' : 'text-red-700'}`}>
            {attempt.percentage}%
          </span>
          <span className="text-xs text-slate-400 block mt-0.5">{attempt.score} / {attempt.maxScore} marks</span>
        </div>

        <div className="bg-green-50 p-4 rounded-xl border border-green-200">
          <span className="text-[11px] font-medium text-green-700 uppercase tracking-wide flex items-center gap-1 mb-1">
            <Check className="w-3 h-3" /> Full marks
          </span>
          <span className="text-3xl font-bold font-mono text-green-900">{fullyCorrectCount}</span>
          <span className="text-xs text-green-600 block mt-0.5">stations (1.0 pt)</span>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
          <span className="text-[11px] font-medium text-amber-700 uppercase tracking-wide flex items-center gap-1 mb-1">
            <Minus className="w-3 h-3" /> Partial
          </span>
          <span className="text-3xl font-bold font-mono text-amber-900">{partiallyCorrectCount}</span>
          <span className="text-xs text-amber-600 block mt-0.5">stations (0.5 pt)</span>
        </div>

        <div className="bg-red-50 p-4 rounded-xl border border-red-200">
          <span className="text-[11px] font-medium text-red-700 uppercase tracking-wide flex items-center gap-1 mb-1">
            <XIcon className="w-3 h-3" /> Incorrect
          </span>
          <span className="text-3xl font-bold font-mono text-red-900">{incorrectCount}</span>
          <span className="text-xs text-red-600 block mt-0.5">stations (0.0 pt)</span>
        </div>
      </div>

      {/* Next actions */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs text-slate-500">
        <span>
          Time spent: <strong>{formatDuration(attempt.totalTimeSpentSeconds)}</strong>
          {' · '}Result saved to your local history.
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onScrollToReview}
            className="flex items-center gap-1 text-slate-700 hover:text-slate-900 font-semibold"
          >
            <ListCheck className="w-3.5 h-3.5" />
            Detailed review
          </button>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <button
            id="back-to-catalog-btn"
            type="button"
            onClick={onBackToCatalog}
            className="flex items-center gap-1 text-rose-950 hover:underline font-semibold"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Exam Library
          </button>
        </div>
      </div>
    </div>
  );
};
