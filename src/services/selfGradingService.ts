import type { Question, StudentStationAnswer, ExamAttempt, Exam, SelfGradeValue, SelfGradingSession } from '../types';
import { v4 as uuidv4 } from '../db/uuid';

export interface SelfGradingCalculationResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  fullyCorrectCount: number;
  partiallyCorrectCount: number;
  incorrectCount: number;
  passed: boolean;
  isComplete: boolean;
  gradedCount: number;
  ungradedCount: number;
}

/**
 * Calculates score metrics based purely on explicit student self-grading marks.
 * Supports:
 * - 1.0 point: Fully correct
 * - 0.5 points: Partially correct
 * - 0.0 points: Incorrect
 */
export function calculateSelfGradingScore(
  questions: Question[],
  grades: Record<string, SelfGradeValue>,
  passingScorePercent: number = 60
): SelfGradingCalculationResult {
  let totalScore = 0;
  let maxScore = 0;
  let fullyCorrectCount = 0;
  let partiallyCorrectCount = 0;
  let incorrectCount = 0;
  let gradedCount = 0;

  for (const q of questions) {
    const qWeight = q.points || 1;
    maxScore += qWeight;

    const grade = grades[q.id];
    if (grade !== undefined) {
      gradedCount++;
      const awarded = grade * qWeight;
      totalScore += awarded;

      if (grade === 1) {
        fullyCorrectCount++;
      } else if (grade === 0.5) {
        partiallyCorrectCount++;
      } else if (grade === 0) {
        incorrectCount++;
      }
    }
  }

  // Rounded to one decimal place
  const roundedTotalScore = Math.round(totalScore * 10) / 10;
  const percentage = maxScore > 0 ? Math.round((roundedTotalScore / maxScore) * 1000) / 10 : 0;
  const passed = percentage >= passingScorePercent;
  const ungradedCount = questions.length - gradedCount;
  const isComplete = ungradedCount === 0;

  return {
    totalScore: roundedTotalScore,
    maxScore,
    percentage,
    fullyCorrectCount,
    partiallyCorrectCount,
    incorrectCount,
    passed,
    isComplete,
    gradedCount,
    ungradedCount,
  };
}

/**
 * Returns question IDs that the student has not yet explicitly graded.
 */
export function getUngradedQuestionIds(
  questions: Question[],
  grades: Record<string, SelfGradeValue>
): string[] {
  return questions
    .filter((q) => grades[q.id] === undefined)
    .map((q) => q.id);
}

/**
 * Creates a fresh, independent self-grading session.
 */
export function createInitialSelfGradingSession(
  exam: Exam,
  subjectName: string,
  answers: Record<string, StudentStationAnswer>,
  timeSpentSeconds: number
): SelfGradingSession {
  const now = Date.now();
  return {
    id: uuidv4(),
    examId: exam.id,
    examTitle: exam.title,
    subjectName,
    startedAt: now - timeSpentSeconds * 1000,
    completedAt: now,
    totalTimeSpentSeconds: timeSpentSeconds,
    answers,
    grades: {}, // No automatic grades assigned
    revealedQuestions: {}, // Hidden until explicitly revealed
    currentQuestionIndex: 0,
    isFinalized: false,
    updatedAt: now,
  };
}

/**
 * Converts a finalized self-grading session into an official ExamAttempt record.
 */
export function finalizeSelfGradingAttempt(
  session: SelfGradingSession,
  questions: Question[],
  passingScorePercent: number
): ExamAttempt {
  const calc = calculateSelfGradingScore(questions, session.grades, passingScorePercent);

  return {
    id: session.id,
    examId: session.examId,
    examTitle: session.examTitle,
    subjectName: session.subjectName,
    startedAt: session.startedAt,
    completedAt: Date.now(),
    totalTimeSpentSeconds: session.totalTimeSpentSeconds,
    score: calc.totalScore,
    maxScore: calc.maxScore,
    percentage: calc.percentage,
    passed: calc.passed,
    answers: session.answers,
    grades: session.grades,
    fullyCorrectCount: calc.fullyCorrectCount,
    partiallyCorrectCount: calc.partiallyCorrectCount,
    incorrectCount: calc.incorrectCount,
  };
}

/**
 * Returns human-readable label and styling details for a grade value
 */
export function getGradeBadgeInfo(grade?: SelfGradeValue): {
  label: string;
  shortLabel: string;
  badgeClass: string;
  description: string;
} {
  if (grade === 1) {
    return {
      label: '1.0 Point - Fully Correct',
      shortLabel: '1.0 pt',
      badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-bold',
      description: 'Answer is accurate and identifies required anatomical or clinical features.',
    };
  }
  if (grade === 0.5) {
    return {
      label: '0.5 Points - Partially Correct',
      shortLabel: '0.5 pt',
      badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
      description: 'Answer contains partial accuracy (e.g. correct category but minor naming omission).',
    };
  }
  if (grade === 0) {
    return {
      label: '0.0 Points - Incorrect',
      shortLabel: '0.0 pt',
      badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
      description: 'Answer is incorrect, unrelated, or demonstrates misconception.',
    };
  }
  return {
    label: 'Ungraded',
    shortLabel: 'Pending',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    description: 'Requires explicit evaluation by the candidate.',
  };
}
