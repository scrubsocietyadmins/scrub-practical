import type { Question, StudentStationAnswer, ExamAttempt, Exam } from '../types';
import { v4 as uuidv4 } from '../db/uuid';

export function normalizeMedicalText(input: string): string {
  if (!input) return '';
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]"']/g, ' ') // punctuation to whitespace
    .replace(/\b(a|an|the)\b/g, ' ') // strip redundant articles
    .replace(/\s+/g, ' ')
    .trim();
}

export interface EvaluationDetail {
  isCorrect: boolean;
  matchedAnswer?: string;
  reason?: string;
}

/**
 * Deterministically evaluates whether a student's typed answer matches acceptable clinical synonyms.
 * Strictly avoids false positives from short substring containment.
 */
export function evaluateTypedSpotterAnswerDetailed(
  studentInput: string,
  acceptableAnswers: string[]
): EvaluationDetail {
  if (!studentInput || !acceptableAnswers || acceptableAnswers.length === 0) {
    return { isCorrect: false, reason: 'No answer provided or key is empty' };
  }

  const rawInputTrimmed = studentInput.trim().toLowerCase();
  const normalizedInput = normalizeMedicalText(studentInput);

  if (!normalizedInput) {
    return { isCorrect: false, reason: 'Answer consists only of punctuation/whitespace' };
  }

  const inputWords = normalizedInput.split(' ').filter((w) => w.length > 0);

  for (const acceptable of acceptableAnswers) {
    if (!acceptable) continue;
    const rawAcceptableTrimmed = acceptable.trim().toLowerCase();
    const normalizedAcceptable = normalizeMedicalText(acceptable);
    if (!normalizedAcceptable) continue;

    // 1. Exact raw match (ignoring case)
    if (rawInputTrimmed === rawAcceptableTrimmed) {
      return {
        isCorrect: true,
        matchedAnswer: acceptable,
        reason: `Exact match with "${acceptable}"`,
      };
    }

    // 2. Normalized full string equality
    if (normalizedInput === normalizedAcceptable) {
      return {
        isCorrect: true,
        matchedAnswer: acceptable,
        reason: `Normalized match with clinical synonym "${acceptable}"`,
      };
    }

    // 3. Token-based word set matching
    // Example: "reed sternberg cells" matches "reed sternberg cell"
    const acceptableWords = normalizedAcceptable.split(' ').filter((w) => w.length > 0);

    // If single word, requires exact token match or stem match (minimum length 4)
    if (acceptableWords.length === 1) {
      const target = acceptableWords[0];
      if (inputWords.includes(target)) {
        return {
          isCorrect: true,
          matchedAnswer: acceptable,
          reason: `Exact keyword match with "${acceptable}"`,
        };
      }
      // Simple plural/singular match (e.g. appendix / appendices, cell / cells)
      if (target.length >= 4) {
        for (const iw of inputWords) {
          if (
            (iw === `${target}s` || target === `${iw}s` || iw === `${target}es` || target === `${iw}es`) &&
            Math.abs(iw.length - target.length) <= 2
          ) {
            return {
              isCorrect: true,
              matchedAnswer: acceptable,
              reason: `Singular/plural match with "${acceptable}"`,
            };
          }
        }
      }
    } else {
      // Multi-word phrase: all tokens in acceptable answer must appear in student's answer
      // to avoid loose substring containment false positives.
      const allTokensFound = acceptableWords.every((word) => {
        if (inputWords.includes(word)) return true;
        if (word.length >= 4) {
          return inputWords.some(
            (iw) =>
              iw === `${word}s` ||
              word === `${iw}s` ||
              iw === `${word}es` ||
              word === `${iw}es`
          );
        }
        return false;
      });

      if (allTokensFound) {
        return {
          isCorrect: true,
          matchedAnswer: acceptable,
          reason: `All anatomical landmark tokens matched with "${acceptable}"`,
        };
      }
    }
  }

  return {
    isCorrect: false,
    reason: 'Answer does not match designated clinical synonyms or anatomical keys',
  };
}

