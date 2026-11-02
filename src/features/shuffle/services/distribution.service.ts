import type { Question, QuestionType } from '../../../types';
import type {
  TopicGroupInfo,
  LectureInfo,
  QuestionBankSummary,
  DistributionPreview,
  TopicGroupAllocationPreview,
  LectureAllocationPreview,
} from '../types/shuffle.types';

/**
 * Normalizes question metadata to ensure every question belongs to a topic group and lecture.
 * If not explicitly set, derives one dynamically based on title, subject, or defaults.
 */
export function normalizeQuestionCategorization(q: Question, fallbackSubjectName?: string): Question {
  const subjectId = q.subjectId || 'subj-general';
  
  // Dynamic topic group assignment if missing
  let topicGroupId = q.topicGroupId;
  let topicGroupName = q.topicGroupName;
  if (!topicGroupId || !topicGroupName) {
    const text = `${q.title || ''} ${q.questionText || ''}`.toLowerCase();
    if (text.includes('schistosoma') || text.includes('giardia') || text.includes('egg') || text.includes('ovum') || text.includes('trophozoite') || subjectId.includes('para')) {
      topicGroupId = 'grp-parasitol-core';
      topicGroupName = 'Medical Parasitology & Tropical Infections';
    } else if (text.includes('gram') || text.includes('stain') || text.includes('bacilli') || text.includes('cocci') || text.includes('agar') || text.includes('mycobacteri') || subjectId.includes('micro')) {
      topicGroupId = 'grp-microbiol-core';
      topicGroupName = 'Clinical Microbiology & Smear Diagnostics';
    } else if (text.includes('dose') || text.includes('receptor') || text.includes('antagonist') || text.includes('agonist') || text.includes('drug') || text.includes('pupil') || subjectId.includes('pharm')) {
      topicGroupId = 'grp-pharmacol-core';
      topicGroupName = 'Medical Pharmacology & Therapeutics';
    } else if (text.includes('ulcer') || text.includes('carcinoma') || text.includes('lymph') || text.includes('necrosis') || text.includes('gastric') || subjectId.includes('path')) {
      topicGroupId = 'grp-pathol-core';
      topicGroupName = 'Systemic Pathology & Diagnostic Histology';
    } else {
      topicGroupId = `grp-${subjectId}`;
      topicGroupName = fallbackSubjectName ? `${fallbackSubjectName} Core Topics` : 'Clinical Sciences Core';
    }
  }

  // Dynamic lecture assignment if missing
  let lectureId = q.lectureId;
  let lectureName = q.lectureName;
  if (!lectureId || !lectureName) {
    lectureId = `lec-${topicGroupId}-01`;
    lectureName = `${topicGroupName} - Core Module`;
  }

  return {
    ...q,
    subjectId,
    topicGroupId,
    topicGroupName,
    lectureId,
    lectureName,
  };
}

/**
 * Groups a collection of questions into structured Topic Groups and Lectures.
 */
export function buildTopicGroupHierarchy(
  questions: readonly Question[],
  subjectNameMap?: Record<string, string>
): TopicGroupInfo[] {
  const groupMap = new Map<string, {
    info: {
      topicGroupId: string;
      topicGroupName: string;
      subjectId?: string;
      subjectName?: string;
    };
    lecturesMap: Map<string, {
      lectureId: string;
      lectureName: string;
      questions: Question[];
    }>;
  }>();

  for (const rawQ of questions) {
    const q = normalizeQuestionCategorization(rawQ, rawQ.subjectId && subjectNameMap ? subjectNameMap[rawQ.subjectId] : undefined);
    const grpId = q.topicGroupId!;
    const grpName = q.topicGroupName!;
    const lecId = q.lectureId!;
    const lecName = q.lectureName!;

    if (!groupMap.has(grpId)) {
      groupMap.set(grpId, {
        info: {
          topicGroupId: grpId,
          topicGroupName: grpName,
          subjectId: q.subjectId,
          subjectName: q.subjectId && subjectNameMap ? subjectNameMap[q.subjectId] : undefined,
        },
        lecturesMap: new Map(),
      });
    }

    const grp = groupMap.get(grpId)!;
    if (!grp.lecturesMap.has(lecId)) {
      grp.lecturesMap.set(lecId, {
        lectureId: lecId,
        lectureName: lecName,
        questions: [],
      });
    }

    grp.lecturesMap.get(lecId)!.questions.push(q);
  }

  const result: TopicGroupInfo[] = [];

  for (const [, grpData] of groupMap.entries()) {
    const lectures: LectureInfo[] = [];
    let totalQuestionsInGroup = 0;

    for (const [, lecData] of grpData.lecturesMap.entries()) {
      lectures.push({
        lectureId: lecData.lectureId,
        lectureName: lecData.lectureName,
        topicGroupId: grpData.info.topicGroupId,
        topicGroupName: grpData.info.topicGroupName,
        questionCount: lecData.questions.length,
        questionIds: lecData.questions.map((q) => q.id),
      });
      totalQuestionsInGroup += lecData.questions.length;
    }

    result.push({
      topicGroupId: grpData.info.topicGroupId,
      topicGroupName: grpData.info.topicGroupName,
      subjectId: grpData.info.subjectId,
      subjectName: grpData.info.subjectName,
      totalQuestions: totalQuestionsInGroup,
      lectures,
    });
  }

  return result.sort((a, b) => b.totalQuestions - a.totalQuestions);
}

