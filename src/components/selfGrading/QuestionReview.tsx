import React, { useState } from 'react';
import {
  Check,
  Slash,
  X,
  Sparkles,
  User,
  FileCheck2,
  FileText,
} from 'lucide-react';
import type { Question, StudentStationAnswer, SelfGradeValue } from '../../types';
import { SpecimenViewer } from '../common/SpecimenViewer';

interface QuestionReviewProps {
  questions: Question[];
  answers: Record<string, StudentStationAnswer>;
  grades: Record<string, SelfGradeValue>;
  imageUrls: Record<string, string | null>;
}

export const QuestionReview: React.FC<QuestionReviewProps> = ({
  questions,
  answers,
  grades,
  imageUrls,
}) => {
  const [filter, setFilter] = useState<'all' | 'full' | 'partial' | 'incorrect'>('all');

  const filteredQuestions = questions.filter((q) => {
    const grade = grades[q.id];
    if (filter === 'full') return grade === 1;
    if (filter === 'partial') return grade === 0.5;
    if (filter === 'incorrect') return grade === 0;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <span>Comprehensive Question Evaluation Review</span>
            <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
              ({filteredQuestions.length} of {questions.length} stations)
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Side-by-side comparison of candidate submissions against designated reference criteria
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-purple-700 dark:bg-purple-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All Stations ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('full')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              filter === 'full'
                ? 'bg-emerald-700 dark:bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Fully Correct</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('partial')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              filter === 'partial'
                ? 'bg-amber-700 dark:bg-amber-600 text-white'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 border border-amber-200 dark:border-amber-800'
            }`}
          >
            <Slash className="w-3 h-3 stroke-[2.5]" />
            <span>Partially Correct</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('incorrect')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer ${
              filter === 'incorrect'
                ? 'bg-rose-700 dark:bg-rose-600 text-white'
                : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-800'
            }`}
          >
            <X className="w-3 h-3 stroke-[3]" />
            <span>Incorrect</span>
          </button>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-6">
        {filteredQuestions.map((q, idx) => {
          const ans = answers[q.id];
          const grade = grades[q.id];
          const maxPts = q.points || 1;
          const pointsAwarded = grade !== undefined ? Math.round(grade * maxPts * 10) / 10 : 0;
          const imageUrl = q.imageId ? imageUrls[q.imageId] : null;

          // Resolve student's answer text
          let studentAnswerText = 'No response submitted';
          if (ans) {
            if (ans.selectedOptionId && q.options) {
              const opt = q.options.find((o) => o.id === ans.selectedOptionId);
              const optIndex = q.options.findIndex((o) => o.id === ans.selectedOptionId);
              const letter = optIndex >= 0 ? String.fromCharCode(65 + optIndex) : '';
              studentAnswerText = opt ? `Option ${letter}: ${opt.text}` : 'Option selected';
            } else if (ans.typedAnswer && ans.typedAnswer.trim()) {
              studentAnswerText = ans.typedAnswer.trim();
            }
          }

          // Resolve reference answer text
          const correctOpt = q.options?.find((o) => o.isCorrect);
          const correctLetter = q.options
            ? String.fromCharCode(65 + Math.max(0, q.options.findIndex((o) => o.isCorrect)))
            : '';
          const acceptable = q.acceptableAnswers || [];
          const referenceText =
            q.referenceAnswer ||
            (acceptable.length > 0 ? acceptable.join(' / ') : '') ||
            (correctOpt ? `Option ${correctLetter}: ${correctOpt.text}` : 'No key specified');

          return (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden transition-colors"
            >
              {/* Question Header & Awarded Mark Badge */}
              <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-purple-950 dark:bg-purple-900 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {q.orderIndex !== undefined ? q.orderIndex + 1 : idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                        {q.type.replace('_', ' ')}
                      </span>
                      {q.title && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">&bull; {q.title}</span>
                      )}
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {q.questionText}
                    </h4>
                  </div>
                </div>

                {/* Self-Assigned Awarded Grade Badge */}
                <div className="shrink-0">
                  {grade === 1 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800 font-bold text-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-700 dark:text-emerald-400" />
                      <span>Awarded: {pointsAwarded} / {maxPts} pt{maxPts !== 1 ? 's' : ''} (Fully Correct)</span>
                    </div>
                  )}
                  {grade === 0.5 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800 font-bold text-xs">
                      <Slash className="w-3.5 h-3.5 stroke-[2.5] text-amber-700 dark:text-amber-400" />
                      <span>Awarded: {pointsAwarded} / {maxPts} pt{maxPts !== 1 ? 's' : ''} (Partially Correct)</span>
                    </div>
                  )}
                  {grade === 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-950 dark:text-rose-200 border border-rose-300 dark:border-rose-800 font-bold text-xs">
                      <X className="w-3.5 h-3.5 stroke-[3] text-rose-700 dark:text-rose-400" />
                      <span>Awarded: 0 / {maxPts} pt{maxPts !== 1 ? 's' : ''} (Incorrect)</span>
                    </div>
                  )}
                  {grade === undefined && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700 text-xs">
                      <span>Ungraded</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Body: Specimen & Side-by-Side Comparison */}
              <div className="p-4 sm:p-6 space-y-5">
                {/* Specimen Viewer if linked */}
                {imageUrl && (
                  <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-black">
                    <SpecimenViewer
                      imageUrl={imageUrl}
                      spotterPin={q.spotterPin}
                      altText={q.title || 'Specimen slide'}
                      className="w-full h-full"
                    />
                  </div>
                )}

                {/* Side-by-Side: Student Answer vs Reference Answer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Student's Answer */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-800/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Candidate Submitted Answer:</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                      {studentAnswerText}
                    </div>
                  </div>

                  {/* Official Reference Answer */}
                  <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">
                      <FileCheck2 className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400" />
                      <span>Official Reference Answer:</span>
                    </div>
                    <div className="text-sm font-semibold text-indigo-950 dark:text-indigo-100 font-mono bg-white dark:bg-slate-900 p-3 rounded-lg border border-indigo-200 dark:border-indigo-900/60">
                      {referenceText}
                    </div>
                  </div>
                </div>

                {/* Optional Marking Rubric */}
                {q.markingRubric && (
                  <div className="p-3.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-1 text-xs">
                    <span className="font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Marking Rubric:</span>
                    </span>
                    <p className="text-amber-950 dark:text-amber-200 whitespace-pre-line leading-relaxed font-sans">
                      {q.markingRubric}
                    </p>
                  </div>
                )}

                {/* Clinical Explanation */}
                {q.explanation && (
                  <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                      <span>Clinical &amp; Anatomical Explanation:</span>
                    </span>
                    <p className="text-slate-700 dark:text-slate-300 font-serif leading-relaxed">{q.explanation}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
