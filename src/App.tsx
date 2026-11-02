import React, { useState, useEffect } from 'react';
import {
  db,
  ensureDatabaseInitialized,
  resetDatabaseToDefaults,
  getActiveSelfGradingSession,
  saveSelfGradingSession,
} from './db';
import type {
  Exam,
  Subject,
  Question,
  ExamAttempt,
  StudentStationAnswer,
  SelfGradingSession,
} from './types';
import { Header, type MainNavTab } from './components/common/Header';
import { ExamCatalog } from './components/student/ExamCatalog';
import { ExamPreStartModal } from './components/student/ExamPreStartModal';
import { ExamRunner } from './components/student/ExamRunner';
import { PerformanceHistory } from './components/student/PerformanceHistory';
import { EducatorWorkspace } from './components/educator/EducatorWorkspace';
import { ToastContainer, type ToastMessage } from './components/common/Toast';
import { isSoundEnabled, toggleSound } from './services/sound';
import { createInitialSelfGradingSession } from './services/selfGradingService';
import { SelfGradingView } from './components/selfGrading/SelfGradingView';
import { ShuffleDashboard } from './features/shuffle/components/ShuffleDashboard';
import { v4 as uuidv4 } from './db/uuid';

interface ActiveSelfGradingState {
  session: SelfGradingSession;
  exam: Exam;
  questions: Question[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<MainNavTab>('library');
  const [isDbReady, setIsDbReady] = useState(false);
  const [soundActive, setSoundActive] = useState(isSoundEnabled());
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Student Examination Flow States
  const [preStartExam, setPreStartExam] = useState<Exam | null>(null);
  const [preStartStationCount, setPreStartStationCount] = useState(0);
  const [activeExamRunning, setActiveExamRunning] = useState<{
    exam: Exam;
    subject?: Subject;
    questions: Question[];
    autoAdvanceOnBell: boolean;
  } | null>(null);

  // Self-Grading Session State (persisted in IndexedDB)
  const [activeSelfGrading, setActiveSelfGrading] = useState<ActiveSelfGradingState | null>(null);

  // Educator workspace sub-tab state
  const [educatorSubTab, setEducatorSubTab] = useState<'authoring' | 'packages' | 'missing_images' | 'backup'>('authoring');

  // Initialize DB and restore any unfinalized self-grading session on boot
  useEffect(() => {
    ensureDatabaseInitialized()
      .then(async () => {
        setIsDbReady(true);
        try {
          const activeSession = await getActiveSelfGradingSession();
          if (activeSession) {
            const exam = await db.exams.get(activeSession.examId);
            const questions = await db.questions
              .where('examId')
              .equals(activeSession.examId)
              .sortBy('orderIndex');

            if (exam && questions.length > 0) {
              setActiveSelfGrading({
                session: activeSession,
                exam,
                questions,
              });
            }
          }
        } catch (sessionErr) {
          console.warn('Failed to restore active self-grading session:', sessionErr);
        }
      })
      .catch((err) => {
        console.error('Failed to initialize database:', err);
        setIsDbReady(true);
      });
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = uuidv4();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleSound = () => {
    const nextState = toggleSound();
    setSoundActive(nextState);
    showToast(nextState ? 'Bell sounds enabled' : 'Bell sounds muted', 'info');
  };

  const handleResetDefaults = async () => {
    if (confirm('Restore default curriculum packages (Parasitology, Microbiology, Pathology, Pharmacology)?')) {
      await resetDatabaseToDefaults();
      showToast('Starter packages restored', 'success');
    }
  };

  // Launch Candidate Pre-Start Modal
  const handleOpenPreStart = async (exam: Exam) => {
    const questionsCount = await db.questions.where('examId').equals(exam.id).count();
    setPreStartStationCount(questionsCount);
    setPreStartExam(exam);
  };

  // Begin Examination
  const handleConfirmStartExam = async (config: { autoAdvanceOnBell: boolean }) => {
    if (!preStartExam) return;

    const questions = await db.questions
      .where('examId')
      .equals(preStartExam.id)
      .sortBy('orderIndex');

    const subject = await db.subjects.get(preStartExam.subjectId);

    setActiveExamRunning({
      exam: preStartExam,
      subject,
      questions,
      autoAdvanceOnBell: config.autoAdvanceOnBell,
    });
    setPreStartExam(null);
  };

  // Finish Examination → Enter grading
  const handleFinishExam = async (
    answers: Record<string, StudentStationAnswer>,
    timeSpentSeconds: number
  ) => {
    if (!activeExamRunning) return;

    const { exam, subject, questions } = activeExamRunning;
    const subjectName = subject?.name || 'Practical Exam';

    const session = createInitialSelfGradingSession(exam, subjectName, answers, timeSpentSeconds);
    await saveSelfGradingSession(session);

    setActiveSelfGrading({ session, exam, questions });
    setActiveExamRunning(null);

    showToast('Exam submitted. Review and grade your answers below.', 'info');
  };

  const handleRetakeExam = () => {
    const examToRetake = activeSelfGrading?.exam;
    setActiveSelfGrading(null);
    if (examToRetake) {
      handleOpenPreStart(examToRetake);
    }
  };

  const handleBackToCatalog = () => {
    setActiveSelfGrading(null);
    setActiveExamRunning(null);
    setActiveTab('library');
  };

  // Review a past attempt from Progress
  const handleReviewPastAttempt = async (attempt: ExamAttempt) => {
    const exam = await db.exams.get(attempt.examId);
    if (!exam) {
      showToast('Exam record no longer exists', 'error');
      return;
    }
    const questions = await db.questions
      .where('examId')
      .equals(attempt.examId)
      .sortBy('orderIndex');

    if (questions.length === 0) {
      showToast('Exam station records not found', 'error');
      return;
    }

    const session: SelfGradingSession = {
      id: attempt.id,
      examId: attempt.examId,
      examTitle: attempt.examTitle,
      subjectName: attempt.subjectName,
      startedAt: attempt.startedAt,
      completedAt: attempt.completedAt,
      totalTimeSpentSeconds: attempt.totalTimeSpentSeconds,
      answers: attempt.answers || {},
      grades: attempt.grades || {},
      revealedQuestions: {},
      currentQuestionIndex: 0,
      isFinalized: true,
      updatedAt: attempt.completedAt,
    };

    setActiveSelfGrading({ session, exam, questions });
  };

  // Direct launcher from Educator Workspace
  const handleLaunchFromAdmin = async (examId: string) => {
    const exam = await db.exams.get(examId);
    if (exam) {
      handleOpenPreStart(exam);
    }
  };

  // Session resume banner data
  const sessionBanner = activeSelfGrading && !activeSelfGrading.session.isFinalized
    ? {
        label: `Grading in progress · ${activeSelfGrading.exam.title}`,
        onResume: () => {
          // activeSelfGrading is already set; just navigate away from current tab will show it
          setActiveTab('library'); // triggers re-render showing SelfGradingView
        },
      }
    : null;

  // Loading screen
  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800/90 p-2 shadow-lg border border-purple-200/50 dark:border-purple-800/40 mx-auto flex items-center justify-center">
            <img src="/logo.png" alt="Scrub Practical" className="w-full h-full object-contain animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="w-6 h-6 border-2 border-purple-900 dark:border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Loading Scrub Practical…</p>
          </div>
        </div>
      </div>
    );
  }

  // 1. Active examination — full focus mode
  if (activeExamRunning) {
    return (
      <ExamRunner
        exam={activeExamRunning.exam}
        subject={activeExamRunning.subject}
        questions={activeExamRunning.questions}
        autoAdvanceOnBell={activeExamRunning.autoAdvanceOnBell}
        onFinishExam={handleFinishExam}
        onExitExam={handleBackToCatalog}
      />
    );
  }

  // 2. Self-grading / review mode
  if (activeSelfGrading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
        <Header
          activeTab="library"
          onTabChange={(tab) => {
            // If navigating away from grading, preserve state but switch view
            setActiveSelfGrading(null);
            setActiveTab(tab);
          }}
          onResetDefaults={handleResetDefaults}
          soundActive={soundActive}
          onToggleSound={handleToggleSound}
        />
        <main className="flex-1">
          <SelfGradingView
            session={activeSelfGrading.session}
            exam={activeSelfGrading.exam}
            questions={activeSelfGrading.questions}
            onFinalizeComplete={(_attempt) => {
              // attempt is saved inside SelfGradingView; nothing needed here
            }}
            onRetakeExam={handleRetakeExam}
            onBackToCatalog={handleBackToCatalog}
            onShowToast={showToast}
          />
        </main>
        <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
      </div>
    );
  }

