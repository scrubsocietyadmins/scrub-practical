import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Send,
  RotateCcw,
  BookOpen,
  User,
  X,
  CheckCircle2,
  ListCheck,
  Eye,
} from 'lucide-react';
import type {
  Exam,
  Question,
  SelfGradingSession,
  SelfGradeValue,
  ExamAttempt,
} from '../../types';
import { db, getImageObjectUrl, saveSelfGradingSession } from '../../db';
import { SpecimenViewer } from '../common/SpecimenViewer';
import {
  calculateSelfGradingScore,
  getUngradedQuestionIds,
  finalizeSelfGradingAttempt,
} from '../../services/selfGradingService';
import { ReferenceAnswerReveal } from './ReferenceAnswerReveal';
import { SelfGradingControls } from './SelfGradingControls';
import { GradingProgress } from './GradingProgress';
import { FinalScoreSummary } from './FinalScoreSummary';
import { QuestionReview } from './QuestionReview';
import { generateExamAttemptPdf } from '../../services/pdfReportService';

interface SelfGradingViewProps {
  session: SelfGradingSession;
  exam: Exam;
  questions: Question[];
  onFinalizeComplete: (attempt: ExamAttempt) => void;
  onRetakeExam: () => void;
  onBackToCatalog: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export const SelfGradingView: React.FC<SelfGradingViewProps> = ({
  session,
  exam,
  questions,
  onFinalizeComplete,
  onRetakeExam,
  onBackToCatalog,
  onShowToast,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    Math.min(session.currentQuestionIndex || 0, Math.max(0, questions.length - 1))
  );
  const [grades, setGrades] = useState<Record<string, SelfGradeValue>>(session.grades || {});
  const [revealedQuestions, setRevealedQuestions] = useState<Record<string, boolean>>(
    session.revealedQuestions || {}
  );
  const [isFinalized, setIsFinalized] = useState<boolean>(session.isFinalized || false);
  const [finalAttempt, setFinalAttempt] = useState<ExamAttempt | null>(null);

  // Modals & UI state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<string, string | null>>({});
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const reviewSectionRef = useRef<HTMLDivElement>(null);

  // Load images for all questions into memory
  useEffect(() => {
    const loadImages = async () => {
      const urls: Record<string, string | null> = {};
      for (const q of questions) {
        if (q.imageId && !urls[q.imageId]) {
          urls[q.imageId] = await getImageObjectUrl(q.imageId);
        }
      }
      setImageUrls(urls);
    };
    loadImages();
  }, [questions]);

  // If session is already finalized on mount (e.g. from restored session)
  useEffect(() => {
    if (session.isFinalized && !finalAttempt) {
      const attempt = finalizeSelfGradingAttempt(
        session,
        questions,
        exam.passingScorePercent || 60
      );
      setFinalAttempt(attempt);
    }
  }, [session, questions, exam.passingScorePercent, finalAttempt]);

  // Persist self-grading progress automatically using IndexedDB
  useEffect(() => {
    if (isFinalized) return;

    const updatedSession: SelfGradingSession = {
      ...session,
      grades,
      revealedQuestions,
      currentQuestionIndex,
      isFinalized,
      updatedAt: Date.now(),
    };

    saveSelfGradingSession(updatedSession).catch((err) => {
      console.warn('Failed to persist self-grading session to IndexedDB:', err);
    });
  }, [grades, revealedQuestions, currentQuestionIndex, isFinalized, session]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentGrade = currentQuestion ? grades[currentQuestion.id] : undefined;
  const isCurrentRevealed = currentQuestion ? Boolean(revealedQuestions[currentQuestion.id]) : false;
  const currentAnswer = currentQuestion ? session.answers[currentQuestion.id] : undefined;
  const currentImageUrl = currentQuestion ? imageUrls[currentQuestion.imageId || ''] : null;

  // Real-time calculation
  const scoreResult = calculateSelfGradingScore(
    questions,
    grades,
    exam.passingScorePercent || 60
  );

  // Handle grade selection
  const handleSelectGrade = (grade: SelfGradeValue) => {
    if (!currentQuestion) return;
    setGrades((prev) => ({
      ...prev,
      [currentQuestion.id]: grade,
    }));
  };

  // Handle reference answer reveal
  const handleRevealCurrent = () => {
    if (!currentQuestion) return;
    setRevealedQuestions((prev) => ({
      ...prev,
      [currentQuestion.id]: true,
    }));
  };

  // Navigation handlers
  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  // Finalize grading handler
  const handleConfirmFinalize = async () => {
    const ungraded = getUngradedQuestionIds(questions, grades);
    if (ungraded.length > 0) {
      onShowToast(
        `Cannot finalize: ${ungraded.length} question(s) remain ungraded. Every question must be graded.`,
        'error'
      );
      return;
    }

    const updatedSession: SelfGradingSession = {
      ...session,
      grades,
      revealedQuestions,
      currentQuestionIndex,
      isFinalized: true,
      updatedAt: Date.now(),
    };

    const attempt = finalizeSelfGradingAttempt(
      updatedSession,
      questions,
      exam.passingScorePercent || 60
    );

    // Save finalized attempt into Dexie attempts table (local history preserved)
    await db.attempts.add(attempt);
    await saveSelfGradingSession(updatedSession);

    setIsFinalized(true);
    setFinalAttempt(attempt);
    setConfirmModalOpen(false);

    onShowToast(
      attempt.passed
        ? `Assessment Passed with ${attempt.percentage}%!`
        : `Assessment completed. Score: ${attempt.score}/${attempt.maxScore}.`,
      attempt.passed ? 'success' : 'info'
    );

    onFinalizeComplete(attempt);
  };

  // PDF Download handler
  const handleDownloadPdf = async () => {
    if (!finalAttempt) return;
    try {
      setIsDownloadingPdf(true);
      const pdf = await generateExamAttemptPdf(finalAttempt);
      const safeTitle = exam.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
      pdf.save(`SelfGrading_${safeTitle}_${new Date().toISOString().slice(0, 10)}.pdf`);
      onShowToast('PDF Report downloaded successfully', 'success');
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      onShowToast('Failed to generate PDF export', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Determine student submitted answer text
  const getStudentAnswerText = (q: Question) => {
    const ans = session.answers[q.id];
    if (!ans) return 'No answer submitted (blank)';

    if (ans.typedAnswer && ans.typedAnswer.trim()) {
      return ans.typedAnswer.trim();
    }
    if (ans.selectedOptionId && q.options) {
      const selected = q.options.find((o) => o.id === ans.selectedOptionId);
      const optIdx = q.options.findIndex((o) => o.id === ans.selectedOptionId);
      const letter = optIdx >= 0 ? String.fromCharCode(65 + optIdx) : '';
      return selected ? `Option ${letter}: ${selected.text}` : 'Unknown option';
    }
    return 'No answer submitted (blank)';
  };

  const ungradedIds = getUngradedQuestionIds(questions, grades);

  // If grading is already finalized, show final score summary and review
  if (isFinalized && finalAttempt) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
        <FinalScoreSummary
          attempt={finalAttempt}
          exam={exam}
          onRetakeExam={onRetakeExam}
          onBackToCatalog={onBackToCatalog}
          onScrollToReview={() => {
            reviewSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }}
          onDownloadPdf={handleDownloadPdf}
          isDownloadingPdf={isDownloadingPdf}
        />

        <div ref={reviewSectionRef} className="pt-2">
          <QuestionReview
            questions={questions}
            answers={session.answers}
            grades={grades}
            imageUrls={imageUrls}
          />
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="p-12 text-center text-slate-600 bg-white min-h-screen flex flex-col items-center justify-center">
        <p className="text-base font-semibold">No questions found in this self-grading session.</p>
        <button
          onClick={onBackToCatalog}
          className="mt-4 px-4 py-2 bg-rose-950 text-white text-xs font-bold rounded-lg"
        >
          Return to Catalog
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none text-slate-900 pb-16">
      {/* Top Grading Progress Bar */}
      <GradingProgress
        questions={questions}
        currentQuestionIndex={currentQuestionIndex}
        grades={grades}
        accumulatedScore={scoreResult.totalScore}
        maxPossibleScore={scoreResult.maxScore}
        onSelectQuestion={handleJumpToQuestion}
        onPrevQuestion={handlePrev}
        onNextQuestion={handleNext}
        onRequestFinalize={() => setConfirmModalOpen(true)}
      />

      {/* Main Self-Grading Workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Specimen Viewer or Vignette */}
        <div
          className={`${
            currentQuestion.type === 'text_mcq' || !currentImageUrl
              ? 'lg:col-span-12'
              : 'lg:col-span-6'
          } space-y-4`}
        >
          {currentImageUrl && (
            <div className="h-[360px] sm:h-[440px] w-full rounded-xl overflow-hidden shadow-sm border border-slate-200 bg-black">
              <SpecimenViewer
                imageUrl={currentImageUrl}
                spotterPin={currentQuestion.spotterPin}
                altText={currentQuestion.title || 'Specimen slide'}
                className="w-full h-full"
              />
            </div>
          )}

          {currentQuestion.clinicalVignette && (
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
                Clinical Vignette:
              </span>
              <p className="text-xs text-amber-950 leading-relaxed font-serif">
                {currentQuestion.clinicalVignette}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Question, Student Answer, Reference Answer Reveal, Grading Controls */}
        <div
          className={`${
            currentQuestion.type === 'text_mcq' || !currentImageUrl
              ? 'lg:col-span-12 max-w-3xl mx-auto'
              : 'lg:col-span-6'
          } space-y-5`}
        >
          {/* Question Details Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold uppercase tracking-wider text-rose-950">
                {currentQuestion.type.replace('_', ' ')}
              </span>
              <span className="font-mono">{currentQuestion.points || 1} Maximum Points</span>
            </div>
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {currentQuestion.questionText}
            </h3>
          </div>

          {/* 1. Student's Submitted Answer Container */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <User className="w-3.5 h-3.5 text-rose-950" />
                <span>Your Submitted Candidate Answer:</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">Recorded at submission</span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-900 font-mono">
              {getStudentAnswerText(currentQuestion)}
            </div>
          </div>

          {/* 2. Reference Answer Reveal Container */}
          <ReferenceAnswerReveal
            question={currentQuestion}
            isRevealed={isCurrentRevealed}
            onReveal={handleRevealCurrent}
          />

          {/* 3. Self-Grading Controls (1.0, 0.5, 0.0) */}
          <SelfGradingControls
            currentGrade={grades[currentQuestion.id]}
            onSelectGrade={handleSelectGrade}
            maxPoints={currentQuestion.points || 1}
          />
        </div>
      </main>

      {/* Confirmation Step Before Finalizing Grades */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  ungradedIds.length > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {ungradedIds.length > 0 ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {ungradedIds.length > 0
                    ? 'Incomplete Self-Grading Assessment'
                    : 'Finalize Self-Grading Assessment?'}
                </h3>
                <p className="text-xs text-slate-500">
                  {ungradedIds.length > 0
                    ? 'All questions must have an explicit self-assigned mark before finalizing.'
                    : 'Review your calculated totals before committing your grade to history.'}
                </p>
              </div>
            </div>

            {ungradedIds.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5">
                  <p className="font-bold">
                    Attention: You have {ungradedIds.length} question(s) without an assigned grade:
                  </p>
                  <p className="leading-relaxed">
                    The platform policy requires explicit evaluation for each question. Please review the ungraded station(s) and select 1.0, 0.5, or 0.0 points.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ungradedIds.map((qid) => {
                    const idx = questions.findIndex((q) => q.id === qid);
                    return (
                      <button
                        key={qid}
                        type="button"
                        onClick={() => {
                          setConfirmModalOpen(false);
                          handleJumpToQuestion(idx);
                        }}
                        className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors"
                      >
                        Station {idx + 1} &rarr;
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModalOpen(false);
                      const firstUngraded = questions.findIndex((q) => q.id === ungradedIds[0]);
                      if (firstUngraded >= 0) handleJumpToQuestion(firstUngraded);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg shadow-xs"
                  >
                    Go to Next Ungraded Station
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-slate-600">Calculated Final Score:</span>
                    <span className="font-mono font-bold text-sm text-slate-900">
                      {scoreResult.totalScore} / {scoreResult.maxScore} marks
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-slate-600">Score Percentage:</span>
                    <span
                      className={`font-mono font-bold text-sm ${
                        scoreResult.passed ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {scoreResult.percentage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="text-slate-600">Grade Breakdown:</span>
                    <span className="font-mono text-slate-700">
                      {scoreResult.fullyCorrectCount} Full | {scoreResult.partiallyCorrectCount} Partial | {scoreResult.incorrectCount} Incorrect
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Passing Standard:</span>
                    <span className="font-mono">{exam.passingScorePercent || 60}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setConfirmModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Keep Adjusting Grades
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmFinalize}
                    className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors"
                  >
                    Confirm &amp; Finalize Assessment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
