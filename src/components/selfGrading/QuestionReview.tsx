import React, { useState } from 'react';
import {
  Check,
  Slash,
  X,
  Sparkles,
  User,
  FileCheck2,
  FileText,
  Filter,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <span>Comprehensive Question Evaluation Review</span>
            <span className="text-xs font-mono font-normal text-slate-500">
              ({filteredQuestions.length} of {questions.length} stations)
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Side-by-side comparison of candidate submissions against designated reference criteria
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Stations ({questions.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('full')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              filter === 'full'
                ? 'bg-emerald-700 text-white'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <Check className="w-3 h-3 stroke-[3]" />
            <span>Fully Correct</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('partial')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              filter === 'partial'
                ? 'bg-amber-700 text-white'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Slash className="w-3 h-3 stroke-[2.5]" />
            <span>Partially Correct</span>
          </button>
          <button
            type="button"
            onClick={() => setFilter('incorrect')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
              filter === 'incorrect'
                ? 'bg-rose-700 text-white'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
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
          const answer = answers[q.id];
          const grade = grades[q.id];
          const imageUrl = imageUrls[q.imageId || ''];

          // Determine Student Answer text
          let studentAnswerText = 'No answer submitted (blank)';
          if (answer) {
            if (answer.typedAnswer && answer.typedAnswer.trim()) {
              studentAnswerText = answer.typedAnswer.trim();
            } else if (answer.selectedOptionId && q.options) {
              const selectedOpt = q.options.find((o) => o.id === answer.selectedOptionId);
              const optIndex = q.options.findIndex((o) => o.id === answer.selectedOptionId);
              const letter = optIndex >= 0 ? String.fromCharCode(65 + optIndex) : '';
              studentAnswerText = selectedOpt
                ? `Option ${letter}: ${selectedOpt.text}`
                : 'Unknown option selected';
            }
          }

          // Determine Reference Answer text
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
              className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden"
            >
              {/* Question Header & Awarded Mark Badge */}
              <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-rose-950 text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                    {q.orderIndex !== undefined ? q.orderIndex + 1 : idx + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-900">
                        {q.type.replace('_', ' ')}
                      </span>
                      {q.title && (
                        <span className="text-xs text-slate-500 font-semibold">&bull; {q.title}</span>
                      )}
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5">
                      {q.questionText}
                    </h4>
                  </div>
                </div>

                {/* Self-Assigned Awarded Grade Badge */}
                <div className="shrink-0">
                  {grade === 1 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-950 border border-emerald-300 font-bold text-xs">
                      <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-700" />
                      <span>Awarded: 1.0 / {q.points || 1} pt (Fully Correct)</span>
                    </div>
                  )}
                  {grade === 0.5 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-950 border border-amber-300 font-bold text-xs">
                      <Slash className="w-3.5 h-3.5 stroke-[2.5] text-amber-700" />
                      <span>Awarded: 0.5 / {q.points || 1} pt (Partially Correct)</span>
                    </div>
                  )}
                  {grade === 0 && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-950 border border-rose-300 font-bold text-xs">
                      <X className="w-3.5 h-3.5 stroke-[3] text-rose-700" />
                      <span>Awarded: 0.0 / {q.points || 1} pt (Incorrect)</span>
                    </div>
                  )}
                  {grade === undefined && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-300 text-xs">
                      <span>Ungraded</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Body: Specimen & Side-by-Side Comparison */}
              <div className="p-4 sm:p-6 space-y-5">
                {/* Specimen Viewer if linked */}
                {imageUrl && (
                  <div className="h-64 sm:h-80 w-full rounded-xl overflow-hidden border border-slate-200 bg-black">
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
                  <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Candidate Submitted Answer:</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 font-mono bg-white p-3 rounded-lg border border-slate-200">
                      {studentAnswerText}
                    </div>
                  </div>

                  {/* Official Reference Answer */}
                  <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/60 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900 uppercase tracking-wider">
                      <FileCheck2 className="w-3.5 h-3.5 text-teal-700" />
                      <span>Official Reference Answer:</span>
                    </div>
                    <div className="text-sm font-semibold text-teal-950 font-mono bg-white p-3 rounded-lg border border-teal-200">
                      {referenceText}
                    </div>
                  </div>
                </div>

                {/* Optional Marking Rubric */}
                {q.markingRubric && (
                  <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 space-y-1 text-xs">
                    <span className="font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Marking Rubric:</span>
                    </span>
                    <p className="text-amber-950 whitespace-pre-line leading-relaxed font-sans">
                      {q.markingRubric}
                    </p>
                  </div>
                )}

                {/* Clinical Explanation */}
                {q.explanation && (
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs">
                    <span className="font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-950" />
                      <span>Clinical &amp; Anatomical Explanation:</span>
                    </span>
                    <p className="text-slate-700 font-serif leading-relaxed">{q.explanation}</p>
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
