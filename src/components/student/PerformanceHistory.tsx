import React, { useState, useEffect, useRef } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  BookOpen,
  ArrowRight,
  Trash2,
  Sparkles,
  Filter,
  X,
  Layers,
  ChevronRight,
  Edit2,
  FileText,
  FileDown,
  Loader2,
} from 'lucide-react';
import { db } from '../../db';
import type { ExamAttempt, Exam, Subject } from '../../types';
import { v4 as uuidv4 } from '../../db/uuid';
import { StudyNotesModal } from './StudyNotesModal';
import { downloadExamAttemptPdf } from '../../services/pdfReportService';

interface PerformanceHistoryProps {
  onReviewAttempt: (attempt: ExamAttempt) => void;
  onNavigateToExams: () => void;
  onShowToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const PerformanceHistory: React.FC<PerformanceHistoryProps> = ({
  onReviewAttempt,
  onNavigateToExams,
  onShowToast,
}) => {
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [editingNotesAttempt, setEditingNotesAttempt] = useState<ExamAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);

  const attemptsTableRef = useRef<HTMLDivElement>(null);

  const handleDownloadAttemptPdf = async (attempt: ExamAttempt) => {
    try {
      setExportingPdfId(attempt.id);
      const filename = await downloadExamAttemptPdf(attempt);
      onShowToast(`Downloaded ${filename}`, 'success');
    } catch (err: unknown) {
      console.error('Failed to export attempt PDF:', err);
      onShowToast((err as Error).message || 'Failed to export PDF', 'error');
    } finally {
      setExportingPdfId(null);
    }
  };

  const handleNotesSaved = (attemptId: string, updatedNotes: string) => {
    setAttempts((prev) =>
      prev.map((a) => (a.id === attemptId ? { ...a, notes: updatedNotes } : a))
    );
  };

