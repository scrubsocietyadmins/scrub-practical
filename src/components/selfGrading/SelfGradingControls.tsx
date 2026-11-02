import React from 'react';
import { Check, Slash, X, AlertCircle } from 'lucide-react';
import type { SelfGradeValue } from '../../types';

interface SelfGradingControlsProps {
  currentGrade?: SelfGradeValue;
  onSelectGrade: (grade: SelfGradeValue) => void;
  maxPoints?: number;
  disabled?: boolean;
}

export const SelfGradingControls: React.FC<SelfGradingControlsProps> = ({
  currentGrade,
  onSelectGrade,
  maxPoints = 1,
  disabled = false,
}) => {
  return (
    <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-slate-100">
        <div>
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span>Assign Your Grade:</span>
            <span className="text-[10px] font-normal text-slate-500 normal-case">
              (Evaluate candidate response against reference criteria)
            </span>
          </h4>
        </div>
        <div className="text-[11px] font-mono">
          {currentGrade !== undefined ? (
            <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Grade Selected: {currentGrade} / {maxPoints}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              <AlertCircle className="w-3 h-3" />
              <span>Pending Selection</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Option 1: 1.0 Point (Fully Correct) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectGrade(1)}
          className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
            currentGrade === 1
              ? 'border-emerald-600 bg-emerald-50/90 ring-2 ring-emerald-600/20 shadow-xs'
              : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold transition-colors ${
              currentGrade === 1
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            <Check className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950">1 Point</span>
              <span className="text-[10px] font-mono font-bold bg-emerald-200/80 text-emerald-900 px-1.5 rounded">
                100%
              </span>
            </div>
            <p className="text-[11px] text-emerald-900/80 leading-tight mt-0.5">
              Fully correct identification and clinical accuracy.
            </p>
          </div>
        </button>

        {/* Option 2: 0.5 Points (Partially Correct) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectGrade(0.5)}
          className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
            currentGrade === 0.5
              ? 'border-amber-600 bg-amber-50/90 ring-2 ring-amber-600/20 shadow-xs'
              : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold transition-colors ${
              currentGrade === 0.5
                ? 'bg-amber-600 text-white'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <Slash className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950">0.5 Points</span>
              <span className="text-[10px] font-mono font-bold bg-amber-200/80 text-amber-900 px-1.5 rounded">
                50%
              </span>
            </div>
            <p className="text-[11px] text-amber-900/80 leading-tight mt-0.5">
              Partially correct response or minor terminology omission.
            </p>
          </div>
        </button>

        {/* Option 3: 0 Points (Incorrect) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectGrade(0)}
          className={`flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
            currentGrade === 0
              ? 'border-rose-600 bg-rose-50/90 ring-2 ring-rose-600/20 shadow-xs'
              : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/30'
          }`}
        >
          <div
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold transition-colors ${
              currentGrade === 0 ? 'bg-rose-600 text-white' : 'bg-rose-100 text-rose-800'
            }`}
          >
            <X className="w-4 h-4 stroke-[3]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-950">0 Points</span>
              <span className="text-[10px] font-mono font-bold bg-rose-200/80 text-rose-900 px-1.5 rounded">
                0%
              </span>
            </div>
            <p className="text-[11px] text-rose-900/80 leading-tight mt-0.5">
              Incorrect identification or misdiagnosed pathology.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