/**
 * Backward compatible boolean evaluation helper
 */
export function evaluateTypedSpotterAnswer(studentInput: string, acceptableAnswers: string[]): boolean {
  return evaluateTypedSpotterAnswerDetailed(studentInput, acceptableAnswers).isCorrect;
}

export interface QuestionGradingResult {
  question: Question;
  studentAnswer?: StudentStationAnswer;
  isCorrect: boolean;
  earnedPoints: number;
  maxPoints: number;
  correctAnswerSummary: string;
  studentAnswerSummary: string;
  evaluationExplanation?: string;
}

export function gradeExamAttempt(
  exam: Exam,
  subjectName: string,
  questions: Question[],
  answers: Record<string, StudentStationAnswer>,
  startedAt: number,
  timeSpentSeconds: number
): { attempt: ExamAttempt; stationResults: QuestionGradingResult[] } {
  let totalScore = 0;
  let maxScore = 0;

  const stationResults: QuestionGradingResult[] = questions.map((q) => {
    const answer = answers[q.id];
    let isCorrect = false;
    let studentSummary = 'Unanswered';
    let correctSummary = '';
    let explanationText: string | undefined = undefined;

    const qPoints = q.points || 1;
    maxScore += qPoints;

    // Determine correct summary
    if (q.type === 'spotter') {
      const correctOption = q.options?.find((o) => o.isCorrect);
      if (q.acceptableAnswers && q.acceptableAnswers.length > 0) {
        correctSummary = q.acceptableAnswers[0];
        if (correctOption) {
          correctSummary += ` (${correctOption.text})`;
        }
      } else if (correctOption) {
        correctSummary = correctOption.text;
      }
    } else {
      const correctOption = q.options?.find((o) => o.isCorrect);
      correctSummary = correctOption ? correctOption.text : 'No key specified';
    }

    if (answer) {
      if (q.type === 'spotter') {
        let typedCorrect = false;
        let optionCorrect = false;

        if (answer.typedAnswer && answer.typedAnswer.trim()) {
          studentSummary = answer.typedAnswer;
          if (q.acceptableAnswers && q.acceptableAnswers.length > 0) {
            const evalResult = evaluateTypedSpotterAnswerDetailed(answer.typedAnswer, q.acceptableAnswers);
            typedCorrect = evalResult.isCorrect;
            explanationText = evalResult.reason;
          }
        }

        if (answer.selectedOptionId && q.options) {
          const selected = q.options.find((o) => o.id === answer.selectedOptionId);
          if (selected) {
            studentSummary = selected.text;
            optionCorrect = Boolean(selected.isCorrect);
            if (optionCorrect && !explanationText) {
              explanationText = 'Correct multiple choice option selected';
            }
          }
        }

        isCorrect = typedCorrect || optionCorrect;
      } else {
        // MCQ types
        if (answer.selectedOptionId && q.options) {
          const selected = q.options.find((o) => o.id === answer.selectedOptionId);
          if (selected) {
            studentSummary = selected.text;
            isCorrect = Boolean(selected.isCorrect);
            explanationText = isCorrect
              ? 'Selected correct answer option'
              : 'Selected incorrect option';
          }
        }
      }
    }

    const earnedPoints = isCorrect ? qPoints : 0;
    totalScore += earnedPoints;

    return {
      question: q,
      studentAnswer: answer,
      isCorrect,
      earnedPoints,
      maxPoints: qPoints,
      correctAnswerSummary: correctSummary,
      studentAnswerSummary: studentSummary,
      evaluationExplanation: explanationText,
    };
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
  const passed = percentage >= (exam.passingScorePercent || 60);

  const attempt: ExamAttempt = {
    id: uuidv4(),
    examId: exam.id,
    examTitle: exam.title,
    subjectName,
    startedAt,
    completedAt: Date.now(),
    totalTimeSpentSeconds: timeSpentSeconds,
    score: totalScore,
    maxScore,
    percentage,
    passed,
    answers,
  };

  return { attempt, stationResults };
}
