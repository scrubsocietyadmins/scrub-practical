import Dexie, { type Table } from 'dexie';
import type { Subject, Exam, Question, ImageRecord, ExamAttempt, SelfGradingSession, ShuffleAttemptRecord } from '../types';
import { v4 as uuidv4 } from './uuid';
import { createSeedData } from './seedData';

export class ScrubPracticalDB extends Dexie {
  subjects!: Table<Subject, string>;
  exams!: Table<Exam, string>;
  questions!: Table<Question, string>;
  images!: Table<ImageRecord, string>;
  attempts!: Table<ExamAttempt, string>;
  selfGradingSessions!: Table<SelfGradingSession, string>;
  shuffleAttempts!: Table<ShuffleAttemptRecord, string>;

  constructor() {
    super('ScrubPracticalDB');
    this.version(1).stores({
      subjects: 'id, name, code, createdAt',
      exams: 'id, subjectId, title, code, timingMode, createdAt, updatedAt',
      questions: 'id, examId, orderIndex, type, imageId',
      images: 'id, name, mimeType, createdAt',
      attempts: 'id, examId, completedAt, score',
    });

    this.version(2).stores({
      subjects: 'id, name, code, createdAt',
      exams: 'id, subjectId, title, code, status, timingMode, createdAt, updatedAt',
      questions: 'id, examId, orderIndex, type, imageId',
      images: 'id, name, mimeType, status, createdAt',
      attempts: 'id, examId, completedAt, score',
    }).upgrade(async (tx) => {
      // Migrate existing exams to have status 'published' if missing
      await tx.table('exams').toCollection().modify((exam: Exam) => {
        if (!exam.status) {
          exam.status = 'published';
        }
      });
      // Migrate existing images to have status 'available' and required: true
      await tx.table('images').toCollection().modify((img: ImageRecord) => {
        if (!img.status) {
          img.status = 'available';
        }
        if (img.required === undefined) {
          img.required = true;
        }
      });
    });

    this.version(3).stores({
      subjects: 'id, name, code, createdAt',
      exams: 'id, subjectId, title, code, status, timingMode, createdAt, updatedAt',
      questions: 'id, examId, orderIndex, type, imageId',
      images: 'id, name, mimeType, status, createdAt',
      attempts: 'id, examId, completedAt, score',
      selfGradingSessions: 'id, examId, isFinalized, updatedAt',
    });

    this.version(4).stores({
      subjects: 'id, name, code, createdAt',
      exams: 'id, subjectId, title, code, status, timingMode, createdAt, updatedAt',
      questions: 'id, examId, orderIndex, type, imageId, lectureId, topicGroupId',
      images: 'id, name, mimeType, status, createdAt',
      attempts: 'id, examId, completedAt, score',
      selfGradingSessions: 'id, examId, isFinalized, updatedAt',
      shuffleAttempts: 'id, createdAt, completedAt, status',
    });
  }
}

export const db = new ScrubPracticalDB();

// Object URL cache to prevent memory leaks and redundant Blob URLs
const objectUrlCache = new Map<string, string>();

export async function getImageObjectUrl(imageId: string): Promise<string | null> {
  if (!imageId) return null;
  if (objectUrlCache.has(imageId)) {
    return objectUrlCache.get(imageId)!;
  }
  const image = await db.images.get(imageId);
  if (!image || !image.blob) return null;

  const url = URL.createObjectURL(image.blob);
  objectUrlCache.set(imageId, url);
  return url;
}

export function revokeImageObjectUrl(imageId: string) {
  if (objectUrlCache.has(imageId)) {
    const url = objectUrlCache.get(imageId)!;
    URL.revokeObjectURL(url);
    objectUrlCache.delete(imageId);
  }
}

/**
 * Initializes the database with sample clinical packages if empty.
 */
