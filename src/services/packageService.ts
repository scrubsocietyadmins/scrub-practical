import JSZip from 'jszip';
import { db, saveImageBlob, cleanupOrphanedImages } from '../db';
import { v4 as uuidv4 } from '../db/uuid';
import type {
  Exam,
  Question,
  Subject,
  ExamPackageManifest,
  ImageRecord,
  ManifestImageFile,
  InspectionSummary,
  MissingImageItem,
  ExamAttempt,
} from '../types';
import { ExamPackageManifestSchema } from '../types';

export interface PackageConflictInfo {
  type: 'id_match' | 'code_match' | 'title_match';
  existingExam: Exam;
  incomingManifest: ExamPackageManifest;
  message: string;
}

export interface PackageImportResult {
  success: boolean;
  examId: string;
  examTitle: string;
  questionCount: number;
  availableImagesCount: number;
  missingImagesCount: number;
  questionsNeedingReviewCount: number;
}

export interface InspectedZipPackage {
  manifest: ExamPackageManifest;
  conflict?: PackageConflictInfo;
  imageBlobMap: Map<string, Blob>;
  inspectionSummary: InspectionSummary;
}

/**
 * Converts a Blob to a base64 Data URL for JSON backups
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Converts a base64 Data URL back to a Blob
 */
function base64ToBlob(dataUrl: string, mimeType: string): Blob {
  const arr = dataUrl.split(',');
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mimeType });
}

/**
 * Exports an exam, its subject, questions, and all linked images into a standalone ZIP package
 */
