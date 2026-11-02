import {
  calculateSelfGradingScore,
  getUngradedQuestionIds,
  createInitialSelfGradingSession,
  finalizeSelfGradingAttempt,
} from './selfGradingService';
import type { Question, Exam, SelfGradeValue, SelfGradingSession, ExamAttempt } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('--- Running Student Self-Grading System Tests ---');

// Mock Exam
const mockExam: Exam = {
  id: 'exam-upper-limb-01',
  subjectId: 'sub-anatomy',
  title: 'Upper Limb Anatomy OSPE',
  code: 'ANAT-UL-01',
  description: 'Upper limb practical spotter stations',
  status: 'published',
  timingMode: 'bell_ring',
  totalDurationMinutes: 15,
  stationDurationSeconds: 90,
  passingScorePercent: 60,
  createdAt: 1000,
  updatedAt: 1000,
};

// 4 Mock Questions (Points: 1, 1, 1, 1 => Max score: 4)
const mockQuestions: Question[] = [
  {
    id: 'q1',
    examId: 'exam-upper-limb-01',
    orderIndex: 0,
    type: 'spotter',
    questionText: 'Identify the pinned nerve in the cubital fossa.',
    acceptableAnswers: ['Median nerve', 'Nervus medianus'],
    referenceAnswer: 'Median nerve (C5-T1)',
    markingRubric: '1.0: Median nerve; 0.5: Identifies nerve but incorrect name; 0: Artery or vein',
    explanation: 'The median nerve lies medial to the brachial artery within the cubital fossa.',
    points: 1,
  },
  {
    id: 'q2',
    examId: 'exam-upper-limb-01',
    orderIndex: 1,
    type: 'spotter',
    questionText: 'Identify the muscle tendon inserting into the radial tuberosity.',
    acceptableAnswers: ['Biceps brachii tendon', 'Biceps tendon'],
    referenceAnswer: 'Biceps brachii tendon',
    markingRubric: '1.0: Biceps tendon; 0.5: Biceps; 0: Brachialis',
    explanation: 'The biceps brachii tendon inserts into the posterior part of the radial tuberosity.',
    points: 1,
  },
  {
    id: 'q3',
    examId: 'exam-upper-limb-01',
    orderIndex: 2,
    type: 'image_mcq',
    questionText: 'Which cords of the brachial plexus contribute to the musculocutaneous nerve?',
    options: [
      { id: 'opt-a', text: 'Lateral cord only', isCorrect: true },
      { id: 'opt-b', text: 'Medial cord only', isCorrect: false },
      { id: 'opt-c', text: 'Posterior cord', isCorrect: false },
    ],
    referenceAnswer: 'Option A: Lateral cord only',
    explanation: 'The musculocutaneous nerve arises as the main terminal branch of the lateral cord (C5-C7).',
    points: 1,
  },
  {
    id: 'q4',
    examId: 'exam-upper-limb-01',
    orderIndex: 3,
    type: 'spotter',
    questionText: 'Identify the ligament spanning the carpal tunnel.',
    acceptableAnswers: ['Flexor retinaculum', 'Transverse carpal ligament'],
    referenceAnswer: 'Flexor retinaculum (Transverse carpal ligament)',
    explanation: 'Forms the roof of the carpal tunnel.',
    points: 1,
  },
];

// Test 1: Three Grade Values (1.0, 0.5, 0.0) Evaluation
console.log('Test 1: Evaluating all three explicit grade values (1.0, 0.5, 0.0)...');
{
  const grades: Record<string, SelfGradeValue> = {
    q1: 1,   // 1.0 Point: Fully correct
    q2: 0.5, // 0.5 Points: Partially correct
    q3: 0,   // 0.0 Points: Incorrect
    q4: 1,   // 1.0 Point: Fully correct
  };

  const result = calculateSelfGradingScore(mockQuestions, grades, 60);

  // Total = 1 + 0.5 + 0 + 1 = 2.5
  assert(result.totalScore === 2.5, `Expected totalScore 2.5, got ${result.totalScore}`);
  assert(result.maxScore === 4, `Expected maxScore 4, got ${result.maxScore}`);
  // Percentage = (2.5 / 4) * 100 = 62.5%
  assert(result.percentage === 62.5, `Expected percentage 62.5%, got ${result.percentage}%`);
  assert(result.fullyCorrectCount === 2, `Expected 2 fully correct, got ${result.fullyCorrectCount}`);
  assert(result.partiallyCorrectCount === 1, `Expected 1 partially correct, got ${result.partiallyCorrectCount}`);
  assert(result.incorrectCount === 1, `Expected 1 incorrect, got ${result.incorrectCount}`);
  assert(result.passed === true, `Expected passed=true (62.5% >= 60%), got ${result.passed}`);
  assert(result.isComplete === true, 'Expected isComplete=true when all 4 are graded');
  console.log('✓ Test 1 Passed: 1.0, 0.5, and 0.0 marks evaluated accurately.');
}

// Test 2: Incomplete Grading Detection
console.log('Test 2: Incomplete grading validation (unanswered/ungraded questions)...');
{
  const partialGrades: Record<string, SelfGradeValue> = {
    q1: 1,
    q2: 0.5,
    // q3 and q4 not yet evaluated
  };

  const result = calculateSelfGradingScore(mockQuestions, partialGrades, 60);
  const ungradedIds = getUngradedQuestionIds(mockQuestions, partialGrades);

  assert(result.isComplete === false, 'Expected isComplete=false when questions remain ungraded');
  assert(result.gradedCount === 2, `Expected gradedCount 2, got ${result.gradedCount}`);
  assert(result.ungradedCount === 2, `Expected ungradedCount 2, got ${result.ungradedCount}`);
  assert(ungradedIds.length === 2, `Expected 2 ungraded IDs, got ${ungradedIds.length}`);
  assert(ungradedIds.includes('q3') && ungradedIds.includes('q4'), 'Expected q3 and q4 in ungraded list');
  console.log('✓ Test 2 Passed: Incomplete grading correctly identifies remaining questions.');
}

