import { db } from '../db';
import type { Exam, Question } from '../types';

export interface ExamReadinessResult {
  canStart: boolean;
  canPublish: boolean;
  missingImageDetails: Array<{
    questionId: string;
    questionTitle: string;
    imageId: string;
  }>;
  validationErrors: string[];
}

/**
 * Validates whether an exam satisfies all pedagogical and clinical rules for candidate launch and publishing.
 */
export async function checkExamReadiness(examId: string): Promise<ExamReadinessResult> {
  const exam = await db.exams.get(examId);
  const questions = await db.questions.where('examId').equals(examId).sortBy('orderIndex');

  const validationErrors: string[] = [];
  const missingImageDetails: Array<{
    questionId: string;
    questionTitle: string;
    imageId: string;
  }> = [];

  if (!exam) {
    return {
      canStart: false,
      canPublish: false,
      missingImageDetails: [],
      validationErrors: ['Exam does not exist'],
    };
  }

  if (questions.length === 0) {
    validationErrors.push('Exam has no stations. At least one station is required.');
  }

  const questionIdSet = new Set<string>();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const stationLabel = q.title || `Station ${i + 1}`;

    // Duplicate question ID check
    if (questionIdSet.has(q.id)) {
      validationErrors.push(`${stationLabel}: Duplicate question identifier "${q.id}".`);
    }
    questionIdSet.add(q.id);

    // Question text check
    if (!q.questionText || !q.questionText.trim()) {
      validationErrors.push(`${stationLabel}: Question prompt cannot be empty.`);
    }

    // Points check
    if (!q.points || q.points <= 0) {
      validationErrors.push(`${stationLabel}: Points must be greater than zero.`);
    }

    // Station duration check
    if (q.stationDurationSeconds && (q.stationDurationSeconds < 15 || q.stationDurationSeconds > 600)) {
      validationErrors.push(`${stationLabel}: Station duration must be between 15 and 600 seconds.`);
    }

    // Visual image check for Spotter and Image MCQ
    if (q.type === 'spotter' || q.type === 'image_mcq') {
      if (!q.imageId) {
        missingImageDetails.push({
          questionId: q.id,
          questionTitle: stationLabel,
          imageId: 'UNASSIGNED',
        });
        validationErrors.push(`${stationLabel}: Visual specimen image is required but not assigned.`);
      } else {
        const imgRecord = await db.images.get(q.imageId);
        if (!imgRecord || !imgRecord.blob || imgRecord.blob.size === 0 || imgRecord.status === 'missing') {
          missingImageDetails.push({
            questionId: q.id,
            questionTitle: stationLabel,
            imageId: q.imageId,
          });
          validationErrors.push(`${stationLabel}: Associated specimen image ("${q.imageId}") is missing from storage.`);
        }
      }
    }

    // MCQ checks
    if (q.type === 'text_mcq' || q.type === 'clinical_mcq' || q.type === 'image_mcq') {
      const validOptions = (q.options || []).filter((o) => o.text && o.text.trim().length > 0);
      if (validOptions.length < 2) {
        validationErrors.push(`${stationLabel}: Multiple choice requires at least 2 non-empty options.`);
      }

      const correctCount = validOptions.filter((o) => o.isCorrect).length;
      if (correctCount === 0) {
        validationErrors.push(`${stationLabel}: No option is designated as the correct answer.`);
      } else if (correctCount > 1) {
        validationErrors.push(`${stationLabel}: Exactly one option must be marked as correct (found ${correctCount}).`);
      }

      // Check duplicate option IDs
      const optIdSet = new Set<string>();
      for (const opt of q.options || []) {
        if (optIdSet.has(opt.id)) {
          validationErrors.push(`${stationLabel}: Duplicate option ID "${opt.id}".`);
        }
        optIdSet.add(opt.id);
      }
    }

    // Spotter checks
    if (q.type === 'spotter') {
      // Spotter pin check
      if (!q.spotterPin) {
        validationErrors.push(`${stationLabel}: Pointer placement on the specimen slide is required.`);
      } else {
        if (q.spotterPin.x < 0 || q.spotterPin.x > 100 || q.spotterPin.y < 0 || q.spotterPin.y > 100) {
          validationErrors.push(`${stationLabel}: Pointer coordinates must be within 0% to 100%.`);
        }
      }

      const mode = q.spotterAnswerMode || 'both';
      if (mode === 'typed' || mode === 'both') {
        const acceptable = (q.acceptableAnswers || []).filter((a) => a && a.trim().length > 0);
        if (acceptable.length === 0) {
          validationErrors.push(`${stationLabel}: At least one acceptable typed clinical answer is required.`);
        }
      }

      if (mode === 'multiple_choice' || mode === 'both') {
        const validOptions = (q.options || []).filter((o) => o.text && o.text.trim().length > 0);
        if (validOptions.length < 2) {
          validationErrors.push(`${stationLabel}: Spotter multiple choice requires at least 2 non-empty options.`);
        }
        const correctCount = validOptions.filter((o) => o.isCorrect).length;
        if (correctCount !== 1) {
          validationErrors.push(`${stationLabel}: Exactly one option must be marked as correct in spotter options.`);
        }
      }
    }
  }

  const hasMissingImages = missingImageDetails.length > 0;
  const canStart = questions.length > 0 && !hasMissingImages;
  const canPublish = validationErrors.length === 0;

  return {
    canStart,
    canPublish,
    missingImageDetails,
    validationErrors,
  };
}