export async function exportExamToZip(examId: string): Promise<{ blob: Blob; fileName: string; missingImagesCount: number }> {
  const exam = await db.exams.get(examId);
  if (!exam) throw new Error(`Exam not found with ID ${examId}`);

  const subject = await db.subjects.get(exam.subjectId);
  if (!subject) throw new Error(`Subject not found for exam "${exam.title}"`);

  const questions = await db.questions.where('examId').equals(examId).sortBy('orderIndex');

  const zip = new JSZip();
  const imagesFolder = zip.folder('images');
  if (!imagesFolder) throw new Error('Could not create images folder in ZIP');

  const imageFilesManifest: ManifestImageFile[] = [];
  let missingImagesCount = 0;

  // Collect unique image IDs referenced in questions
  const uniqueImageIds = Array.from(new Set(questions.map((q) => q.imageId).filter(Boolean))) as string[];

  for (const imgId of uniqueImageIds) {
    const imgRecord = await db.images.get(imgId);
    if (imgRecord && imgRecord.blob && imgRecord.blob.size > 0 && imgRecord.status !== 'missing') {
      const ext = imgRecord.name.includes('.') ? imgRecord.name.split('.').pop()! : 'jpg';
      const cleanFileName = `${imgId}.${ext}`;
      imagesFolder.file(cleanFileName, imgRecord.blob);
      imageFilesManifest.push({
        id: imgId,
        fileName: cleanFileName,
        mimeType: imgRecord.mimeType || 'image/jpeg',
        required: true,
        status: 'available',
        altText: imgRecord.altText || `Specimen slide for ${imgId}`,
        source: imgRecord.source,
      });
    } else {
      // Missing image record: export metadata as missing without crashing!
      missingImagesCount++;
      const associatedQ = questions.find((q) => q.imageId === imgId);
      imageFilesManifest.push({
        id: imgId,
        fileName: imgRecord?.name || `${imgId}.jpg`,
        mimeType: imgRecord?.mimeType || 'image/jpeg',
        required: true,
        status: 'missing',
        altText: imgRecord?.altText || associatedQ?.title || 'Specimen slide (missing from storage)',
        source: 'MANUAL_UPLOAD_REQUIRED',
      });
    }
  }

  const manifest: ExamPackageManifest = {
    formatVersion: '1.0.0',
    exportedAt: Date.now(),
    subject: {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      color: subject.color,
    },
    exam: {
      id: exam.id,
      subjectId: exam.subjectId,
      title: exam.title,
      code: exam.code,
      description: exam.description,
      status: exam.status || 'draft',
      timingMode: exam.timingMode,
      totalDurationMinutes: exam.totalDurationMinutes,
      stationDurationSeconds: exam.stationDurationSeconds,
      passingScorePercent: exam.passingScorePercent,
      shuffleQuestions: exam.shuffleQuestions,
      instructions: exam.instructions,
    },
    questions,
    imageFiles: imageFilesManifest,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const sanitizedCode = (exam.code || 'EXAM').replace(/[^a-zA-Z0-9_-]/g, '_');
  const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  const fileName = `ScrubPractical_${sanitizedCode}_${sanitizedTitle}.zip`;

  return { blob: zipBlob, fileName, missingImagesCount };
}

/**
 * Triggers a native browser file download
 */
export function downloadFile(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Previews and validates a ZIP package, detecting available and missing images without dropping imageIds.
 */
export async function inspectZipPackage(file: File): Promise<InspectedZipPackage> {
  const zip = new JSZip();
  let zipContent: JSZip;
  try {
    zipContent = await zip.loadAsync(file);
  } catch (err) {
    throw new Error('Invalid or corrupted ZIP archive. Please select a valid exam package.');
  }

  const manifestFile = zipContent.file('manifest.json');
  if (!manifestFile) {
    throw new Error('Incompatible package: missing "manifest.json" in ZIP archive root.');
  }

  const manifestText = await manifestFile.async('text');
  let rawManifest: unknown;
  try {
    rawManifest = JSON.parse(manifestText);
  } catch (err) {
    throw new Error('Manifest contains invalid or corrupted JSON.');
  }

  // Validate with Zod
  const validationResult = ExamPackageManifestSchema.safeParse(rawManifest);
  if (!validationResult.success) {
    const errorDetails = validationResult.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .slice(0, 4)
      .join('; ');
    throw new Error(`Package schema validation failed: ${errorDetails}`);
  }

  const manifest = validationResult.data;

  // Inspect and extract images
  const imageBlobMap = new Map<string, Blob>();
  const inspectionImages: MissingImageItem[] = [];
  let availableImagesCount = 0;
  let missingImagesCount = 0;

  for (const imgMeta of manifest.imageFiles) {
    // Check multiple plausible paths in zip
    const candidateFiles = [
      zipContent.file(`images/${imgMeta.fileName}`),
      zipContent.file(`images/${imgMeta.id}`),
      zipContent.file(imgMeta.fileName),
    ].filter(Boolean);

    const imgFile = candidateFiles[0];

    const associatedQuestions = manifest.questions.filter((q) => q.imageId === imgMeta.id);
    const associatedQuestionIds = associatedQuestions.map((q) => q.id);
    const associatedQuestionTitles = associatedQuestions.map(
      (q) => q.title || `Station ${q.orderIndex + 1}`
    );

    if (imgFile) {
      const imgBuffer = await imgFile.async('arraybuffer');
      const blob = new Blob([imgBuffer], { type: imgMeta.mimeType || 'image/jpeg' });
      imageBlobMap.set(imgMeta.id, blob);
      availableImagesCount++;

      inspectionImages.push({
        id: imgMeta.id,
        fileName: imgMeta.fileName,
        mimeType: imgMeta.mimeType || 'image/jpeg',
        required: imgMeta.required !== false,
        status: 'available',
        altText: imgMeta.altText,
        source: imgMeta.source,
        associatedQuestionIds,
        associatedQuestionTitles,
      });
    } else {
      // Image file is missing from ZIP
      missingImagesCount++;
      imgMeta.status = 'missing';

      inspectionImages.push({
        id: imgMeta.id,
        fileName: imgMeta.fileName,
        mimeType: imgMeta.mimeType || 'image/jpeg',
        required: imgMeta.required !== false,
        status: 'missing',
        altText: imgMeta.altText,
        source: imgMeta.source || 'MANUAL_UPLOAD_REQUIRED',
        associatedQuestionIds,
        associatedQuestionTitles,
      });
    }
  }

  // Count questions needing review
  let questionsNeedingReviewCount = 0;
  for (const q of manifest.questions) {
    if (q.type === 'spotter' || q.type === 'image_mcq') {
      if (!q.imageId || !imageBlobMap.has(q.imageId)) {
        questionsNeedingReviewCount++;
      } else if (q.type === 'spotter' && !q.spotterPin) {
        questionsNeedingReviewCount++;
      }
    }
  }

  const inspectionSummary: InspectionSummary = {
    examTitle: manifest.exam.title,
    examCode: manifest.exam.code,
    subjectName: manifest.subject.name,
    questionCount: manifest.questions.length,
    availableImagesCount,
    missingImagesCount,
    images: inspectionImages,
    questionsNeedingReviewCount,
  };

  // Check for conflicts in local IndexedDB
  const existingById = await db.exams.get(manifest.exam.id);
  const existingByCode = await db.exams.where('code').equals(manifest.exam.code).first();
  const existingByTitle = await db.exams.where('title').equals(manifest.exam.title).first();

  let conflict: PackageConflictInfo | undefined;

  if (existingById) {
    conflict = {
      type: 'id_match',
      existingExam: existingById,
      incomingManifest: manifest,
      message: `An exam with the exact ID "${manifest.exam.id}" already exists ("${existingById.title}").`,
    };
  } else if (existingByCode && existingByCode.code.trim() !== '') {
    conflict = {
      type: 'code_match',
      existingExam: existingByCode,
      incomingManifest: manifest,
      message: `An existing exam already uses the course code "${manifest.exam.code}".`,
    };
  } else if (existingByTitle) {
    conflict = {
      type: 'title_match',
      existingExam: existingByTitle,
      incomingManifest: manifest,
      message: `An exam titled "${manifest.exam.title}" already exists in your library.`,
    };
  }

  return { manifest, conflict, imageBlobMap, inspectionSummary };
}

/**
 * Commits an inspected package to IndexedDB inside an atomic transaction.
 * Rolls back automatically if any error occurs.
 */
export async function commitZipPackageImport(
  manifest: ExamPackageManifest,
  imageBlobMap: Map<string, Blob>,
  resolution: 'overwrite' | 'keep_both' = 'overwrite',
  deleteAttemptsOnOverwrite = false
): Promise<PackageImportResult> {
  const now = Date.now();

  let finalSubjectId = manifest.subject.id;
  let finalExamId = manifest.exam.id;
  let finalExamTitle = manifest.exam.title;
  let finalExamCode = manifest.exam.code;

  const imageIdRemap = new Map<string, string>();

  if (resolution === 'keep_both') {
    finalExamId = uuidv4();
    finalExamTitle = `${manifest.exam.title} (Imported)`;
    finalExamCode = `${manifest.exam.code}-IMP`;

    // Remap image IDs to avoid cross-exam overwrites
    for (const imgMeta of manifest.imageFiles) {
      const newImgId = uuidv4();
      imageIdRemap.set(imgMeta.id, newImgId);
    }
  }

  // Count available and missing
  let availableImagesCount = 0;
  let missingImagesCount = 0;
  let questionsNeedingReviewCount = 0;

  // Execute Atomic Transaction
  await db.transaction('rw', db.subjects, db.exams, db.questions, db.images, db.attempts, async () => {
    // 1. Subject Upsert
    const existingSubject = await db.subjects.get(manifest.subject.id);
    if (!existingSubject) {
      await db.subjects.add({
        id: manifest.subject.id,
        name: manifest.subject.name,
        code: manifest.subject.code,
        description: manifest.subject.description || '',
        color: manifest.subject.color || '#881337',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      // Update subject info if overwriting
      await db.subjects.update(manifest.subject.id, {
        name: manifest.subject.name,
        code: manifest.subject.code,
        description: manifest.subject.description || existingSubject.description,
        color: manifest.subject.color || existingSubject.color,
        updatedAt: now,
      });
    }

    // 2. Handle Overwrite Cleanup
    if (resolution === 'overwrite') {
      const existing = await db.exams.get(manifest.exam.id);
      if (existing) {
        await db.questions.where('examId').equals(existing.id).delete();
        if (deleteAttemptsOnOverwrite) {
          await db.attempts.where('examId').equals(existing.id).delete();
        }
        await db.exams.delete(existing.id);
      }
    }

    // 3. Insert or Update Images
    for (const imgMeta of manifest.imageFiles) {
      const effectiveId = resolution === 'keep_both' ? imageIdRemap.get(imgMeta.id)! : imgMeta.id;
      const blob = imageBlobMap.get(imgMeta.id);

      if (blob) {
        availableImagesCount++;
        await db.images.put({
          id: effectiveId,
          name: imgMeta.fileName,
          mimeType: imgMeta.mimeType || blob.type || 'image/jpeg',
          blob,
          createdAt: now,
          required: imgMeta.required !== false,
          status: 'available',
          altText: imgMeta.altText,
          source: imgMeta.source,
        });
      } else {
        // Missing image: keep an ImageRecord with status = 'missing' and empty placeholder blob
        // so that imageId is preserved and Missing Images Manager can display and attach it!
        missingImagesCount++;
        const existingRecord = await db.images.get(effectiveId);
        if (!existingRecord) {
          await db.images.put({
            id: effectiveId,
            name: imgMeta.fileName,
            mimeType: imgMeta.mimeType || 'image/jpeg',
            blob: new Blob([], { type: imgMeta.mimeType || 'image/jpeg' }),
            createdAt: now,
            required: imgMeta.required !== false,
            status: 'missing',
            altText: imgMeta.altText,
            source: imgMeta.source || 'MANUAL_UPLOAD_REQUIRED',
          });
        }
      }
    }

    // 4. Construct Final Exam Record (Default to draft for newly imported AI packages)
    const examRecord: Exam = {
      id: finalExamId,
      subjectId: finalSubjectId,
      title: finalExamTitle,
      code: finalExamCode,
      description: manifest.exam.description || '',
      status: 'draft', // Default imported packages to draft as requested
      timingMode: manifest.exam.timingMode || 'flexible',
      totalDurationMinutes: manifest.exam.totalDurationMinutes || 20,
      stationDurationSeconds: manifest.exam.stationDurationSeconds || 90,
      passingScorePercent: manifest.exam.passingScorePercent || 60,
      shuffleQuestions: manifest.exam.shuffleQuestions,
      instructions: manifest.exam.instructions,
      createdAt: now,
      updatedAt: now,
    };

    // 5. Construct Questions, preserving imageIds
    const questionsToInsert: Question[] = manifest.questions.map((q, idx) => {
      const qId = resolution === 'keep_both' ? uuidv4() : q.id;
      const mappedImageId = q.imageId
        ? resolution === 'keep_both' && imageIdRemap.has(q.imageId)
          ? imageIdRemap.get(q.imageId)
          : q.imageId
        : undefined;

      if (q.type === 'spotter' || q.type === 'image_mcq') {
        if (!mappedImageId || !imageBlobMap.has(q.imageId || '')) {
          questionsNeedingReviewCount++;
        }
      }

      return {
        ...q,
        id: qId,
        examId: finalExamId,
        orderIndex: idx,
        imageId: mappedImageId,
        options: q.options
          ? q.options.map((opt) => ({
              ...opt,
              id: resolution === 'keep_both' ? uuidv4() : opt.id,
            }))
          : undefined,
        acceptableAnswers: q.acceptableAnswers ? [...q.acceptableAnswers] : undefined,
        spotterPin: q.spotterPin ? { ...q.spotterPin } : undefined,
      };
    });

    await db.exams.put(examRecord);
    await db.questions.bulkPut(questionsToInsert);
  });

  // Clean orphaned images that might have been unreferenced by overwrite
  await cleanupOrphanedImages();

  return {
    success: true,
    examId: finalExamId,
    examTitle: finalExamTitle,
    questionCount: manifest.questions.length,
    availableImagesCount,
    missingImagesCount,
    questionsNeedingReviewCount,
  };
}

/**
 * Full Database Backup Export (JSON archive of all IndexedDB tables including image blobs)
 */
export async function exportFullDatabaseBackup(): Promise<{ blob: Blob; fileName: string }> {
  const subjects = await db.subjects.toArray();
  const exams = await db.exams.toArray();
  const questions = await db.questions.toArray();
  const attempts = await db.attempts.toArray();
  const images = await db.images.toArray();

  const serializedImages = await Promise.all(
    images.map(async (img) => {
      let dataUrl = '';
      if (img.blob && img.blob.size > 0) {
        try {
          dataUrl = await blobToBase64(img.blob);
        } catch {
          dataUrl = '';
        }
      }
      return {
        id: img.id,
        name: img.name,
        mimeType: img.mimeType,
        dataUrl,
        createdAt: img.createdAt,
        required: img.required,
        status: img.status,
        altText: img.altText,
        source: img.source,
      };
    })
  );

  const backupData = {
    schemaVersion: 2,
    exportedAt: Date.now(),
    app: 'Scrub Practical',
    subjects,
    exams,
    questions,
    attempts,
    images: serializedImages,
  };

  const jsonStr = JSON.stringify(backupData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `ScrubPractical_FULL_BACKUP_${dateStr}.json`;

  return { blob, fileName };
}

/**
 * Restores a Full Database Backup safely inside an atomic transaction
 */
export async function importFullDatabaseBackup(file: File): Promise<{
  subjectCount: number;
  examCount: number;
  questionCount: number;
  imageCount: number;
  attemptCount: number;
}> {
  const text = await file.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON file format in backup.');
  }

  if (!data.subjects || !data.exams || !data.questions) {
    throw new Error('Incompatible backup format: missing core examination tables.');
  }

  // Restore inside Dexie transaction
  await db.transaction('rw', db.subjects, db.exams, db.questions, db.images, db.attempts, async () => {
    // Upsert subjects
    for (const s of data.subjects) {
      await db.subjects.put(s);
    }
    // Upsert exams
    for (const e of data.exams) {
      await db.exams.put({
        ...e,
        status: e.status || 'published',
      });
    }
    // Upsert questions
    for (const q of data.questions) {
      await db.questions.put(q);
    }
    // Upsert attempts if present
    if (Array.isArray(data.attempts)) {
      for (const a of data.attempts) {
        await db.attempts.put(a);
      }
    }
    // Reconstruct and upsert images
    if (Array.isArray(data.images)) {
      for (const img of data.images) {
        let blob: Blob;
        if (img.dataUrl) {
          blob = base64ToBlob(img.dataUrl, img.mimeType || 'image/jpeg');
        } else {
          blob = new Blob([], { type: img.mimeType || 'image/jpeg' });
        }
        await db.images.put({
          id: img.id,
          name: img.name,
          mimeType: img.mimeType || 'image/jpeg',
          blob,
          createdAt: img.createdAt || Date.now(),
          required: img.required !== false,
          status: img.status || (blob.size > 0 ? 'available' : 'missing'),
          altText: img.altText,
          source: img.source,
        });
      }
    }
  });

  return {
    subjectCount: data.subjects.length,
    examCount: data.exams.length,
    questionCount: data.questions.length,
    imageCount: Array.isArray(data.images) ? data.images.length : 0,
    attemptCount: Array.isArray(data.attempts) ? data.attempts.length : 0,
  };
}
