import { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../../../db';
import type { Question, Subject, Exam, ShuffleAttemptRecord } from '../../../types';
import type {
  QuestionBankSummary,
  DistributionPreview,
  SamplingResult,
} from '../types/shuffle.types';
import {
  summarizeQuestionBank,
  getDistributionPreview,
} from '../services/distribution.service';
import { sampleStratifiedQuestions } from '../services/sampling.service';
import { prepareQuestionsForShuffleExam } from '../services/randomization.service';
import { v4 as uuidv4 } from '../../../db/uuid';

export interface UseShuffleExamReturn {
  isLoading: boolean;
  totalAvailable: number;
  bankSummary: QuestionBankSummary | null;
  targetCount: number;
  setTargetCount: (count: number) => void;
  selectedTopicGroupIds: string[];
  setSelectedTopicGroupIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedSubjectId: string | undefined;
  setSelectedSubjectId: (subjectId: string | undefined) => void;
  randomizeOptions: boolean;
  setRandomizeOptions: (val: boolean) => void;
  distributionPreview: DistributionPreview | null;
  activeShuffleAttempt: ShuffleAttemptRecord | null;
  startShuffleExam: (options?: {
    autoAdvanceOnBell?: boolean;
    stationDurationSeconds?: number;
  }) => Promise<{
    exam: Exam;
    subject: Subject;
    questions: Question[];
    autoAdvanceOnBell: boolean;
    attemptRecord: ShuffleAttemptRecord;
  }>;
  resumeShuffleAttempt: () => Promise<{
    exam: Exam;
    subject: Subject;
    questions: Question[];
  } | null>;
  discardActiveShuffleAttempt: () => Promise<void>;
  reloadBank: () => Promise<void>;
}

export function useShuffleExam(): UseShuffleExamReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [targetCount, setTargetCount] = useState<number>(10);
  const [selectedTopicGroupIds, setSelectedTopicGroupIds] = useState<string[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | undefined>(undefined);
  const [randomizeOptions, setRandomizeOptions] = useState<boolean>(true);
  const [activeShuffleAttempt, setActiveShuffleAttempt] = useState<ShuffleAttemptRecord | null>(null);

  // Subject lookup map: subjectId -> subjectName
  const subjectNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of subjects) {
      map[s.id] = s.name;
    }
    return map;
  }, [subjects]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allQuestions, allSubjects] = await Promise.all([
        db.questions.toArray(),
        db.subjects.toArray(),
      ]);
      setQuestions(allQuestions);
      setSubjects(allSubjects);

      // Check for in-progress shuffle attempt
      const inProgress = await db.shuffleAttempts
        .where('status')
        .equals('in_progress')
        .reverse()
        .first();
      setActiveShuffleAttempt(inProgress || null);

      // Set sensible initial question count
      if (allQuestions.length > 0) {
        setTargetCount((prev) => {
          if (prev <= 0 || prev > allQuestions.length) {
            return Math.min(10, allQuestions.length);
          }
          return prev;
        });
      }
    } catch (err) {
      console.error('Failed to load shuffle bank:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered bank based on subject or topic group selections
  const filteredQuestions = useMemo(() => {
    let list = questions;
    if (selectedSubjectId) {
      list = list.filter((q) => q.subjectId === selectedSubjectId);
    }
    if (selectedTopicGroupIds.length > 0) {
      const allowed = new Set(selectedTopicGroupIds);
      list = list.filter((q) => q.topicGroupId && allowed.has(q.topicGroupId));
    }
    return list;
  }, [questions, selectedSubjectId, selectedTopicGroupIds]);

  // Bank summary
  const bankSummary = useMemo(() => {
    if (questions.length === 0) return null;
    return summarizeQuestionBank(questions, subjectNameMap);
  }, [questions, subjectNameMap]);

  // Live Distribution Preview for current target count
  const distributionPreview = useMemo(() => {
    if (filteredQuestions.length === 0 || !bankSummary) return null;
    const filteredHierarchy = bankSummary.topicGroups.filter((g) => {
      if (selectedSubjectId && g.subjectId && g.subjectId !== selectedSubjectId) return false;
      if (selectedTopicGroupIds.length > 0 && !selectedTopicGroupIds.includes(g.topicGroupId)) return false;
      return true;
    });

    const safeCount = Math.min(Math.max(1, targetCount), filteredQuestions.length);
    return getDistributionPreview(filteredHierarchy, safeCount);
  }, [filteredQuestions.length, bankSummary, selectedSubjectId, selectedTopicGroupIds, targetCount]);

  /**
   * Generates a balanced shuffle exam session and saves attempt record.
   */
  const startShuffleExam = async (options?: {
    autoAdvanceOnBell?: boolean;
    stationDurationSeconds?: number;
  }) => {
    const safeCount = Math.min(Math.max(1, targetCount), filteredQuestions.length);

    const samplingResult: SamplingResult = sampleStratifiedQuestions(
      filteredQuestions,
      {
        targetCount: safeCount,
        selectedSubjectId,
        selectedTopicGroupIds: selectedTopicGroupIds.length > 0 ? selectedTopicGroupIds : undefined,
      },
      subjectNameMap
    );

    const preparedQuestions = prepareQuestionsForShuffleExam(
      samplingResult.questions,
      randomizeOptions
    );

    const attemptId = `shuffle-${uuidv4()}`;
    const stationDurationSeconds = options?.stationDurationSeconds || 90;
    const totalDurationMinutes = Math.max(5, Math.ceil((preparedQuestions.length * stationDurationSeconds) / 60));

    // Distribution record for analytics
    const topicDist: Record<string, number> = {};
    for (const g of samplingResult.distribution.groups) {
      topicDist[g.topicGroupName] = g.allocatedCount;
    }

    const attemptRecord: ShuffleAttemptRecord = {
      id: attemptId,
      createdAt: Date.now(),
      totalQuestions: preparedQuestions.length,
      selectedQuestionIds: preparedQuestions.map((q) => q.id),
      topicDistribution: topicDist,
      status: 'in_progress',
      currentQuestionIndex: 0,
    };

    // Persist attempt in DB
    await db.shuffleAttempts.put(attemptRecord);
    setActiveShuffleAttempt(attemptRecord);

    // Synthetic Exam & Subject objects compatible with ExamRunner & SelfGradingView
    const shuffleExam: Exam = {
      id: attemptId,
      subjectId: 'shuffle-bank',
      title: `Shuffle Practice (${preparedQuestions.length} Questions)`,
      code: `SHUF-${preparedQuestions.length}`,
      description: `Stratified randomized assessment across ${samplingResult.distribution.groups.filter((g) => g.allocatedCount > 0).length} topic groups.`,
      status: 'published',
      timingMode: 'flexible',
      totalDurationMinutes,
      stationDurationSeconds,
      passingScorePercent: 60,
      instructions: 'Stratified randomized question set. Each station provides medical image examination, answer fields, and pacing alerts.',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const shuffleSubject: Subject = {
      id: 'shuffle-bank',
      name: 'Shuffle Practice Bank',
      code: 'SHUFFLE',
      description: 'Randomized multi-specialty question rotation',
      color: '#0f766e', // Medical teal
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return {
      exam: shuffleExam,
      subject: shuffleSubject,
      questions: preparedQuestions,
      autoAdvanceOnBell: options?.autoAdvanceOnBell ?? false,
      attemptRecord,
    };
  };

  /**
   * Resumes an in-progress shuffle attempt.
   */
  const resumeShuffleAttempt = async () => {
    if (!activeShuffleAttempt) return null;

    const matchedQuestions: Question[] = [];
    for (const qId of activeShuffleAttempt.selectedQuestionIds) {
      const q = await db.questions.get(qId);
      if (q) matchedQuestions.push(q);
    }

    if (matchedQuestions.length === 0) {
      await db.shuffleAttempts.delete(activeShuffleAttempt.id);
      setActiveShuffleAttempt(null);
      return null;
    }

    const preparedQuestions = prepareQuestionsForShuffleExam(matchedQuestions, false);

    const shuffleExam: Exam = {
      id: activeShuffleAttempt.id,
      subjectId: 'shuffle-bank',
      title: `Shuffle Practice (${preparedQuestions.length} Questions)`,
      code: `SHUF-${preparedQuestions.length}`,
      description: `Resumed shuffle practice session started ${new Date(activeShuffleAttempt.createdAt).toLocaleTimeString()}.`,
      status: 'published',
      timingMode: 'flexible',
      totalDurationMinutes: Math.max(5, Math.ceil((preparedQuestions.length * 90) / 60)),
      stationDurationSeconds: 90,
      passingScorePercent: 60,
      instructions: 'Resumed examination. Continue answering your stations.',
      createdAt: activeShuffleAttempt.createdAt,
      updatedAt: Date.now(),
    };

    const shuffleSubject: Subject = {
      id: 'shuffle-bank',
      name: 'Shuffle Practice Bank',
      code: 'SHUFFLE',
      description: 'Randomized multi-specialty question rotation',
      color: '#0f766e',
      createdAt: activeShuffleAttempt.createdAt,
      updatedAt: Date.now(),
    };

    return {
      exam: shuffleExam,
      subject: shuffleSubject,
      questions: preparedQuestions,
    };
  };

  const discardActiveShuffleAttempt = async () => {
    if (activeShuffleAttempt) {
      await db.shuffleAttempts.update(activeShuffleAttempt.id, { status: 'abandoned' });
      setActiveShuffleAttempt(null);
    }
  };

  return {
    isLoading,
    totalAvailable: filteredQuestions.length,
    bankSummary,
    targetCount,
    setTargetCount,
    selectedTopicGroupIds,
    setSelectedTopicGroupIds,
    selectedSubjectId,
    setSelectedSubjectId,
    randomizeOptions,
    setRandomizeOptions,
    distributionPreview,
    activeShuffleAttempt,
    startShuffleExam,
    resumeShuffleAttempt,
    discardActiveShuffleAttempt,
    reloadBank: loadData,
  };
}
