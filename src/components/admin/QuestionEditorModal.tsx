import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  Image as ImageIcon,
  Tag,
  HelpCircle,
  Clock,
  Crosshair,
  ArrowUpRight,
  Circle,
} from 'lucide-react';
import type { Question, QuestionType, SpotterPin, QuestionOption, PointerType } from '../../types';
import { v4 as uuidv4 } from '../../db/uuid';
import { saveImageBlob, getImageObjectUrl } from '../../db';
import { SpecimenViewer } from '../common/SpecimenViewer';

interface QuestionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: Question) => Promise<void>;
  examId: string;
  initialQuestion?: Question | null;
  totalQuestionsCount: number;
}

export const QuestionEditorModal: React.FC<QuestionEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  examId,
  initialQuestion,
  totalQuestionsCount,
}) => {
  const [type, setType] = useState<QuestionType>('spotter');
  const [title, setTitle] = useState('');
  const [clinicalVignette, setClinicalVignette] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [explanation, setExplanation] = useState('');
  const [points, setPoints] = useState<number>(2);
  const [stationDurationSeconds, setStationDurationSeconds] = useState<number>(90);
  const [topicGroupName, setTopicGroupName] = useState('');
  const [lectureName, setLectureName] = useState('');

  // Image & Spotter Pin
  const [imageId, setImageId] = useState<string | undefined>(undefined);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [spotterPin, setSpotterPin] = useState<SpotterPin | undefined>(undefined);
  const [pointerType, setPointerType] = useState<PointerType>('arrow');
  const [pointerLabel, setPointerLabel] = useState<string>('Pointer A');

  // Spotter Acceptable Typed Answers
  const [acceptableAnswers, setAcceptableAnswers] = useState<string[]>([]);
  const [newAcceptableAnswer, setNewAcceptableAnswer] = useState('');
  const [spotterAnswerMode, setSpotterAnswerMode] = useState<'typed' | 'multiple_choice' | 'both'>('both');

  // Options for MCQ
  const [options, setOptions] = useState<QuestionOption[]>([
    { id: uuidv4(), text: '', isCorrect: true },
    { id: uuidv4(), text: '', isCorrect: false },
    { id: uuidv4(), text: '', isCorrect: false },
    { id: uuidv4(), text: '', isCorrect: false },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load question data
  useEffect(() => {
    if (initialQuestion) {
      setType(initialQuestion.type);
      setTitle(initialQuestion.title || '');
      setClinicalVignette(initialQuestion.clinicalVignette || '');
      setQuestionText(initialQuestion.questionText);
      setExplanation(initialQuestion.explanation || '');
      setPoints(initialQuestion.points || 2);
      setStationDurationSeconds(initialQuestion.stationDurationSeconds || 90);
      setTopicGroupName(initialQuestion.topicGroupName || '');
      setLectureName(initialQuestion.lectureName || '');
      setImageId(initialQuestion.imageId);
      setSpotterPin(initialQuestion.spotterPin);
      if (initialQuestion.spotterPin) {
        setPointerType(initialQuestion.spotterPin.pointerType || 'arrow');
        setPointerLabel(initialQuestion.spotterPin.label || 'Pointer A');
      }
      setAcceptableAnswers(initialQuestion.acceptableAnswers || []);
      setSpotterAnswerMode(initialQuestion.spotterAnswerMode || 'both');
      setOptions(
        initialQuestion.options && initialQuestion.options.length > 0
          ? initialQuestion.options
          : [
              { id: uuidv4(), text: '', isCorrect: true },
              { id: uuidv4(), text: '', isCorrect: false },
            ]
      );

      // Load image preview URL
      if (initialQuestion.imageId) {
        getImageObjectUrl(initialQuestion.imageId).then((url) => {
          setImagePreviewUrl(url);
        });
      } else {
        setImagePreviewUrl(null);
      }
    } else {
      // Defaults for new station
      const nextOrder = totalQuestionsCount + 1;
      setType('spotter');
      setTitle(`Station ${nextOrder}`);
      setClinicalVignette('');
      setQuestionText('');
      setExplanation('');
      setPoints(2);
      setStationDurationSeconds(90);
      setTopicGroupName('');
      setLectureName('');
      setImageId(undefined);
      setImagePreviewUrl(null);
      setSpotterPin(undefined);
      setPointerType('arrow');
      setPointerLabel('Pointer A');
      setAcceptableAnswers([]);
      setNewAcceptableAnswer('');
      setSpotterAnswerMode('both');
      setOptions([
        { id: uuidv4(), text: '', isCorrect: true },
        { id: uuidv4(), text: '', isCorrect: false },
        { id: uuidv4(), text: '', isCorrect: false },
        { id: uuidv4(), text: '', isCorrect: false },
      ]);
    }
    setError(null);
  }, [initialQuestion, totalQuestionsCount, isOpen]);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const newImgId = await saveImageBlob(file.name, file);
      setImageId(newImgId);
      const url = await getImageObjectUrl(newImgId);
      setImagePreviewUrl(url);

      // If spotter and no pin yet, set default center pin
      if (type === 'spotter' && !spotterPin) {
        setSpotterPin({
          x: 50,
          y: 50,
          label: pointerLabel,
          pointerType,
        });
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to upload specimen image');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAcceptableAnswer = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const trimmed = newAcceptableAnswer.trim();
    if (trimmed && !acceptableAnswers.includes(trimmed)) {
      setAcceptableAnswers([...acceptableAnswers, trimmed]);
      setNewAcceptableAnswer('');
    }
  };

  const handleRemoveAcceptableAnswer = (idx: number) => {
    setAcceptableAnswers(acceptableAnswers.filter((_, i) => i !== idx));
  };

  const handleOptionChange = (idx: number, text: string) => {
    const updated = [...options];
    updated[idx] = { ...updated[idx], text };
    setOptions(updated);
  };

  const handleSetCorrectOption = (idx: number) => {
    const updated = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === idx,
    }));
    setOptions(updated);
  };

  const handleAddOption = () => {
    setOptions([...options, { id: uuidv4(), text: '', isCorrect: false }]);
  };

  const handleRemoveOption = (idx: number) => {
    if (options.length <= 2) return;
    const removed = options[idx];
    const updated = options.filter((_, i) => i !== idx);
    // If we removed the correct option, default first to correct
    if (removed.isCorrect && updated.length > 0) {
      updated[0].isCorrect = true;
    }
    setOptions(updated);
  };

  const handlePinPlaced = (pin: SpotterPin) => {
    setSpotterPin(pin);
  };

  const handlePointerTypeChange = (pType: PointerType) => {
    setPointerType(pType);
    if (spotterPin) {
      setSpotterPin({ ...spotterPin, pointerType: pType });
    }
  };

  const handlePointerLabelChange = (lbl: string) => {
    setPointerLabel(lbl);
    if (spotterPin) {
      setSpotterPin({ ...spotterPin, label: lbl });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      setError('Question prompt is required');
      return;
    }

    if ((type === 'spotter' || type === 'image_mcq') && !imageId) {
      setError('An image is required for this station type');
      return;
    }

    if (type === 'spotter' && !spotterPin) {
      setError('Please click on the specimen image to place the pointer');
      return;
    }

    if (type === 'spotter' && (spotterAnswerMode === 'typed' || spotterAnswerMode === 'both')) {
      if (acceptableAnswers.length === 0) {
        setError('Please provide at least one acceptable typed identification keyword');
        return;
      }
    }

    if (type !== 'spotter' || spotterAnswerMode === 'multiple_choice' || spotterAnswerMode === 'both') {
      const validOptions = options.filter((o) => o.text.trim().length > 0);
      if (validOptions.length < 2) {
        setError('Please provide at least 2 multiple choice options');
        return;
      }
      if (!validOptions.some((o) => o.isCorrect)) {
        setError('Please designate one option as the correct answer');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const orderIndex = initialQuestion ? initialQuestion.orderIndex : totalQuestionsCount;
      const qTopicGroupId = initialQuestion?.topicGroupId || (topicGroupName.trim() ? `grp-${topicGroupName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);
      const qLectureId = initialQuestion?.lectureId || (lectureName.trim() ? `lec-${lectureName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}` : undefined);

      const questionToSave: Question = {
        id: initialQuestion ? initialQuestion.id : uuidv4(),
        examId,
        orderIndex,
        type,
        title: title.trim() || `Station ${orderIndex + 1}`,
        topicGroupId: qTopicGroupId,
        topicGroupName: topicGroupName.trim() || undefined,
        lectureId: qLectureId,
        lectureName: lectureName.trim() || undefined,
        clinicalVignette: type === 'clinical_mcq' ? clinicalVignette.trim() : undefined,
        questionText: questionText.trim(),
        imageId: (type !== 'text_mcq' && imageId) ? imageId : undefined,
        spotterPin: type === 'spotter' ? spotterPin : undefined,
        acceptableAnswers: type === 'spotter' ? acceptableAnswers : undefined,
        spotterAnswerMode: type === 'spotter' ? spotterAnswerMode : undefined,
        options: (type !== 'spotter' || spotterAnswerMode !== 'typed')
          ? options.filter((o) => o.text.trim().length > 0)
          : undefined,
        explanation: explanation.trim(),
        points: Number(points) || 1,
        stationDurationSeconds: Number(stationDurationSeconds) || 90,
      };

      await onSave(questionToSave);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save station');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {initialQuestion ? 'Edit Examination Station' : 'Create Examination Station'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure medical visual assets, questions, pointer coordinates, and scoring</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Station Type Switcher */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
              Station Question Format *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'spotter', label: 'Spotter Station', desc: 'Pinned specimen identifier' },
                { id: 'image_mcq', label: 'Image MCQ', desc: 'Slide/radiology MCQ' },
                { id: 'clinical_mcq', label: 'Clinical MCQ', desc: 'Case history + MCQ' },
                { id: 'text_mcq', label: 'Text MCQ', desc: 'Conceptual station' },
              ].map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setType(t.id as QuestionType)}
                  className={`p-3 text-left border rounded-lg transition-colors flex flex-col gap-1 cursor-pointer ${
                    type === t.id
                      ? 'border-purple-700 bg-purple-50/70 dark:bg-purple-950/40 ring-1 ring-purple-700 dark:border-purple-600'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/60'
                  }`}
                >
                  <span className="text-xs font-bold text-purple-950 dark:text-purple-300">{t.label}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Station Title & Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Station Title / Tag
              </label>
              <input
                type="text"
                placeholder="e.g. Station 01: Gross Pathology"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Marks
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={points}
                  onChange={(e) => setPoints(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Time (s)
                </label>
                <input
                  type="number"
                  min="15"
                  max="600"
                  step="5"
                  value={stationDurationSeconds}
                  onChange={(e) => setStationDurationSeconds(Math.max(15, parseInt(e.target.value) || 60))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Curriculum Categorization (Shuffle Engine metadata) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 dark:bg-slate-800/60 p-3.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Topic Group (Curriculum Cluster)
              </label>
              <input
                type="text"
                placeholder="e.g. Gastrointestinal Pathology"
                value={topicGroupName}
                onChange={(e) => setTopicGroupName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Groups related lectures together for balanced shuffle sampling.
              </span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Lecture / Specific Module
              </label>
              <input
                type="text"
                placeholder="e.g. Gastroduodenal Ulcers & Mucosal Injury"
                value={lectureName}
                onChange={(e) => setLectureName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Specific lecture module this station belongs to.
              </span>
            </div>
          </div>

          {/* Clinical Vignette if Clinical MCQ */}
          {type === 'clinical_mcq' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Clinical Vignette &amp; Case History
              </label>
              <textarea
                rows={3}
                placeholder="A 45-year-old female presents with acute epigastric pain radiating to the back..."
                value={clinicalVignette}
                onChange={(e) => setClinicalVignette(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-amber-50/20 dark:bg-amber-950/20 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
            </div>
          )}

          {/* Image & Specimen Pin Section (for spotter, image_mcq, or optional clinical_mcq) */}
          {type !== 'text_mcq' && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/50 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Medical Specimen &amp; Visual Slide
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {type === 'spotter'
                      ? 'Upload high-resolution image and click on the specimen to anchor the pointer'
                      : 'Upload specimen slide, gross pathology photo, or radiology scan'}
                  </p>
                </div>

                <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer shadow-xs transition-colors shrink-0">
                  <Upload className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {imagePreviewUrl ? (
                <div className="space-y-3">
                  <div className="h-[360px] w-full rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner">
                    <SpecimenViewer
                      imageUrl={imagePreviewUrl}
                      spotterPin={type === 'spotter' ? spotterPin : undefined}
                      interactivePinPlacement={type === 'spotter'}
                      onPinPlaced={handlePinPlaced}
                      selectedPointerType={pointerType}
                      selectedPointerLabel={pointerLabel}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Spotter Pin Controls */}
                  {type === 'spotter' && (
                    <div className="space-y-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
                      {!spotterPin && (
                        <div className="p-2 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2 font-semibold">
                          <Crosshair className="w-4 h-4 text-amber-700 dark:text-amber-400 animate-pulse shrink-0" />
                          <span>Pointer placement required: Click on the specimen image above or click "Set to Center".</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Pointer Shape
                          </label>
                          <div className="flex items-center gap-2">
                            {[
                              { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
                              { id: 'ring', label: 'Ring', icon: Circle },
                              { id: 'crosshair', label: 'Crosshair', icon: Crosshair },
                            ].map((pt) => {
                              const Icon = pt.icon;
                              return (
                                <button
                                  type="button"
                                  key={pt.id}
                                  onClick={() => handlePointerTypeChange(pt.id as PointerType)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors cursor-pointer ${
                                    pointerType === pt.id
                                      ? 'bg-purple-700 text-white border-purple-700'
                                      : 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-650'
                                  }`}
                                >
                                  <Icon className="w-3.5 h-3.5" />
                                  <span>{pt.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Pointer Label Text
                          </label>
                          <input
                            type="text"
                            value={pointerLabel}
                            onChange={(e) => handlePointerLabelChange(e.target.value)}
                            placeholder="e.g. Pointer A, Pointer 1"
                            className="w-full px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded focus:outline-none focus:ring-1 focus:ring-purple-700 bg-white dark:bg-slate-750 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      {/* Numerical Coordinates & Reset to Center */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Coordinates:</span>
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                              <span>X:</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={spotterPin ? spotterPin.x : ''}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                  setSpotterPin({
                                    x: val,
                                    y: spotterPin ? spotterPin.y : 50,
                                    label: pointerLabel,
                                    pointerType,
                                  });
                                }}
                                placeholder="50"
                                className="w-14 px-1.5 py-0.5 border border-slate-300 dark:border-slate-750 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-purple-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                              />
                              <span>%</span>
                            </label>

                            <label className="flex items-center gap-1 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                              <span>Y:</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={spotterPin ? spotterPin.y : ''}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(100, parseInt(e.target.value) || 0));
                                  setSpotterPin({
                                    x: spotterPin ? spotterPin.x : 50,
                                    y: val,
                                    label: pointerLabel,
                                    pointerType,
                                  });
                                }}
                                placeholder="50"
                                className="w-14 px-1.5 py-0.5 border border-slate-300 dark:border-slate-750 rounded text-center text-xs focus:outline-none focus:ring-1 focus:ring-purple-700 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                              />
                              <span>%</span>
                            </label>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSpotterPin({
                              x: 50,
                              y: 50,
                              label: pointerLabel,
                              pointerType,
                            });
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 rounded transition-colors cursor-pointer"
                        >
                          Reset to Center (50%, 50%)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-44 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex flex-col items-center justify-center p-4 text-center bg-white dark:bg-slate-800/40">
                  <ImageIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">No specimen image uploaded</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Supports JPG, PNG, WebP, SVG medical illustrations
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Question Text */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Station Question Prompt *
            </label>
            <textarea
              rows={2}
              required
              placeholder={
                type === 'spotter'
                  ? 'Identify the anatomical structure indicated by the pointer.'
                  : 'What is the most likely diagnosis based on this biopsy specimen?'
              }
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Spotter Answer Mode & Acceptable Typed Answers */}
          {type === 'spotter' && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-800/50 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Spotter Examination Mode
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'both', label: 'Both (Typed Identification + Optional MCQ choices)' },
                    { id: 'typed', label: 'Strict Typed Identification Only' },
                    { id: 'multiple_choice', label: 'Multiple Choice Only' },
                  ].map((mode) => (
                    <button
                      type="button"
                      key={mode.id}
                      onClick={() => setSpotterAnswerMode(mode.id as 'typed' | 'multiple_choice' | 'both')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                        spotterAnswerMode === mode.id
                          ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {mode.label}
                    </button>
                  ))}
                </div>
              </div>

              {(spotterAnswerMode === 'typed' || spotterAnswerMode === 'both') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Acceptable Clinical Answers &amp; Synonyms *
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    Case-insensitive and fuzzy matched. Enter variations (e.g. "Reed Sternberg", "RS Cell", "Reed-Sternberg cell").
                  </p>

                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="Type acceptable name and press Enter"
                      value={newAcceptableAnswer}
                      onChange={(e) => setNewAcceptableAnswer(e.target.value)}
                      onKeyDown={handleAddAcceptableAnswer}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddAcceptableAnswer}
                      className="px-3 py-1.5 text-xs font-semibold bg-slate-800 dark:bg-slate-700 text-white rounded-lg hover:bg-slate-700 dark:hover:bg-slate-600 cursor-pointer"
                    >
                      Add Synonym
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {acceptableAnswers.map((ans, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-2xs font-medium text-slate-800 dark:text-slate-200"
                      >
                        <span>{ans}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAcceptableAnswer(idx)}
                          className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {acceptableAnswers.length === 0 && (
                      <span className="text-xs text-purple-600 dark:text-purple-400 italic">
                        No acceptable answers added yet.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Multiple Choice Options (if MCQ or spotter with MCQ) */}
          {(type !== 'spotter' || spotterAnswerMode !== 'typed') && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Multiple Choice Options (Select Correct Key) *
                </label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="flex items-center gap-1 text-xs font-semibold text-purple-700 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Option</span>
                </button>
              </div>

              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div
                    key={opt.id}
                    className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${
                      opt.isCorrect
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-400/40'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSetCorrectOption(idx)}
                      title="Mark as correct answer"
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        opt.isCorrect
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'border border-slate-300 dark:border-slate-600 text-transparent hover:border-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    <input
                      type="text"
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                      value={opt.text}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-700 bg-white dark:bg-slate-750 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 p-1 rounded cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation / Clinical Rationale */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
              Clinical Explanation &amp; Rationale (Shown after submission)
            </label>
            <textarea
              rows={3}
              placeholder="Detailed explanation of the findings, diagnostic criteria, differential diagnoses, or anatomical relationships."
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-700/30 focus:border-purple-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 rounded-lg transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Saving...' : initialQuestion ? 'Update Station' : 'Add Station to Exam'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