/**
 * Summarizes the entire question bank.
 */
export function summarizeQuestionBank(
  questions: readonly Question[],
  subjectNameMap?: Record<string, string>
): QuestionBankSummary {
  const topicGroups = buildTopicGroupHierarchy(questions, subjectNameMap);
  let totalLectures = 0;
  const questionTypes: Record<QuestionType, number> = {
    spotter: 0,
    image_mcq: 0,
    clinical_mcq: 0,
    text_mcq: 0,
  };

  for (const grp of topicGroups) {
    totalLectures += grp.lectures.length;
  }

  for (const q of questions) {
    if (questionTypes[q.type] !== undefined) {
      questionTypes[q.type]++;
    } else {
      questionTypes[q.type] = 1;
    }
  }

  return {
    totalQuestions: questions.length,
    topicGroups,
    totalLectures,
    questionTypes,
  };
}

/**
 * Calculates a balanced stratified distribution plan (quotas) for a requested number of questions.
 * This is used for BOTH the UI preview AND the sampling engine.
 * 
 * Stratified Distribution Logic:
 * 1. Target total count N (clamped to available total).
 * 2. Distribute N across available groups.
 *    - Each group gets baseline: floor(N / numGroups).
 *    - Remaining surplus: distributed 1 by 1 to groups with available capacity.
 *    - Capacity overflow handling: If a group cannot fulfill its quota, cap at its capacity and
 *      redistribute the unused quota to other groups with remaining capacity.
 * 3. Within each group with quota Q_group, distribute across its lectures.
 *    - Same stratified logic: baseline floor(Q_group / numLectures), remainder distributed,
 *      and overflow redistributed among fellow lectures in the group.
 *    - If all lectures in the group are saturated and leftover quota remains, it bubbles back
 *      to other topic groups.
 */
