import React, { useState } from 'react';
import {
  GraduationCap,
  Layers,
  Archive,
  Image,
  HardDrive,
  ChevronRight,
} from 'lucide-react';
import { AdminDashboard } from '../admin/AdminDashboard';
import { PackageHub } from '../packages/PackageHub';

interface EducatorWorkspaceProps {
  onLaunchExamSimulator: (examId: string) => void;
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToMissingImages?: () => void;
  initialSubTab?: EducatorSubTab;
}

type EducatorSubTab = 'authoring' | 'packages' | 'missing_images' | 'backup';

export const EducatorWorkspace: React.FC<EducatorWorkspaceProps> = ({
  onLaunchExamSimulator,
  onShowToast,
  onNavigateToMissingImages,
  initialSubTab = 'authoring',
}) => {
  const [activeSubTab, setActiveSubTab] = useState<EducatorSubTab>(initialSubTab);

  const subTabs: Array<{ id: EducatorSubTab; label: string; icon: React.ElementType; description: string }> = [
    {
      id: 'authoring',
      label: 'Authoring Studio',
      icon: Layers,
      description: 'Subjects, exams, stations, publish',
    },
    {
      id: 'packages',
      label: 'Packages',
      icon: Archive,
      description: 'Import & export ZIP packages',
    },
    {
      id: 'missing_images',
      label: 'Missing Images',
      icon: Image,
      description: 'Upload specimen images',
    },
    {
      id: 'backup',
      label: 'Backup & Restore',
      icon: HardDrive,
      description: 'Export and import all data',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Educator workspace header */}
      <div className="flex items-center gap-3 pb-2 border-b border-slate-200 dark:border-slate-700">
        <div className="w-9 h-9 rounded-lg bg-slate-800 dark:bg-slate-700 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-slate-300" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Educator Workspace</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Manage content, import packages, and validate exams before publishing.
          </p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none border-b border-slate-100 dark:border-slate-800 pb-1">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`educator-subtab-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors min-h-[36px] cursor-pointer ${
                isActive
                  ? 'bg-slate-900 dark:bg-purple-700 text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeSubTab === 'authoring' && (
          <AdminDashboard
            onLaunchExamSimulator={onLaunchExamSimulator}
            onShowToast={onShowToast}
            onNavigateToMissingImages={() => setActiveSubTab('missing_images')}
          />
        )}

        {(activeSubTab === 'packages' || activeSubTab === 'missing_images' || activeSubTab === 'backup') && (
          <PackageHub
            onShowToast={onShowToast}
            initialTab={
              activeSubTab === 'missing_images'
                ? 'missing_images'
                : activeSubTab === 'backup'
                ? 'backup'
                : 'packages'
            }
          />
        )}
      </div>
    </div>
  );
};
