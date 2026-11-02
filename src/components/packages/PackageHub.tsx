import React, { useState, useEffect } from 'react';
import {
  Archive,
  Upload,
  FileDown,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  FolderArchive,
  Database,
  Layers,
  Image as ImageIcon,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { db, resetDatabaseToDefaults } from '../../db';
import type { Exam, Subject, InspectionSummary } from '../../types';
import {
  inspectZipPackage,
  commitZipPackageImport,
  exportExamToZip,
  downloadFile,
  exportFullDatabaseBackup,
  importFullDatabaseBackup,
  type PackageConflictInfo,
  type InspectedZipPackage,
} from '../../services/packageService';
import { MissingImagesManager } from './MissingImagesManager';

interface PackageHubProps {
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  initialTab?: 'packages' | 'missing_images' | 'backup';
}

export const PackageHub: React.FC<PackageHubProps> = ({
  onShowToast,
  initialTab = 'packages',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'packages' | 'missing_images' | 'backup'>(initialTab);
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questionCounts, setQuestionCounts] = useState<Record<string, number>>({});
  const [missingImagesCount, setMissingImagesCount] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Inspected Package Modal State
  const [inspectedPackage, setInspectedPackage] = useState<InspectedZipPackage | null>(null);
  const [deleteAttemptsOnOverwrite, setDeleteAttemptsOnOverwrite] = useState(false);

  // Full backup confirmation modal
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);

  const loadData = async () => {
    const allExams = await db.exams.toArray();
    const allSubjects = await db.subjects.toArray();
    const allImages = await db.images.toArray();
    const allQuestions = await db.questions.toArray();

    setExams(allExams);
    setSubjects(allSubjects);

    // Question counts
    const counts: Record<string, number> = {};
    for (const ex of allExams) {
      counts[ex.id] = await db.questions.where('examId').equals(ex.id).count();
    }
    setQuestionCounts(counts);

    // Calculate missing images count across the DB
    const referencedImageIds = new Set(allQuestions.map((q) => q.imageId).filter(Boolean));
    let missing = 0;
    for (const imgId of referencedImageIds) {
      const rec = allImages.find((i) => i.id === imgId);
      if (!rec || !rec.blob || rec.blob.size === 0 || rec.status === 'missing') {
        missing++;
      }
    }
    setMissingImagesCount(missing);
  };

  useEffect(() => {
    setActiveSubTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    loadData();
  }, [activeSubTab]);

  const handleProcessZipFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      onShowToast('Please provide a valid ZIP archive (.zip)', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      const inspected = await inspectZipPackage(file);
      setInspectedPackage(inspected);
    } catch (err: unknown) {
      onShowToast((err as Error).message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmImport = async (resolution: 'overwrite' | 'keep_both') => {
    if (!inspectedPackage) return;
    try {
      setIsProcessing(true);
      const result = await commitZipPackageImport(
        inspectedPackage.manifest,
        inspectedPackage.imageBlobMap,
        resolution,
        deleteAttemptsOnOverwrite
      );
      setInspectedPackage(null);
      await loadData();

      if (result.missingImagesCount > 0) {
        onShowToast(
          `Imported "${result.examTitle}" as Draft with ${result.missingImagesCount} missing images. Please attach them in Missing Images Manager.`,
          'info'
        );
      } else {
        onShowToast(
          `Imported "${result.examTitle}" (${result.questionCount} stations, ${result.availableImagesCount} images) successfully!`,
          'success'
        );
      }
    } catch (err: unknown) {
      onShowToast((err as Error).message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportExam = async (examId: string) => {
    try {
      onShowToast('Packaging exam ZIP archive and specimen images...', 'info');
      const { blob, fileName, missingImagesCount } = await exportExamToZip(examId);
      downloadFile(blob, fileName);
      if (missingImagesCount > 0) {
        onShowToast(`Exported "${fileName}" (${missingImagesCount} missing images flagged in manifest)`, 'info');
      } else {
        onShowToast(`Exported "${fileName}" successfully`, 'success');
      }
    } catch (err: unknown) {
      onShowToast(`Export failed: ${(err as Error).message}`, 'error');
    }
  };

  // Full Database Backup Handlers
  const handleExportFullBackup = async () => {
    try {
      onShowToast('Generating full database snapshot...', 'info');
      const { blob, fileName } = await exportFullDatabaseBackup();
      downloadFile(blob, fileName);
      onShowToast(`Full backup snapshot saved as "${fileName}"`, 'success');
    } catch (err: unknown) {
      onShowToast(`Backup export failed: ${(err as Error).message}`, 'error');
    }
  };

  const handleConfirmRestoreBackup = async () => {
    if (!pendingRestoreFile) return;
    try {
      setIsProcessing(true);
      const res = await importFullDatabaseBackup(pendingRestoreFile);
      setPendingRestoreFile(null);
      await loadData();
      onShowToast(
        `Full database restored: ${res.examCount} exams, ${res.questionCount} stations, ${res.imageCount} images!`,
        'success'
      );
    } catch (err: unknown) {
      onShowToast(`Database restore failed: ${(err as Error).message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetSamplePackages = async () => {
    if (
      !confirm(
        'Restore pre-loaded sample packages (Pathology and Anatomy)? Any custom changes will be reset to factory defaults.'
      )
    ) {
      return;
    }

    try {
      setIsProcessing(true);
      await resetDatabaseToDefaults();
      await loadData();
      onShowToast('Factory sample packages restored successfully!', 'success');
    } catch (err: unknown) {
      onShowToast((err as Error).message, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Title & Navigation Subtabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Package &amp; Asset Exchange Hub
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Offline ZIP exam packages, specimen image synchronization, and full clinical library backups
          </p>
        </div>

        {/* Subtabs Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setActiveSubTab('packages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeSubTab === 'packages'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            <span>ZIP Packages</span>
          </button>

          <button
            onClick={() => setActiveSubTab('missing_images')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors relative cursor-pointer ${
              activeSubTab === 'missing_images'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            <span>Missing Images</span>
            {missingImagesCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-mono flex items-center justify-center font-bold">
                {missingImagesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('backup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              activeSubTab === 'backup'
                ? 'bg-white dark:bg-slate-700 text-purple-700 dark:text-purple-300 font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
            <span>Backup &amp; Restore</span>
          </button>
        </div>
      </div>

      {/* Subtab 1: ZIP Packages & Exchange */}
      {activeSubTab === 'packages' && (
        <div className="space-y-8">
          {/* Drag & Drop Import Dropzone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleProcessZipFile(file);
            }}
            className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all ${
              isDragging
                ? 'border-purple-700 bg-purple-50/50 dark:bg-purple-950/30 scale-[1.01]'
                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 hover:border-slate-400 dark:hover:border-slate-600'
            }`}
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center justify-center mx-auto border border-purple-200 dark:border-purple-800 shadow-2xs">
                <Archive className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Drag and Drop Examination ZIP Package
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect manifest, stations, spotter pins, and specimen images with atomic transaction safety.
                </p>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg cursor-pointer transition-all shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>{isProcessing ? 'Validating Package...' : 'Select .zip Package to Inspect'}</span>
                  <input
                    type="file"
                    accept=".zip"
                    disabled={isProcessing}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleProcessZipFile(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                Maintains formatVersion 1.0.0 · Detects missing images without data loss
              </p>
            </div>
          </div>

          {/* Installed Packages Table */}
          <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-2xs space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  Stored Examination Packages ({exams.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  All clinical stations and high-res specimen slides held offline in browser IndexedDB
                </p>
              </div>

              <button
                onClick={handleResetSamplePackages}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Restore Starter Samples</span>
              </button>
            </div>

            {exams.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500 dark:text-slate-400">
                No exams in local storage. Click "Restore Starter Samples" above or import a package.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {exams.map((exam) => {
                  const subject = subjects.find((s) => s.id === exam.subjectId);
                  const count = questionCounts[exam.id] || 0;

                  return (
                    <div
                      key={exam.id}
                      className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                          <FolderArchive className="w-5 h-5 text-purple-700 dark:text-purple-400" />
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{exam.title}</span>
                            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-slate-700">
                              {exam.code}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                exam.status === 'published'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : exam.status === 'review'
                                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800'
                                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              }`}
                            >
                              {exam.status === 'published' ? 'Published' : exam.status === 'review' ? 'Needs Review' : 'Draft'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span>{subject?.name || 'Medical Subject'}</span>
                            <span>·</span>
                            <span>{count} Stations</span>
                            <span>·</span>
                            <span>{exam.stationDurationSeconds}s Bell</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => handleExportExam(exam.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100/70 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>Export Standalone ZIP</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Subtab 2: Missing Images Manager */}
      {activeSubTab === 'missing_images' && (
        <MissingImagesManager onShowToast={onShowToast} />
      )}

      {/* Subtab 3: Backup & Restore */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Clinical Database Backup &amp; Disaster Recovery</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Full snapshot containing subjects, exams, questions, student attempts, and embedded specimen images.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Card 1: Full Export */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-700 dark:text-purple-300">
                    <Database className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Export All Data Backup</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Downloads a single consolidated JSON archive containing all subjects, examinations, candidate attempt histories, and base64 specimen slide images.
                  </p>
                </div>
                <button
                  onClick={handleExportFullBackup}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all shadow-2xs cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download Full Library Backup (.json)</span>
                </button>
              </div>

              {/* Card 2: Full Restore */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 space-y-3 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-700 dark:text-indigo-300">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Import Full Backup</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Restore previously exported library backups. A verification prompt will confirm before applying updates.
                  </p>
                </div>

                <label className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold text-indigo-950 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100/80 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 rounded-lg cursor-pointer transition-colors shadow-2xs">
                  <Upload className="w-4 h-4" />
                  <span>Select Full Backup JSON File</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setPendingRestoreFile(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inspected Package / Import Preview Modal */}
      {inspectedPackage && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Package Inspection Report</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Validated manifest and specimen asset integrity.</p>
                </div>
              </div>
            </div>

            {/* Exam Details Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Exam Title:</span>
                <span className="font-bold text-slate-900 dark:text-white">{inspectedPackage.manifest.exam.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Course Code:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{inspectedPackage.manifest.exam.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Subject:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">{inspectedPackage.manifest.subject.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Stations:</span>
                <span className="font-bold text-slate-900 dark:text-white">{inspectedPackage.manifest.questions.length} stations</span>
              </div>
            </div>

            {/* Image Assets Status Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">Specimen Asset Audit</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950 dark:text-emerald-300 block">
                      {inspectedPackage.inspectionSummary.availableImagesCount} Available
                    </span>
                    <span className="text-[11px] text-emerald-800 dark:text-emerald-400">Packed in ZIP</span>
                  </div>
                </div>

                <div className={`p-3 border rounded-lg flex items-center gap-2 ${
                  inspectedPackage.inspectionSummary.missingImagesCount > 0
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-950 dark:text-amber-200'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${
                    inspectedPackage.inspectionSummary.missingImagesCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'
                  }`} />
                  <div>
                    <span className="font-bold block">
                      {inspectedPackage.inspectionSummary.missingImagesCount} Missing
                    </span>
                    <span className="text-[11px]">Attach manually later</span>
                  </div>
                </div>
              </div>

              {/* If images are missing, display their details */}
              {inspectedPackage.inspectionSummary.missingImagesCount > 0 && (
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-1.5 max-h-36 overflow-y-auto">
                  <span className="font-bold text-amber-950 dark:text-amber-200 block">Missing Image Files:</span>
                  {inspectedPackage.inspectionSummary.images
                    .filter((img) => img.status === 'missing')
                    .map((m) => (
                      <div key={m.id} className="text-[11px] text-amber-900 dark:text-amber-300 flex items-center justify-between">
                        <span className="font-mono font-medium truncate">{m.fileName}</span>
                        <span className="text-amber-700 dark:text-amber-400 text-[10px]">
                          ({m.associatedQuestionTitles.join(', ') || 'No station'})
                        </span>
                      </div>
                    ))}
                  <p className="text-[10px] text-amber-800 dark:text-amber-400 pt-1">
                    * The exam will import as a <strong>Draft</strong> so you can attach these slides before launching.
                  </p>
                </div>
              )}
            </div>

            {/* Conflict Detection Prompt */}
            {inspectedPackage.conflict ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-950 dark:text-amber-200 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Existing Exam Conflict</span>
                </div>
                <p className="text-[11px] text-amber-900 dark:text-amber-300">{inspectedPackage.conflict.message}</p>

                <div className="pt-2 border-t border-amber-200/80 dark:border-amber-800/60 space-y-2">
                  <label className="flex items-center gap-2 text-[11px] text-amber-950 dark:text-amber-200 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteAttemptsOnOverwrite}
                      onChange={(e) => setDeleteAttemptsOnOverwrite(e.target.checked)}
                      className="rounded text-purple-700 focus:ring-purple-700"
                    />
                    <span>Also wipe existing past student attempt history on overwrite</span>
                  </label>
                </div>
              </div>
            ) : null}

            {/* Import Buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                onClick={() => setInspectedPackage(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>

              {inspectedPackage.conflict ? (
                <>
                  <button
                    onClick={() => handleConfirmImport('keep_both')}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 rounded-lg shadow-2xs cursor-pointer"
                  >
                    Keep Both (Import as Copy)
                  </button>
                  <button
                    onClick={() => handleConfirmImport('overwrite')}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg shadow-2xs cursor-pointer"
                  >
                    Overwrite Existing
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConfirmImport('overwrite')}
                  className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Import Examination Package
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Database Restore Confirmation Modal */}
      {pendingRestoreFile && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Confirm Database Restore</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Restoring from: "{pendingRestoreFile.name}"</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs text-amber-950 dark:text-amber-200 space-y-1 leading-relaxed">
              <p className="font-bold">Caution: Library Data Merge</p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                This operation will merge or update existing subjects, exams, stations, and specimen images in your local IndexedDB storage.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPendingRestoreFile(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestoreBackup}
                disabled={isProcessing}
                className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg shadow-2xs cursor-pointer"
              >
                {isProcessing ? 'Restoring...' : 'Confirm Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