export function computeStratifiedQuotaPlan(
  topicGroups: TopicGroupInfo[],
  targetCount: number
): Map<string, { groupAllocated: number; lectureQuotas: Map<string, number> }> {
  const result = new Map<string, { groupAllocated: number; lectureQuotas: Map<string, number> }>();
  if (topicGroups.length === 0 || targetCount <= 0) return result;

  const totalAvailable = topicGroups.reduce((acc, g) => acc + g.totalQuestions, 0);
  const actualTarget = Math.min(targetCount, totalAvailable);

  // Initialize group allocations
  const groupCaps = new Map<string, number>();
  const groupAllocs = new Map<string, number>();

  for (const g of topicGroups) {
    groupCaps.set(g.topicGroupId, g.totalQuestions);
    groupAllocs.set(g.topicGroupId, 0);
  }

  // Distribute across groups with overflow protection
  let remainingToAllocate = actualTarget;
  let activeGroups = topicGroups.filter((g) => g.totalQuestions > 0);

  while (remainingToAllocate > 0 && activeGroups.length > 0) {
    const quotaPerGroup = Math.floor(remainingToAllocate / activeGroups.length);
    const remainder = remainingToAllocate % activeGroups.length;

    let allocatedInThisPass = 0;
    const nextActiveGroups: TopicGroupInfo[] = [];

    // Sort active groups by available capacity descending to balance remainder
    activeGroups.sort((a, b) => {
      const capA = groupCaps.get(a.topicGroupId)! - groupAllocs.get(a.topicGroupId)!;
      const capB = groupCaps.get(b.topicGroupId)! - groupAllocs.get(b.topicGroupId)!;
      return capB - capA;
    });

    for (let i = 0; i < activeGroups.length; i++) {
      const g = activeGroups[i];
      const currentAlloc = groupAllocs.get(g.topicGroupId)!;
      const cap = groupCaps.get(g.topicGroupId)!;
      const room = cap - currentAlloc;

      if (room <= 0) continue;

      let want = quotaPerGroup + (i < remainder ? 1 : 0);
      if (want <= 0 && remainingToAllocate > 0) {
        want = 1;
      }

      const take = Math.min(want, room, remainingToAllocate);
      groupAllocs.set(g.topicGroupId, currentAlloc + take);
      remainingToAllocate -= take;
      allocatedInThisPass += take;

      if (currentAlloc + take < cap) {
        nextActiveGroups.push(g);
      }

      if (remainingToAllocate <= 0) break;
    }

    // Safety: if no progress was made in this pass (all groups saturated), break
    if (allocatedInThisPass === 0) {
      break;
    }
    activeGroups = nextActiveGroups;
  }

  // Now, for each group, distribute its quota across its lectures
  for (const g of topicGroups) {
    const groupQuota = groupAllocs.get(g.topicGroupId) || 0;
    const lectureQuotas = new Map<string, number>();

    for (const lec of g.lectures) {
      lectureQuotas.set(lec.lectureId, 0);
    }

    if (groupQuota > 0 && g.lectures.length > 0) {
      let lecRemaining = groupQuota;
      let activeLectures = g.lectures.filter((l) => l.questionCount > 0);

      while (lecRemaining > 0 && activeLectures.length > 0) {
        const quotaPerLec = Math.floor(lecRemaining / activeLectures.length);
        const remainder = lecRemaining % activeLectures.length;
        let passAllocated = 0;
        const nextActiveLectures: LectureInfo[] = [];

        activeLectures.sort((a, b) => {
          const capA = a.questionCount - (lectureQuotas.get(a.lectureId) || 0);
          const capB = b.questionCount - (lectureQuotas.get(b.lectureId) || 0);
          return capB - capA;
        });

        for (let i = 0; i < activeLectures.length; i++) {
          const lec = activeLectures[i];
          const cur = lectureQuotas.get(lec.lectureId) || 0;
          const room = lec.questionCount - cur;

          if (room <= 0) continue;

          let want = quotaPerLec + (i < remainder ? 1 : 0);
          if (want <= 0 && lecRemaining > 0) {
            want = 1;
          }

          const take = Math.min(want, room, lecRemaining);
          lectureQuotas.set(lec.lectureId, cur + take);
          lecRemaining -= take;
          passAllocated += take;

          if (cur + take < lec.questionCount) {
            nextActiveLectures.push(lec);
          }

          if (lecRemaining <= 0) break;
        }

        if (passAllocated === 0) break;
        activeLectures = nextActiveLectures;
      }
    }

    result.set(g.topicGroupId, {
      groupAllocated: groupQuota,
      lectureQuotas,
    });
  }

  return result;
}

/**
 * Computes a human-readable and visual DistributionPreview object.
 */
export function getDistributionPreview(
  topicGroups: TopicGroupInfo[],
  targetCount: number
): DistributionPreview {
  const plan = computeStratifiedQuotaPlan(topicGroups, targetCount);
  let totalAllocated = 0;
  const groupsPreview: TopicGroupAllocationPreview[] = [];

  for (const g of topicGroups) {
    const groupPlan = plan.get(g.topicGroupId);
    const allocated = groupPlan ? groupPlan.groupAllocated : 0;
    totalAllocated += allocated;

    const lectureBreakdown: LectureAllocationPreview[] = g.lectures.map((lec) => {
      const lecAlloc = groupPlan?.lectureQuotas.get(lec.lectureId) || 0;
      return {
        lectureId: lec.lectureId,
        lectureName: lec.lectureName,
        availableCount: lec.questionCount,
        allocatedCount: lecAlloc,
      };
    });

    groupsPreview.push({
      topicGroupId: g.topicGroupId,
      topicGroupName: g.topicGroupName,
      availableCount: g.totalQuestions,
      allocatedCount: allocated,
      percentageOfExam: 0, // calculated below
      lectureBreakdown,
    });
  }

  // Compute final percentages
  for (const gp of groupsPreview) {
    gp.percentageOfExam = totalAllocated > 0 ? Math.round((gp.allocatedCount / totalAllocated) * 100) : 0;
  }

  return {
    totalRequested: targetCount,
    totalAllocated,
    groups: groupsPreview,
    isBalanced: true,
  };
}
