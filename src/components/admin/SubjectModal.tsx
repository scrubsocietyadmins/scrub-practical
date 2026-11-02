import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Subject } from '../../types';
import { v4 as uuidv4 } from '../../db/uuid';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (subject: Subject) => Promise<void>;
  initialSubject?: Subject | null;
}

const PRESET_COLORS = [
  '#881337', // Deep burgundy
  '#1e3a8a', // Deep blue
  '#065f46', // Deep emerald
  '#701a75', // Deep purple
  '#854d0e', // Ochre / bronze
  '#334155', // Slate
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSubject,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubject) {
      setName(initialSubject.name);
      setCode(initialSubject.code);
      setDescription(initialSubject.description || '');
      setColor(initialSubject.color || PRESET_COLORS[0]);
    } else {
      setName('');
      setCode('');
      setDescription('');
      setColor(PRESET_COLORS[0]);
    }
    setError(null);
  }, [initialSubject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Subject name is required');
      return;
    }
    if (!code.trim()) {
      setError('Subject code is required (e.g. PATH-301)');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = Date.now();
      const subjectToSave: Subject = {
        id: initialSubject ? initialSubject.id : uuidv4(),
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim(),
        color,
        createdAt: initialSubject ? initialSubject.createdAt : now,
        updatedAt: now,
      };

      await onSave(subjectToSave);
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to save subject');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">
            {initialSubject ? 'Edit Medical Subject' : 'Create New Medical Subject'}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Subject Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Pathology &amp; Histopathology"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Course Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. PATH-301 or ANAT-201"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={3}
              placeholder="Overview of the curriculum, organ systems covered, or station styles."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-900/20 focus:border-rose-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Color Accent
            </label>
            <div className="flex items-center gap-3">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? 'scale-110 border-slate-900 ring-2 ring-slate-400' : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-950 hover:bg-rose-900 rounded-lg transition-colors shadow-xs disabled:opacity-50"
            >
              {loading ? 'Saving...' : initialSubject ? 'Update Subject' : 'Create Subject'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
