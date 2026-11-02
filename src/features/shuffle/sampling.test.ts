import { sampleStratifiedQuestions } from './services/sampling.service';
import {
  computeStratifiedQuotaPlan,
  buildTopicGroupHierarchy,
  getDistributionPreview,
} from './services/distribution.service';
import { fisherYatesShuffle, createDeterministicPrng } from './utils/fisher-yates';
import { prepareQuestionsForShuffleExam } from './services/randomization.service';
import type { Question } from '../../types';

function createMockQuestion(params: {
  id: string;
  topicGroupId: string;
  topicGroupName: string;
  lectureId: string;
  lectureName: string;
  type?: Question['type'];
}): Question {
  return {
    id: params.id,
    examId: 'mock-exam',
    orderIndex: 0,
    type: params.type || 'text_mcq',
    questionText: `Test question for ${params.id}`,
    topicGroupId: params.topicGroupId,
    topicGroupName: params.topicGroupName,
    lectureId: params.lectureId,
    lectureName: params.lectureName,
    explanation: 'Test explanation',
    points: 1,
    options: [
      { id: 'opt-1', text: 'Option A', isCorrect: true },
      { id: 'opt-2', text: 'Option B', isCorrect: false },
    ],
  };
}

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failCount++;
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    passCount++;
    console.log(`✅ PASS: ${message}`);
  }
}

console.log('\n--- Running Shuffle Engine Test Suite ---\n');

// TEST 1: Stratified Balanced Distribution Across Groups
try {
  const bank: Question[] = [];
  // 4 groups, each with 2 lectures, each lecture has 5 questions (10 per group, 40 total)
  for (let g = 1; g <= 4; g++) {
    for (let l = 1; l <= 2; l++) {
      for (let q = 1; q <= 5; q++) {
        bank.push(
          createMockQuestion({
            id: `q-g${g}-l${l}-${q}`,
            topicGroupId: `grp-${g}`,
            topicGroupName: `Topic Group ${g}`,
            lectureId: `lec-${g}-${l}`,
            lectureName: `Lecture ${g}.${l}`,
          })
        );
      }
    }
  }

  const result = sampleStratifiedQuestions(bank, {
    targetCount: 8,
    seed: 'balanced-test-seed',
  });

  assert(result.questions.length === 8, 'Returned exactly 8 questions');
  assert(result.actualCount === 8, 'actualCount equals 8');

  // Verify each of the 4 groups got exactly 2 questions
  const groupCounts: Record<string, number> = {};
  for (const q of result.questions) {
    groupCounts[q.topicGroupId!] = (groupCounts[q.topicGroupId!] || 0) + 1;
  }

  assert(Object.keys(groupCounts).length === 4, 'All 4 groups are represented');
  for (let g = 1; g <= 4; g++) {
    assert(groupCounts[`grp-${g}`] === 2, `Group ${g} received exactly 2 questions`);
  }
} catch (e) {
  console.error(e);
}

// TEST 2: Quota Overflow and Redistribution
try {
  const bank: Question[] = [];
  // Group 1 has only 1 question
  bank.push(
    createMockQuestion({
      id: 'q-scarce-1',
      topicGroupId: 'grp-scarce',
      topicGroupName: 'Scarce Group',
      lectureId: 'lec-scarce-1',
      lectureName: 'Scarce Lecture',
    })
  );
  // Group 2 has 20 questions
  for (let i = 1; i <= 20; i++) {
    bank.push(
      createMockQuestion({
        id: `q-abundant-${i}`,
        topicGroupId: 'grp-abundant',
        topicGroupName: 'Abundant Group',
        lectureId: 'lec-abundant-1',
        lectureName: 'Abundant Lecture',
      })
    );
  }

  // Request 6 questions: Group 1 can only provide 1, remaining 5 must come from Group 2
  const result = sampleStratifiedQuestions(bank, {
    targetCount: 6,
    seed: 'overflow-test-seed',
  });

  assert(result.questions.length === 6, 'Requested 6 and received exactly 6 questions despite scarce group');
  const scarceCount = result.questions.filter((q) => q.topicGroupId === 'grp-scarce').length;
  const abundantCount = result.questions.filter((q) => q.topicGroupId === 'grp-abundant').length;

  assert(scarceCount === 1, 'Scarce group provided its full capacity of 1 question');
  assert(abundantCount === 5, 'Abundant group absorbed leftover quota to fulfill 5 questions');
} catch (e) {
  console.error(e);
}

