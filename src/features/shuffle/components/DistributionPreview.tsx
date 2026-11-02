import React from 'react';
import { PieChart, CheckCircle2, BookOpen, Layers, Sparkles } from 'lucide-react';
import type { DistributionPreview as DistributionPreviewType } from '../types/shuffle.types';

interface DistributionPreviewProps {
  preview: DistributionPreviewType | null;
  isLoading?: boolean;
}

export const DistributionPreview: React.FC<DistributionPreviewProps> = ({
  preview,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          <div className="h-16 bg-slate-100 rounded-xl"></div>
          <div className="h-16 bg-slate-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!preview || preview.groups.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-850 rounded-2xl p-8 border border-slate-200/80 dark:border-slate-800 shadow-xs text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
          <PieChart className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No Distribution Data Available</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select at least one question to preview distribution.</p>
      </div>
    );
  }

  const activeGroups = preview.groups.filter((g) => g.allocatedCount > 0);

  return (
    <div className="bg-white dark:bg-slate-850 rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Distribution Preview</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800">
              <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              Stratified & Balanced
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Simulated question allocation across topic groups and lectures before generation
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Allocated Stations: </span>
            <span className="font-bold text-slate-900 dark:text-white font-mono">{preview.totalAllocated}</span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700">
            <span className="text-slate-500 dark:text-slate-400">Active Groups: </span>
            <span className="font-bold text-slate-900 dark:text-white font-mono">{activeGroups.length}</span>
          </div>
        </div>
      </div>

      {/* Topic Groups Breakdown */}
      <div className="space-y-4">
        {preview.groups.map((group) => {
          const isIncluded = group.allocatedCount > 0;
          const ratioPercent = group.availableCount > 0 ? (group.allocatedCount / group.availableCount) * 100 : 0;

          return (
            <div
              key={group.topicGroupId}
              className={`rounded-xl p-4 border transition-all ${
                isIncluded
                  ? 'bg-slate-50/60 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                  : 'bg-slate-50/20 dark:bg-slate-900/20 border-slate-100 dark:border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isIncluded ? 'bg-purple-100 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}>
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                      {group.topicGroupName}
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      {group.availableCount} in bank ({group.lectureBreakdown.length} lectures)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">
                      {group.allocatedCount}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">stations</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                    {group.percentageOfExam}% of quiz
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden my-2.5">
                <div
                  className="bg-gradient-to-r from-purple-700 to-indigo-600 dark:from-purple-500 dark:to-indigo-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, ratioPercent))}%` }}
                />
              </div>

              {/* Constituent Lecture Breakdown */}
              {isIncluded && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/80 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.lectureBreakdown.map((lec) => {
                    const lecAllocated = lec.allocatedCount > 0;
                    return (
                      <div
                        key={lec.lectureId}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border ${
                          lecAllocated
                            ? 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-700 text-slate-800 dark:text-slate-200 shadow-2xs'
                            : 'bg-slate-100/50 dark:bg-slate-850/50 border-transparent text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <BookOpen className={`w-3 h-3 shrink-0 ${lecAllocated ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400'}`} />
                          <span className="truncate">{lec.lectureName}</span>
                        </div>
                        <span className={`font-mono text-[11px] font-semibold shrink-0 ml-2 ${
                          lecAllocated ? 'text-slate-900 dark:text-white' : 'text-slate-400'
                        }`}>
                          {lec.allocatedCount} / {lec.availableCount}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
