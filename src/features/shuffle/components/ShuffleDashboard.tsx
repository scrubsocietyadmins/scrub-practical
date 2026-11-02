import React, { useState } from 'react';
import {
  Shuffle,
  Play,
  RotateCcw,
  Sparkles,
  BookOpen,
  Layers,
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Filter,
  CheckSquare,
  Square,
  Flame,
} from 'lucide-react';
import type { Question, Subject, Exam, ShuffleAttemptRecord } from '../../../types';
import { useShuffleExam } from '../hooks/useShuffleExam';
import { QuestionCountSelector } from './QuestionCountSelector';
import { DistributionPreview } from './DistributionPreview';

interface ShuffleDashboardProps {
  onStartExam: (
    exam: Exam,
    subject: Subject,
    questions: Question[],
    autoAdvanceOnBell: boolean
  ) => void;
  onNavigateToAuthoring?: () => void;
}

export const ShuffleDashboard: React.FC<ShuffleDashboardProps> = ({
  onStartExam,
  onNavigateToAuthoring,
}) => {
  const {
    isLoading,
    totalAvailable,
    bankSummary,
    targetCount,
    setTargetCount,
    selectedTopicGroupIds,
    setSelectedTopicGroupIds,
    selectedSubjectId,
    setSelectedSubjectId,
    randomizeOptions,
    setRandomizeOptions,
    distributionPreview,
    activeShuffleAttempt,
    startShuffleExam,
    resumeShuffleAttempt,
    discardActiveShuffleAttempt,
  } = useShuffleExam();

  const [autoAdvanceOnBell, setAutoAdvanceOnBell] = useState(false);
  const [stationDuration, setStationDuration] = useState<number>(90);
  const [isStarting, setIsStarting] = useState(false);

  const handleLaunch = async () => {
    if (totalAvailable === 0 || isStarting) return;
    setIsStarting(true);
    try {
      const result = await startShuffleExam({
        autoAdvanceOnBell,
        stationDurationSeconds: stationDuration,
      });
      onStartExam(result.exam, result.subject, result.questions, result.autoAdvanceOnBell);
    } catch (err) {
      console.error('Failed to launch shuffle exam:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const handleResume = async () => {
    if (!activeShuffleAttempt) return;
    setIsStarting(true);
    try {
      const result = await resumeShuffleAttempt();
      if (result) {
        onStartExam(result.exam, result.subject, result.questions, false);
      }
    } catch (err) {
      console.error('Failed to resume shuffle attempt:', err);
    } finally {
      setIsStarting(false);
    }
  };

  const toggleTopicGroup = (groupId: string) => {
    setSelectedTopicGroupIds((prev) => {
      if (prev.includes(groupId)) {
        return prev.filter((id) => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  const handleSelectAllTopics = () => {
    setSelectedTopicGroupIds([]);
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="h-28 bg-slate-100 rounded-3xl animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
          <div className="lg:col-span-2 h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  const allTopicGroups = bankSummary?.topicGroups || [];
  const totalLectures = bankSummary?.totalLectures || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Banner: In-Progress Shuffle Attempt Resume */}
      {activeShuffleAttempt && (
        <div className="bg-amber-50 border border-amber-300/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900">
                In-Progress Shuffle Session Detected
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                You have an uncompleted {activeShuffleAttempt.totalQuestions}-question shuffle practice from{' '}
                {new Date(activeShuffleAttempt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={discardActiveShuffleAttempt}
              className="px-3 py-1.5 text-xs font-semibold text-amber-800 hover:text-amber-950 hover:bg-amber-100/60 rounded-lg transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleResume}
              disabled={isStarting}
              className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Resume Session
            </button>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm relative overflow-hidden border border-slate-800">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-950/80 text-rose-200 border border-rose-800/60 text-xs font-semibold tracking-wide">
            <Shuffle className="w-3.5 h-3.5 text-rose-300" />
            Stratified Sampling Practice
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
            Practice
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            Generate customized, balanced station sets sampled randomly across medical topic groups and lectures.
            Guarantees proportional topic representation, zero duplicate stations, and authentic station pacing.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-800">
          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-xs text-slate-400">Total Bank</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-0.5">
              {bankSummary?.totalQuestions || 0}
            </div>
            <div className="text-[10px] text-rose-300">Stations Available</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-xs text-slate-400">Topic Groups</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-0.5">
              {allTopicGroups.length}
            </div>
            <div className="text-[10px] text-rose-300">Curriculum Clusters</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-xs text-slate-400">Lectures</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-0.5">
              {totalLectures}
            </div>
            <div className="text-[10px] text-rose-300">Distinct Modules</div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs rounded-xl p-3 border border-white/10">
            <div className="text-xs text-slate-400">Mode</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-green-400 mt-0.5">
              Self-Graded
            </div>
            <div className="text-[10px] text-slate-400">Full Answer Key</div>
          </div>
        </div>
      </div>

      {/* Main Configuration Layout */}
      {totalAvailable === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-900">No Questions in Question Bank</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            The question bank is currently empty. Create exams in the Authoring Studio or import exam packages to populate the bank.
          </p>
          {onNavigateToAuthoring && (
            <button
              type="button"
              onClick={onNavigateToAuthoring}
              className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Go to Authoring Studio
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Configuration Controls (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Question Count Selector */}
            <QuestionCountSelector
              count={targetCount}
              max={totalAvailable}
              min={1}
              onChange={setTargetCount}
              disabled={isStarting}
            />

            {/* 2. Topic Group Filter Selector */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                    <Filter className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Curriculum Filters</h3>
                    <p className="text-xs text-slate-500">Focus on all topics or select specific groups</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllTopics}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                    selectedTopicGroupIds.length === 0
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  All Topics ({allTopicGroups.length})
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {allTopicGroups.map((group) => {
                  const isChecked =
                    selectedTopicGroupIds.length === 0 ||
                    selectedTopicGroupIds.includes(group.topicGroupId);

                  return (
                    <div
                      key={group.topicGroupId}
                      onClick={() => toggleTopicGroup(group.topicGroupId)}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                        isChecked
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-white border-slate-100 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-rose-950 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className="text-xs font-medium truncate">{group.topicGroupName}</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 shrink-0 ml-2">
                        {group.totalQuestions} q
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Examination Options */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                Session Settings
              </h3>

              <div className="space-y-3">
                {/* Duration per Station */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 font-medium">Station Bell Duration:</span>
                  <div className="flex items-center gap-1.5 font-mono">
                    {[60, 90, 120].map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setStationDuration(sec)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer ${
                          stationDuration === sec
                            ? 'bg-rose-950 text-white border-rose-950'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>

                {/* Auto-advance Toggle */}
                <label className="flex items-center justify-between text-xs cursor-pointer select-none py-1">
                  <span className="text-slate-700 font-medium">Auto-Advance on Station Bell</span>
                  <input
                    type="checkbox"
                    checked={autoAdvanceOnBell}
                    onChange={(e) => setAutoAdvanceOnBell(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-950 focus:ring-rose-900/30 cursor-pointer"
                  />
                </label>

                {/* Randomize Option Order */}
                <label className="flex items-center justify-between text-xs cursor-pointer select-none py-1">
                  <span className="text-slate-700 font-medium">Randomize MCQ Option Order</span>
                  <input
                    type="checkbox"
                    checked={randomizeOptions}
                    onChange={(e) => setRandomizeOptions(e.target.checked)}
                    className="w-4 h-4 rounded text-rose-950 focus:ring-rose-900/30 cursor-pointer"
                  />
                </label>
              </div>
            </div>

            {/* Launch CTA Button */}
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isStarting || totalAvailable === 0}
              className="w-full py-4 px-6 bg-rose-950 hover:bg-rose-900 active:scale-[0.99] text-white rounded-2xl font-bold text-base shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-5 h-5 text-rose-300 fill-rose-300" />
              <span>
                Start Shuffle Practice ({Math.min(targetCount, totalAvailable)} Stations)
              </span>
            </button>
          </div>

          {/* Right Column: Live Distribution Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <DistributionPreview
              preview={distributionPreview}
              isLoading={isLoading}
            />

            {/* Explanatory Callout */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <HelpCircle className="w-4 h-4 text-slate-500" />
                How the Stratified Practice Engine Works
              </div>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>
                  <strong>Proportional Quotas:</strong> Target count is divided evenly among all available topic groups and lectures.
                </li>
                <li>
                  <strong>Surplus Redistribution:</strong> If a lecture or group lacks enough questions, surplus quota is automatically redistributed to other active topics.
                </li>
                <li>
                  <strong>Fisher-Yates Sampling:</strong> True uniform random selection guarantees no bias or question repetition.
                </li>
                <li>
                  <strong>Integrated Self-Grading:</strong> After completing the exam, you immediately enter the full self-grading interface with reference answers, medical specimens, and scoring rubrics.
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
