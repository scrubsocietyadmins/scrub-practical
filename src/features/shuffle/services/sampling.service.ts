import type { Question } from '../../../types';
import type {
  ShuffleConfig,
  SamplingResult,
  DistributionPreview,
} from '../types/shuffle.types';
import { fisherYatesShuffle, createDeterministicPrng } from '../utils/fisher-yates';
import {
  normalizeQuestionCategorization,
  buildTopicGroupHierarchy,
  computeStratifiedQuotaPlan,
  getDistributionPreview,
} from './distribution.service';

/**
 * Stratified Random Sampling Engine for Scrub Practical.
 *
 * Algorithm specifications:
 * 1. Groups questions dynamically by Topic Group and Lecture.
 * 2. Distributes the requested count N proportionally and evenly across topic groups.
 * 3. Sub-distributes each group quota evenly across its constituent lectures.
 * 4. Resolves quota overflow when a lecture or group lacks enough questions by redistributing
 *    the remaining quota to other active lectures/groups until the requested count is satisfied.
 * 5. Uses Fisher-Yates shuffle for true uniform randomness within each lecture bucket.
 * 6. Guarantees ZERO duplicate questions in the resulting sample.
 * 7. Never silently truncates below requested count if the total bank has sufficient questions.
 * 8. Shuffles the final question array so the candidate experiences an authentic mixed rotation.
 */
export function sampleStratifiedQuestions(
  questionBank: readonly Question[],
  config: ShuffleConfig,
  subjectNameMap?: Record<string, string>
): SamplingResult {
  if (!questionBank || questionBank.length === 0) {
    return {
      questions: [],
      distribution: {
        totalRequested: config.targetCount,
        totalAllocated: 0,
        groups: [],
        isBalanced: true,
      },
      requestedCount: config.targetCount,
      actualCount: 0,
      overflowHandled: false,
    };
  }

  // PRNG: seeded if provided in config, otherwise standard Math.random
  const rng = config.seed !== undefined ? createDeterministicPrng(config.seed) : Math.random;

  // 1. Normalize and filter candidate questions
  let eligibleQuestions = questionBank.map((q) =>
    normalizeQuestionCategorization(q, q.subjectId && subjectNameMap ? subjectNameMap[q.subjectId] : undefined)
  );

  // Optional subject filter
  if (config.selectedSubjectId) {
    eligibleQuestions = eligibleQuestions.filter((q) => q.subjectId === config.selectedSubjectId);
  }

  // Optional topic group filter
  if (config.selectedTopicGroupIds && config.selectedTopicGroupIds.length > 0) {
    const allowed = new Set(config.selectedTopicGroupIds);
    eligibleQuestions = eligibleQuestions.filter((q) => q.topicGroupId && allowed.has(q.topicGroupId));
  }

  const totalEligible = eligibleQuestions.length;
  const targetCount = Math.max(1, Math.min(config.targetCount, totalEligible));

  // 2. Build topic group and lecture hierarchy
  const topicGroups = buildTopicGroupHierarchy(eligibleQuestions, subjectNameMap);

  // 3. Compute stratified quota plan
  const quotaPlan = computeStratifiedQuotaPlan(topicGroups, targetCount);

  // Map for fast question lookup: topicGroupId -> lectureId -> Question[]
  const bankLookup = new Map<string, Map<string, Question[]>>();
  for (const q of eligibleQuestions) {
    const grpId = q.topicGroupId!;
    const lecId = q.lectureId!;
    if (!bankLookup.has(grpId)) {
      bankLookup.set(grpId, new Map());
    }
    const grpMap = bankLookup.get(grpId)!;
    if (!grpMap.has(lecId)) {
      grpMap.set(lecId, []);
    }
    grpMap.get(lecId)!.push(q);
  }

  const selectedQuestions: Question[] = [];
  const selectedIdSet = new Set<string>();

  // 4. Sample questions per lecture according to quota plan
  for (const group of topicGroups) {
    const grpPlan = quotaPlan.get(group.topicGroupId);
    if (!grpPlan || grpPlan.groupAllocated === 0) continue;

    const grpLookup = bankLookup.get(group.topicGroupId);
    if (!grpLookup) continue;

    for (const lec of group.lectures) {
      const quota = grpPlan.lectureQuotas.get(lec.lectureId) || 0;
      if (quota <= 0) continue;

      const availableInLec = grpLookup.get(lec.lectureId) || [];
      // Fisher-Yates shuffle the available questions in this lecture
      const shuffledLec = fisherYatesShuffle(availableInLec, rng);

      // Pick the quota count
      let taken = 0;
      for (const candidate of shuffledLec) {
        if (taken >= quota) break;
        if (!selectedIdSet.has(candidate.id)) {
          selectedIdSet.add(candidate.id);
          selectedQuestions.push(candidate);
          taken++;
        }
      }
    }
  }

  // 5. Overflow & Underflow Guarantee:
  // If due to any dynamic grouping edge cases we still need questions and totalEligible > selected,
  // greedily backfill from remaining unselected eligible questions using Fisher-Yates
  let overflowHandled = false;
  if (selectedQuestions.length < targetCount) {
    overflowHandled = true;
    const remainingCandidates = eligibleQuestions.filter((q) => !selectedIdSet.has(q.id));
    const shuffledRemaining = fisherYatesShuffle(remainingCandidates, rng);

    for (const extra of shuffledRemaining) {
      if (selectedQuestions.length >= targetCount) break;
      selectedIdSet.add(extra.id);
      selectedQuestions.push(extra);
    }
  }

  // 6. Final Shuffle: Randomize the station sequence so stations from the same lecture aren't always clumped
  const finalOrderedQuestions = fisherYatesShuffle(selectedQuestions, rng);

  // 7. Generate distribution preview object
  const distribution = getDistributionPreview(topicGroups, targetCount);

  return {
    questions: finalOrderedQuestions,
    distribution,
    requestedCount: config.targetCount,
    actualCount: finalOrderedQuestions.length,
    overflowHandled,
  };
}