  const loadData = async () => {
    setLoading(true);
    const allAttempts = await db.attempts.orderBy('completedAt').toArray();
    const allSubjects = await db.subjects.toArray();
    setAttempts(allAttempts);
    setSubjects(allSubjects);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick helper to seed 4 sample practice attempts if empty so user can immediately evaluate Recharts graphs
  const handleSeedSampleAttempts = async () => {
    const exams = await db.exams.toArray();
    if (exams.length === 0) return;

    const pathExam = exams.find((e) => e.code.includes('PATH')) || exams[0];
    const anatExam = exams.find((e) => e.code.includes('ANAT')) || exams[1] || exams[0];

    const now = Date.now();
    const sampleAttempts: ExamAttempt[] = [
      {
        id: uuidv4(),
        examId: pathExam.id,
        examTitle: pathExam.title,
        subjectName: 'Pathology & Histopathology',
        startedAt: now - 86400000 * 4 - 600000,
        completedAt: now - 86400000 * 4,
        totalTimeSpentSeconds: 420,
        score: 6,
        maxScore: 10,
        percentage: 60,
        passed: true,
        answers: {},
      },
      {
        id: uuidv4(),
        examId: anatExam.id,
        examTitle: anatExam.title,
        subjectName: 'Gross Anatomy & Neuroanatomy',
        startedAt: now - 86400000 * 3 - 480000,
        completedAt: now - 86400000 * 3,
        totalTimeSpentSeconds: 380,
        score: 6,
        maxScore: 8,
        percentage: 75,
        passed: true,
        answers: {},
      },
      {
        id: uuidv4(),
        examId: pathExam.id,
        examTitle: pathExam.title,
        subjectName: 'Pathology & Histopathology',
        startedAt: now - 86400000 * 2 - 540000,
        completedAt: now - 86400000 * 2,
        totalTimeSpentSeconds: 490,
        score: 8,
        maxScore: 10,
        percentage: 80,
        passed: true,
        answers: {},
      },
      {
        id: uuidv4(),
        examId: anatExam.id,
        examTitle: anatExam.title,
        subjectName: 'Gross Anatomy & Neuroanatomy',
        startedAt: now - 86400000 * 1 - 420000,
        completedAt: now - 86400000 * 1,
        totalTimeSpentSeconds: 360,
        score: 8,
        maxScore: 8,
        percentage: 100,
        passed: true,
        answers: {},
      },
    ];

    await db.attempts.bulkAdd(sampleAttempts);
    await loadData();
    onShowToast('Populated realistic practice performance data', 'success');
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all past examination attempt records?')) return;
    await db.attempts.clear();
    setSelectedSubject(null);
    await loadData();
    onShowToast('Attempt history cleared', 'info');
  };

  const handleSubjectBarClick = (subjectFullName: string) => {
    const next = selectedSubject === subjectFullName ? null : subjectFullName;
    setSelectedSubject(next);
    if (next) {
      setTimeout(() => {
        attemptsTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 80);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-slate-500 text-xs">
        Loading performance analytics...
      </div>
    );
  }

  // Summary Metrics
  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter((a) => a.passed).length;
  const passRate = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
  const avgScore =
    totalAttempts > 0
      ? Math.round(attempts.reduce((sum, a) => sum + a.percentage, 0) / totalAttempts)
      : 0;
  const highestScore =
    totalAttempts > 0 ? Math.max(...attempts.map((a) => a.percentage)) : 0;

  // 1. Data for Trend Line Chart
  const trendData = attempts.map((att, idx) => {
    const d = new Date(att.completedAt);
    const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
    return {
      attemptNumber: `Test ${idx + 1}`,
      date: dateLabel,
      score: att.percentage,
      title: att.examTitle,
      passed: att.passed,
      subject: att.subjectName,
    };
  });

  // 2. Data for Average Score by Subject Bar Chart
  const subjectMap = new Map<string, { totalPercent: number; count: number; passCount: number; highest: number }>();
  for (const att of attempts) {
    const key = att.subjectName || 'General';
    const curr = subjectMap.get(key) || { totalPercent: 0, count: 0, passCount: 0, highest: 0 };
    subjectMap.set(key, {
      totalPercent: curr.totalPercent + att.percentage,
      count: curr.count + 1,
      passCount: curr.passCount + (att.passed ? 1 : 0),
      highest: Math.max(curr.highest, att.percentage),
    });
  }

  const subjectBarData = Array.from(subjectMap.entries()).map(([subjName, val]) => {
    return {
      subject: subjName.split('&')[0].trim(),
      fullName: subjName,
      avgScore: Math.round(val.totalPercent / val.count),
      attemptsCount: val.count,
      passRate: Math.round((val.passCount / val.count) * 100),
      highestScore: val.highest,
    };
  });

  // Filtered attempts based on subject selection
  const displayedAttempts = selectedSubject
    ? attempts.filter((a) => a.subjectName === selectedSubject)
    : attempts;

  // Selected subject stats
  const activeSubjectStats = selectedSubject ? subjectMap.get(selectedSubject) : null;

  const formatSeconds = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans">
            Student Performance &amp; Score Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track OSPE progress over time and click any subject bar to inspect individual attempts
          </p>
        </div>

        <div className="flex items-center gap-2">
          {totalAttempts === 0 && (
            <button
              onClick={handleSeedSampleAttempts}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-purple-950 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100/80 border border-purple-200 dark:border-purple-800 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
              <span>Load Practice History Demo</span>
            </button>
          )}

          {totalAttempts > 0 && (
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
      </div>

      {totalAttempts === 0 ? (
        /* Empty State */
        <div className="p-12 text-center bg-white dark:bg-slate-850 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Past Exam Attempts Recorded</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete your first practical spotter exam in the simulator, or click below to populate sample historical data to preview charts.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={onNavigateToExams}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-700 to-indigo-600 hover:from-purple-800 hover:to-indigo-700 dark:from-purple-600 dark:to-indigo-500 rounded-lg transition-all shadow-xs cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Browse Available Exams</span>
            </button>
            <button
              onClick={handleSeedSampleAttempts}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
              <span>Generate Sample History</span>
            </button>
          </div>
        </div>
      ) : (
        /* Analytics Content */
        <div className="space-y-8">
          {/* Key Metric Indicators (KPIs) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Total Exams Taken
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                  {totalAttempts}
                </span>
                <span className="text-xs text-slate-400 font-mono">Sessions</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Average Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-700 dark:text-purple-400">
                  {avgScore}%
                </span>
                <span className="text-xs text-slate-400 font-mono">Mean</span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Pass Rate
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                  {passRate}%
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {passedAttempts}/{totalAttempts}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-850 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Peak Score
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white">
                  {highestScore}%
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Best Record</span>
              </div>
            </div>
          </div>

          {/* Visual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Score Trends Over Time Line Chart */}
            <div className="bg-white dark:bg-slate-850 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Score Trajectory Over Time
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Percentage achieved per attempt with 60% passing benchmark
                </p>
              </div>

              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 20, left: -15, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b830" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#94a3b840' }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 25, 50, 75, 100]}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#94a3b840' }}
                      unit="%"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg space-y-1 border border-slate-700">
                              <p className="font-bold text-purple-300">{data.title}</p>
                              <p className="text-slate-300 text-[11px]">{data.subject}</p>
                              <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-700">
                                <span>Score:</span>
                                <span className="font-mono font-bold text-emerald-400">
                                  {data.score}%
                                </span>
                              </div>
                              <span
                                className={`text-[10px] font-bold block ${
                                  data.passed ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {data.passed ? 'PASSED' : 'DID NOT PASS'}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <ReferenceLine
                      y={60}
                      stroke="#ef4444"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Pass 60%',
                        fill: '#ef4444',
                        fontSize: 10,
                        position: 'insideTopRight',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Score"
                      stroke="#7c3aed"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#7c3aed', strokeWidth: 2, stroke: '#ffffff' }}
                      activeDot={{ r: 6, fill: '#9333ea', stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 2. Average Score by Subject Bar Chart (Clickable for drilldown) */}
            <div className="bg-white dark:bg-slate-850 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <span>Average Score by Subject</span>
                    <span className="text-[10px] font-mono text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.2 rounded border border-purple-200 dark:border-purple-800">
                      Click bar to filter
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click any bar or chip to reveal all attempts for that discipline
                  </p>
                </div>

                {selectedSubject && (
                  <button
                    onClick={() => setSelectedSubject(null)}
                    className="self-start sm:self-auto flex items-center gap-1 text-[11px] font-semibold text-purple-900 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 px-2 py-1 rounded-md transition-colors shrink-0 cursor-pointer"
                  >
                    <span>Clear Filter</span>
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Quick Subject Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <button
                  onClick={() => setSelectedSubject(null)}
                  className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    selectedSubject === null
                      ? 'bg-purple-700 dark:bg-purple-600 text-white shadow-2xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  All Disciplines
                </button>
                {subjectBarData.map((s) => {
                  const isSelected = selectedSubject === s.fullName;
                  return (
                    <button
                      key={s.fullName}
                      onClick={() => handleSubjectBarClick(s.fullName)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? 'bg-purple-700 dark:bg-purple-600 text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{s.subject}</span>
                      <span
                        className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                          isSelected ? 'bg-purple-800 dark:bg-purple-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {s.avgScore}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bar Chart Container with Horizontal Scroll Support */}
              <div className="space-y-1.5">
                <div className="overflow-x-auto pb-2 scrollbar-thin">
                  <div
                    className="h-[250px] pt-1"
                    style={{
                      minWidth: `${Math.max(480, subjectBarData.length * 75)}px`,
                      width: '100%',
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={subjectBarData}
                        margin={{ top: 10, right: 20, left: -15, bottom: 5 }}
                        onClick={(state: any) => {
                          if (state && state.activePayload && state.activePayload.length) {
                            const data = state.activePayload[0].payload;
                            if (data && data.fullName) {
                              handleSubjectBarClick(data.fullName);
                            }
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b830" vertical={false} />
                        <XAxis
                          dataKey="subject"
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: '#94a3b840' }}
                        />
                        <YAxis
                          domain={[0, 100]}
                          ticks={[0, 25, 50, 75, 100]}
                          tick={{ fill: '#94a3b8', fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: '#94a3b840' }}
                          unit="%"
                        />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const isSel = selectedSubject === data.fullName;
                              return (
                                <div className="bg-slate-900 text-white p-2.5 rounded-lg text-xs shadow-lg space-y-1 border border-slate-700">
                                  <p className="font-bold text-purple-300">{data.fullName}</p>
                                  <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-700">
                                    <span>Average Score:</span>
                                    <span className="font-mono font-bold text-emerald-400">
                                      {data.avgScore}%
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between gap-4 text-slate-400 text-[11px]">
                                    <span>Attempts Taken:</span>
                                    <span className="font-mono">{data.attemptsCount}</span>
                                  </div>
                                  <p className="text-[10px] text-purple-300 italic pt-1 border-t border-slate-800">
                                    {isSel ? 'Click to deselect' : 'Click bar to filter attempts below'}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar
                          dataKey="avgScore"
                          name="Average Score"
                          radius={[6, 6, 0, 0]}
                          cursor="pointer"
                        >
                          {subjectBarData.map((entry, index) => {
                            const isSelected = selectedSubject === entry.fullName;
                            const isDimmed = selectedSubject !== null && !isSelected;
                            const baseColor = index % 2 === 0 ? '#7c3aed' : '#4f46e5';
                            return (
                              <Cell
                                key={`cell-${index}`}
                                fill={isSelected ? '#9333ea' : isDimmed ? '#475569' : baseColor}
                                stroke={isSelected ? '#c084fc' : 'none'}
                                strokeWidth={isSelected ? 2 : 0}
                                className="transition-all duration-200"
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                  <span>Tip: Click any bar to drill down</span>
                  <span className="inline-flex items-center gap-1">
                    <span>Horizontal scroll enabled</span>
                    <span aria-hidden="true">&harr;</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Subject Drilldown / Attempts Log Table */}
          <div
            ref={attemptsTableRef}
            className={`bg-white dark:bg-slate-850 rounded-xl border transition-all overflow-hidden shadow-2xs space-y-4 p-6 ${
              selectedSubject
                ? 'border-purple-600/40 ring-2 ring-purple-600/10'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            {/* Table Header / Subject Specific Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                    {selectedSubject ? `${selectedSubject} Attempts` : 'All Examination Attempts'}
                  </h3>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                    {displayedAttempts.length} {displayedAttempts.length === 1 ? 'Record' : 'Records'}
                  </span>
                  {selectedSubject && (
                    <span className="text-[11px] font-semibold text-purple-900 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                      <Filter className="w-3 h-3" />
                      <span>Filtered by Bar Selection</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedSubject
                    ? `Showing all examination attempts taken in ${selectedSubject}. Click "Clear Filter" to view all disciplines.`
                    : 'Click any subject bar in the chart above to isolate attempts for that medical discipline.'}
                </p>
              </div>

              {selectedSubject && activeSubjectStats && (
                <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 text-xs shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Mean Score</span>
                    <span className="font-mono font-bold text-purple-700 dark:text-purple-400 text-sm">
                      {Math.round(activeSubjectStats.totalPercent / activeSubjectStats.count)}%
                    </span>
                  </div>
                  <div className="border-l border-slate-200 dark:border-slate-700 pl-3">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Pass Rate</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                      {Math.round((activeSubjectStats.passCount / activeSubjectStats.count) * 100)}%
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedSubject(null)}
                    title="Clear filter"
                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors ml-1 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Attempts Table */}
            {displayedAttempts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No past attempts found for this subject.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 uppercase font-bold tracking-wider text-[10px]">
                      <th className="pb-3 pl-2">Date &amp; Time</th>
                      <th className="pb-3">Practical Exam</th>
                      <th className="pb-3">Subject</th>
                      <th className="pb-3 text-center">Score</th>
                      <th className="pb-3 text-center">Duration</th>
                      <th className="pb-3 text-center">Status</th>
                      <th className="pb-3">Personal Study Notes</th>
                      <th className="pb-3 text-right pr-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[...displayedAttempts].reverse().map((att) => {
                      const date = new Date(att.completedAt);
                      return (
                        <tr key={att.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="py-3 pl-2 text-slate-600 dark:text-slate-400 font-mono text-[11px] whitespace-nowrap">
                            {date.toLocaleDateString()}{' '}
                            {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-3 font-semibold text-slate-900 dark:text-white max-w-xs truncate">
                            {att.examTitle}
                          </td>
                          <td className="py-3 text-slate-500 dark:text-slate-400">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[11px] ${
                                selectedSubject === att.subjectName
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-950 dark:text-purple-300 font-bold border border-purple-200 dark:border-purple-800'
                                  : ''
                              }`}
                            >
                              {att.subjectName}
                            </span>
                          </td>
                          <td className="py-3 text-center font-mono font-bold">
                            <span
                              className={
                                att.passed ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-rose-600 dark:text-rose-400 font-bold'
                              }
                            >
                              {att.percentage}%
                            </span>
                            <span className="text-[11px] text-slate-400 font-normal ml-1">
                              ({att.score}/{att.maxScore})
                            </span>
                          </td>
                          <td className="py-3 text-center font-mono text-slate-500 dark:text-slate-400">
                            {formatSeconds(att.totalTimeSpentSeconds)}
                          </td>
                          <td className="py-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                att.passed
                                  ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {att.passed ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <XCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                              )}
                              <span>{att.passed ? 'PASSED' : 'REVISION'}</span>
                            </span>
                          </td>

                          {/* Personal Notes Cell */}
                          <td className="py-3">
                            {att.notes ? (
                              <button
                                onClick={() => setEditingNotesAttempt(att)}
                                title="Click to view or edit study notes"
                                className="group flex items-start gap-1.5 text-left max-w-[220px] p-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-950/50 border border-amber-200 dark:border-amber-900/60 transition-colors cursor-pointer"
                              >
                                <FileText className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                                <span className="text-[11px] text-amber-950 dark:text-amber-200 line-clamp-1 flex-1 font-medium">
                                  {att.notes}
                                </span>
                                <Edit2 className="w-3 h-3 text-amber-600 dark:text-amber-400 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditingNotesAttempt(att)}
                                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <FileText className="w-3 h-3 text-slate-400" />
                                <span>+ Add Note</span>
                              </button>
                            )}
                          </td>

                          <td className="py-3 text-right pr-2">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleDownloadAttemptPdf(att)}
                                disabled={exportingPdfId === att.id}
                                title="Download formatted PDF Examination Report"
                                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-md transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                              >
                                {exportingPdfId === att.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-700 dark:text-purple-400" />
                                ) : (
                                  <FileDown className="w-3.5 h-3.5 text-purple-700 dark:text-purple-400" />
                                )}
                                <span className="hidden sm:inline">PDF</span>
                              </button>

                              <button
                                onClick={() => onReviewAttempt(att)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-purple-950 dark:text-purple-200 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100/70 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800 rounded-md transition-colors cursor-pointer"
                              >
                                <span>Review</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personal Study Notes Modal */}
      <StudyNotesModal
        isOpen={Boolean(editingNotesAttempt)}
        onClose={() => setEditingNotesAttempt(null)}
        attempt={editingNotesAttempt}
        onSaved={handleNotesSaved}
        onShowToast={onShowToast}
      />
    </div>
  );
};