// Test 3: Do Not Automatically Assign Grades or Assume Unanswered are Incorrect
console.log('Test 3: Verify no automatic grade assignment for unanswered questions...');
{
  const emptyGrades: Record<string, SelfGradeValue> = {};
  const result = calculateSelfGradingScore(mockQuestions, emptyGrades, 60);

  // With no grades assigned, totalScore is 0, gradedCount is 0, ungraded is 4
  assert(result.totalScore === 0, 'Score is 0 before grading');
  assert(result.gradedCount === 0, 'No questions are graded automatically');
  assert(result.ungradedCount === 4, 'All 4 questions remain pending explicit evaluation');
  assert(result.incorrectCount === 0, 'Unanswered questions are NOT automatically marked incorrect');
  console.log('✓ Test 3 Passed: System strictly requires candidate explicit evaluation.');
}

// Test 4: Passing and Failing Thresholds
console.log('Test 4: Passing and failing threshold verification...');
{
  // Score: 1 + 0.5 + 0 + 0 = 1.5 / 4 = 37.5% (< 60% standard)
  const failingGrades: Record<string, SelfGradeValue> = {
    q1: 1,
    q2: 0.5,
    q3: 0,
    q4: 0,
  };
  const failingResult = calculateSelfGradingScore(mockQuestions, failingGrades, 60);
  assert(failingResult.percentage === 37.5, `Expected 37.5%, got ${failingResult.percentage}`);
  assert(failingResult.passed === false, 'Expected passed=false for 37.5% < 60%');

  // Score: 1 + 1 + 1 + 1 = 4.0 / 4 = 100%
  const perfectGrades: Record<string, SelfGradeValue> = {
    q1: 1,
    q2: 1,
    q3: 1,
    q4: 1,
  };
  const perfectResult = calculateSelfGradingScore(mockQuestions, perfectGrades, 60);
  assert(perfectResult.percentage === 100, `Expected 100%, got ${perfectResult.percentage}`);
  assert(perfectResult.passed === true, 'Expected passed=true for 100%');
  console.log('✓ Test 4 Passed: Passing thresholds verified.');
}

// Test 5: Self-Grading Session Lifecycle & Persistence Structure
console.log('Test 5: Session initialization, update, and finalization lifecycle...');
{
  const answers = {
    q1: { questionId: 'q1', typedAnswer: 'Median nerve', isFlagged: false, timeSpentSeconds: 45 },
    q2: { questionId: 'q2', typedAnswer: 'Biceps', isFlagged: false, timeSpentSeconds: 60 },
  };

  // 1. Create fresh session
  const session = createInitialSelfGradingSession(mockExam, 'Anatomy', answers, 105);
  assert(Boolean(session.id), 'Session has unique ID');
  assert(session.isFinalized === false, 'Session starts unfinalized');
  assert(Object.keys(session.grades).length === 0, 'Session grades start empty');

  // 2. Candidate assigns grades during review
  session.grades['q1'] = 1;
  session.grades['q2'] = 0.5;
  session.grades['q3'] = 1;
  session.grades['q4'] = 1;
  session.revealedQuestions['q1'] = true;
  session.revealedQuestions['q2'] = true;

  // 3. Finalize attempt
  const finalizedAttempt = finalizeSelfGradingAttempt(session, mockQuestions, 60);
  assert(finalizedAttempt.id === session.id, 'Attempt preserves session ID');
  assert(finalizedAttempt.score === 3.5, `Expected score 3.5, got ${finalizedAttempt.score}`);
  assert(finalizedAttempt.maxScore === 4, `Expected maxScore 4, got ${finalizedAttempt.maxScore}`);
  assert(finalizedAttempt.percentage === 87.5, `Expected percentage 87.5%, got ${finalizedAttempt.percentage}`);
  assert(finalizedAttempt.passed === true, 'Expected passed=true');
  assert(finalizedAttempt.grades?.['q2'] === 0.5, 'Attempt retains grade map');
  console.log('✓ Test 5 Passed: Session lifecycle and attempt finalization verified.');
}

// Test 6: Retaking Examinations (New Independent Attempt)
console.log('Test 6: Independent retake attempts without overwriting previous history...');
{
  const history: ExamAttempt[] = [];

  // Attempt 1:
  const session1 = createInitialSelfGradingSession(mockExam, 'Anatomy', {}, 120);
  session1.grades = { q1: 0, q2: 0.5, q3: 0, q4: 0.5 }; // Total = 1.0 (25%)
  const attempt1 = finalizeSelfGradingAttempt(session1, mockQuestions, 60);
  history.push(attempt1);

  // Attempt 2 (Retake):
  const session2 = createInitialSelfGradingSession(mockExam, 'Anatomy', {}, 110);
  session2.grades = { q1: 1, q2: 1, q3: 1, q4: 0.5 }; // Total = 3.5 (87.5%)
  const attempt2 = finalizeSelfGradingAttempt(session2, mockQuestions, 60);
  history.push(attempt2);

  assert(history.length === 2, 'History retains both attempts');
  assert(attempt1.id !== attempt2.id, 'Attempts have distinct unique IDs');
  assert(attempt1.score === 1.0, 'First attempt score preserved in history');
  assert(attempt2.score === 3.5, 'Second attempt has independent score');
  console.log('✓ Test 6 Passed: Retake creates new independent attempt while retaining history.');
}

console.log('\n--- All Student Self-Grading Tests Passed Successfully! ---');
