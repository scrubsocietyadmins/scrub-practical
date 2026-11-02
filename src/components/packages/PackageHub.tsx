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
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            Package &amp; Asset Exchange Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Offline ZIP exam packages, specimen image synchronization, and full clinical library backups
          </p>
        </div>

        {/* Subtabs Bar */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
          <button
            onClick={() => setActiveSubTab('packages')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'packages'
                ? 'bg-white text-rose-950 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderArchive className="w-3.5 h-3.5 text-rose-900" />
            <span>ZIP Packages</span>
          </button>

          <button
            onClick={() => setActiveSubTab('missing_images')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors relative ${
              activeSubTab === 'missing_images'
                ? 'bg-white text-rose-950 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5 text-rose-900" />
            <span>Missing Images</span>
            {missingImagesCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-mono flex items-center justify-center font-bold">
                {missingImagesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('backup')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeSubTab === 'backup'
                ? 'bg-white text-rose-950 font-bold shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-rose-900" />
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
                ? 'border-rose-900 bg-rose-50/50 scale-[1.01]'
                : 'border-slate-300 bg-white hover:border-slate-400'
            }`}
          >
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-950 flex items-center justify-center mx-auto border border-rose-200 shadow-2xs">
                <Archive className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">
                  Drag and Drop Examination ZIP Package
                </h3>
                <p className="text-xs text-slate-500">
                  Inspect manifest, stations, spotter pins, and specimen images with atomic transaction safety.
                </p>
              </div>

              <div>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg cursor-pointer transition-colors shadow-xs">
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

              <p className="text-[11px] text-slate-400">
                Maintains formatVersion 1.0.0 · Detects missing images without data loss
              </p>
            </div>
          </div>

          {/* Installed Packages Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                  Stored Examination Packages ({exams.length})
                </h3>
                <p className="text-xs text-slate-500">
                  All clinical stations and high-res specimen slides held offline in browser IndexedDB
                </p>
              </div>

              <button
                onClick={handleResetSamplePackages}
                disabled={isProcessing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-2xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Restore Starter Samples</span>
              </button>
            </div>

            {exams.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">
                No exams in local storage. Click "Restore Starter Samples" above or import a package.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {exams.map((exam) => {
                  const subject = subjects.find((s) => s.id === exam.subjectId);
                  const count = questionCounts[exam.id] || 0;

                  return (
                    <div
                      key={exam.id}
                      className="py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                          <FolderArchive className="w-5 h-5 text-rose-950" />
                        </div>

                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">{exam.title}</span>
                            <span className="text-[11px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded border border-slate-200">
                              {exam.code}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                exam.status === 'published'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : exam.status === 'review'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {exam.status === 'published' ? 'Published' : exam.status === 'review' ? 'Needs Review' : 'Draft'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
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
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-950 bg-rose-50 hover:bg-rose-100/70 border border-rose-200 rounded-lg transition-colors"
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
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Clinical Database Backup &amp; Disaster Recovery</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full snapshot containing subjects, exams, questions, student attempts, and embedded specimen images.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Card 1: Full Export */}
              <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-950">
                    <Database className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Export All Data Backup</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Downloads a single consolidated JSON archive containing all subjects, examinations, candidate attempt histories, and base64 specimen slide images.
                  </p>
                </div>
                <button
                  onClick={handleExportFullBackup}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg transition-colors shadow-2xs"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download Full Library Backup (.json)</span>
                </button>
              </div>

              {/* Card 2: Full Restore */}
              <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-900">
                    <Upload className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">Import Full Backup</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Restore previously exported library backups. A verification prompt will confirm before applying updates.
                  </p>
                </div>

                <label className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold text-indigo-950 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 rounded-lg cursor-pointer transition-colors shadow-2xs">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-950 flex items-center justify-center">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Package Inspection Report</h3>
                  <p className="text-xs text-slate-500">Validated manifest and specimen asset integrity.</p>
                </div>
              </div>
            </div>

            {/* Exam Details Summary */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Exam Title:</span>
                <span className="font-bold text-slate-900">{inspectedPackage.manifest.exam.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Course Code:</span>
                <span className="font-mono font-medium text-slate-700">{inspectedPackage.manifest.exam.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Subject:</span>
                <span className="font-semibold text-slate-700">{inspectedPackage.manifest.subject.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stations:</span>
                <span className="font-bold text-slate-900">{inspectedPackage.manifest.questions.length} stations</span>
              </div>
            </div>

            {/* Image Assets Status Breakdown */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Specimen Asset Audit</span>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold text-emerald-950 block">
                      {inspectedPackage.inspectionSummary.availableImagesCount} Available
                    </span>
                    <span className="text-[11px] text-emerald-800">Packed in ZIP</span>
                  </div>
                </div>

                <div className={`p-3 border rounded-lg flex items-center gap-2 ${
                  inspectedPackage.inspectionSummary.missingImagesCount > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${
                    inspectedPackage.inspectionSummary.missingImagesCount > 0 ? 'text-rose-600' : 'text-slate-400'
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
                <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-lg text-xs space-y-1.5 max-h-36 overflow-y-auto">
                  <span className="font-bold text-rose-950 block">Missing Image Files:</span>
                  {inspectedPackage.inspectionSummary.images
                    .filter((img) => img.status === 'missing')
                    .map((m) => (
                      <div key={m.id} className="text-[11px] text-rose-900 flex items-center justify-between">
                        <span className="font-mono font-medium truncate">{m.fileName}</span>
                        <span className="text-rose-700 text-[10px]">
                          ({m.associatedQuestionTitles.join(', ') || 'No station'})
                        </span>
                      </div>
                    ))}
                  <p className="text-[10px] text-rose-800 pt-1">
                    * The exam will import as a <strong>Draft</strong> so you can attach these slides before launching.
                  </p>
                </div>
              )}
            </div>

            {/* Conflict Detection Prompt */}
            {inspectedPackage.conflict ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-950 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Existing Exam Conflict</span>
                </div>
                <p className="text-[11px] text-amber-900">{inspectedPackage.conflict.message}</p>

                <div className="pt-2 border-t border-amber-200/80 space-y-2">
                  <label className="flex items-center gap-2 text-[11px] text-amber-950 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={deleteAttemptsOnOverwrite}
                      onChange={(e) => setDeleteAttemptsOnOverwrite(e.target.checked)}
                      className="rounded text-rose-950 focus:ring-rose-900"
                    />
                    <span>Also wipe existing past student attempt history on overwrite</span>
                  </label>
                </div>
              </div>
            ) : null}

            {/* Import Buttons */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2">
              <button
                onClick={() => setInspectedPackage(null)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>

              {inspectedPackage.conflict ? (
                <>
                  <button
                    onClick={() => handleConfirmImport('keep_both')}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-2xs"
                  >
                    Keep Both (Import as Copy)
                  </button>
                  <button
                    onClick={() => handleConfirmImport('overwrite')}
                    className="w-full sm:w-auto px-4 py-2 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg shadow-2xs"
                  >
                    Overwrite Existing
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleConfirmImport('overwrite')}
                  className="w-full sm:w-auto px-5 py-2 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg shadow-xs"
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-950 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-900" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Database Restore</h3>
                <p className="text-xs text-slate-500">Restoring from: "{pendingRestoreFile.name}"</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950 space-y-1 leading-relaxed">
              <p className="font-bold">Caution: Library Data Merge</p>
              <p className="text-[11px] text-amber-800">
                This operation will merge or update existing subjects, exams, stations, and specimen images in your local IndexedDB storage.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setPendingRestoreFile(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestoreBackup}
                disabled={isProcessing}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-950 hover:bg-rose-900 rounded-lg shadow-2xs"
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