export async function ensureDatabaseInitialized(): Promise<void> {
  const hasParasitology = await db.subjects.get('subj-parasitol');
  const hasOldAnatomy = await db.subjects.get('subj-anat-02');

  // If DB is empty OR still has legacy subjects without the 4 requested curriculum groups
  if (!hasParasitology || hasOldAnatomy) {
    const seed = await createSeedData();
    await db.transaction('rw', db.subjects, db.exams, db.questions, db.images, async () => {
      // Remove obsolete anatomy exam and questions if present
      if (hasOldAnatomy) {
        await db.exams.where('subjectId').equals('subj-anat-02').delete();
        await db.exams.where('id').equals('exam-anat-spotter-02').delete();
        await db.questions.where('examId').equals('exam-anat-spotter-02').delete();
        await db.subjects.delete('subj-anat-02');
      }

      // Add/update 4 subjects and starter exams
      await db.subjects.bulkPut(seed.subjects);
      await db.exams.bulkPut(seed.exams);
      await db.questions.bulkPut(seed.questions);
      await db.images.bulkPut(seed.images);
    });
  } else {
    // Backfill topic groups and lectures for any custom questions missing them
    try {
      const existingQuestions = await db.questions.toArray();
      const needsCategorization = existingQuestions.filter((q) => !q.topicGroupId || !q.lectureId);
      if (needsCategorization.length > 0) {
        const exams = await db.exams.toArray();
        const examSubjectMap = new Map(exams.map((e) => [e.id, e.subjectId]));
        await db.transaction('rw', db.questions, async () => {
          for (const q of needsCategorization) {
            const subjectId = q.subjectId || examSubjectMap.get(q.examId) || 'subj-general';
            const topicGroupId = q.topicGroupId || `grp-${subjectId}`;
            const topicGroupName = q.topicGroupName || 'Medical Practical Core';
            const lectureId = q.lectureId || `lec-${topicGroupId}-01`;
            const lectureName = q.lectureName || `${topicGroupName} - Core Module`;
            await db.questions.update(q.id, {
              subjectId,
              topicGroupId,
              topicGroupName,
              lectureId,
              lectureName,
            });
          }
        });
      }
    } catch (e) {
      console.warn('Categorization backfill skipped:', e);
    }
  }
}

/**
 * Resets database to factory sample data
 */
export async function resetDatabaseToDefaults(): Promise<void> {
  // Revoke cached URLs
  for (const [id] of objectUrlCache.entries()) {
    revokeImageObjectUrl(id);
  }
  objectUrlCache.clear();

  await db.transaction('rw', db.subjects, db.exams, db.questions, db.images, db.attempts, async () => {
    await db.subjects.clear();
    await db.exams.clear();
    await db.questions.clear();
    await db.images.clear();
    await db.attempts.clear();

    const seed = await createSeedData();
    await db.subjects.bulkAdd(seed.subjects);
    await db.exams.bulkAdd(seed.exams);
    await db.questions.bulkAdd(seed.questions);
    await db.images.bulkAdd(seed.images);
  });
}

/**
 * Cleans up orphaned images not referenced by any question.
 */
export async function cleanupOrphanedImages(): Promise<number> {
  let removedCount = 0;
  await db.transaction('rw', db.questions, db.images, async () => {
    const questions = await db.questions.toArray();
    const referencedImageIds = new Set<string>();
    for (const q of questions) {
      if (q.imageId) {
        referencedImageIds.add(q.imageId);
      }
    }

    const allImages = await db.images.toArray();
    for (const img of allImages) {
      if (!referencedImageIds.has(img.id)) {
        await db.images.delete(img.id);
        revokeImageObjectUrl(img.id);
        removedCount++;
      }
    }
  });
  return removedCount;
}

/**
 * Deletes an exam and its questions, attempt history, and orphaned images
 */
export async function deleteExamWithCascade(examId: string, deleteAttempts = true): Promise<void> {
  await db.transaction('rw', db.exams, db.questions, db.attempts, db.images, async () => {
    // Delete questions
    await db.questions.where('examId').equals(examId).delete();
    // Delete attempts if requested
    if (deleteAttempts) {
      await db.attempts.where('examId').equals(examId).delete();
    }
    // Delete exam
    await db.exams.delete(examId);
  });

  // Clean orphaned images
  await cleanupOrphanedImages();
}

/**
 * Checks which visual questions in an exam are missing their images from the database
 */
export async function checkExamMissingImages(examId: string): Promise<Array<{ questionId: string; questionTitle: string; imageId: string }>> {
  const questions = await db.questions.where('examId').equals(examId).toArray();
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
        if (!img || !img.blob || img.status === 'missing') {
          missing.push({
            questionId: q.id,
            questionTitle: q.title || `Station ${q.orderIndex + 1}`,
            imageId: q.imageId,
          });
        }
      }
    }
  }

  return missing;
}

