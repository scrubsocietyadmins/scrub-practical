import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  Bell,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  Menu,
  X,
  Volume2,
  VolumeX,
  Timer,
  LogOut,
  Lock,
} from 'lucide-react';
import type { Exam, Question, StudentStationAnswer, Subject } from '../../types';
import { getImageObjectUrl } from '../../db';
import { SpecimenViewer } from '../common/SpecimenViewer';
import {
  playStationBell,
  playWarningChime,
  playStationClick,
  playPacingWarningChime,
  isSoundEnabled,
  toggleSound,
} from '../../services/sound';

interface ExamRunnerProps {
  exam: Exam;
  subject?: Subject;
  questions: Question[];
  autoAdvanceOnBell: boolean;
  onFinishExam: (answers: Record<string, StudentStationAnswer>, timeSpentSeconds: number) => void;
  onExitExam: () => void;
}

interface PersistedExamProgress {
  currentStationIndex: number;
  answers: Record<string, StudentStationAnswer>;
  startTimestamp: number;
  totalTimeSpentSeconds: number;
}

interface PacingAlert {
  id: string;
  type: 'ninety_seconds' | 'one_minute' | 'thirty_seconds';
  timeLabel: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'urgent';
}

export const ExamRunner: React.FC<ExamRunnerProps> = ({
  exam,
  subject,
  questions,
  autoAdvanceOnBell,
  onFinishExam,
  onExitExam,
}) => {
  const storageKey = `scrubPracticalExamRunning:${exam.id}`;

  const isBellRing = exam.timingMode === 'bell_ring';
  const isTotalTimer = exam.timingMode === 'total_timer';
  const isFlexible = exam.timingMode === 'flexible';

  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, StudentStationAnswer>>({});
  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [feedbackAnnouncement, setFeedbackAnnouncement] = useState<string>('');
  const [activePacingAlert, setActivePacingAlert] = useState<PacingAlert | null>(null);

  // Spotter view toggle when spotterAnswerMode === 'both'
  const [spotterViewMode, setSpotterViewMode] = useState<'mcq' | 'typed'>('mcq');

  // Station lock state for strict bell rotation
  const [isStationLocked, setIsStationLocked] = useState<boolean>(false);
  const stationEndTimeRef = useRef<number>(0);
  const isTransitioningRef = useRef<boolean>(false);

  // Countdown values
  const [stationTimeRemaining, setStationTimeRemaining] = useState<number>(
    questions[0]?.stationDurationSeconds || exam.stationDurationSeconds || 90
  );
  const [totalTimeRemaining, setTotalTimeRemaining] = useState<number>(
    (exam.totalDurationMinutes || 20) * 60
  );
  const [totalTimeSpentSeconds, setTotalTimeSpentSeconds] = useState<number>(0);

  // Modals & Navigation
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [isStationDrawerOpen, setIsStationDrawerOpen] = useState(false);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = useState(false);
  const [timeExpiredSubmit, setTimeExpiredSubmit] = useState(false);

  // Warning guard refs
  const warnedStation90sRef = useRef<boolean>(false);
  const warnedStation60sRef = useRef<boolean>(false);
  const warnedStation30sRef = useRef<boolean>(false);
  const warnedTenSecondsRef = useRef<boolean>(false);
  const warnedTotal90sRef = useRef<boolean>(false);
  const warnedTotal60sRef = useRef<boolean>(false);
  const warnedTotal30sRef = useRef<boolean>(false);
  const timeExpiredRef = useRef<boolean>(false);

  const hasRestoredRef = useRef<boolean>(false);
  const currentStation = questions[currentStationIndex];

  const triggerPacingAlert = useCallback((alert: PacingAlert) => {
    setActivePacingAlert(alert);
    setFeedbackAnnouncement(`${alert.title}. ${alert.message}`);
    setTimeout(() => {
      setActivePacingAlert((current) => (current?.id === alert.id ? null : current));
    }, 4500);
  }, []);

  // Restore progress from localStorage
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const saved: PersistedExamProgress = JSON.parse(savedRaw);
        if (saved && typeof saved === 'object') {
          if (
            typeof saved.currentStationIndex === 'number' &&
            saved.currentStationIndex >= 0 &&
            saved.currentStationIndex < questions.length
          ) {
            setCurrentStationIndex(saved.currentStationIndex);
          }
          if (saved.answers && typeof saved.answers === 'object') {
            setAnswers(saved.answers);
          }

          if (typeof saved.startTimestamp === 'number' && saved.startTimestamp > 0) {
            const elapsedSinceStart = Math.floor((Date.now() - saved.startTimestamp) / 1000);
            const stored = typeof saved.totalTimeSpentSeconds === 'number' ? saved.totalTimeSpentSeconds : 0;
            const computed = Math.max(stored, elapsedSinceStart);
            setTotalTimeSpentSeconds(computed);

            if (isTotalTimer) {
              const totalSecs = (exam.totalDurationMinutes || 20) * 60;
              setTotalTimeRemaining(Math.max(0, totalSecs - computed));
            }
          } else if (typeof saved.totalTimeSpentSeconds === 'number') {
            setTotalTimeSpentSeconds(saved.totalTimeSpentSeconds);
          }
        }
      }
    } catch (err) {
      console.warn('Error restoring exam progress:', err);
    }
  }, [storageKey, questions.length, isTotalTimer, exam.totalDurationMinutes]);

  // Persist progress
  useEffect(() => {
    if (!hasRestoredRef.current) return;
    try {
      const existing = localStorage.getItem(storageKey);
      let startTimestamp = Date.now();
      if (existing) {
        try {
          const parsed: PersistedExamProgress = JSON.parse(existing);
          if (parsed.startTimestamp) startTimestamp = parsed.startTimestamp;
        } catch {
          /* ignore */
        }
      }
      const toSave: PersistedExamProgress = {
        currentStationIndex,
        answers,
        startTimestamp,
        totalTimeSpentSeconds,
      };
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (err) {
      console.warn('Error saving exam progress:', err);
    }
  }, [storageKey, currentStationIndex, answers, totalTimeSpentSeconds]);

  // Load image & setup timer when station changes
  useEffect(() => {
    if (!currentStation) return;

    warnedStation90sRef.current = false;
    warnedStation60sRef.current = false;
    warnedStation30sRef.current = false;
    warnedTenSecondsRef.current = false;
    setIsStationLocked(false);
    isTransitioningRef.current = false;

    // Reset spotter view mode if current station has typed answers recorded
    const existingAns = answers[currentStation.id];
    if (existingAns?.typedAnswer && !existingAns?.selectedOptionId) {
      setSpotterViewMode('typed');
    } else {
      setSpotterViewMode('mcq');
    }

    const allocatedTime = currentStation.stationDurationSeconds || exam.stationDurationSeconds || 90;
    setStationTimeRemaining(allocatedTime);
    stationEndTimeRef.current = Date.now() + allocatedTime * 1000;

    if (currentStation.imageId) {
      getImageObjectUrl(currentStation.imageId).then(setCurrentImageUrl);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentStationIndex, currentStation, exam.stationDurationSeconds]);

  // Countdown timer with wall-clock drift protection
  useEffect(() => {
    if (timeExpiredRef.current) return;

    const checkTiming = () => {
      // Total timer mode countdown
      if (isTotalTimer) {
        setTotalTimeRemaining((prev) => {
          if (prev <= 1) {
            if (!timeExpiredRef.current) {
              timeExpiredRef.current = true;
              setTimeExpiredSubmit(true);
            }
            return 0;
          }

          if (prev === 91 && !warnedTotal90sRef.current) {
            warnedTotal90sRef.current = true;
            playPacingWarningChime('ninety_seconds');
            triggerPacingAlert({
              id: 'exam-90',
              type: 'ninety_seconds',
              timeLabel: '1m 30s',
              title: '1 minute 30 seconds remaining',
              message: 'Review flagged stations before time runs out.',
              severity: 'info',
            });
          } else if (prev === 61 && !warnedTotal60sRef.current) {
            warnedTotal60sRef.current = true;
            playPacingWarningChime('one_minute');
            triggerPacingAlert({
              id: 'exam-60',
              type: 'one_minute',
              timeLabel: '1m',
              title: '1 minute remaining',
              message: 'Finalize your answers soon.',
              severity: 'warning',
            });
          } else if (prev === 31 && !warnedTotal30sRef.current) {
            warnedTotal30sRef.current = true;
            playPacingWarningChime('thirty_seconds');
            triggerPacingAlert({
              id: 'exam-30',
              type: 'thirty_seconds',
              timeLabel: '30s',
              title: '30 seconds — time almost up',
              message: 'The exam will submit automatically.',
              severity: 'urgent',
            });
          }

          return prev - 1;
        });
      }

      // Bell ring mode: per-station countdown with wall-clock end timestamp
      if (isBellRing && stationEndTimeRef.current > 0) {
        const remaining = Math.max(0, Math.ceil((stationEndTimeRef.current - Date.now()) / 1000));
        setStationTimeRemaining(remaining);

        if (remaining === 90 && !warnedStation90sRef.current) {
          warnedStation90sRef.current = true;
          playPacingWarningChime('ninety_seconds');
          triggerPacingAlert({
            id: `st-90-${currentStationIndex}`,
            type: 'ninety_seconds',
            timeLabel: '1m 30s',
            title: 'Station: 1 minute 30 seconds',
            message: 'Review your answer and pointer.',
            severity: 'info',
          });
        }
        if (remaining === 60 && !warnedStation60sRef.current) {
          warnedStation60sRef.current = true;
          playPacingWarningChime('one_minute');
          triggerPacingAlert({
            id: `st-60-${currentStationIndex}`,
            type: 'one_minute',
            timeLabel: '1m',
            title: 'Station: 1 minute remaining',
            message: 'Select your final answer.',
            severity: 'warning',
          });
        }
        if (remaining === 30 && !warnedStation30sRef.current) {
          warnedStation30sRef.current = true;
          playPacingWarningChime('thirty_seconds');
          triggerPacingAlert({
            id: `st-30-${currentStationIndex}`,
            type: 'thirty_seconds',
            timeLabel: '30s',
            title: 'Station: 30 seconds',
            message: 'Bell rings soon.',
            severity: 'urgent',
          });
        }
        if (remaining === 10 && !warnedTenSecondsRef.current) {
          warnedTenSecondsRef.current = true;
          playWarningChime();
        }

        // When station timer expires: strict lock and rotation
        if (remaining <= 0) {
          setIsStationLocked(true);

          if (!isTransitioningRef.current) {
            isTransitioningRef.current = true;
            playStationBell();

            if (autoAdvanceOnBell) {
              if (currentStationIndex < questions.length - 1) {
                setTimeout(() => {
                  setCurrentStationIndex((curr) => curr + 1);
                }, 400);
              } else {
                // Last station expired in strict rotation -> auto-submit exam
                setTimeout(() => {
                  setTimeExpiredSubmit(true);
                }, 400);
              }
            }
          }
        }
      }
    };

    const timer = setInterval(() => {
      setTotalTimeSpentSeconds((s) => s + 1);
      checkTiming();
    }, 1000);

    const handleVisibilityOrFocus = () => {
      checkTiming();
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(timer);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [autoAdvanceOnBell, currentStationIndex, questions.length, triggerPacingAlert, isBellRing, isTotalTimer]);

  // Auto-submit when total timer expires
  useEffect(() => {
    if (timeExpiredSubmit) {
      setTimeExpiredSubmit(false);
      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
      onFinishExam(answers, totalTimeSpentSeconds);
    }
  }, [timeExpiredSubmit, answers, totalTimeSpentSeconds, onFinishExam, storageKey]);

  if (!currentStation) {
    return (
      <div className="p-12 text-center text-slate-600 bg-white min-h-screen flex flex-col items-center justify-center">
        <p className="text-base font-semibold">No stations found for this examination.</p>
        <button onClick={onExitExam} className="mt-4 px-5 py-2.5 bg-rose-950 text-white text-xs font-bold rounded-lg cursor-pointer">
          Return to Exam Library
        </button>
      </div>
    );
  }

  const currentAnswer = answers[currentStation.id] || {
    questionId: currentStation.id,
    isFlagged: false,
    timeSpentSeconds: 0,
  };

  const handleSelectOption = (optionId: string) => {
    if (isStationLocked) return;
    setAnswers((prev) => ({
      ...prev,
      [currentStation.id]: { ...currentAnswer, questionId: currentStation.id, selectedOptionId: optionId },
    }));
  };

  const handleTypedAnswerChange = (val: string) => {
    if (isStationLocked) return;
    setAnswers((prev) => ({
      ...prev,
      [currentStation.id]: { ...currentAnswer, questionId: currentStation.id, typedAnswer: val },
    }));
  };

  const handleToggleFlag = () => {
    setAnswers((prev) => ({
      ...prev,
      [currentStation.id]: { ...currentAnswer, questionId: currentStation.id, isFlagged: !currentAnswer.isFlagged },
    }));
  };

  const handlePrevStation = () => {
    if (currentStationIndex > 0) {
      playStationClick();
      setCurrentStationIndex(currentStationIndex - 1);
    }
  };

  const handleNextStation = () => {
    if (currentStationIndex < questions.length - 1) {
      playStationClick();
      setCurrentStationIndex(currentStationIndex + 1);
    } else {
      setIsSubmitConfirmOpen(true);
    }
  };

  const handleJumpToStation = (idx: number) => {
    playStationClick();
    setCurrentStationIndex(idx);
    setIsStationDrawerOpen(false);
  };

  const handleConfirmFinish = () => {
    setIsSubmitConfirmOpen(false);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    onFinishExam(answers, totalTimeSpentSeconds);
  };

  const handleConfirmLeave = () => {
    setIsLeaveConfirmOpen(false);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    onExitExam();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!currentStation?.options || isStationLocked) return;

      const opts = currentStation.options;
      if (e.key === '1' || e.key === 'a' || e.key === 'A') { if (opts[0]) handleSelectOption(opts[0].id); }
      else if (e.key === '2' || e.key === 'b' || e.key === 'B') { if (opts[1]) handleSelectOption(opts[1].id); }
      else if (e.key === '3' || e.key === 'c' || e.key === 'C') { if (opts[2]) handleSelectOption(opts[2].id); }
      else if (e.key === '4' || e.key === 'd' || e.key === 'D') { if (opts[3]) handleSelectOption(opts[3].id); }
      else if (e.key === 'ArrowLeft') { handlePrevStation(); }
      else if (e.key === 'ArrowRight') { handleNextStation(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStationIndex, currentStation, isStationLocked]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const answeredCount = questions.filter((q) => {
    const ans = answers[q.id];
    return ans && (ans.selectedOptionId || (ans.typedAnswer && ans.typedAnswer.trim().length > 0));
  }).length;

  const flaggedCount = questions.filter((q) => answers[q.id]?.isFlagged).length;

  // Timer urgency styling for bell ring
  const stationUrgent = isBellRing && stationTimeRemaining <= 30;
  const stationWarning = isBellRing && stationTimeRemaining > 30 && stationTimeRemaining <= 60;

  // Timer urgency for total timer
  const totalUrgent = isTotalTimer && totalTimeRemaining <= 30;
  const totalWarning = isTotalTimer && totalTimeRemaining > 30 && totalTimeRemaining <= 60;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex flex-col font-sans text-slate-900 dark:text-slate-100 transition-colors">
      <div aria-live="polite" aria-atomic="true" className="sr-only">{feedbackAnnouncement}</div>

      {/* Pacing alert banner */}
      {activePacingAlert && (
        <div
          role="alert"
          className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] sm:w-auto mt-2 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 ${
            activePacingAlert.severity === 'urgent'
              ? 'bg-red-50 dark:bg-red-950/80 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
              : activePacingAlert.severity === 'warning'
              ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              : 'bg-slate-50 dark:bg-slate-850 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
          }`}
        >
          <Timer className="w-4 h-4 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">{activePacingAlert.title}</p>
            <p className="text-[11px] opacity-80 mt-0.5">{activePacingAlert.message}</p>
          </div>
          <button
            onClick={() => setActivePacingAlert(null)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Exam Header — Compact, streamlined, no premature Finish button */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 shadow-xs">
        {/* Progress bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-700 to-indigo-600 dark:from-purple-500 dark:to-indigo-400 transition-[width] duration-500 ease-out"
            style={{ width: `${((currentStationIndex + 1) / questions.length) * 100}%` }}
            aria-hidden="true"
          />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 sm:gap-4 py-2 sm:py-2.5">
            {/* Left: station indicator and exam title */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="shrink-0">
                <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-purple-950 dark:bg-purple-900/90 text-white font-mono font-bold text-xs sm:text-sm flex items-center justify-center shadow-xs border border-purple-800/40">
                  {currentStationIndex + 1}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white block truncate">
                  Station {currentStationIndex + 1} of {questions.length}
                </span>
                <span className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate block max-w-[120px] sm:max-w-xs font-medium">
                  {exam.title}
                </span>
              </div>
            </div>

            {/* Center: timer badge (MM:SS) */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Bell ring per-station timer */}
              {isBellRing && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border font-mono text-xs sm:text-sm transition-colors ${
                    isStationLocked
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 font-bold'
                      : stationUrgent
                      ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 font-bold animate-pulse'
                      : stationWarning
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  aria-label={`Station time remaining: ${formatTimer(stationTimeRemaining)}`}
                >
                  <Bell
                    className={`w-3.5 h-3.5 ${isStationLocked ? 'text-rose-600' : stationUrgent ? 'text-red-600 dark:text-red-400' : stationWarning ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span className="font-bold">{formatTimer(stationTimeRemaining)}</span>
                </div>
              )}

              {/* Total timer */}
              {isTotalTimer && (
                <div
                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border font-mono text-xs sm:text-sm transition-colors ${
                    totalUrgent
                      ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 font-bold'
                      : totalWarning
                      ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-200 font-semibold'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                  aria-label={`Total time remaining: ${formatTimer(totalTimeRemaining)}`}
                >
                  <Clock className={`w-3.5 h-3.5 ${totalUrgent ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`} aria-hidden="true" />
                  <span className="font-bold">{formatTimer(totalTimeRemaining)}</span>
                </div>
              )}

              {/* Flexible mode */}
              {isFlexible && (
                <div
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-600 dark:text-slate-300"
                  aria-label={`Elapsed time: ${formatTimer(totalTimeSpentSeconds)}`}
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>{formatTimer(totalTimeSpentSeconds)}</span>
                </div>
              )}
            </div>

            {/* Right: Flag, Roster, Sound, Leave */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* Flag button */}
              <button
                type="button"
                onClick={handleToggleFlag}
                title={currentAnswer.isFlagged ? 'Remove flag' : 'Flag for review'}
                aria-label={currentAnswer.isFlagged ? 'Remove flag from this station' : 'Flag this station for review'}
                className={`p-2 rounded-lg border transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer ${
                  currentAnswer.isFlagged
                    ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${currentAnswer.isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} aria-hidden="true" />
              </button>

              {/* Stations Roster button (Visible on mobile too!) */}
              <button
                type="button"
                onClick={() => setIsStationDrawerOpen(true)}
                title="View Stations Roster"
                aria-label="Open station roster"
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors min-h-[36px] cursor-pointer"
              >
                <Menu className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" aria-hidden="true" />
                <span className="hidden sm:inline">Answered:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  {answeredCount}/{questions.length}
                </span>
              </button>

              {/* Sound toggle */}
              <button
                type="button"
                onClick={() => {
                  const next = toggleSound();
                  setSoundOn(next);
                  setFeedbackAnnouncement(next ? 'Sound on' : 'Sound muted');
                }}
                title={soundOn ? 'Mute audio chimes' : 'Enable audio chimes'}
                aria-label={soundOn ? 'Mute OSPE bell sounds' : 'Enable OSPE bell sounds'}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              >
                {soundOn ? (
                  <Volume2 className="w-4 h-4 text-purple-700 dark:text-purple-400" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                )}
              </button>

              {/* Exit/Leave Icon */}
              <button
                type="button"
                onClick={() => setIsLeaveConfirmOpen(true)}
                title="Leave exam session"
                aria-label="Leave exam session"
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Examination Workspace: Desktop two-column, Mobile clean vertical stack */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (Desktop) / Top Section (Mobile): Specimen Image & Clinical Scenario */}
        <div
          className={`${
            currentStation.type === 'text_mcq' || !currentImageUrl
              ? 'lg:col-span-12'
              : 'lg:col-span-7'
          } space-y-4`}
        >
          {/* Specimen image viewer with pan & zoom pin */}
          {currentImageUrl && (
            <div className="h-64 sm:h-80 md:h-[400px] lg:h-[460px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 shadow-xs">
              <SpecimenViewer
                imageUrl={currentImageUrl}
                spotterPin={currentStation.spotterPin}
                altText={currentStation.title || 'Examination specimen slide'}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Clinical scenario / Vignette */}
          {currentStation.clinicalVignette && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 block">
                Clinical scenario
              </span>
              <p className="text-sm text-amber-950 dark:text-amber-200 leading-relaxed font-sans">
                {currentStation.clinicalVignette}
              </p>
            </div>
          )}
        </div>

        {/* Right Column (Desktop) / Bottom Section (Mobile): Question Prompt & Answer Input */}
        <div
          className={`${
            currentStation.type === 'text_mcq' || !currentImageUrl
              ? 'lg:col-span-12 max-w-3xl mx-auto w-full'
              : 'lg:col-span-5'
          } space-y-4`}
        >
          {/* Station Question Card */}
          <div className="bg-white dark:bg-slate-850 p-5 sm:p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="space-y-1.5 mb-4">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold uppercase tracking-wide text-purple-700 dark:text-purple-400">
                  {currentStation.type.replace(/_/g, ' ')}
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {currentStation.points || 1} mark{(currentStation.points || 1) !== 1 ? 's' : ''}
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                {currentStation.questionText}
              </h2>
            </div>

            {/* Station Expired & Locked Alert */}
            {isStationLocked && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-xs text-red-900 dark:text-red-200 font-semibold flex items-center gap-2 mb-4">
                <Lock className="w-4 h-4 text-red-600 shrink-0" />
                <span>Station time expired. Answering is locked for this station.</span>
              </div>
            )}

            {/* Mode switch for spotters with spotterAnswerMode === 'both' */}
            {currentStation.type === 'spotter' && currentStation.spotterAnswerMode === 'both' && (
              <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4 text-xs font-semibold">
                <button
                  type="button"
                  disabled={isStationLocked}
                  onClick={() => setSpotterViewMode('mcq')}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                    spotterViewMode === 'mcq'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Multiple Choice
                </button>
                <button
                  type="button"
                  disabled={isStationLocked}
                  onClick={() => setSpotterViewMode('typed')}
                  className={`flex-1 py-1.5 rounded-md transition-all cursor-pointer ${
                    spotterViewMode === 'typed'
                      ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 shadow-xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Typed Identification
                </button>
              </div>
            )}

            {/* 1. Free-text Input: Rendered ONLY when spotter is in typed mode or active view */}
            {currentStation.type === 'spotter' &&
              (currentStation.spotterAnswerMode === 'typed' ||
                (currentStation.spotterAnswerMode === 'both' && spotterViewMode === 'typed')) && (
                <div className="space-y-2 p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl mb-4">
                  <label htmlFor="typed-answer-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Your identification:
                  </label>
                  <input
                    id="typed-answer-input"
                    type="text"
                    disabled={isStationLocked}
                    placeholder="Type the anatomical structure or pathological finding…"
                    value={currentAnswer.typedAnswer || ''}
                    onChange={(e) => handleTypedAnswerChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-600/30 focus:border-purple-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Your answer is saved automatically. You'll evaluate it during self-grading.
                  </p>
                </div>
              )}

            {/* 2. Multiple Choice Options: Rendered for MCQs or spotters in MCQ mode */}
            {currentStation.options &&
              currentStation.options.length > 0 &&
              (currentStation.type !== 'spotter' ||
                currentStation.spotterAnswerMode === 'multiple_choice' ||
                (currentStation.spotterAnswerMode === 'both' && spotterViewMode === 'mcq')) && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                      Select one option:
                    </label>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:inline">Keys: 1–4 or A–D</span>
                  </div>

                  <div className="space-y-2" role="radiogroup" aria-label="Answer options">
                    {currentStation.options.map((opt, idx) => {
                      const isSelected = currentAnswer.selectedOptionId === opt.id;
                      const letter = String.fromCharCode(65 + idx);
                      return (
                        <button
                          key={opt.id}
                          id={`option-${opt.id}`}
                          type="button"
                          role="radio"
                          disabled={isStationLocked}
                          aria-checked={isSelected}
                          onClick={() => handleSelectOption(opt.id)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                            isStationLocked
                              ? 'opacity-60 cursor-not-allowed'
                              : 'cursor-pointer'
                          } ${
                            isSelected
                              ? 'border-purple-600 dark:border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-600/20'
                              : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/80'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-purple-700 dark:bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className={`text-sm leading-relaxed ${isSelected ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200'}`}>
                            {opt.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>

          {/* Auto-save status note */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            Answers are saved automatically on this device.
          </p>
        </div>
      </main>

      {/* Bottom Navigation Bar */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-3 px-4 sticky bottom-0 z-20 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Previous Station button */}
          <button
            disabled={currentStationIndex === 0}
            onClick={handlePrevStation}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 rounded-lg transition-colors min-h-[44px] cursor-pointer"
            aria-label="Previous station"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>Previous</span>
          </button>

          {/* Station mini-grid pills */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-[160px] sm:max-w-sm py-1 px-1 scrollbar-none" role="list" aria-label="Station list">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentStationIndex;
              const ans = answers[q.id];
              const isAnswered = ans && (ans.selectedOptionId || (ans.typedAnswer && ans.typedAnswer.trim().length > 0));
              const isFlagged = ans?.isFlagged;

              let style = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 border border-transparent';
              if (isCurrent) style = 'bg-purple-700 dark:bg-purple-600 text-white ring-2 ring-purple-600/30 font-bold border border-transparent';
              else if (isFlagged) style = 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800';
              else if (isAnswered) style = 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800';

              return (
                <button
                  key={q.id}
                  role="listitem"
                  onClick={() => handleJumpToStation(idx)}
                  title={`Station ${idx + 1}${isFlagged ? ' — flagged' : ''}${isAnswered ? ' — answered' : ' — unanswered'}`}
                  aria-label={`Station ${idx + 1}${isFlagged ? ', flagged' : ''}${isAnswered ? ', answered' : ', unanswered'}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={`w-7 h-7 rounded-md text-xs font-mono transition-all shrink-0 cursor-pointer ${style}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Next / Finish & Submit */}
          <div className="flex items-center gap-2">
            {currentStationIndex === questions.length - 1 ? (
              <button
                id="finish-exam-submit-btn"
                type="button"
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-lg transition-all shadow-md min-h-[44px] cursor-pointer"
                aria-label="Finish and submit examination"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Finish &amp; Submit</span>
              </button>
            ) : (
              <button
                onClick={handleNextStation}
                className="flex items-center gap-1.5 px-4 sm:px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-500 rounded-lg transition-all shadow-xs min-h-[44px] cursor-pointer"
                aria-label="Next station"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Station Roster Drawer Modal */}
      {isStationDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Station roster">
          <div className="bg-white dark:bg-slate-850 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stations Roster</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Stations Answered: <strong>{answeredCount} of {questions.length}</strong>
                </p>
              </div>
              <button onClick={() => setIsStationDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer" aria-label="Close roster">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400" aria-hidden="true" /> Answered ({answeredCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" aria-hidden="true" /> Flagged ({flaggedCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700" aria-hidden="true" /> Unanswered ({questions.length - answeredCount})</span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-64 overflow-y-auto" role="list">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentStationIndex;
                const ans = answers[q.id];
                const isAnswered = ans && (ans.selectedOptionId || (ans.typedAnswer && ans.typedAnswer.trim().length > 0));
                const isFlagged = ans?.isFlagged;

                let boxStyle = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';
                if (isCurrent) boxStyle = 'ring-2 ring-purple-600 bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-200 font-extrabold';
                else if (isFlagged) boxStyle = 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800';
                else if (isAnswered) boxStyle = 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800';

                return (
                  <button
                    key={q.id}
                    role="listitem"
                    onClick={() => handleJumpToStation(idx)}
                    aria-label={`Go to station ${idx + 1}`}
                    className={`p-3 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer ${boxStyle}`}
                  >
                    <span>{idx + 1}</span>
                    <span className="text-[10px] font-normal opacity-70 uppercase">
                      {q.type === 'spotter' ? 'Spotter' : 'MCQ'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsStationDrawerOpen(false);
                  setIsSubmitConfirmOpen(true);
                }}
                className="px-3 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 rounded-lg hover:from-purple-800 hover:to-indigo-700 cursor-pointer"
              >
                Submit Exam Now
              </button>
              <button onClick={() => setIsStationDrawerOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Submit exam">
          <div className="bg-white dark:bg-slate-850 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/60 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-purple-700 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Submit your answers?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  You'll proceed to the self-grading evaluation and answer review.
                </p>
              </div>
            </div>

            {answeredCount < questions.length && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 rounded-lg text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                <span>
                  <strong>{questions.length - answeredCount} station{questions.length - answeredCount > 1 ? 's' : ''} unanswered.</strong>{' '}
                  You can still submit — unanswered stations receive 0 credit.
                </span>
              </div>
            )}

            <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
              <p>Stations Answered: <strong>{answeredCount} of {questions.length}</strong></p>
              <p>Flagged for review: <strong>{flaggedCount}</strong></p>
              <p>Time elapsed: <strong className="font-mono">{formatTimer(totalTimeSpentSeconds)}</strong></p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setIsSubmitConfirmOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-h-[40px] cursor-pointer">
                Keep reviewing
              </button>
              <button
                id="confirm-submit-btn"
                type="button"
                onClick={handleConfirmFinish}
                className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-500 rounded-lg transition-all shadow-xs min-h-[40px] cursor-pointer"
              >
                Submit answers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave Session Confirmation Modal */}
      {isLeaveConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Leave session">
          <div className="bg-white dark:bg-slate-850 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Leave this exam?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Your answers will be discarded and you'll return to the Exam Library.
                  This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button type="button" onClick={() => setIsLeaveConfirmOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors min-h-[40px] cursor-pointer">
                Stay in exam
              </button>
              <button
                id="confirm-leave-btn"
                type="button"
                onClick={handleConfirmLeave}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 rounded-lg transition-colors min-h-[40px] cursor-pointer"
              >
                Leave and discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
