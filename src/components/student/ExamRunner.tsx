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
  startTimestamp: number; // wall-clock time the exam started, for accurate restoration
  totalTimeSpentSeconds: number;
  stationStartedAt?: number;
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

  // Bell ring: per-station countdown
  const [stationTimeRemaining, setStationTimeRemaining] = useState<number>(
    questions[0]?.stationDurationSeconds || exam.stationDurationSeconds || 90
  );
  // Total timer: overall countdown
  const [totalTimeRemaining, setTotalTimeRemaining] = useState<number>(
    (exam.totalDurationMinutes || 20) * 60
  );
  // Elapsed time (all modes)
  const [totalTimeSpentSeconds, setTotalTimeSpentSeconds] = useState<number>(0);
  const [stationStartedAt, setStationStartedAt] = useState<number>(Date.now());

  // Modals
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
  const stationBellRangRef = useRef<boolean>(false);
  const stationTimerInitializedRef = useRef<boolean>(false);
  const restoredProgressRef = useRef<PersistedExamProgress | null>(null);
  const skipInitialProgressSaveRef = useRef<boolean>(false);

  const hasRestoredRef = useRef<boolean>(false);
  const currentStation = questions[currentStationIndex];

  const triggerPacingAlert = useCallback((alert: PacingAlert) => {
    setActivePacingAlert(alert);
    setFeedbackAnnouncement(`${alert.title}. ${alert.message}`);
    setTimeout(() => {
      setActivePacingAlert((current) => (current?.id === alert.id ? null : current));
    }, 4500);
  }, []);

  // Restore progress from localStorage with timestamp-based timer accuracy
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    try {
      const savedRaw = localStorage.getItem(storageKey);
      if (savedRaw) {
        const saved: PersistedExamProgress = JSON.parse(savedRaw);
        if (saved && typeof saved === 'object') {
          const restoredStationIndex =
            typeof saved.currentStationIndex === 'number' &&
            saved.currentStationIndex >= 0 &&
            saved.currentStationIndex < questions.length
              ? saved.currentStationIndex
              : 0;
          restoredProgressRef.current = saved;
          skipInitialProgressSaveRef.current = true;

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

          if (isBellRing) {
            const restoredStation = questions[restoredStationIndex];
            const allocatedTime = restoredStation?.stationDurationSeconds || exam.stationDurationSeconds || 90;
            const stationStart = typeof saved.stationStartedAt === 'number'
              ? saved.stationStartedAt
              : Date.now();
            const stationElapsed = Math.floor((Date.now() - stationStart) / 1000);
            setStationStartedAt(stationStart);
            setStationTimeRemaining(Math.max(0, allocatedTime - stationElapsed));
          }

          // Recompute elapsed time using wall-clock timestamp
          if (typeof saved.startTimestamp === 'number' && saved.startTimestamp > 0) {
            const elapsedSinceStart = Math.floor((Date.now() - saved.startTimestamp) / 1000);
            const stored = typeof saved.totalTimeSpentSeconds === 'number' ? saved.totalTimeSpentSeconds : 0;
            // Use the larger of stored and wall-clock elapsed (more accurate after gap)
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
    if (skipInitialProgressSaveRef.current) {
      skipInitialProgressSaveRef.current = false;
      return;
    }
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
        stationStartedAt,
      };
      localStorage.setItem(storageKey, JSON.stringify(toSave));
    } catch (err) {
      console.warn('Error saving exam progress:', err);
    }
  }, [storageKey, currentStationIndex, answers, totalTimeSpentSeconds, stationStartedAt]);

  // Load image when station changes
  useEffect(() => {
    if (!currentStation) return;

    warnedStation90sRef.current = false;
    warnedStation60sRef.current = false;
    warnedStation30sRef.current = false;
    warnedTenSecondsRef.current = false;
    stationBellRangRef.current = false;

    const allocatedTime = currentStation.stationDurationSeconds || exam.stationDurationSeconds || 90;
    const restoredProgress = restoredProgressRef.current;
    if (
      isBellRing &&
      restoredProgress &&
      restoredProgress.currentStationIndex === currentStationIndex &&
      typeof restoredProgress.stationStartedAt === 'number'
    ) {
      const elapsed = Math.floor((Date.now() - restoredProgress.stationStartedAt) / 1000);
      setStationStartedAt(restoredProgress.stationStartedAt);
      setStationTimeRemaining(Math.max(0, allocatedTime - elapsed));
      restoredProgressRef.current = null;
    } else {
      if (stationTimerInitializedRef.current) {
        restoredProgressRef.current = null;
      }
      const now = Date.now();
      setStationStartedAt(now);
      setStationTimeRemaining(allocatedTime);
    }
    stationTimerInitializedRef.current = true;

    if (currentStation.imageId) {
      getImageObjectUrl(currentStation.imageId).then(setCurrentImageUrl);
    } else {
      setCurrentImageUrl(null);
    }
  }, [currentStationIndex, currentStation, exam.stationDurationSeconds, isBellRing]);

  // Countdown timer
  useEffect(() => {
    if (timeExpiredRef.current) return;

    const timer = setInterval(() => {
      setTotalTimeSpentSeconds((s) => s + 1);

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
            triggerPacingAlert({ id: 'exam-90', type: 'ninety_seconds', timeLabel: '1m 30s', title: '1 minute 30 seconds remaining', message: 'Review flagged stations before time runs out.', severity: 'info' });
          } else if (prev === 61 && !warnedTotal60sRef.current) {
            warnedTotal60sRef.current = true;
            playPacingWarningChime('one_minute');
            triggerPacingAlert({ id: 'exam-60', type: 'one_minute', timeLabel: '1m', title: '1 minute remaining', message: 'Finalize your answers soon.', severity: 'warning' });
          } else if (prev === 31 && !warnedTotal30sRef.current) {
            warnedTotal30sRef.current = true;
            playPacingWarningChime('thirty_seconds');
            triggerPacingAlert({ id: 'exam-30', type: 'thirty_seconds', timeLabel: '30s', title: '30 seconds — time almost up', message: 'The exam will submit automatically.', severity: 'urgent' });
          }

          return prev - 1;
        });
      }

      // Bell ring mode: per-station countdown
      if (isBellRing) {
        setStationTimeRemaining((prev) => {
          if (prev === 91 && !warnedStation90sRef.current) {
            warnedStation90sRef.current = true;
            playPacingWarningChime('ninety_seconds');
            triggerPacingAlert({ id: `st-90-${currentStationIndex}`, type: 'ninety_seconds', timeLabel: '1m 30s', title: 'Station: 1 minute 30 seconds', message: 'Review your answer and pointer.', severity: 'info' });
          }
          if (prev === 61 && !warnedStation60sRef.current) {
            warnedStation60sRef.current = true;
            playPacingWarningChime('one_minute');
            triggerPacingAlert({ id: `st-60-${currentStationIndex}`, type: 'one_minute', timeLabel: '1m', title: 'Station: 1 minute remaining', message: 'Select your final answer.', severity: 'warning' });
          }
          if (prev === 31 && !warnedStation30sRef.current) {
            warnedStation30sRef.current = true;
            playPacingWarningChime('thirty_seconds');
            triggerPacingAlert({ id: `st-30-${currentStationIndex}`, type: 'thirty_seconds', timeLabel: '30s', title: 'Station: 30 seconds', message: 'Bell rings soon.', severity: 'urgent' });
          }
          if (prev === 11 && !warnedTenSecondsRef.current) {
            warnedTenSecondsRef.current = true;
            playWarningChime();
          }
          if (prev <= 1) {
            if (!stationBellRangRef.current) {
              stationBellRangRef.current = true;
              playStationBell();
              if (autoAdvanceOnBell && currentStationIndex < questions.length - 1) {
                setCurrentStationIndex((curr) => curr + 1);
              }
            }
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timer);
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
        <button onClick={onExitExam} className="mt-4 px-5 py-2.5 bg-rose-950 text-white text-xs font-bold rounded-lg">
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
    setAnswers((prev) => ({
      ...prev,
      [currentStation.id]: { ...currentAnswer, questionId: currentStation.id, selectedOptionId: optionId },
    }));
  };

  const handleTypedAnswerChange = (val: string) => {
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
      if (!currentStation?.options) return;

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
  }, [currentStationIndex, currentStation]);

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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      <div aria-live="polite" aria-atomic="true" className="sr-only">{feedbackAnnouncement}</div>

      {/* Pacing alert banner */}
      {activePacingAlert && (
        <div
          role="alert"
          className={`fixed top-0 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[92%] sm:w-auto mt-2 px-4 py-3 rounded-xl border shadow-lg flex items-center gap-3 ${
            activePacingAlert.severity === 'urgent'
              ? 'bg-red-50 border-red-300 text-red-900'
              : activePacingAlert.severity === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-slate-50 border-slate-300 text-slate-800'
          }`}
        >
          <Timer className="w-4 h-4 shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold">{activePacingAlert.title}</p>
            <p className="text-[11px] opacity-80 mt-0.5">{activePacingAlert.message}</p>
          </div>
          <button
            onClick={() => setActivePacingAlert(null)}
            className="p-1 rounded text-slate-400 hover:text-slate-700"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Exam header — focus mode, no global nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        {/* Progress bar */}
        <div className="w-full bg-slate-100 h-1 overflow-hidden">
          <div
            className="h-full bg-rose-950 transition-[width] duration-500 ease-out"
            style={{ width: `${((currentStationIndex + 1) / questions.length) * 100}%` }}
            aria-hidden="true"
          />
        </div>

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3 py-2.5">
            {/* Left: exam identity + station */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0">
                <span className="w-9 h-9 rounded-lg bg-rose-950 text-white font-mono font-bold text-sm flex items-center justify-center shadow-sm">
                  {currentStationIndex + 1}
                </span>
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-900 block truncate">
                  Station {currentStationIndex + 1} of {questions.length}
                </span>
                <span className="text-[11px] text-slate-400 truncate block max-w-[160px] sm:max-w-xs">
                  {exam.title}
                </span>
              </div>
            </div>

            {/* Center: timer(s) */}
            <div className="flex items-center gap-2">
              {/* Bell ring timer */}
              {isBellRing && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-colors ${
                    stationUrgent
                      ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                      : stationWarning
                      ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                  aria-label={`Station time remaining: ${formatTimer(stationTimeRemaining)}`}
                >
                  <Bell
                    className={`w-3.5 h-3.5 ${stationUrgent ? 'text-red-600 animate-bounce' : stationWarning ? 'text-amber-600' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span>{formatTimer(stationTimeRemaining)}</span>
                  <span className="text-[9px] text-slate-400 hidden sm:inline">station</span>
                </div>
              )}

              {/* Total timer */}
              {isTotalTimer && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs transition-colors ${
                    totalUrgent
                      ? 'bg-red-50 border-red-300 text-red-900 font-bold'
                      : totalWarning
                      ? 'bg-amber-50 border-amber-300 text-amber-800 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                  aria-label={`Total time remaining: ${formatTimer(totalTimeRemaining)}`}
                >
                  <Clock className={`w-3.5 h-3.5 ${totalUrgent ? 'text-red-600' : 'text-slate-400'}`} aria-hidden="true" />
                  <span>{formatTimer(totalTimeRemaining)}</span>
                  <span className="text-[9px] text-slate-400 hidden sm:inline">remaining</span>
                </div>
              )}

              {/* Flexible: elapsed only */}
              {isFlexible && (
                <div
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 font-mono text-xs text-slate-600"
                  aria-label={`Elapsed time: ${formatTimer(totalTimeSpentSeconds)}`}
                >
                  <Clock className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>{formatTimer(totalTimeSpentSeconds)}</span>
                  <span className="text-[9px] text-slate-400 hidden sm:inline">elapsed</span>
                </div>
              )}
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Flag */}
              <button
                type="button"
                onClick={handleToggleFlag}
                title={currentAnswer.isFlagged ? 'Remove flag' : 'Flag for review'}
                aria-label={currentAnswer.isFlagged ? 'Remove flag from this station' : 'Flag this station for review'}
                className={`p-2 rounded-lg border transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
                  currentAnswer.isFlagged
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <Bookmark className={`w-4 h-4 ${currentAnswer.isFlagged ? 'fill-amber-500 text-amber-500' : ''}`} aria-hidden="true" />
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
                className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                {soundOn ? (
                  <Volume2 className="w-4 h-4 text-slate-600" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-4 h-4 text-slate-400" aria-hidden="true" />
                )}
              </button>

              {/* Station roster */}
              <button
                type="button"
                onClick={() => setIsStationDrawerOpen(true)}
                aria-label="Open station roster"
                className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors min-h-[36px]"
              >
                <Menu className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden md:inline">Stations</span>
                <span className="font-mono text-slate-400 text-[11px]">({answeredCount}/{questions.length})</span>
              </button>

              {/* Submit */}
              <button
                id="submit-exam-btn"
                type="button"
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg transition-colors shadow-sm min-h-[36px]"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Finish</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main workspace */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Specimen viewer */}
        <div
          className={`${
            currentStation.type === 'text_mcq' || !currentImageUrl
              ? 'lg:col-span-12'
              : 'lg:col-span-7'
          } space-y-4`}
        >
          {currentImageUrl && (
            <div className="h-[360px] sm:h-[460px] w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
              <SpecimenViewer
                imageUrl={currentImageUrl}
                spotterPin={currentStation.spotterPin}
                altText={currentStation.title || 'Specimen slide'}
                className="w-full h-full"
              />
            </div>
          )}

          {currentStation.clinicalVignette && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800 block">
                Clinical scenario
              </span>
              <p className="text-sm text-amber-950 leading-relaxed">
                {currentStation.clinicalVignette}
              </p>
            </div>
          )}
        </div>

        {/* Question + answer panel */}
        <div
          className={`${
            currentStation.type === 'text_mcq' || !currentImageUrl
              ? 'lg:col-span-12 max-w-3xl mx-auto w-full'
              : 'lg:col-span-5'
          } space-y-4`}
        >
          <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200">
            <div className="space-y-1 mb-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold uppercase tracking-wide text-rose-900">
                  {currentStation.type.replace(/_/g, ' ')}
                </span>
                <span className="font-mono">{currentStation.points || 1} mark{currentStation.points !== 1 ? 's' : ''}</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 leading-snug">
                {currentStation.questionText}
              </h2>
            </div>

            {/* Typed spotter answer */}
            {currentStation.type === 'spotter' &&
              (currentStation.spotterAnswerMode === 'typed' || currentStation.spotterAnswerMode === 'both') && (
                <div className="space-y-2 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-4">
                  <label htmlFor="typed-answer-input" className="block text-xs font-semibold text-slate-700">
                    Your identification:
                  </label>
                  <input
                    id="typed-answer-input"
                    type="text"
                    placeholder="Type the anatomical structure or pathological finding…"
                    value={currentAnswer.typedAnswer || ''}
                    onChange={(e) => handleTypedAnswerChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-900/30 focus:border-rose-900 bg-white"
                    autoComplete="off"
                  />
                  <p className="text-[11px] text-slate-400">
                    Your answer is saved automatically. You'll review it after submitting.
                  </p>
                </div>
              )}

            {/* Multiple choice options */}
            {currentStation.options &&
              currentStation.options.length > 0 &&
              (currentStation.type !== 'spotter' ||
                currentStation.spotterAnswerMode === 'multiple_choice' ||
                currentStation.spotterAnswerMode === 'both') && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      Select one option:
                    </label>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">Keys: 1–4 or A–D</span>
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
                          aria-checked={isSelected}
                          onClick={() => handleSelectOption(opt.id)}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                            isSelected
                              ? 'border-rose-950 bg-rose-50 ring-2 ring-rose-950/15'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-rose-950 text-white' : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {letter}
                          </span>
                          <span className={`text-sm leading-relaxed ${isSelected ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                            {opt.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
          </div>

          {/* Auto-save note */}
          <p className="text-[11px] text-slate-400 text-center">
            Answers saved automatically on this device.
          </p>
        </div>
      </main>

      {/* Bottom navigation bar — fixed */}
      <footer className="bg-white border-t border-slate-200 py-3 px-4 sticky bottom-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <button
            disabled={currentStationIndex === 0}
            onClick={handlePrevStation}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 rounded-lg transition-colors min-h-[44px]"
            aria-label="Previous station"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            <span>Previous</span>
          </button>

          {/* Station mini-grid */}
          <div className="hidden sm:flex items-center gap-1 overflow-x-auto max-w-sm py-1 px-1" role="list" aria-label="Station list">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentStationIndex;
              const ans = answers[q.id];
              const isAnswered = ans && (ans.selectedOptionId || (ans.typedAnswer && ans.typedAnswer.trim().length > 0));
              const isFlagged = ans?.isFlagged;

              let style = 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-transparent';
              if (isCurrent) style = 'bg-rose-950 text-white ring-2 ring-rose-900/30 font-bold border border-transparent';
              else if (isFlagged) style = 'bg-amber-100 text-amber-800 border border-amber-300';
              else if (isAnswered) style = 'bg-green-100 text-green-800 border border-green-300';

              return (
                <button
                  key={q.id}
                  role="listitem"
                  onClick={() => handleJumpToStation(idx)}
                  title={`Station ${idx + 1}${isFlagged ? ' — flagged' : ''}${isAnswered ? ' — answered' : ' — unanswered'}`}
                  aria-label={`Station ${idx + 1}${isFlagged ? ', flagged' : ''}${isAnswered ? ', answered' : ', unanswered'}`}
                  aria-current={isCurrent ? 'true' : undefined}
                  className={`w-7 h-7 rounded-md text-xs font-mono transition-all shrink-0 ${style}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {/* Leave session — explicit, separated */}
            <button
              type="button"
              onClick={() => setIsLeaveConfirmOpen(true)}
              title="Leave exam session (progress will be lost)"
              aria-label="Leave exam session"
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-500 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors min-h-[44px]"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Leave</span>
            </button>

            <button
              onClick={handleNextStation}
              className="flex items-center gap-1.5 px-5 py-2.5 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg transition-colors shadow-sm min-h-[44px]"
              aria-label={currentStationIndex === questions.length - 1 ? 'Finish exam' : 'Next station'}
            >
              <span>{currentStationIndex === questions.length - 1 ? 'Finish & submit' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </footer>

      {/* Station roster modal */}
      {isStationDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Station roster">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Station roster</h3>
              <button onClick={() => setIsStationDrawerOpen(false)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Close roster">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-400" aria-hidden="true" /> Answered ({answeredCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" aria-hidden="true" /> Flagged ({flaggedCount})</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200" aria-hidden="true" /> Unanswered ({questions.length - answeredCount})</span>
            </div>

            <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto" role="list">
              {questions.map((q, idx) => {
                const isCurrent = idx === currentStationIndex;
                const ans = answers[q.id];
                const isAnswered = ans && (ans.selectedOptionId || (ans.typedAnswer && ans.typedAnswer.trim().length > 0));
                const isFlagged = ans?.isFlagged;

                let boxStyle = 'bg-slate-100 text-slate-600 hover:bg-slate-200';
                if (isCurrent) boxStyle = 'ring-2 ring-rose-950 bg-rose-50 text-rose-950 font-extrabold';
                else if (isFlagged) boxStyle = 'bg-amber-100 text-amber-900 border border-amber-300';
                else if (isAnswered) boxStyle = 'bg-green-100 text-green-900 border border-green-300';

                return (
                  <button
                    key={q.id}
                    role="listitem"
                    onClick={() => handleJumpToStation(idx)}
                    aria-label={`Go to station ${idx + 1}`}
                    className={`p-3 rounded-lg text-xs font-mono font-bold flex flex-col items-center justify-center gap-0.5 transition-all ${boxStyle}`}
                  >
                    <span>{idx + 1}</span>
                    <span className="text-[10px] font-normal opacity-70 uppercase">
                      {q.type === 'spotter' ? 'Spot' : 'MCQ'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button onClick={() => setIsStationDrawerOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submit confirmation */}
      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Submit exam">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-rose-900" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Submit your answers?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  You'll then review and self-grade each station.
                </p>
              </div>
            </div>

            {answeredCount < questions.length && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                <span>
                  <strong>{questions.length - answeredCount} station{questions.length - answeredCount > 1 ? 's' : ''} unanswered.</strong>{' '}
                  You can still submit — unanswered stations score 0.
                </span>
              </div>
            )}

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
              <p>Answered: <strong>{answeredCount} of {questions.length}</strong></p>
              <p>Flagged: <strong>{flaggedCount}</strong></p>
              <p>Time elapsed: <strong className="font-mono">{formatTimer(totalTimeSpentSeconds)}</strong></p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsSubmitConfirmOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[40px]">
                Keep reviewing
              </button>
              <button
                id="confirm-submit-btn"
                type="button"
                onClick={handleConfirmFinish}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg transition-colors shadow-sm min-h-[40px]"
              >
                Submit answers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave session confirmation */}
      {isLeaveConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Leave session">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Leave this exam?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Your answers will be discarded and you'll return to the Exam Library.
                  This cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsLeaveConfirmOpen(false)} className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors min-h-[40px]">
                Stay in exam
              </button>
              <button
                id="confirm-leave-btn"
                type="button"
                onClick={handleConfirmLeave}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg transition-colors min-h-[40px]"
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

