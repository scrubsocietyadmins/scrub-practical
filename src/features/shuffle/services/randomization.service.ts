import type { Question } from '../../../types';
import { fisherYatesShuffle } from '../utils/fisher-yates';

/**
 * Prepares questions for a shuffle exam session.
 * Reassigns 0-indexed orderIndex and optionally shuffles MCQ choices
 * while keeping all answer keys, rubrics, and spotter pins untouched.
 */
export function prepareQuestionsForShuffleExam(
  questions: readonly Question[],
  randomizeOptions: boolean = false,
  rng: () => number = Math.random
): Question[] {
  return questions.map((q, index) => {
    let options = q.options;
    if (randomizeOptions && options && options.length > 1) {
      options = fisherYatesShuffle(options, rng);
    }

    return {
      ...q,
      orderIndex: index,
      options,
    };
  });
}
