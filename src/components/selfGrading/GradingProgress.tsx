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
    <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
      {/* Progress bar */}
      <div className="w-full bg-slate-100 h-1 overflow-hidden">
        <div
          className={`h-full transition-[width] duration-300 ease-out ${allGraded ? 'bg-green-600' : 'bg-rose-950'}`}
          style={{ width: `${progressPercent}%` }}
          aria-hidden="true"
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
        {/* Concise sticky strip */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Station identity + grading counts */}
          <div className="flex items-center gap-3 text-xs">
            <span className="font-semibold text-slate-700">
              Station {currentQuestionIndex + 1} of {totalQuestions}
            </span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-slate-600">
              <span className="font-semibold text-green-700">{gradedCount}</span> graded
            </span>
            {remainingCount > 0 && (
              <>
                <span className="text-slate-300" aria-hidden="true">·</span>
                <span className="text-slate-600">
                  <span className="font-semibold text-amber-700">{remainingCount}</span> remaining
                </span>
              </>
            )}
            {allGraded && (
              <span className="flex items-center gap-1 text-green-700 font-semibold">
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
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors min-h-[36px]"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <button
              type="button"
              disabled={currentQuestionIndex >= totalQuestions - 1}
              onClick={onNextQuestion}
              aria-label="Next station"
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors min-h-[36px]"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              id="finalize-grading-btn"
              type="button"
              onClick={onRequestFinalize}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg transition-colors shadow-sm min-h-[36px] ${
                allGraded
                  ? 'bg-green-700 hover:bg-green-800 text-white'
                  : 'bg-rose-950 hover:bg-rose-900 text-white'
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

            let style = 'bg-slate-100 text-slate-600 border border-transparent hover:bg-slate-200';
            if (grade === 1) style = 'bg-green-100 text-green-900 border border-green-300 font-bold';
            else if (grade === 0.5) style = 'bg-amber-100 text-amber-900 border border-amber-300 font-bold';
            else if (grade === 0) style = 'bg-red-100 text-red-900 border border-red-300 font-bold';

            if (isCurrent) style += ' ring-2 ring-rose-950 shadow-sm';

            return (
              <button
                key={q.id}
                role="listitem"
                type="button"
                onClick={() => onSelectQuestion(idx)}
                title={`Station ${idx + 1}: ${grade !== undefined ? `Graded ${grade} pt` : 'Not yet graded'}`}
                aria-label={`Station ${idx + 1}, ${grade !== undefined ? `${grade} point` : 'ungraded'}`}
                aria-current={isCurrent ? 'true' : undefined}
                className={`relative px-2.5 py-1 rounded-lg text-xs font-mono transition-all shrink-0 flex items-center gap-1 ${style}`}
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
