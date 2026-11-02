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
      <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
          <PieChart className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800">No Distribution Data Available</h4>
        <p className="text-xs text-slate-500 mt-1">Select at least one question to preview distribution.</p>
      </div>
    );
  }

  const activeGroups = preview.groups.filter((g) => g.allocatedCount > 0);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900">Distribution Preview</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200/60">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Stratified & Balanced
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Simulated question allocation across topic groups and lectures before generation
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
            <span className="text-slate-500">Allocated Stations: </span>
            <span className="font-bold text-slate-900 font-mono">{preview.totalAllocated}</span>
          </div>
          <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
            <span className="text-slate-500">Active Groups: </span>
            <span className="font-bold text-slate-900 font-mono">{activeGroups.length}</span>
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
                  ? 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                  : 'bg-slate-50/20 border-slate-100 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isIncluded ? 'bg-rose-100 text-rose-900' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Layers className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {group.topicGroupName}
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {group.availableCount} in bank ({group.lectureBreakdown.length} lectures)
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-lg font-bold font-mono text-slate-900">
                      {group.allocatedCount}
                    </span>
                    <span className="text-xs text-slate-500">stations</span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    {group.percentageOfExam}% of quiz
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden my-2.5">
                <div
                  className="bg-rose-950 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, ratioPercent))}%` }}
                />
              </div>

              {/* Constituent Lecture Breakdown */}
              {isIncluded && (
                <div className="mt-3 pt-2.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.lectureBreakdown.map((lec) => {
                    const lecAllocated = lec.allocatedCount > 0;
                    return (
                      <div
                        key={lec.lectureId}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs border ${
                          lecAllocated
                            ? 'bg-white border-slate-200/80 text-slate-800 shadow-2xs'
                            : 'bg-slate-100/50 border-transparent text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <BookOpen className={`w-3 h-3 shrink-0 ${lecAllocated ? 'text-rose-900' : 'text-slate-400'}`} />
                          <span className="truncate">{lec.lectureName}</span>
                        </div>
                        <span className={`font-mono text-[11px] font-semibold shrink-0 ml-2 ${
                          lecAllocated ? 'text-slate-900' : 'text-slate-400'
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
