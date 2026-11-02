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
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
            <Crosshair className="w-3 h-3 text-rose-700" />
            <span>Spotter Station</span>
          </span>
        );
      case 'image_mcq':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            <ImageIcon className="w-3 h-3 text-blue-700" />
            <span>Image MCQ</span>
          </span>
        );
      case 'clinical_mcq':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <FileText className="w-3 h-3 text-amber-700" />
            <span>Clinical Vignette</span>
          </span>
        );
      case 'text_mcq':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            <FileText className="w-3 h-3 text-slate-600" />
            <span>Text MCQ</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Exam Stations ({questions.length})
          </h3>
          <p className="text-xs text-slate-500">
            Stations are presented to candidates in this order during the practical examination
          </p>
        </div>

        <button
          onClick={onAddQuestion}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-rose-950 hover:bg-rose-900 rounded-lg transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Station</span>
        </button>
      </div>

      {questions.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-xl border border-dashed border-slate-300">
          <Crosshair className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">No stations created yet</p>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Add spotters, gross pathology specimens, or clinical MCQs to this exam.
          </p>
          <button
            onClick={onAddQuestion}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-950 rounded-lg hover:bg-rose-900"
          >
            Create Station 1
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-slate-300 transition-colors shadow-2xs"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                  {idx + 1}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900">
                      {q.title || `Station ${idx + 1}`}
                    </span>
                    {getTypeBadge(q.type)}
                    <span className="text-[11px] text-slate-400 font-mono">
                      · {q.points || 1} {q.points === 1 ? 'mark' : 'marks'}
                    </span>
                    {q.stationDurationSeconds && (
                      <span className="text-[11px] text-slate-400 font-mono flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />
                        <span>{q.stationDurationSeconds}s</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-1">{q.questionText}</p>

                  {q.type === 'spotter' && q.spotterPin && (
                    <p className="text-[11px] text-rose-800/80 font-mono">
                      Pinned {q.spotterPin.label || 'pointer'} at ({q.spotterPin.x}%, {q.spotterPin.y}%)
                    </p>
                  )}
                </div>
              </div>

              {/* Action Controls */}
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                {/* Reorder Buttons */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg p-0.5 mr-1">
                  <button
                    disabled={idx === 0}
                    onClick={() => onReorderQuestion(idx, idx - 1)}
                    title="Move station earlier"
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 rounded"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    disabled={idx === questions.length - 1}
                    onClick={() => onReorderQuestion(idx, idx + 1)}
                    title="Move station later"
                    className="p-1 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500 rounded"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => onEditQuestion(q)}
                  title="Edit Station"
                  className="p-1.5 text-slate-600 hover:text-rose-950 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDuplicateQuestion(q.id)}
                  title="Duplicate Station"
                  className="p-1.5 text-slate-600 hover:text-rose-950 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteQuestion(q.id)}
                  title="Delete Station"
                  className="p-1.5 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
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