  // 3. Primary views
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Header
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
        }}
        onResetDefaults={handleResetDefaults}
        soundActive={soundActive}
        onToggleSound={handleToggleSound}
        activeSessionBanner={sessionBanner}
      />

      <main className="flex-1">
        {/* Exam Library */}
        {activeTab === 'library' && (
          <ExamCatalog
            onStartExam={handleOpenPreStart}
            onNavigateToMissingImages={() => {
              setEducatorSubTab('missing_images');
              setActiveTab('educator');
            }}
            onNavigateToHistory={() => setActiveTab('progress')}
          />
        )}

        {/* Practice — Shuffle */}
        {activeTab === 'practice' && (
          <ShuffleDashboard
            onStartExam={(exam, subject, questions, autoAdvanceOnBell) => {
              setActiveExamRunning({ exam, subject, questions, autoAdvanceOnBell });
            }}
            onNavigateToAuthoring={() => {
              setEducatorSubTab('authoring');
              setActiveTab('educator');
            }}
          />
        )}

        {/* Progress */}
        {activeTab === 'progress' && (
          <PerformanceHistory
            onReviewAttempt={handleReviewPastAttempt}
            onNavigateToExams={() => setActiveTab('library')}
            onShowToast={showToast}
          />
        )}

        {/* Educator Workspace */}
        {activeTab === 'educator' && (
          <EducatorWorkspace
            onLaunchExamSimulator={handleLaunchFromAdmin}
            onShowToast={showToast}
            initialSubTab={educatorSubTab}
          />
        )}
      </main>

      {/* Candidate Pre-Start Modal */}
      {preStartExam && (
        <ExamPreStartModal
          isOpen={Boolean(preStartExam)}
          onClose={() => setPreStartExam(null)}
          onConfirmStart={handleConfirmStartExam}
          exam={preStartExam}
          stationCount={preStartStationCount}
        />
      )}

      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