/**
 * Duplicates an entire exam with all its station questions
 */
export async function duplicateExam(examId: string): Promise<string> {
  const originalExam = await db.exams.get(examId);
  if (!originalExam) throw new Error('Exam not found');

  const originalQuestions = await db.questions.where('examId').equals(examId).sortBy('orderIndex');
  const newExamId = uuidv4();
  const now = Date.now();

  const newExam: Exam = {
    ...originalExam,
    id: newExamId,
    title: `${originalExam.title} (Copy)`,
    code: `${originalExam.code}-COPY`,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };

  const newQuestions: Question[] = originalQuestions.map((q) => ({
    ...q,
    id: uuidv4(),
    examId: newExamId,
    options: q.options ? q.options.map((opt) => ({ ...opt, id: uuidv4() })) : undefined,
    acceptableAnswers: q.acceptableAnswers ? [...q.acceptableAnswers] : undefined,
    spotterPin: q.spotterPin ? { ...q.spotterPin } : undefined,
  }));

  await db.transaction('rw', db.exams, db.questions, async () => {
    await db.exams.add(newExam);
    await db.questions.bulkAdd(newQuestions);
  });

  return newExamId;
}

/**
 * Duplicates a single question in an exam
 */
export async function duplicateQuestion(questionId: string): Promise<string> {
  const original = await db.questions.get(questionId);
  if (!original) throw new Error('Question not found');

  const questions = await db.questions.where('examId').equals(original.examId).sortBy('orderIndex');
  const newId = uuidv4();

  // Shift subsequent order indices
  for (const q of questions) {
    if (q.orderIndex > original.orderIndex) {
      await db.questions.update(q.id, { orderIndex: q.orderIndex + 1 });
    }
  }

  const duplicatedQuestion: Question = {
    ...original,
    id: newId,
    title: original.title ? `${original.title} (Copy)` : undefined,
    orderIndex: original.orderIndex + 1,
    options: original.options ? original.options.map((opt) => ({ ...opt, id: uuidv4() })) : undefined,
    acceptableAnswers: original.acceptableAnswers ? [...original.acceptableAnswers] : undefined,
    spotterPin: original.spotterPin ? { ...original.spotterPin } : undefined,
  };

  await db.questions.add(duplicatedQuestion);
  return newId;
}

/**
 * Saves or updates an image blob and returns its ID
 */
export async function saveImageBlob(name: string, blob: Blob, explicitId?: string): Promise<string> {
  const id = explicitId || uuidv4();
  const imageRecord: ImageRecord = {
    id,
    name,
    mimeType: blob.type || 'image/jpeg',
    blob,
    createdAt: Date.now(),
    required: true,
    status: 'available',
  };

  await db.images.put(imageRecord);
  revokeImageObjectUrl(id);
  return id;
}

/**
 * Attaches or replaces a missing image in IndexedDB keeping the exact ID intact
 */
export async function attachMissingImage(imageId: string, file: File): Promise<void> {
  const imageRecord: ImageRecord = {
    id: imageId,
    name: file.name,
    mimeType: file.type || 'image/jpeg',
    blob: file,
    createdAt: Date.now(),
    required: true,
    status: 'available',
  };
  await db.images.put(imageRecord);
  revokeImageObjectUrl(imageId);
}

/**
 * Self-Grading Session Persistence Helpers (IndexedDB via Dexie)
 */
export async function saveSelfGradingSession(session: SelfGradingSession): Promise<void> {
  await db.selfGradingSessions.put({
    ...session,
    updatedAt: Date.now(),
  });
}

export async function getSelfGradingSession(id: string): Promise<SelfGradingSession | undefined> {
  return db.selfGradingSessions.get(id);
}

export async function getActiveSelfGradingSession(examId?: string): Promise<SelfGradingSession | undefined> {
  if (examId) {
    return db.selfGradingSessions
      .where('examId')
      .equals(examId)
      .filter((s) => !s.isFinalized)
      .last();
  }
  return db.selfGradingSessions
    .filter((s) => !s.isFinalized)
    .last();
}

export async function deleteSelfGradingSession(id: string): Promise<void> {
  await db.selfGradingSessions.delete(id);
}

