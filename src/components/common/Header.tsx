import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  BookOpen,
  TrendingUp,
  Shuffle,
  GraduationCap,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertCircle,
  Moon,
  Sun,
} from 'lucide-react';

export type MainNavTab = 'library' | 'practice' | 'progress' | 'educator';

interface ActiveSessionBanner {
  label: string; // e.g. "Exam in progress · Parasitology Spotter"
  onResume: () => void;
}

interface HeaderProps {
  activeTab: MainNavTab;
  onTabChange: (tab: MainNavTab) => void;
  onResetDefaults?: () => void;
  soundActive: boolean;
  onToggleSound: () => void;
  activeSessionBanner?: ActiveSessionBanner | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onResetDefaults,
  soundActive,
  onToggleSound,
  activeSessionBanner,
}) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('scrub-practical-theme');
      return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    document.documentElement.style.colorScheme = isDarkMode ? 'dark' : 'light';
    try {
      localStorage.setItem('scrub-practical-theme', isDarkMode ? 'dark' : 'light');
    } catch {
      // The theme still applies for this session if storage is unavailable.
    }
  }, [isDarkMode]);

  const studentTabs: Array<{ id: MainNavTab; label: string; shortLabel: string; icon: React.ElementType }> = [
    { id: 'library', label: 'Exam Library', shortLabel: 'Library', icon: BookOpen },
    { id: 'practice', label: 'Practice', shortLabel: 'Practice', icon: Shuffle },
    { id: 'progress', label: 'Progress', shortLabel: 'Progress', icon: TrendingUp },
  ];

  const educatorTab = { id: 'educator' as MainNavTab, label: 'Educator Workspace', shortLabel: 'Educator', icon: GraduationCap };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      {/* Session resume banner */}
      {activeSessionBanner && (
        <div className="bg-rose-950 text-white px-4 py-1.5 flex items-center justify-between gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-rose-300 shrink-0" />
            <span className="text-rose-100">{activeSessionBanner.label}</span>
          </span>
          <button
            onClick={activeSessionBanner.onResume}
            className="shrink-0 px-3 py-1 rounded-md bg-white/15 hover:bg-white/25 text-white font-semibold transition-colors"
          >
            Resume →
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-3 sm:gap-6">
          {/* Brand */}
          <button
            onClick={() => onTabChange('library')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
            aria-label="Scrub Practical home"
          >
            <img src="/logo.svg" alt="" className="w-9 h-9 object-contain" />
            <div className="leading-tight hidden sm:block">
              <span className="text-base font-bold tracking-tight text-slate-900">
                Scrub <span className="text-rose-900">Practical</span>
              </span>
              <p className="text-[10px] text-slate-400 tracking-wide hidden lg:block">
                OSPE Exam Platform
              </p>
            </div>
          </button>

          {/* Student Navigation */}
          <nav
            className="flex items-center p-1 bg-slate-100 border border-slate-200 rounded-xl overflow-x-auto scrollbar-none"
            aria-label="Primary navigation"
          >
            <div className="flex items-center gap-0.5 relative">
              {studentTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`nav-tab-${tab.id}`}
                    onClick={() => onTabChange(tab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[44px] ${
                      isActive
                        ? 'text-rose-950'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-900' : 'text-slate-400'}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    {isActive && (
                      <motion.div
                        layoutId="navPill"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200 -z-10"
                      />
                    )}
                  </button>
                );
              })}

              {/* Separator */}
              <div className="w-px h-5 bg-slate-300 mx-1 shrink-0" aria-hidden="true" />

              {/* Educator Tab */}
              {(() => {
                const Icon = educatorTab.icon;
                const isActive = activeTab === educatorTab.id;
                return (
                  <button
                    key={educatorTab.id}
                    id={`nav-tab-${educatorTab.id}`}
                    onClick={() => onTabChange(educatorTab.id)}
                    aria-current={isActive ? 'page' : undefined}
                    title="Educator Workspace — authoring, packages, backups"
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[44px] ${
                      isActive
                        ? 'text-rose-950'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-rose-900' : 'text-slate-400'}`} />
                    <span className="hidden md:inline">{educatorTab.label}</span>
                    <span className="md:hidden">{educatorTab.shortLabel}</span>
                    {isActive && (
                      <motion.div
                        layoutId="navPill"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 bg-white rounded-lg shadow-sm border border-slate-200 -z-10"
                      />
                    )}
                  </button>
                );
              })()}
            </div>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="theme-toggle-btn"
              type="button"
              onClick={() => setIsDarkMode((current) => !current)}
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-pressed={isDarkMode}
              className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-colors min-h-[44px] min-w-[44px]"
            >
              {isDarkMode ? <Sun className="w-4 h-4" aria-hidden="true" /> : <Moon className="w-4 h-4" aria-hidden="true" />}
              <span className="sr-only">{isDarkMode ? 'Light mode' : 'Dark mode'}</span>
            </button>
            <button
              id="sound-toggle-btn"
              onClick={onToggleSound}
              title={soundActive ? 'Bell audio: on — click to mute' : 'Bell audio: muted — click to enable'}
              aria-label={soundActive ? 'Mute OSPE bell sounds' : 'Enable OSPE bell sounds'}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[44px] ${
                soundActive
                  ? 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                  : 'border-slate-200 text-slate-400 bg-slate-50 hover:bg-white'
              }`}
            >
              {soundActive ? (
                <Volume2 className="w-4 h-4 text-rose-900" aria-hidden="true" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" aria-hidden="true" />
              )}
              <span className="hidden lg:inline text-[11px]">
                {soundActive ? 'Bell on' : 'Muted'}
              </span>
            </button>

            {onResetDefaults && (
              <button
                id="reset-samples-btn"
                onClick={onResetDefaults}
                title="Restore default sample packages"
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors min-h-[44px]"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                <span>Samples</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

