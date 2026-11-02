import { z } from 'zod';

export type QuestionType = 'image_mcq' | 'spotter' | 'text_mcq' | 'clinical_mcq';
export type TimingMode = 'bell_ring' | 'total_timer' | 'flexible';
export type PointerType = 'arrow' | 'ring' | 'crosshair';
export type ExamStatus = 'draft' | 'review' | 'published';

export interface SpotterPin {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  label?: string; // e.g. "Pointer A" or "Structure 1"
  pointerType: PointerType;
}

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  examId: string;
  orderIndex: number;
  type: QuestionType;
  title?: string;
  clinicalVignette?: string;
  questionText: string;
  imageId?: string; // Foreign key to image table
  imageName?: string;
  spotterPin?: SpotterPin;
  options?: QuestionOption[];
  acceptableAnswers?: string[]; // For typed spotter answer matching
  spotterAnswerMode?: 'typed' | 'multiple_choice' | 'both';
  referenceAnswer?: string; // Explicit reference answer string
  markingRubric?: string; // Optional marking rubrics / grading guidelines
  explanation: string;
  stationDurationSeconds?: number; // Override exam station time if needed
  points: number;
  subjectId?: string;
  lectureId?: string;
  lectureName?: string;
  topicGroupId?: string;
  topicGroupName?: string;
}

export type SelfGradeValue = 1 | 0.5 | 0;

export interface SelfGradingSession {
  id: string; // Session ID
  examId: string;
  examTitle: string;
  subjectName: string;
  startedAt: number;
  completedAt: number;
  totalTimeSpentSeconds: number;
  answers: Record<string, StudentStationAnswer>;
  grades: Record<string, SelfGradeValue>; // questionId -> 1 | 0.5 | 0
  revealedQuestions: Record<string, boolean>; // questionId -> isRevealed
  currentQuestionIndex: number;
  isFinalized: boolean;
  updatedAt: number;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  color?: string; // Hex color for badge styling
  createdAt: number;
  updatedAt: number;
}

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  code: string;
  description: string;
  status: ExamStatus; // 'draft' | 'review' | 'published'
  timingMode: TimingMode;
  totalDurationMinutes: number; // For total_timer or flexible
  stationDurationSeconds: number; // For bell_ring or flexible (e.g. 90s per station)
  passingScorePercent: number;
  shuffleQuestions?: boolean;
  instructions?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ManifestImageFile {
  id: string;
  fileName: string;
  mimeType: string;
  required?: boolean;
  status?: 'available' | 'missing';
  altText?: string;
  source?: string;
}

export interface ImageRecord {
  id: string;
  name: string;
  mimeType: string;
  blob: Blob;
  createdAt: number;
  required?: boolean;
  status?: 'available' | 'missing';
  altText?: string;
  source?: string;
}

export interface StudentStationAnswer {
  questionId: string;
  selectedOptionId?: string;
  typedAnswer?: string;
  isFlagged: boolean;
  timeSpentSeconds: number;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  examTitle: string;
  subjectName: string;
  startedAt: number;
  completedAt: number;
  totalTimeSpentSeconds: number;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  answers: Record<string, StudentStationAnswer>;
  grades?: Record<string, SelfGradeValue>; // questionId -> 1 | 0.5 | 0
  fullyCorrectCount?: number;
  partiallyCorrectCount?: number;
  incorrectCount?: number;
  notes?: string;
}

export interface ShuffleAttemptRecord {
  id: string;
  createdAt: number;
  completedAt?: number;
  totalQuestions: number;
  selectedQuestionIds: string[];
  topicDistribution: Record<string, number>;
  status: 'in_progress' | 'completed' | 'abandoned';
  currentQuestionIndex?: number;
  answers?: Record<string, StudentStationAnswer>;
  grades?: Record<string, SelfGradeValue>;
  score?: number;
}

// Zod schemas for validation and imports
export const SpotterPinSchema = z.object({
  x: z.number().min(0, 'X coordinate must be >= 0').max(100, 'X coordinate must be <= 100'),
  y: z.number().min(0, 'Y coordinate must be >= 0').max(100, 'Y coordinate must be <= 100'),
  label: z.string().optional(),
  pointerType: z.enum(['arrow', 'ring', 'crosshair']).default('arrow'),
});

export const QuestionOptionSchema = z.object({
  id: z.string().min(1, 'Option ID is required'),
  text: z.string().min(1, 'Option text cannot be empty'),
  isCorrect: z.boolean(),
});

