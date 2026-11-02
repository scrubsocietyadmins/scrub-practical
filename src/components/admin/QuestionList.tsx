import React from 'react';
import {
  Plus,
  Edit2,
  Copy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Crosshair,
  FileText,
  Clock,
  Award,
} from 'lucide-react';
import type { Question, QuestionType } from '../../types';

interface QuestionListProps {
  questions: Question[];
  onAddQuestion: () => void;
  onEditQuestion: (question: Question) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  onReorderQuestion: (fromIndex: number, toIndex: number) => void;
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  onAddQuestion,
  onEditQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
  onReorderQuestion,
}) => {
  const getTypeBadge = (type: QuestionType) => {
    switch (type) {
      case 'spotter':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-900 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
            <Crosshair className="w-3 h-3 text-purple-700 dark:text-purple-400" />
            <span>Spotter Station</span>
          </span>
        );
      case 'image_mcq':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
            <ImageIcon className="w-3 h-3 text-blue-700 dark:text-blue-400" />
            <span>Image MCQ</span>
          </span>
        );
      case 'clinical_mcq':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
            <FileText className="w-3 h-3 text-amber-700 dark:text-amber-400" />
            <span>Clinical Vignette</span>
          </span>
        );
      case 'text_mcq':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
            <FileText className="w-3 h-3 text-slate-600 dark:text-slate-400" />
            <span>Text MCQ</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Exam Stations ({questions.length})
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Stations are presented to candidates in this order during the practical examination
          </p>
        </div>

        <button
          onClick={onAddQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Station</span>
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-850 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <Crosshair className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">No stations created yet</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
            Add spotters, gross pathology specimens, or clinical MCQs to this exam.
          </p>
          <button
            onClick={onAddQuestion}
            className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all cursor-pointer"
          >
            Create Station 1
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 dark:hover:border-slate-600 transition-colors shadow-2xs"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {q.title || `Station ${idx + 1}`}
                    </span>
                    {getTypeBadge(q.type)}
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                      · {q.points || 1} {q.points === 1 ? 'mark' : 'marks'}
                    </span>
                    {q.stationDurationSeconds && (
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{q.stationDurationSeconds}s</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">{q.questionText}</p>

                  {q.type === 'spotter' && q.spotterPin && (
                    <p className="text-[11px] text-purple-700 dark:text-purple-400 font-mono">
                      Pinned {q.spotterPin.label || 'pointer'} at ({q.spotterPin.x}%, {q.spotterPin.y}%)
                    </p>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                {/* Reorder Buttons */}
                <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5 mr-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => onReorderQuestion(idx, idx - 1)}
                    title="Move station earlier"
                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-slate-500 rounded cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === questions.length - 1}
                    onClick={() => onReorderQuestion(idx, idx + 1)}
                    title="Move station later"
                    className="p-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:hover:text-slate-500 rounded cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => onEditQuestion(q)}
                  title="Edit Station"
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDuplicateQuestion(q.id)}
                  title="Duplicate Station"
                  className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteQuestion(q.id)}
                  title="Delete Station"
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
