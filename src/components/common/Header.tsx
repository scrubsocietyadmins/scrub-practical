import React from 'react';
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
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

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
  const { isDark, toggleTheme } = useTheme();

  const studentTabs: Array<{ id: MainNavTab; label: string; shortLabel: string; icon: React.ElementType }> = [
    { id: 'library', label: 'Exam Library', shortLabel: 'Library', icon: BookOpen },
    { id: 'practice', label: 'Practice', shortLabel: 'Practice', icon: Shuffle },
    { id: 'progress', label: 'Progress', shortLabel: 'Progress', icon: TrendingUp },
  ];

  const educatorTab = { id: 'educator' as MainNavTab, label: 'Educator Workspace', shortLabel: 'Educator', icon: GraduationCap };

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-colors">
      {/* Session resume banner */}
      {activeSessionBanner && (
        <div className="bg-purple-950 dark:bg-purple-950/90 text-white px-4 py-1.5 flex items-center justify-between gap-3 text-xs border-b border-purple-900/40">
          <span className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-purple-300 shrink-0" />
            <span className="text-purple-100">{activeSessionBanner.label}</span>
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
        <div className="flex items-center justify-between h-14 gap-2 sm:gap-6">
          {/* Brand with SS Logo */}
          <button
            onClick={() => onTabChange('library')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer group text-left"
            aria-label="Scrub Practical home"
          >
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-slate-800/80 p-0.5 flex items-center justify-center border border-purple-200/60 dark:border-purple-800/50 shadow-xs group-hover:scale-105 transition-transform overflow-hidden">
              <img
                src="/logo.png"
                alt="Scrub Practical SS Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="leading-tight hidden sm:block">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                Scrub <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-700 to-indigo-600 dark:from-purple-400 dark:to-indigo-400">Practical</span>
              </span>
              <p className="text-[10px] text-slate-400 dark:text-slate-400 font-medium tracking-wide hidden lg:block">
                OSPE Exam Platform
              </p>
            </div>
          </button>

          {/* Student Navigation */}
          <nav
            className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-x-auto scrollbar-none"
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
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${isActive
                      ? 'text-purple-950 dark:text-purple-200'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    {isActive && (
                      <motion.div
                        layoutId="navPill"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-xs border border-slate-200 dark:border-slate-600 -z-10"
                      />
                    )}
                  </button>
                );
              })}

              {/* Separator */}
              <div className="w-px h-5 bg-slate-300 dark:bg-slate-700 mx-1 shrink-0" aria-hidden="true" />

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
                    className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap min-h-[36px] ${isActive
                      ? 'text-purple-950 dark:text-purple-200'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-purple-700 dark:text-purple-400' : 'text-slate-400 dark:text-slate-500'}`} />
                    <span className="hidden md:inline">{educatorTab.label}</span>
                    <span className="md:hidden">{educatorTab.shortLabel}</span>
                    {isActive && (
                      <motion.div
                        layoutId="navPill"
                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        className="absolute inset-0 bg-white dark:bg-slate-700 rounded-lg shadow-xs border border-slate-200 dark:border-slate-600 -z-10"
                      />
                    )}
                  </button>
                );
              })()}
            </div>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Theme Toggle Button */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[36px] border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-once" aria-hidden="true" />
              ) : (
                <Moon className="w-4 h-4 text-purple-700" aria-hidden="true" />
              )}
              <span className="hidden lg:inline text-[11px]">
                {isDark ? 'Light' : 'Dark'}
              </span>
            </button>

            {/* Bell Sound Toggle */}
            <button
              id="sound-toggle-btn"
              onClick={onToggleSound}
              title={soundActive ? 'Bell audio: on — click to mute' : 'Bell audio: muted — click to enable'}
              aria-label={soundActive ? 'Mute OSPE bell sounds' : 'Enable OSPE bell sounds'}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-xs font-medium border transition-colors min-h-[36px] cursor-pointer ${soundActive
                ? 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700'
                : 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800'
                }`}
            >
              {soundActive ? (
                <Volume2 className="w-4 h-4 text-purple-700 dark:text-purple-400" aria-hidden="true" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
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
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors min-h-[36px] cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                <span>Samples</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
