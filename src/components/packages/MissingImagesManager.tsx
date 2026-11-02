import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  Layers,
  FileQuestion,
  Eye,
  Trash2,
} from 'lucide-react';
import { db, getImageObjectUrl, revokeImageObjectUrl, attachMissingImage, cleanupOrphanedImages } from '../../db';
import type { ImageRecord, Question, Exam } from '../../types';

interface MissingImagesManagerProps {
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
  onNavigateToExam?: (examId: string) => void;
}

interface ImageWithUsage {
  id: string;
  name: string;
  mimeType: string;
  status: 'available' | 'missing';
  hasBlob: boolean;
  blobSize: number;
  previewUrl: string | null;
  associatedQuestions: Array<{
    questionId: string;
    questionTitle: string;
    examId: string;
    examTitle: string;
  }>;
}

export const MissingImagesManager: React.FC<MissingImagesManagerProps> = ({
  onShowToast,
  onNavigateToExam,
}) => {
  const [images, setImages] = useState<ImageWithUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'available'>('missing');

  // Filename mismatch warning modal state
  const [pendingUpload, setPendingUpload] = useState<{
    imageId: string;
    expectedName: string;
    file: File;
  } | null>(null);

  // Active preview image modal
  const [activePreviewUrl, setActivePreviewUrl] = useState<string | null>(null);

  const loadImages = async () => {
    setLoading(true);
    try {
      const allDbImages = await db.images.toArray();
      const allQuestions = await db.questions.toArray();
      const allExams = await db.exams.toArray();

      const examMap = new Map<string, Exam>();
      for (const e of allExams) {
        examMap.set(e.id, e);
      }

      // Map question references by imageId
      const usageMap = new Map<
        string,
        Array<{ questionId: string; questionTitle: string; examId: string; examTitle: string }>
      >();

      // Also collect unassigned or orphaned image IDs from questions that might not be in db.images
      const referencedImageIds = new Set<string>();

      for (const q of allQuestions) {
        if (q.imageId) {
          referencedImageIds.add(q.imageId);
          const currentList = usageMap.get(q.imageId) || [];
          const exam = examMap.get(q.examId);
          currentList.push({
            questionId: q.id,
            questionTitle: q.title || `Station ${q.orderIndex + 1}`,
            examId: q.examId,
            examTitle: exam?.title || 'Unknown Exam',
          });
          usageMap.set(q.imageId, currentList);
        }
      }

      const imageItems: ImageWithUsage[] = [];

      // Existing image records in db
      for (const img of allDbImages) {
        const hasBlob = Boolean(img.blob && img.blob.size > 0);
        const status = hasBlob && img.status !== 'missing' ? 'available' : 'missing';
        let previewUrl: string | null = null;
        if (hasBlob) {
          previewUrl = await getImageObjectUrl(img.id);
        }

        imageItems.push({
          id: img.id,
          name: img.name,
          mimeType: img.mimeType || 'image/jpeg',
          status,
          hasBlob,
          blobSize: img.blob ? img.blob.size : 0,
          previewUrl,
          associatedQuestions: usageMap.get(img.id) || [],
        });
      }

      // Questions that reference an imageId not in db.images table at all
      for (const imgId of referencedImageIds) {
        if (!allDbImages.some((i) => i.id === imgId)) {
          imageItems.push({
            id: imgId,
            name: `${imgId}.jpg`,
            mimeType: 'image/jpeg',
            status: 'missing',
            hasBlob: false,
            blobSize: 0,
            previewUrl: null,
            associatedQuestions: usageMap.get(imgId) || [],
          });
        }
      }

      setImages(imageItems);
    } catch (err: unknown) {
      onShowToast((err as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  const handleSelectFile = (imageId: string, expectedName: string, file: File) => {
    // Validate file type
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
    const lowerName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));
    const hasValidMime = file.type.startsWith('image/');

    if (!hasValidExt || !hasValidMime) {
      onShowToast('Invalid file format. Please select a valid JPG, PNG, WEBP, or SVG specimen image.', 'error');
      return;
    }

    // Check if filename differs from expected
    if (expectedName && file.name.toLowerCase() !== expectedName.toLowerCase()) {
      setPendingUpload({
        imageId,
        expectedName,
        file,
      });
      return;
    }

    // Direct save if names match
    executeSaveImage(imageId, file);
  };

  const executeSaveImage = async (imageId: string, file: File) => {
    try {
      await attachMissingImage(imageId, file);
      setPendingUpload(null);
      await loadImages();
      onShowToast(`Specimen image attached successfully to ID: ${imageId}`, 'success');
    } catch (err: unknown) {
      onShowToast(`Failed to attach image: ${(err as Error).message}`, 'error');
    }
  };

  const handleCleanupOrphaned = async () => {
    try {
      const removed = await cleanupOrphanedImages();
      await loadImages();
      onShowToast(`Cleaned up ${removed} unreferenced image records`, 'info');
    } catch (err: unknown) {
      onShowToast((err as Error).message, 'error');
    }
  };

  // Filtered and searched images
  const filteredImages = images.filter((item) => {
    if (filterMode === 'missing' && item.status !== 'missing') return false;
    if (filterMode === 'available' && item.status !== 'available') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchesId = item.id.toLowerCase().includes(q);
      const matchesName = item.name.toLowerCase().includes(q);
      const matchesQuestions = item.associatedQuestions.some(
        (aq) => aq.questionTitle.toLowerCase().includes(q) || aq.examTitle.toLowerCase().includes(q)
      );
      if (!matchesId && !matchesName && !matchesQuestions) return false;
    }

    return true;
  });

  const missingCount = images.filter((i) => i.status === 'missing').length;
  const availableCount = images.filter((i) => i.status === 'available').length;

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Specimen &amp; Missing Images Directory</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage clinical specimen slides, attach missing package assets, and keep specimen references intact.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCleanupOrphaned}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              <span>Clean Orphaned Images</span>
            </button>
            <button
              onClick={loadImages}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setFilterMode('missing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterMode === 'missing'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              <span>Missing Images ({missingCount})</span>
            </button>
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All Assets ({images.length})
            </button>
            <button
              onClick={() => setFilterMode('available')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterMode === 'available'
                  ? 'bg-purple-700 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Available ({availableCount})</span>
            </button>
          </div>

          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, filename, station..."
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-slate-50/60 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-750 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Images Table / List */}
      <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700/80 overflow-hidden shadow-2xs">
        {filteredImages.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <FileQuestion className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">No images match current filter criteria</p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              {filterMode === 'missing'
                ? 'All specimen assets are available in local storage!'
                : 'Try modifying your search or filter tab.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-x-auto">
            {filteredImages.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
              >
                {/* Left: Thumbnail & Info */}
                <div className="flex items-start gap-4 min-w-0">
                  {/* Thumbnail / Placeholder */}
                  <div className="w-16 h-16 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 overflow-hidden relative group">
                    {item.previewUrl ? (
                      <>
                        <img
                          src={item.previewUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => setActivePreviewUrl(item.previewUrl)}
                          className="absolute inset-0 bg-slate-900/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <ImageIcon className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                    )}
                  </div>

                  {/* Metadata */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.id}
                      </span>
                      {item.status === 'missing' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Missing Asset</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Available</span>
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-2">
                      <span>MIME: {item.mimeType}</span>
                      {item.hasBlob && <span>· {(item.blobSize / 1024).toFixed(1)} KB</span>}
                    </div>

                    {/* Associated Questions List */}
                    {item.associatedQuestions.length > 0 ? (
                      <div className="pt-1 flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          Linked Stations ({item.associatedQuestions.length}):
                        </span>
                        {item.associatedQuestions.map((aq) => (
                          <span
                            key={aq.questionId}
                            className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                            title={`Exam: ${aq.examTitle}`}
                          >
                            {aq.questionTitle} ({aq.examTitle})
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">No stations currently reference this asset</p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg cursor-pointer transition-all shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{item.status === 'missing' ? 'Attach Image' : 'Replace Image'}</span>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleSelectFile(item.id, item.name, file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filename Mismatch Confirmation Modal */}
      {pendingUpload && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Filename Mismatch Warning</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">The selected filename differs from the manifest expectation.</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg text-xs space-y-2 text-amber-950 dark:text-amber-200">
              <p>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Expected File Name:</span>{' '}
                <span className="font-mono text-slate-900 dark:text-white font-bold">{pendingUpload.expectedName}</span>
              </p>
              <p>
                <span className="font-semibold text-slate-700 dark:text-slate-300">Selected File Name:</span>{' '}
                <span className="font-mono text-purple-700 dark:text-purple-300 font-bold">{pendingUpload.file.name}</span>
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                The image will still be stored with the permanent key{' '}
                <span className="font-mono font-bold">{pendingUpload.imageId}</span>, preserving all station spotter coordinates.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setPendingUpload(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => executeSaveImage(pendingUpload.imageId, pendingUpload.file)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all shadow-2xs cursor-pointer"
              >
                Confirm &amp; Attach Image
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {activePreviewUrl && (
        <div
          onClick={() => setActivePreviewUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={activePreviewUrl}
              alt="Preview"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
            />
            <p className="text-center text-xs text-white/70 mt-2">Click anywhere to close preview</p>
          </div>
        </div>
      )}
    </div>
  );
};
