import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Clock,
  Play,
  Crosshair,
  Search,
  X,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ChevronDown,
  Lock,
  Award,
  Calendar,
  Eye,
  TrendingUp,
  FileCheck,
} from 'lucide-react';
import { db } from '../../db';
import type { Exam, Subject, ExamAttempt } from '../../types';

interface ExamCatalogProps {
  onStartExam: (exam: Exam) => void;
  onNavigateToMissingImages: () => void;
  onNavigateToHistory?: () => void;
  onReviewAttempt?: (attempt: ExamAttempt) => void;
}

function getTimingLabel(exam: Exam): string {
  switch (exam.timingMode) {
    case 'bell_ring':
      return `${exam.stationDurationSeconds}s per station`;
    case 'total_timer':
      return `${exam.totalDurationMinutes}min total`;
    case 'flexible':
      return 'Self-paced';
    default:
      return '';
  }
}

function getTimingIcon(exam: Exam): React.ReactNode {
  switch (exam.timingMode) {
    case 'bell_ring':
      return <span className="text-[10px] font-mono bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 px-1.5 py-0.5 rounded">Bell ring</span>;
    case 'total_timer':
      return <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded">Total timer</span>;
    case 'flexible':
      return <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600 px-1.5 py-0.5 rounded">Flexible</span>;
    default:
      return null;
  }
}