export const QuestionSchema = z
  .object({
    id: z.string().min(1, 'Question ID is required'),
    examId: z.string().min(1, 'Exam ID is required'),
    orderIndex: z.number().int().min(0),
    type: z.enum(['image_mcq', 'spotter', 'text_mcq', 'clinical_mcq']),
    title: z.string().optional(),
    clinicalVignette: z.string().optional(),
    questionText: z.string().min(1, 'Question prompt is required'),
    imageId: z.string().optional(),
    imageName: z.string().optional(),
    spotterPin: SpotterPinSchema.optional(),
    options: z.array(QuestionOptionSchema).optional(),
    acceptableAnswers: z.array(z.string()).optional(),
    spotterAnswerMode: z.enum(['typed', 'multiple_choice', 'both']).optional(),
    referenceAnswer: z.string().optional(),
    markingRubric: z.string().optional(),
    explanation: z.string().default(''),
    stationDurationSeconds: z.number().min(15).max(600).optional(),
    points: z.number().min(0.1, 'Points must be greater than zero').default(1),
    subjectId: z.string().optional(),
    lectureId: z.string().optional(),
    lectureName: z.string().optional(),
    topicGroupId: z.string().optional(),
    topicGroupName: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // MCQ checks
    if (data.type === 'text_mcq' || data.type === 'clinical_mcq' || data.type === 'image_mcq') {
      if (!data.options || data.options.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Multiple choice questions require at least 2 options.',
          path: ['options'],
        });
      } else {
        const correctCount = data.options.filter((o) => o.isCorrect).length;
        if (correctCount !== 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Exactly one option must be marked as correct.',
            path: ['options'],
          });
        }
        // Check for duplicate option IDs
        const ids = new Set<string>();
        for (const opt of data.options) {
          if (ids.has(opt.id)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Duplicate option ID detected: "${opt.id}"`,
              path: ['options'],
            });
          }
          ids.add(opt.id);
        }
      }
    }

    // Spotter checks
    if (data.type === 'spotter') {
      const mode = data.spotterAnswerMode || 'both';
      if ((mode === 'typed' || mode === 'both') && (!data.acceptableAnswers || data.acceptableAnswers.length === 0)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Spotter station requires at least one acceptable typed answer keyword.',
          path: ['acceptableAnswers'],
        });
      }
      if (mode === 'multiple_choice' || mode === 'both') {
        if (!data.options || data.options.length < 2) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Spotter multiple choice options require at least 2 options.',
            path: ['options'],
          });
        } else {
          const correctCount = data.options.filter((o) => o.isCorrect).length;
          if (correctCount !== 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Exactly one option must be marked as correct in spotter options.',
              path: ['options'],
            });
          }
        }
      }
    }
  });

export const ManifestImageFileSchema = z.object({
  id: z.string().min(1, 'Image ID is required'),
  fileName: z.string().min(1, 'File name is required'),
  mimeType: z.string().default('image/jpeg'),
  required: z.boolean().optional(),
  status: z.enum(['available', 'missing']).optional(),
  altText: z.string().optional(),
  source: z.string().optional(),
});

export const ExamPackageManifestSchema = z
  .object({
    formatVersion: z.literal('1.0.0'),
    exportedAt: z.number(),
    subject: z.object({
      id: z.string().min(1),
      name: z.string().min(1, 'Subject name is required'),
      code: z.string().min(1, 'Subject code is required'),
      description: z.string().optional(),
      color: z.string().optional(),
    }),
    exam: z.object({
      id: z.string().min(1),
      subjectId: z.string().min(1),
      title: z.string().min(1, 'Exam title is required'),
      code: z.string().min(1, 'Exam code is required'),
      description: z.string().default(''),
      status: z.enum(['draft', 'review', 'published']).default('draft'),
      timingMode: z.enum(['bell_ring', 'total_timer', 'flexible']),
      totalDurationMinutes: z.number().default(20),
      stationDurationSeconds: z.number().min(15).max(600).default(90),
      passingScorePercent: z.number().min(1).max(100).default(60),
      shuffleQuestions: z.boolean().optional(),
      instructions: z.string().optional(),
    }),
    questions: z.array(QuestionSchema),
    imageFiles: z.array(ManifestImageFileSchema),
  })
  .superRefine((data, ctx) => {
    // Check for duplicate question IDs
    const questionIds = new Set<string>();
    data.questions.forEach((q, idx) => {
      if (questionIds.has(q.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate question ID detected: "${q.id}"`,
          path: ['questions', idx, 'id'],
        });
      }
      questionIds.add(q.id);
    });
  });

export type ExamPackageManifest = z.infer<typeof ExamPackageManifestSchema>;

// Missing Image and Inspection Data Types
export interface MissingImageItem {
  id: string;
  fileName: string;
  mimeType: string;
  required: boolean;
  status: 'available' | 'missing';
  altText?: string;
  source?: string;
  associatedQuestionIds: string[];
  associatedQuestionTitles: string[];
}

export interface InspectionSummary {
  examTitle: string;
  examCode: string;
  subjectName: string;
  questionCount: number;
  availableImagesCount: number;
  missingImagesCount: number;
  images: MissingImageItem[];
  questionsNeedingReviewCount: number;
}
