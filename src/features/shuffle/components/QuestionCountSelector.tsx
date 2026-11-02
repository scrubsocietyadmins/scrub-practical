import React from 'react';
import { Minus, Plus, HelpCircle, Layers } from 'lucide-react';

interface QuestionCountSelectorProps {
  count: number;
  max: number;
  min?: number;
  onChange: (count: number) => void;
  disabled?: boolean;
}

export const QuestionCountSelector: React.FC<QuestionCountSelectorProps> = ({
  count,
  max,
  min = 1,
  onChange,
  disabled = false,
}) => {
  const safeMax = Math.max(min, max);
  const safeCount = Math.min(Math.max(min, count), safeMax);

  const presets = [5, 10, 15, 20, safeMax].filter(
    (val, idx, arr) => val <= safeMax && arr.indexOf(val) === idx
  );

  const handleDecrement = () => {
    if (safeCount > min) {
      onChange(safeCount - 1);
    }
  };

  const handleIncrement = () => {
    if (safeCount < safeMax) {
      onChange(safeCount + 1);
    }
  };

  const percentOfBank = safeMax > 0 ? Math.round((safeCount / safeMax) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Question Volume</h3>
            <p className="text-xs text-slate-500">Select target question count for this shuffle practice</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {percentOfBank}% of Bank ({safeCount}/{safeMax})
          </span>
        </div>
      </div>

      {/* Main Counter & Stepper */}
      <div className="flex items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200/60">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || safeCount <= min}
          aria-label="Decrease question count"
          className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white active:scale-95 transition-all shadow-2xs font-semibold cursor-pointer min-h-[44px] min-w-[44px]"
        >
          <Minus className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="text-4xl font-extrabold text-slate-900 tracking-tight font-mono">
            {safeCount}
          </div>
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">
            Questions
          </div>
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || safeCount >= safeMax}
          aria-label="Increase question count"
          className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white active:scale-95 transition-all shadow-2xs font-semibold cursor-pointer min-h-[44px] min-w-[44px]"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Slider */}
      <div className="space-y-1.5 pt-1">
        <input
          type="range"
          min={min}
          max={safeMax}
          value={safeCount}
          disabled={disabled || safeMax <= min}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-950 disabled:opacity-50"
        />
        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>{min} station</span>
          <span>{Math.round(safeMax / 2)} stations</span>
          <span>{safeMax} (Full Bank)</span>
        </div>
      </div>

      {/* Quick Preset Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <span className="text-xs font-medium text-slate-500 mr-1">Quick Sets:</span>
        {presets.map((presetVal) => {
          const isSelected = safeCount === presetVal;
          const label = presetVal === safeMax ? `Max (${safeMax})` : `${presetVal}`;
          return (
            <button
              key={presetVal}
              type="button"
              disabled={disabled}
              onClick={() => onChange(presetVal)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer min-h-[36px] ${
                isSelected
                  ? 'bg-rose-950 text-white shadow-2xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