function formatAttemptDate(timestamp: number): string {
  if (!timestamp) return 'Recently';
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export const ExamCatalog: React.FC<ExamCatalogProps> = ({
  onStartExam,
  onNavigateToMissingImages,
  onNavigateToHistory,
  onReviewAttempt,
}) => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [examStationCounts, setExamStationCounts] = useState<Record<string, number>>({});
  const [pastAttempts, setPastAttempts] = useState<Record<string, ExamAttempt[]>>({});
  const [missingImagesMap, setMissingImagesMap] = useState<
    Record<string, Array<{ questionId: string; questionTitle: string; imageId: string }>>
  >({});
  const [blockedExamModal, setBlockedExamModal] = useState<{
    examTitle: string;
    missing: Array<{ questionId: string; questionTitle: string; imageId: string }>;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      // Only load published exams for the student library
      const allExams = await db.exams.where('status').equals('published').toArray();
      const allSubjects = await db.subjects.toArray();
      const allAttempts = await db.attempts.toArray();

      setExams(allExams);
      setSubjects(allSubjects);

      const counts: Record<string, number> = {};
      const missingMap: Record<string, Array<{ questionId: string; questionTitle: string; imageId: string }>> = {};
      for (const ex of allExams) {
        counts[ex.id] = await db.questions.where('examId').equals(ex.id).count();
        const questions = await db.questions.where('examId').equals(ex.id).toArray();
        const missing: Array<{ questionId: string; questionTitle: string; imageId: string }> = [];
        for (const q of questions) {
          if (q.type === 'spotter' || q.type === 'image_mcq') {
            if (!q.imageId) {
              missing.push({
                questionId: q.id,
                questionTitle: q.title || `Station ${q.orderIndex + 1}`,
                imageId: 'UNASSIGNED',
              });
            } else {
              const img = await db.images.get(q.imageId);
              if (!img || !img.blob || img.blob.size === 0 || img.status === 'missing') {
                missing.push({
                  questionId: q.id,
                  questionTitle: q.title || `Station ${q.orderIndex + 1}`,
                  imageId: q.imageId,
                });
              }
            }
          }
        }
        missingMap[ex.id] = missing;
      }
      setExamStationCounts(counts);
      setMissingImagesMap(missingMap);

      const attemptsMap: Record<string, ExamAttempt[]> = {};
      for (const att of allAttempts) {
        if (!attemptsMap[att.examId]) attemptsMap[att.examId] = [];
        attemptsMap[att.examId].push(att);
      }
      // Sort attempts descending by completion date (most recent first)
      for (const examId in attemptsMap) {
        attemptsMap[examId].sort((a, b) => b.completedAt - a.completedAt);
      }
      setPastAttempts(attemptsMap);
    };

    load();
  }, []);

  const filteredExams = exams.filter((exam) => {
    if (selectedSubjectId !== 'all' && exam.subjectId !== selectedSubjectId) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const subject = subjects.find((s) => s.id === exam.subjectId);
      const matches =
        exam.title.toLowerCase().includes(q) ||
        exam.code.toLowerCase().includes(q) ||
        (exam.description || '').toLowerCase().includes(q) ||
        (subject?.name || '').toLowerCase().includes(q) ||
        (subject?.code || '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedSubjectId('all');
  };

  const activeSubjectNames = subjects.filter((s) => exams.some((e) => e.subjectId === s.id));

  // Progress summary calculations across all published quizzes
  const totalAvailableQuizzes = exams.filter((e) => (examStationCounts[e.id] || 0) > 0).length;
  const completedExamsList = exams.filter((e) => (pastAttempts[e.id] || []).length > 0);
  const completedQuizzesCount = completedExamsList.length;
  const completionPercentage =
    totalAvailableQuizzes > 0
      ? Math.round((completedQuizzesCount / totalAvailableQuizzes) * 100)
      : 0;

  const totalAttemptsCount = Object.values(pastAttempts).reduce(
    (total, list) => total + list.length,
    0
  );

  const averageBestScore =
    completedExamsList.length > 0
      ? Math.round(
          completedExamsList.reduce((acc, exam) => {
            const attempts = pastAttempts[exam.id] || [];
            const best = attempts.reduce((max, a) => Math.max(max, a.percentage), 0);
            return acc + best;
          }, 0) / completedExamsList.length
        )
      : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Exam Library
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Select a registered clinical practical examination to begin your station session.
          </p>
        </div>
        {onNavigateToHistory && (
          <button
            id="go-to-progress-btn"
            onClick={onNavigateToHistory}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs min-h-[36px] cursor-pointer"
          >
            <TrendingUp className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            <span>Detailed Performance History →</span>
          </button>
        )}
      </div>

      {/* Progress Summary Card */}
      {totalAvailableQuizzes > 0 && (
        <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                  <span>Curriculum Completion Progress</span>
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {completedQuizzesCount} of {totalAvailableQuizzes} Quizzes Completed ({completionPercentage}%)
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-rose-900 via-purple-700 to-indigo-600 dark:from-rose-700 dark:via-purple-600 dark:to-indigo-500 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${completionPercentage}%` }}
                  aria-valuenow={completionPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="flex items-center gap-4 sm:gap-6 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700/80 shrink-0">
              <div className="text-left">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Completed</p>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
                  {completedQuizzesCount}/{totalAvailableQuizzes}
                </p>
              </div>

              {completedQuizzesCount > 0 && (
                <div className="text-left">
                  <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Avg. Best Score</p>
                  <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {averageBestScore}%
                  </p>
                </div>
              )}

              <div className="text-left">
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Total Attempts</p>
                <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-mono">
                  {totalAttemptsCount}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unified filter bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="exam-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exams by title, course code, or subject…"
            className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Subject dropdown */}
        <div className="relative shrink-0">
          <select
            id="subject-filter-select"
            value={selectedSubjectId}
            onChange={(e) => setSelectedSubjectId(e.target.value)}
            className="pl-3 pr-8 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 cursor-pointer appearance-none"
          >
            <option value="all">All subjects ({exams.length})</option>
            {activeSubjectNames.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({exams.filter((e) => e.subjectId === s.id).length})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 -mt-1">
        <span>
          {filteredExams.length === exams.length
            ? `${exams.length} exam${exams.length !== 1 ? 's' : ''}`
            : `${filteredExams.length} of ${exams.length} exams`}
          {selectedSubjectId !== 'all' && (
            <> · <strong className="text-slate-700 dark:text-slate-300">{subjects.find((s) => s.id === selectedSubjectId)?.name}</strong></>
          )}
          {searchQuery && (
            <> · matching "<strong className="text-slate-700 dark:text-slate-300">{searchQuery}</strong>"</>
          )}
        </span>
        {(searchQuery || selectedSubjectId !== 'all') && (
          <button
            onClick={handleClearFilters}
            className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-medium cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Exam Grid */}
      {filteredExams.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-slate-800/90 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
          <BookOpen className="w-9 h-9 text-slate-300 dark:text-slate-600 mx-auto" />
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-300">No exams found</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? `No published exams match "${searchQuery}".`
              : 'No published exams in this subject.'}
            {' '}Educators can author and publish exams in the Educator Workspace.
          </p>
          {(searchQuery || selectedSubjectId !== 'all') && (
            <button
              onClick={handleClearFilters}
              className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 dark:bg-purple-600 rounded-lg hover:bg-purple-800 inline-flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredExams.map((exam) => {
            const subject = subjects.find((s) => s.id === exam.subjectId);
            const stationCount = examStationCounts[exam.id] || 0;
            const attempts = pastAttempts[exam.id] || [];
            const hasPastAttempt = attempts.length > 0;

            const latestAttempt = hasPastAttempt ? attempts[0] : null;
            const bestAttempt = hasPastAttempt
              ? attempts.reduce((best, curr) => (curr.percentage > best.percentage ? curr : best), attempts[0])
              : null;

            const bestPercentage = bestAttempt ? bestAttempt.percentage : 0;
            const isPassed = bestPercentage >= exam.passingScorePercent;

            const missingForExam = missingImagesMap[exam.id] || [];
            const hasMissingImages = missingForExam.length > 0;
            const isAvailable = stationCount > 0 && !hasMissingImages;

            return (
              <div
                key={exam.id}
                className={`bg-white dark:bg-slate-800/90 border rounded-xl overflow-hidden flex flex-col transition-all shadow-xs ${
                  isAvailable
                    ? 'border-slate-200 dark:border-slate-700/80 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md'
                    : 'border-slate-200 dark:border-slate-700/60 opacity-90'
                }`}
              >
                <div className="p-5 space-y-3 flex-1 flex flex-col">
                  {/* Subject + Status/Code Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: subject?.color || '#881337' }}
                        aria-hidden="true"
                      />
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide truncate">
                        {subject?.name || 'Practical Exam'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasPastAttempt && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            isPassed
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {isPassed ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <RotateCcw className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          )}
                          <span>Completed</span>
                        </span>
                      )}

                      <span className="text-[11px] font-mono font-bold whitespace-nowrap text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded">
                        {exam.code}
                      </span>
                    </div>
                  </div>

                  {/* Exam Title */}
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                    {exam.title}
                  </h2>

                  {exam.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {exam.description}
                    </p>
                  )}

                  {/* Station info row */}
                  <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-300 flex-wrap">
                    <span className="flex items-center gap-1">
                      <Crosshair className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      {stationCount} station{stationCount !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      {getTimingLabel(exam)}
                    </span>
                    {getTimingIcon(exam)}
                  </div>

                  {/* Missing images alert */}
                  {hasMissingImages && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg">
                      <p className="text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                        <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span>
                          <span className="font-semibold">{missingForExam.length} image{missingForExam.length > 1 ? 's' : ''} missing.</span>{' '}
                          This exam cannot be started until an educator uploads the specimen slides.
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Completed Quiz Results Box (Feature 1 Requirement) */}
                  {hasPastAttempt && latestAttempt && !hasMissingImages && (
                    <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      {/* Score Metrics */}
                      <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <Award className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                            <span>Latest Score:</span>
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {latestAttempt.score}/{latestAttempt.maxScore}{' '}
                            <span className={latestAttempt.passed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
                              ({latestAttempt.percentage}%)
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Best Score:</span>
                          </span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {bestPercentage}%{' '}
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              (pass: {exam.passingScorePercent}%)
                            </span>
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-0.5 border-t border-slate-200/50 dark:border-slate-700/50">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>Latest: {formatAttemptDate(latestAttempt.completedAt)}</span>
                          </span>
                          <span>
                            {attempts.length} attempt{attempts.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 pb-4 pt-1 space-y-2">
                  {hasMissingImages ? (
                    <div className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Unavailable — missing images</span>
                    </div>
                  ) : stationCount === 0 ? (
                    <div className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                      <span>No stations added yet</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* Review past results button if attempt exists */}
                      {hasPastAttempt && latestAttempt && onReviewAttempt && (
                        <button
                          type="button"
                          id={`review-exam-btn-${exam.id}`}
                          onClick={() => onReviewAttempt(latestAttempt)}
                          title="Review answers and rubric for your latest completed attempt"
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors cursor-pointer min-h-[44px]"
                        >
                          <Eye className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                          <span>Review</span>
                        </button>
                      )}

                      {/* Start or Retake Button */}
                      <button
                        id={`start-exam-btn-${exam.id}`}
                        onClick={() => onStartExam(exam)}
                        className={`${
                          hasPastAttempt && onReviewAttempt ? 'flex-1' : 'w-full'
                        } flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-rose-900 via-purple-700 to-indigo-600 hover:from-rose-950 hover:to-indigo-700 dark:from-rose-800 dark:to-indigo-500 rounded-lg transition-all shadow-xs cursor-pointer min-h-[44px]`}
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>{hasPastAttempt ? 'Retake' : 'Start exam'}</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Missing images detail modal (educator context) */}
      {blockedExamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Missing specimen images</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  "{blockedExamModal.examTitle}" cannot be started.
                </p>
              </div>
            </div>

            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc pl-5 max-h-40 overflow-y-auto">
              {blockedExamModal.missing.map((m) => (
                <li key={m.questionId}>
                  <strong>{m.questionTitle}</strong> — image key{' '}
                  <code className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded text-[11px]">{m.imageId}</code>
                </li>
              ))}
            </ul>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upload the missing images in the Educator Workspace to enable this exam.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setBlockedExamModal(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setBlockedExamModal(null);
                  onNavigateToMissingImages();
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-700 rounded-lg transition-colors cursor-pointer"
              >
                Go to Educator Workspace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
