import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  RotateCcw,
  BookOpen,
  Bookmark,
  Check,
  X,
  Crosshair,
  FileText,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  FileDown,
  Printer,
  Loader2,
} from 'lucide-react';
import type { ExamAttempt, Question } from '../../types';
import type { QuestionGradingResult } from '../../services/scoringService';
import { SpecimenViewer } from '../common/SpecimenViewer';
import { getImageObjectUrl, db } from '../../db';
import { downloadExamAttemptPdf, printExamAttemptPdf } from '../../services/pdfReportService';

interface ExamResultViewProps {
  attempt: ExamAttempt;
  stationResults: QuestionGradingResult[];
  onRetakeExam: () => void;
  onBackToCatalog: () => void;
  onShowToast?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const ExamResultView: React.FC<ExamResultViewProps> = ({
  attempt,
  stationResults,
  onRetakeExam,
  onBackToCatalog,
  onShowToast,
}) => {
  const [filter, setFilter] = useState<'all' | 'incorrect' | 'flagged'>('all');
  const [stationImages, setStationImages] = useState<Record<string, string>>({});
  const [personalNotes, setPersonalNotes] = useState(attempt.notes || '');
  const [isNotesSaving, setIsNotesSaving] = useState(false);
  const [notesSaveStatus, setNotesSaveStatus] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const filename = await downloadExamAttemptPdf(attempt, stationResults);
      if (onShowToast) {
        onShowToast(`Report downloaded: ${filename}`, 'success');
      }
    } catch (err: unknown) {
      console.error('Failed to export PDF:', err);
      if (onShowToast) {
        onShowToast((err as Error).message || 'Failed to export PDF', 'error');
      }
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintPdf = async () => {
    try {
      setIsPrintingPdf(true);
      await printExamAttemptPdf(attempt, stationResults);
      if (onShowToast) {
        onShowToast('Preparing report print view...', 'info');
      }
    } catch (err: unknown) {
      console.error('Failed to print PDF:', err);
      if (onShowToast) {
        onShowToast((err as Error).message || 'Failed to print report', 'error');
      }
    } finally {
      setIsPrintingPdf(false);
    }
  };

  const handleSavePersonalNotes = async () => {
    setIsNotesSaving(true);
    try {
      const clean = personalNotes.trim();
      await db.attempts.update(attempt.id, { notes: clean });
      attempt.notes = clean;
      setNotesSaveStatus('Personal study notes saved to IndexedDB');
      setTimeout(() => setNotesSaveStatus(null), 3000);
    } catch (err: unknown) {
      setNotesSaveStatus('Failed to save notes');
    } finally {
      setIsNotesSaving(false);
    }
  };

  useEffect(() => {
    const loadImages = async () => {
      const urls: Record<string, string> = {};
      for (const res of stationResults) {
        if (res.question.imageId) {
          const url = await getImageObjectUrl(res.question.imageId);
          if (url) urls[res.question.id] = url;
        }
      }
      setStationImages(urls);
    };
    loadImages();
  }, [stationResults]);

  const correctCount = stationResults.filter((r) => r.isCorrect).length;
  const incorrectCount = stationResults.length - correctCount;
  const flaggedCount = stationResults.filter((r) => r.studentAnswer?.isFlagged).length;

  const filteredStations = stationResults.filter((r) => {
    if (filter === 'incorrect') return !r.isCorrect;
    if (filter === 'flagged') return r.studentAnswer?.isFlagged;
    return true;
  });

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Top Banner / Summary Card */}
      <div
        className={`rounded-2xl p-6 sm:p-8 border shadow-md ${
          attempt.passed
            ? 'bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900 border-emerald-800 text-white'
            : 'bg-gradient-to-br from-rose-950 via-rose-900 to-slate-900 border-rose-800 text-white'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-mono tracking-widest uppercase font-bold px-2 py-0.5 rounded ${
                  attempt.passed ? 'bg-emerald-800 text-emerald-100' : 'bg-rose-800 text-rose-100'
                }`}
              >
                {attempt.passed ? 'PRACTICAL EXAMINATION PASSED' : 'REVISION RECOMMENDED'}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {formatSeconds(attempt.totalTimeSpentSeconds)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans">
              {attempt.examTitle}
            </h1>
            <p className="text-xs text-slate-200">
              {attempt.subjectName} · Completed at {new Date(attempt.completedAt).toLocaleTimeString()}
            </p>
          </div>

          {/* Big Score Box */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-6 py-4 rounded-xl border border-white/20 shrink-0">
            <div className="text-right">
              <span className="text-3xl sm:text-4xl font-extrabold font-mono tracking-tight block">
                {attempt.percentage}%
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {attempt.score} / {attempt.maxScore} Marks
              </span>
            </div>
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                attempt.passed ? 'bg-emerald-500 text-white' : 'bg-rose-600 text-white'
              }`}
            >
              {attempt.passed ? (
                <CheckCircle className="w-7 h-7" />
              ) : (
                <XCircle className="w-7 h-7" />
              )}
            </div>
          </div>
        </div>

        {/* Breakdown Row */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 pt-6 border-t border-white/15 text-center text-xs">
          <div>
            <span className="block text-slate-300">Correct Stations</span>
            <span className="text-lg font-bold font-mono text-emerald-300">{correctCount}</span>
          </div>
          <div className="border-x border-white/15">
            <span className="block text-slate-300">Missed Stations</span>
            <span className="text-lg font-bold font-mono text-rose-300">{incorrectCount}</span>
          </div>
          <div>
            <span className="block text-slate-300">Flagged</span>
            <span className="text-lg font-bold font-mono text-amber-300">{flaggedCount}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Segmented Filter Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Stations ({stationResults.length})
          </button>
          <button
            onClick={() => setFilter('incorrect')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === 'incorrect'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Missed ({incorrectCount})
          </button>
          <button
            onClick={() => setFilter('flagged')}
            className={`flex-1 sm:flex-initial px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              filter === 'flagged'
                ? 'bg-white dark:bg-slate-700 text-amber-900 dark:text-amber-300 shadow-xs font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Flagged ({flaggedCount})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
          <button
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
            title="Download formatted OSPE Examination Report as PDF"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-700 dark:text-purple-400" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            )}
            <span>{isExportingPdf ? 'Exporting...' : 'Download PDF'}</span>
          </button>

          <button
            onClick={handlePrintPdf}
            disabled={isPrintingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs disabled:opacity-60 cursor-pointer"
            title="Open printable report"
          >
            {isPrintingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600 dark:text-slate-400" />
            ) : (
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
            )}
            <span>{isPrintingPdf ? 'Preparing...' : 'Print'}</span>
          </button>

          <button
            onClick={onRetakeExam}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retake Exam</span>
          </button>

          <button
            onClick={onBackToCatalog}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-500 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Exam Catalog</span>
          </button>
        </div>
      </div>

      {/* Candidate Personal Study Notes Card */}
      <div className="bg-white dark:bg-slate-850 rounded-xl border border-amber-200 dark:border-amber-900/60 p-5 shadow-2xs space-y-3 bg-amber-50/20 dark:bg-amber-950/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-300 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                Candidate Personal Study Notes
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Log takeaways, difficult pointers, or mnemonics directly into IndexedDB for future review
              </p>
            </div>
          </div>

          {notesSaveStatus && (
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              <span>{notesSaveStatus}</span>
            </span>
          )}
        </div>

        <div className="space-y-2">
          <textarea
            rows={3}
            value={personalNotes}
            onChange={(e) => setPersonalNotes(e.target.value)}
            placeholder="e.g. 'Station 2: Review Reed-Sternberg owl-eye nucleolus vs Hodgkin mononuclear cell. Station 3: Note the T8 vena caval foramen inside the central tendon.'"
            className="w-full p-3 text-xs sm:text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/20 focus:border-purple-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white leading-relaxed"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              Stored locally alongside this attempt record in IndexedDB
            </span>
            <button
              onClick={handleSavePersonalNotes}
              disabled={isNotesSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-500 rounded-lg transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isNotesSaving ? 'Saving...' : 'Save Study Notes'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Station Review Cards */}
      <div className="space-y-6">
        {filteredStations.map((res, idx) => {
          const q = res.question;
          const imageUrl = stationImages[q.id];

          return (
            <div
              key={q.id}
              className={`bg-white dark:bg-slate-850 rounded-xl border overflow-hidden shadow-2xs transition-all ${
                res.isCorrect ? 'border-emerald-200 dark:border-emerald-800' : 'border-rose-200 dark:border-rose-800'
              }`}
            >
              {/* Card Header */}
              <div
                className={`px-5 py-3 border-b flex items-center justify-between gap-3 ${
                  res.isCorrect
                    ? 'bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-850'
                    : 'bg-rose-50/60 dark:bg-rose-950/40 border-rose-100 dark:border-rose-850'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                      res.isCorrect
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {q.orderIndex + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {q.title || `Station ${q.orderIndex + 1}`}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    · {q.type.replace('_', ' ').toUpperCase()}
                  </span>
                  {res.studentAnswer?.isFlagged && (
                    <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded flex items-center gap-1">
                      <Bookmark className="w-3 h-3 fill-amber-500" />
                      <span>Flagged</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                      res.isCorrect
                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {res.earnedPoints} / {res.maxPoints} pts
                  </span>
                </div>
              </div>

              {/* Card Content */}
              <div className="p-5 space-y-4">
                {/* Specimen Visual */}
                {imageUrl && (
                  <div className="h-[280px] sm:h-[340px] w-full rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                    <SpecimenViewer
                      imageUrl={imageUrl}
                      spotterPin={q.spotterPin}
                      className="w-full h-full"
                    />
                  </div>
                )}

                {/* Vignette */}
                {q.clinicalVignette && (
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-lg text-xs text-amber-950 dark:text-amber-200">
                    <span className="font-bold block mb-0.5 text-[11px] uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      Case Presentation:
                    </span>
                    {q.clinicalVignette}
                  </div>
                )}

                {/* Question Text */}
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  {q.questionText}
                </h3>

                {/* Answers Comparison */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Candidate Answer */}
                  <div
                    className={`p-3 rounded-lg border flex flex-col gap-1 ${
                      res.isCorrect
                        ? 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80'
                        : 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/80'
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Your Answer:
                    </span>
                    <div className="flex items-center gap-2 font-medium">
                      {res.isCorrect ? (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <X className="w-4 h-4 text-rose-600 shrink-0" />
                      )}
                      <span className={res.isCorrect ? 'text-emerald-950 dark:text-emerald-200 font-bold' : 'text-rose-950 dark:text-rose-200 font-bold'}>
                        {res.studentAnswerSummary || 'Unanswered'}
                      </span>
                    </div>
                  </div>

                  {/* Official Key */}
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Official Key &amp; Accepted Synonyms:
                    </span>
                    <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-white">
                      <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-bold">{res.correctAnswerSummary}</span>
                    </div>
                  </div>
                </div>

                {/* Clinical Explanation & Pathology Rationale */}
                {q.explanation && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-400 block">
                      Clinical Rationale &amp; Key Finding:
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
