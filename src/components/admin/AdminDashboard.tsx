import React, { useState, useEffect } from 'react';
import {
  Plus,
  BookOpen,
  Settings,
  Archive,
  Copy,
  Trash2,
  Play,
  ArrowLeft,
  Clock,
  Layers,
  FolderPlus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  FileDown,
  Image as ImageIcon,
  Check,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';
import { db, deleteExamWithCascade, duplicateExam, duplicateQuestion, checkExamMissingImages } from '../../db';
import type { Exam, Subject, Question, ExamStatus } from '../../types';
import { SubjectModal } from './SubjectModal';
import { ExamModal } from './ExamModal';
import { QuestionEditorModal } from './QuestionEditorModal';
import { QuestionList } from './QuestionList';
import { exportExamToZip, downloadFile } from '../../services/packageService';
import { checkExamReadiness, type ExamReadinessResult } from '../../services/examValidation';

interface AdminDashboardProps {
  onLaunchExamSimulator: (examId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onNavigateToMissingImages?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLaunchExamSimulator,
  onShowToast,
  onNavigateToMissingImages,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'review' | 'published'>('all');
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);

  // Missing images per exam map
  const [examMissingImages, setExamMissingImages] = useState<
    Record<string, Array<{ questionId: string; questionTitle: string; imageId: string }>>
  >({});

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);

  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Validation errors modal when publishing fails
  const [publishErrorsModal, setPublishErrorsModal] = useState<{
    examTitle: string;
    errors: string[];
    missingImages: Array<{ questionId: string; questionTitle: string; imageId: string }>;
  } | null>(null);

  // Load data
  const loadData = async () => {
    const allSubjects = await db.subjects.toArray();
    const allExams = await db.exams.toArray();
    setSubjects(allSubjects);
    setExams(allExams);

    // Scan missing images for each exam
    const missingMap: Record<string, Array<{ questionId: string; questionTitle: string; imageId: string }>> = {};
    for (const ex of allExams) {
      missingMap[ex.id] = await checkExamMissingImages(ex.id);
    }
    setExamMissingImages(missingMap);

    if (selectedExamId) {
      const examQuestions = await db.questions
        .where('examId')
        .equals(selectedExamId)
        .sortBy('orderIndex');
      setQuestions(examQuestions);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedExamId]);

  const activeExam = exams.find((e) => e.id === selectedExamId);
  const activeExamMissing = selectedExamId ? examMissingImages[selectedExamId] || [] : [];

  // Subject Handlers
  const handleSaveSubject = async (subject: Subject) => {
    await db.subjects.put(subject);
    await loadData();
    onShowToast(`Subject "${subject.name}" saved successfully`);
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const subjectExams = await db.exams.where('subjectId').equals(subjectId).count();
    if (subjectExams > 0) {
      if (!confirm(`This subject contains ${subjectExams} exams. Deleting it will also delete those exams. Proceed?`)) {
        return;
      }
      const examsToDelete = await db.exams.where('subjectId').equals(subjectId).toArray();
      for (const ex of examsToDelete) {
        await deleteExamWithCascade(ex.id);
      }
    } else {
      if (!confirm('Are you sure you want to delete this subject?')) return;
    }

    await db.subjects.delete(subjectId);
    if (selectedSubjectId === subjectId) setSelectedSubjectId('all');
    await loadData();
    onShowToast('Subject deleted', 'info');
  };

  // Exam Handlers
  const handleSaveExam = async (exam: Exam) => {
    await db.exams.put(exam);
    await loadData();
    onShowToast(`Exam "${exam.title}" saved successfully`);
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam and all its stations?')) return;
    await deleteExamWithCascade(examId);
    if (selectedExamId === examId) setSelectedExamId(null);
    await loadData();
    onShowToast('Exam deleted and unreferenced images cleaned up', 'info');
  };

  const handleDuplicateExam = async (examId: string) => {
    try {
      const newId = await duplicateExam(examId);
      await loadData();
      onShowToast('Exam duplicated with all stations as Draft', 'success');
      setSelectedExamId(newId);
    } catch (err: unknown) {
      onShowToast((err as Error).message, 'error');
    }
  };

  const handleExportExam = async (examId: string) => {
    try {
      onShowToast('Packaging exam ZIP archive...', 'info');
      const { blob, fileName, missingImagesCount } = await exportExamToZip(examId);
      downloadFile(blob, fileName);
      if (missingImagesCount > 0) {
        onShowToast(`Exam exported with ${missingImagesCount} missing images flagged in manifest`, 'info');
      } else {
        onShowToast(`Exam exported as ${fileName}`, 'success');
      }
    } catch (err: unknown) {
      onShowToast(`Export failed: ${(err as Error).message}`, 'error');
    }
  };

  // Status Lifecycle Transitions with Validation Guard
  const handleChangeExamStatus = async (exam: Exam, newStatus: ExamStatus) => {
    if (newStatus === exam.status) return;

    if (newStatus === 'published') {
      const readiness = await checkExamReadiness(exam.id);
      if (!readiness.canPublish) {
        setPublishErrorsModal({
          examTitle: exam.title,
          errors: readiness.validationErrors,
          missingImages: readiness.missingImageDetails,
        });
        return;
      }
    }

    await db.exams.update(exam.id, {
      status: newStatus,
      updatedAt: Date.now(),
    });
    await loadData();

    const labelMap: Record<ExamStatus, string> = {
      draft: 'Draft',
      review: 'Needs Review',
      published: 'Published',
    };
    onShowToast(`Exam status updated to "${labelMap[newStatus]}"`, 'success');
  };

  const handleAttemptLaunchSimulator = async (examId: string) => {
    const readiness = await checkExamReadiness(examId);
    if (!readiness.canStart) {
      setPublishErrorsModal({
        examTitle: exams.find((e) => e.id === examId)?.title || 'Exam',
        errors: readiness.validationErrors.filter((e) => e.includes('image') || e.includes('station')),
        missingImages: readiness.missingImageDetails,
      });
      return;
    }
    onLaunchExamSimulator(examId);
  };

  // Question Handlers
  const handleSaveQuestion = async (question: Question) => {
    await db.questions.put(question);
    if (selectedExamId) {
      const updated = await db.questions.where('examId').equals(selectedExamId).sortBy('orderIndex');
      setQuestions(updated);
    }
    await loadData();
    onShowToast('Station saved successfully');
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Delete this station?')) return;
    await db.questions.delete(questionId);
    if (selectedExamId) {
      const updated = await db.questions.where('examId').equals(selectedExamId).sortBy('orderIndex');
      for (let i = 0; i < updated.length; i++) {
        if (updated[i].orderIndex !== i) {
          await db.questions.update(updated[i].id, { orderIndex: i });
          updated[i].orderIndex = i;
        }
      }
      setQuestions(updated);
    }
    await loadData();
    onShowToast('Station removed', 'info');
  };

  const handleDuplicateQuestion = async (questionId: string) => {
    await duplicateQuestion(questionId);
    if (selectedExamId) {
      const updated = await db.questions.where('examId').equals(selectedExamId).sortBy('orderIndex');
      setQuestions(updated);
    }
    await loadData();
    onShowToast('Station duplicated');
  };

  const handleReorderQuestion = async (fromIdx: number, toIdx: number) => {
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= questions.length || toIdx >= questions.length) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    for (let i = 0; i < reordered.length; i++) {
      reordered[i].orderIndex = i;
      await db.questions.update(reordered[i].id, { orderIndex: i });
    }
    setQuestions(reordered);
  };

  // Filter exams by Subject and Status
  const filteredExams = exams.filter((exam) => {
    if (selectedSubjectId !== 'all' && exam.subjectId !== selectedSubjectId) {
      return false;
    }
    if (statusFilter !== 'all' && (exam.status || 'draft') !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* If managing stations inside a specific exam */}
      {selectedExamId && activeExam ? (
        <div className="space-y-6">
          {/* Breadcrumb & Navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedExamId(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Exams</span>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{activeExam.title}</h2>
                  <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                    {activeExam.code}
                  </span>
                  {/* Status Badge */}
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      activeExam.status === 'published'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : activeExam.status === 'review'
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}
                  >
                    {activeExam.status === 'published'
                      ? 'Published'
                      : activeExam.status === 'review'
                      ? 'Needs Review'
                      : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {subjects.find((s) => s.id === activeExam.subjectId)?.name} · {questions.length} stations
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Status Selector */}
              <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 text-xs shadow-2xs">
                {(['draft', 'review', 'published'] as ExamStatus[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleChangeExamStatus(activeExam, st)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                      activeExam.status === st
                        ? st === 'published'
                          ? 'bg-emerald-600 dark:bg-emerald-600 text-white font-bold'
                          : st === 'review'
                          ? 'bg-indigo-600 dark:bg-indigo-600 text-white font-bold'
                          : 'bg-amber-600 dark:bg-amber-600 text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    {st === 'published' ? 'Published' : st === 'review' ? 'Review' : 'Draft'}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setEditingExam(activeExam);
                  setIsExamModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => handleExportExam(activeExam.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export ZIP</span>
              </button>

              <button
                onClick={() => handleAttemptLaunchSimulator(activeExam.id)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all shadow-xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Launch Simulator</span>
              </button>
            </div>
          </div>

          {/* Missing Images Banner in Exam Station View */}
          {activeExamMissing.length > 0 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950 dark:text-amber-200 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold block">
                    {activeExamMissing.length} Station Specimen Images Missing
                  </span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300">
                    Stations requiring images cannot run in the simulator until slides are attached.
                  </p>
                </div>
              </div>

              {onNavigateToMissingImages && (
                <button
                  onClick={onNavigateToMissingImages}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all shrink-0 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Attach Images in Manager</span>
                </button>
              )}
            </div>
          )}

          {/* Stations List */}
          <QuestionList
            questions={questions}
            onAddQuestion={() => {
              setEditingQuestion(null);
              setIsQuestionModalOpen(true);
            }}
            onEditQuestion={(q) => {
              setEditingQuestion(q);
              setIsQuestionModalOpen(true);
            }}
            onDuplicateQuestion={handleDuplicateQuestion}
            onDeleteQuestion={handleDeleteQuestion}
            onReorderQuestion={handleReorderQuestion}
          />
        </div>
      ) : (
        /* Overview: Subjects & Exam Library */
        <div className="space-y-8">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
                Medical Authoring Studio
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Design custom OSPE rotations, upload specimen slides, and manage exam lifecycle
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setEditingSubject(null);
                  setIsSubjectModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>New Subject</span>
              </button>
              <button
                disabled={subjects.length === 0}
                onClick={() => {
                  setEditingExam(null);
                  setIsExamModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Practical Exam</span>
              </button>
            </div>
          </div>

          {/* Dual Filters Row: Subject + Lifecycle Status */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-2">
            {/* Subject Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
              <button
                onClick={() => setSelectedSubjectId('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  selectedSubjectId === 'all'
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                }`}
              >
                All Subjects ({exams.length})
              </button>
              {subjects.map((subj) => {
                const count = exams.filter((e) => e.subjectId === subj.id).length;
                const isSelected = selectedSubjectId === subj.id;
                return (
                  <button
                    key={subj.id}
                    onClick={() => setSelectedSubjectId(subj.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: subj.color || '#7c3aed' }}
                    />
                    <span>{subj.name}</span>
                    <span className="opacity-75 font-mono text-[11px]">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Lifecycle Status Filter */}
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shrink-0 self-end md:self-auto">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Statuses
              </button>
              <button
                onClick={() => setStatusFilter('draft')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'draft' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-200 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Draft
              </button>
              <button
                onClick={() => setStatusFilter('review')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'review' ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Needs Review
              </button>
              <button
                onClick={() => setStatusFilter('published')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer ${
                  statusFilter === 'published' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 shadow-2xs font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Published
              </button>
            </div>
          </div>

          {/* Exam Cards Grid */}
          {filteredExams.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-850 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
              <Layers className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No practical exams found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No examinations match your current subject or status filters.
              </p>
              {subjects.length > 0 && (
                <button
                  onClick={() => {
                    setEditingExam(null);
                    setIsExamModalOpen(true);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all inline-flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Practical Exam</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
                const subject = subjects.find((s) => s.id === exam.subjectId);
                const missingList = examMissingImages[exam.id] || [];
                const hasMissing = missingList.length > 0;

                return (
                  <div
                    key={exam.id}
                    className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700/80 rounded-xl overflow-hidden shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between"
                  >
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                          {subject?.code || 'MEDICAL'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-mono font-medium px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                            {exam.code}
                          </span>
                          {/* Lifecycle Status Badge */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              exam.status === 'published'
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : exam.status === 'review'
                                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {exam.status === 'published'
                              ? 'Published'
                              : exam.status === 'review'
                              ? 'Needs Review'
                              : 'Draft'}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">
                        {exam.title}
                      </h3>

                      {exam.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {exam.description}
                        </p>
                      )}

                      {/* Missing Images Alert Card on Exam Tile */}
                      {hasMissing && (
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg flex items-center justify-between gap-2 text-xs text-amber-950 dark:text-amber-200">
                          <span className="flex items-center gap-1.5 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <span>{missingList.length} Missing Image{missingList.length > 1 ? 's' : ''}</span>
                          </span>
                          {onNavigateToMissingImages && (
                            <button
                              onClick={onNavigateToMissingImages}
                              className="text-[10px] text-purple-700 dark:text-purple-400 underline font-semibold hover:text-purple-800 dark:hover:text-purple-300 cursor-pointer"
                            >
                              Attach Assets →
                            </button>
                          )}
                        </div>
                      )}

                      {/* Meta stats */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span>{exam.stationDurationSeconds}s/station</span>
                        </span>
                        <span>·</span>
                        <span className="capitalize">{exam.timingMode.replace('_', ' ')}</span>
                        <span>·</span>
                        <span>Pass: {exam.passingScorePercent}%</span>
                      </div>
                    </div>

                    {/* Bottom Actions Bar */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedExamId(exam.id)}
                          className="px-2.5 py-1 text-xs font-bold text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
                        >
                          Stations →
                        </button>

                        {/* Quick Status Toggle Button */}
                        <button
                          onClick={() => {
                            const next: ExamStatus =
                              exam.status === 'draft'
                                ? 'review'
                                : exam.status === 'review'
                                ? 'published'
                                : 'draft';
                            handleChangeExamStatus(exam, next);
                          }}
                          title="Click to advance status: Draft → Review → Published"
                          className="px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md transition-colors cursor-pointer"
                        >
                          Next: {exam.status === 'draft' ? 'Review' : exam.status === 'review' ? 'Publish' : 'Draft'}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExportExam(exam.id)}
                          title="Export Exam ZIP"
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDuplicateExam(exam.id)}
                          title="Duplicate Exam"
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingExam(exam);
                            setIsExamModalOpen(true);
                          }}
                          title="Exam Settings"
                          className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-md transition-colors cursor-pointer"
                        >
                          <Settings className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteExam(exam.id)}
                          title="Delete Exam"
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAttemptLaunchSimulator(exam.id)}
                          title={hasMissing ? 'Cannot launch: missing specimen images' : 'Launch in Simulator'}
                          className={`p-1.5 rounded-md transition-colors ml-1 cursor-pointer ${
                            hasMissing
                              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                              : 'text-purple-700 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-950/50'
                          }`}
                        >
                          <Play className={`w-4 h-4 ${hasMissing ? 'fill-slate-300 dark:fill-slate-600' : 'fill-purple-700 dark:fill-purple-400'}`} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Validation / Publishing Errors Modal */}
      {publishErrorsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Exam Publishing Blocked</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  "{publishErrorsModal.examTitle}" does not satisfy medical examination standards.
                </p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 rounded-lg text-xs text-rose-950 dark:text-rose-200 space-y-2 max-h-60 overflow-y-auto">
              <span className="font-bold block">Please resolve the following issues:</span>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-900 dark:text-rose-300">
                {publishErrorsModal.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>

            {publishErrorsModal.missingImages.length > 0 && onNavigateToMissingImages && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-600 dark:text-slate-400">
                  {publishErrorsModal.missingImages.length} missing specimen slide(s) detected.
                </span>
                <button
                  onClick={() => {
                    setPublishErrorsModal(null);
                    onNavigateToMissingImages();
                  }}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all shrink-0 shadow-2xs cursor-pointer"
                >
                  Open Missing Images Manager
                </button>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPublishErrorsModal(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Understood, Return to Editing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <SubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSave={handleSaveSubject}
        initialSubject={editingSubject}
      />

      <ExamModal
        isOpen={isExamModalOpen}
        onClose={() => setIsExamModalOpen(false)}
        onSave={handleSaveExam}
        subjects={subjects}
        initialExam={editingExam}
        defaultSubjectId={selectedSubjectId !== 'all' ? selectedSubjectId : undefined}
      />

      {selectedExamId && (
        <QuestionEditorModal
          isOpen={isQuestionModalOpen}
          onClose={() => setIsQuestionModalOpen(false)}
          onSave={handleSaveQuestion}
          examId={selectedExamId}
          initialQuestion={editingQuestion}
          totalQuestionsCount={questions.length}
        />
      )}
    </div>
  );
};
