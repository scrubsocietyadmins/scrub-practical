import type { Question, QuestionType, ExamAttempt } from '../../../types';

export interface LectureInfo {
  lectureId: string;
  lectureName: string;
  topicGroupId: string;
  topicGroupName: string;
  questionCount: number;
  questionIds: string[];
}

export interface TopicGroupInfo {
  topicGroupId: string;
  topicGroupName: string;
  subjectId?: string;
  subjectName?: string;
  totalQuestions: number;
  lectures: LectureInfo[];
}

export interface QuestionBankSummary {
  totalQuestions: number;
  topicGroups: TopicGroupInfo[];
  totalLectures: number;
  questionTypes: Record<QuestionType, number>;
}

export interface ShuffleConfig {
  targetCount: number;
  selectedTopicGroupIds?: string[]; // If user wants all or subset
  selectedSubjectId?: string; // Optional filter by subject
  randomizeOptionOrder?: boolean;
  seed?: string | number;
}

export interface LectureAllocationPreview {
  lectureId: string;
  lectureName: string;
  availableCount: number;
  allocatedCount: number;
}

export interface TopicGroupAllocationPreview {
  topicGroupId: string;
  topicGroupName: string;
  availableCount: number;
  allocatedCount: number;
  percentageOfExam: number;
  lectureBreakdown: LectureAllocationPreview[];
}

export interface DistributionPreview {
  totalRequested: number;
  totalAllocated: number;
  groups: TopicGroupAllocationPreview[];
  isBalanced: boolean;
}

export interface SamplingResult {
  questions: Question[];
  distribution: DistributionPreview;
  requestedCount: number;
  actualCount: number;
  overflowHandled: boolean;
}
