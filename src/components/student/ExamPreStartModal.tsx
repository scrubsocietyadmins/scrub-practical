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
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full overflow-hidden transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-1">
              {isBellRing ? 'Bell ring mode' : isTotalTimer ? 'Total timer mode' : 'Flexible mode'}
            </p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{exam.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors -mt-1 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Key stats — mode-aware */}
          <div
            className={`grid gap-2 text-center p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl ${
              isBellRing ? 'grid-cols-3' : isTotalTimer ? 'grid-cols-2' : 'grid-cols-2'
            }`}
          >
            <div>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Stations</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">{stationCount}</span>
            </div>

            {isBellRing && (
              <div className="border-x border-slate-200 dark:border-slate-700">
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Per station</span>
                <span className="text-xl font-bold text-purple-700 dark:text-purple-400 font-mono">
                  {exam.stationDurationSeconds}s
                </span>
              </div>
            )}

            {isTotalTimer && (
              <div className="border-l border-slate-200 dark:border-slate-700">
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Total time</span>
                <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                  {exam.totalDurationMinutes}min
                </span>
              </div>
            )}

            {isFlexible && (
              <div className="border-l border-slate-200 dark:border-slate-700">
                <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Timing</span>
                <span className="text-base font-bold text-slate-700 dark:text-slate-300">Self-paced</span>
              </div>
            )}

            <div className={isBellRing ? '' : ''}>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 font-medium">Pass threshold</span>
              <span className="text-xl font-bold text-slate-900 dark:text-white font-mono">
                {exam.passingScorePercent}%
              </span>
            </div>
          </div>

          {/* Mode-specific explanation */}
          {isBellRing && (
            <div className="flex gap-3 p-3.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 rounded-lg">
              <Bell className="w-4 h-4 text-purple-700 dark:text-purple-400 shrink-0 mt-0.5" />
              <div className="text-xs text-purple-950 dark:text-purple-200 space-y-1">
                <p className="font-semibold text-purple-900 dark:text-purple-300">OSPE bell ring</p>
                <p className="text-purple-800 dark:text-purple-200/90 leading-relaxed">
                  A bell chimes every <strong>{exam.stationDurationSeconds} seconds</strong> to signal
                  station rotation. Estimated total: ~{estimatedMinutes} minutes.
                  You can navigate stations freely between chimes.
                </p>
              </div>
            </div>
          )}

          {isTotalTimer && (
            <div className="flex gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Timer className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white">Total timer</p>
                <p className="leading-relaxed">
                  One countdown of <strong>{exam.totalDurationMinutes} minutes</strong> covers the
                  entire exam. Navigate stations in any order. When time runs out the exam stops and
                  you'll be taken to the review screen.
                </p>
              </div>
            </div>
          )}

          {isFlexible && (
            <div className="flex gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg">
              <Zap className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-slate-900 dark:text-white">Flexible — no forced countdown</p>
                <p className="leading-relaxed">
                  No bell and no time limit. Navigate at your own pace. Elapsed time is shown for
                  your reference only. Finish when you're ready.
                </p>
              </div>
            </div>
          )}

          {exam.instructions && (
            <div className="space-y-1.5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                Candidate instructions
              </h3>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                {exam.instructions}
              </p>
            </div>
          )}

          {/* Auto-advance toggle — only for bell ring mode */}
          {isBellRing && (
            <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="pt-0.5">
                  <input
                    id="auto-advance-checkbox"
                    type="checkbox"
                    checked={autoAdvanceOnBell}
                    onChange={(e) => setAutoAdvanceOnBell(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-purple-600 focus:ring-purple-600/30 dark:bg-slate-800"
                  />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                    Strict rotation — advance automatically on bell
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                    When unchecked, the bell chimes but you stay on the station until you move manually.
                  </span>
                </div>
              </label>
            </div>
          )}

          {/* Auto-save note */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
            <Crosshair className="w-3 h-3" />
            Answers are saved automatically on this device.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-h-[40px] cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="confirm-start-exam-btn"
              type="button"
              onClick={() => onConfirmStart({ autoAdvanceOnBell })}
              className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-500 rounded-lg transition-all shadow-md min-h-[44px] cursor-pointer"
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
