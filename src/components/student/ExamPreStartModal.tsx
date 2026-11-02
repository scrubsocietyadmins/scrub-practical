import React, { useState } from 'react';
import { X, Clock, Bell, Crosshair, Play, Info, Timer, Zap } from 'lucide-react';
import type { Exam } from '../../types';

interface ExamPreStartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmStart: (config: { autoAdvanceOnBell: boolean }) => void;
  exam: Exam;
  stationCount: number;
}

export const ExamPreStartModal: React.FC<ExamPreStartModalProps> = ({
  isOpen,
  onClose,
  onConfirmStart,
  exam,
  stationCount,
}) => {
  const [autoAdvanceOnBell, setAutoAdvanceOnBell] = useState(false);

  if (!isOpen) return null;

  const isBellRing = exam.timingMode === 'bell_ring';
  const isTotalTimer = exam.timingMode === 'total_timer';
  const isFlexible = exam.timingMode === 'flexible';

  const estimatedMinutes = isBellRing
    ? Math.ceil((stationCount * exam.stationDurationSeconds) / 60)
    : exam.totalDurationMinutes || 20;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
              {isBellRing ? 'Bell ring mode' : isTotalTimer ? 'Total timer mode' : 'Flexible mode'}
            </p>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">{exam.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors -mt-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Key stats — mode-aware */}
          <div
            className={`grid gap-2 text-center p-4 bg-slate-50 border border-slate-200 rounded-xl ${
              isBellRing ? 'grid-cols-3' : isTotalTimer ? 'grid-cols-2' : 'grid-cols-2'
            }`}
          >
            <div>
              <span className="block text-[11px] text-slate-500 font-medium">Stations</span>
              <span className="text-xl font-bold text-slate-900 font-mono">{stationCount}</span>
            </div>

            {isBellRing && (
              <div className="border-x border-slate-200">
                <span className="block text-[11px] text-slate-500 font-medium">Per station</span>
                <span className="text-xl font-bold text-rose-900 font-mono">
                  {exam.stationDurationSeconds}s
                </span>
              </div>
            )}

            {isTotalTimer && (
              <div className="border-l border-slate-200">
                <span className="block text-[11px] text-slate-500 font-medium">Total time</span>
                <span className="text-xl font-bold text-slate-900 font-mono">
                  {exam.totalDurationMinutes}min
                </span>
              </div>
            )}

            {isFlexible && (
              <div className="border-l border-slate-200">
                <span className="block text-[11px] text-slate-500 font-medium">Timing</span>
                <span className="text-base font-bold text-slate-700">Self-paced</span>
              </div>
            )}

            <div className={isBellRing ? '' : ''}>
              <span className="block text-[11px] text-slate-500 font-medium">Pass threshold</span>
              <span className="text-xl font-bold text-slate-900 font-mono">
                {exam.passingScorePercent}%
              </span>
            </div>
          </div>

          {/* Mode-specific explanation */}
          {isBellRing && (
            <div className="flex gap-3 p-3.5 bg-rose-50 border border-rose-100 rounded-lg">
              <Bell className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 space-y-1">
                <p className="font-semibold">OSPE bell ring</p>
                <p className="text-rose-800 leading-relaxed">
                  A bell chimes every <strong>{exam.stationDurationSeconds} seconds</strong> to signal
                  station rotation. Estimated total: ~{estimatedMinutes} minutes.
                  You can navigate stations freely between chimes.
                </p>
              </div>
            </div>
          )}

          {isTotalTimer && (
            <div className="flex gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <Timer className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 space-y-1">
                <p className="font-semibold">Total timer</p>
                <p className="leading-relaxed">
                  One countdown of <strong>{exam.totalDurationMinutes} minutes</strong> covers the
                  entire exam. Navigate stations in any order. When time runs out the exam stops and
                  you'll be taken to the review screen.
                </p>
              </div>
            </div>
          )}

          {isFlexible && (
            <div className="flex gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
              <Zap className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 space-y-1">
                <p className="font-semibold">Flexible — no forced countdown</p>
                <p className="leading-relaxed">
                  No bell and no time limit. Navigate at your own pace. Elapsed time is shown for
                  your reference only. Finish when you're ready.
                </p>
              </div>
            </div>
          )}

          {/* Instructions */}
          {exam.instructions && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Candidate instructions
              </h3>
              <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                {exam.instructions}
              </p>
            </div>
          )}

          {/* Auto-advance toggle — only for bell ring mode */}
          {isBellRing && (
            <div className="pt-1 border-t border-slate-100">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="pt-0.5">
                  <input
                    id="auto-advance-checkbox"
                    type="checkbox"
                    checked={autoAdvanceOnBell}
                    onChange={(e) => setAutoAdvanceOnBell(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-rose-900 focus:ring-rose-900/30"
                  />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block group-hover:text-slate-900">
                    Strict rotation — advance automatically on bell
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    When unchecked, the bell chimes but you stay on the station until you move manually.
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Auto-save note */}
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Crosshair className="w-3 h-3" />
            Answers are saved automatically on this device.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[40px]"
            >
              Cancel
            </button>
            <button
              id="confirm-start-exam-btn"
              type="button"
              onClick={() => onConfirmStart({ autoAdvanceOnBell })}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg transition-colors shadow-sm min-h-[44px]"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Begin exam</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