// TEST 3: Zero Duplicate Question Guarantee
try {
  const bank: Question[] = [];
  for (let i = 1; i <= 50; i++) {
    bank.push(
      createMockQuestion({
        id: `question-unique-${i}`,
        topicGroupId: `grp-${(i % 5) + 1}`,
        topicGroupName: `Group ${(i % 5) + 1}`,
        lectureId: `lec-${(i % 10) + 1}`,
        lectureName: `Lecture ${(i % 10) + 1}`,
      })
    );
  }

  // Sample large set (35 questions)
  const result = sampleStratifiedQuestions(bank, {
    targetCount: 35,
    seed: 'no-dupes-seed',
  });

  assert(result.questions.length === 35, 'Sampled 35 questions');
  const idSet = new Set(result.questions.map((q) => q.id));
  assert(idSet.size === 35, 'Zero duplicate question IDs found in sample');
} catch (e) {
  console.error(e);
}

// TEST 4: Bank Full Capacity (Max Clamping)
try {
  const bank: Question[] = [];
  for (let i = 1; i <= 15; i++) {
    bank.push(
      createMockQuestion({
        id: `q-cap-${i}`,
        topicGroupId: 'grp-1',
        topicGroupName: 'Group 1',
        lectureId: 'lec-1',
        lectureName: 'Lecture 1',
      })
    );
  }

  // Request 100 questions from bank of 15
  const result = sampleStratifiedQuestions(bank, {
    targetCount: 100,
  });

  assert(result.questions.length === 15, 'Requesting exceeding count clamps to total available (15)');
  const idSet = new Set(result.questions.map((q) => q.id));
  assert(idSet.size === 15, 'All 15 unique questions returned');
} catch (e) {
  console.error(e);
}

// TEST 5: Deterministic PRNG Reproducibility
try {
  const bank: Question[] = [];
  for (let i = 1; i <= 25; i++) {
    bank.push(
      createMockQuestion({
        id: `q-prng-${i}`,
        topicGroupId: `grp-${(i % 3) + 1}`,
        topicGroupName: `Group ${(i % 3) + 1}`,
        lectureId: `lec-${(i % 5) + 1}`,
        lectureName: `Lecture ${(i % 5) + 1}`,
      })
    );
  }

  const runA = sampleStratifiedQuestions(bank, {
    targetCount: 10,
    seed: 'scrub-deterministic-key-99',
  });

  const runB = sampleStratifiedQuestions(bank, {
    targetCount: 10,
    seed: 'scrub-deterministic-key-99',
  });

  const idsA = runA.questions.map((q) => q.id).join(',');
  const idsB = runB.questions.map((q) => q.id).join(',');

  assert(idsA === idsB, 'Identical seed produces identical stratified sample and order');
} catch (e) {
  console.error(e);
}

// TEST 6: MCQ Option Randomization Preserves Correct Answer Key
try {
  const originalQuestion = createMockQuestion({
    id: 'mcq-q1',
    topicGroupId: 'grp-test',
    topicGroupName: 'Test Group',
    lectureId: 'lec-test',
    lectureName: 'Test Lecture',
  });

  originalQuestion.options = [
    { id: 'opt-correct', text: 'Correct Answer', isCorrect: true },
    { id: 'opt-wrong-1', text: 'Wrong 1', isCorrect: false },
    { id: 'opt-wrong-2', text: 'Wrong 2', isCorrect: false },
    { id: 'opt-wrong-3', text: 'Wrong 3', isCorrect: false },
  ];

  const prepared = prepareQuestionsForShuffleExam([originalQuestion], true);
  const prepQ = prepared[0];

  assert(prepQ.options?.length === 4, 'Option count preserved (4 options)');
  const correctOpt = prepQ.options?.find((o) => o.isCorrect);
  assert(correctOpt !== undefined, 'Correct option exists');
  assert(correctOpt?.id === 'opt-correct', 'Correct option ID remained opt-correct');
  assert(correctOpt?.text === 'Correct Answer', 'Correct option text intact');
} catch (e) {
  console.error(e);
}

console.log(`\n========================================`);
console.log(`Tests Passed: ${passCount} | Tests Failed: ${failCount}`);
console.log(`========================================\n`);

if (failCount > 0) {
  process.exit(1);
}
