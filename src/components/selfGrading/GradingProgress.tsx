import React from 'react';
import { ChevronLeft, ChevronRight, Send, CheckCircle2 } from 'lucide-react';
import type { Question, SelfGradeValue } from '../../types';

interface GradingProgressProps {
  questions: Question[];
  currentQuestionIndex: number;
  grades: Record<string, SelfGradeValue>;
  accumulatedScore: number;
  maxPossibleScore: number;
  onSelectQuestion: (index: number) => void;
  onPrevQuestion: () => void;
  onNextQuestion: () => void;
  onRequestFinalize: () => void;
}

export const GradingProgress: React.FC<GradingProgressProps> = ({
  questions,
  currentQuestionIndex,
  grades,
  accumulatedScore,
  maxPossibleScore,
  onSelectQuestion,
  onPrevQuestion,
  onNextQuestion,
  onRequestFinalize,
}) => {
  const totalQuestions = questions.length;
  const gradedCount = Object.keys(grades).length;
  const remainingCount = totalQuestions - gradedCount;
  const progressPercent = totalQuestions > 0 ? Math.round((gradedCount / totalQuestions) * 100) : 0;
  const allGraded = gradedCount === totalQuestions;

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-20 shadow-xs transition-colors">
      {/* Progress bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 overflow-hidden">
        <div
          className={`h-full transition-[width] duration-300 ease-out ${allGraded ? 'bg-emerald-600' : 'bg-gradient-to-r from-purple-700 to-indigo-600'}`}
          style={{ width: `${progressPercent}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        {/* Concise sticky strip */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Station identity + grading counts */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              Station {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
            <span className="text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">{gradedCount}</span> graded
            </span>
            {remainingCount > 0 && (
              <>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                <span className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{remainingCount}</span> remaining
                </span>
              </>
            )}
            {allGraded && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Ready to finalize
              </span>
            )}
          </div>

          {/* Navigation + finalize */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentQuestionIndex === 0}
              onClick={onPrevQuestion}
              aria-label="Previous station"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors min-h-[36px] cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              type="button"
              disabled={currentQuestionIndex >= totalQuestions - 1}
              onClick={onNextQuestion}
              aria-label="Next station"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors min-h-[36px] cursor-pointer"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              id="finalize-grading-btn"
              type="button"
              onClick={onRequestFinalize}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs min-h-[36px] cursor-pointer ${
                allGraded
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 text-white'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>{allGraded ? 'Finalize result' : 'Finalize'}</span>
            </button>
          </div>
        </div>

        {/* Station selector bar */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 mt-2.5 scrollbar-thin" role="list" aria-label="Station grading status">
          {questions.map((q, idx) => {
            const isCurrent = idx === currentQuestionIndex;
            const grade = grades[q.id];

            let style = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-transparent hover:bg-slate-200 dark:hover:bg-slate-700';
            if (grade === 1) style = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 font-bold';
            else if (grade === 0.5) style = 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold';
            else if (grade === 0) style = 'bg-red-100 dark:bg-red-950/60 text-red-900 dark:text-red-300 border border-red-300 dark:border-red-800 font-bold';

            if (isCurrent) style += ' ring-2 ring-purple-600 shadow-xs';

            return (
              <button
                key={q.id}
                role="listitem"
                type="button"
                onClick={() => onSelectQuestion(idx)}
                title={`Station ${idx + 1}: ${grade !== undefined ? `Graded ${grade} pt` : 'Not yet graded'}`}
                aria-label={`Station ${idx + 1}, ${grade !== undefined ? `${grade} point` : 'ungraded'}`}
                aria-current={isCurrent ? 'true' : undefined}
                className={`relative px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 flex items-center gap-1 cursor-pointer ${style}`}
              >
                <span>{idx + 1}</span>
                {grade !== undefined ? (
                  <span className="text-[10px] font-bold opacity-75">{grade}</span>
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
