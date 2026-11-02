import React from 'react';
import { Check, Slash, X, AlertCircle } from 'lucide-react';
import type { SelfGradeValue } from '../../types';

interface SelfGradingControlsProps {
  currentGrade?: SelfGradeValue;
  onSelectGrade: (grade: SelfGradeValue) => void;
  maxPoints?: number;
  disabled?: boolean;
  isAutoGraded?: boolean;
}

export const SelfGradingControls: React.FC<SelfGradingControlsProps> = ({
  currentGrade,
  onSelectGrade,
  maxPoints = 1,
  disabled = false,
  isAutoGraded = false,
}) => {
  const fullPts = maxPoints;
  const partialPts = Math.round(maxPoints * 0.5 * 10) / 10;
  const awardedPoints = currentGrade !== undefined ? Math.round(currentGrade * maxPoints * 10) / 10 : null;

  return (
    <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-2xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>Assign Your Grade:</span>
            <span className="text-[10px] font-normal text-slate-500 dark:text-slate-400 normal-case">
              (Evaluate candidate response against reference criteria)
            </span>
          </h4>
          {isAutoGraded && (
            <span className="inline-flex items-center gap-1 text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 text-[10px]">
              Auto-Graded (Objective MCQ)
            </span>
          )}
        </div>
        <div className="text-[11px] font-mono">
          {awardedPoints !== null ? (
            <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Grade Selected: {awardedPoints} / {maxPoints} Point{maxPoints !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-800 dark:text-amber-300 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-3 h-3" />
              <span>Pending Selection</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Option 1: Full Credit */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectGrade(1)}
          className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
            currentGrade === 1
              ? 'border-emerald-600 bg-emerald-50/90 dark:bg-emerald-950/50 ring-2 ring-emerald-600/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold transition-colors ${
              currentGrade === 1
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200">{fullPts} Point{fullPts !== 1 ? 's' : ''}</span>
              <span className="text-[10px] font-mono font-bold bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 px-1.5 rounded">
                100%
              </span>
            </div>
            <p className="text-[11px] text-emerald-900/80 dark:text-emerald-300/80 leading-tight mt-0.5">
              Fully correct identification and clinical accuracy.
            </p>
          </div>
        </button>

        {/* Option 2: Partial Credit */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectGrade(0.5)}
          className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
            currentGrade === 0.5
              ? 'border-amber-600 bg-amber-50/90 dark:bg-amber-950/50 ring-2 ring-amber-600/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:bg-amber-50/30 dark:hover:bg-amber-950/30'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold transition-colors ${
              currentGrade === 0.5
                ? 'bg-amber-600 text-white'
                : 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
            }`}
          >
            <Slash className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 dark:text-amber-200">{partialPts} Point{partialPts !== 1 ? 's' : ''}</span>
              <span className="text-[10px] font-mono font-bold bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 px-1.5 rounded">
                50%
              </span>
            </div>
            <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 leading-tight mt-0.5">
              Partially correct response or minor terminology omission.
            </p>
          </div>
        </button>

        {/* Option 3: 0 Points (Incorrect) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectGrade(0)}
          className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
            currentGrade === 0
              ? 'border-rose-600 bg-rose-50/90 dark:bg-rose-950/50 ring-2 ring-rose-600/20 shadow-xs'
              : 'border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-600 hover:bg-rose-50/30 dark:hover:bg-rose-950/30'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold transition-colors ${
              currentGrade === 0 ? 'bg-rose-600 text-white' : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
            }`}
          >
            <X className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-950 dark:text-rose-200">0 Points</span>
              <span className="text-[10px] font-mono font-bold bg-rose-200/80 dark:bg-rose-900/60 text-rose-900 dark:text-rose-200 px-1.5 rounded">
                0%
              </span>
            </div>
            <p className="text-[11px] text-rose-900/80 dark:text-rose-300/80 leading-tight mt-0.5">
              Incorrect identification or misdiagnosed pathology.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
