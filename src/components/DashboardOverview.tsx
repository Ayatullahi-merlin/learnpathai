import React from 'react';
import { Award, Flame, Calendar, BookOpen, MessageSquare, AlertCircle, Sparkles, CheckCircle, TrendingUp, HelpCircle } from 'lucide-react';
import { UserProfile, StudentProgress, Badge } from '../types';

interface DashboardOverviewProps {
  profile: UserProfile | null;
  progress: StudentProgress | null;
  badges: Badge[];
  onNavigate: (tab: string) => void;
  onOpenSetup: () => void;
  subjectsPerformance: Record<string, number>;
}

export default function DashboardOverview({
  profile,
  progress,
  badges,
  onNavigate,
  onOpenSetup,
  subjectsPerformance
}: DashboardOverviewProps) {
  
  const selectedSubjects = profile?.subjects || ['Mathematics', 'English Language', 'Physics'];
  const targetExam = profile?.targetExam || 'WAEC';

  // Calculate percentage of subjects completed (mocked or with status)
  const streak = progress?.streak || 0;
  const completedHours = progress?.completedHours || 0;

  // Render static available syllabus lists for decoration & visual interest
  const syllabusPrepList = [
    { name: 'Mathematics', type: 'Core', code: 'MTH' },
    { name: 'English Language', type: 'Core', code: 'ENG' },
    { name: 'Physics', type: 'Elective', code: 'PHY' },
    { name: 'Chemistry', type: 'Elective', code: 'CHM' },
    { name: 'Biology', type: 'Elective', code: 'BIO' },
    { name: 'Government', type: 'Elective', code: 'GOV' }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 px-6 py-8 sm:px-10 sm:py-12 text-white shadow-xl">
        <div className="absolute top-0 right-0 h-40 w-40 translate-x-12 -translate-y-12 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl" />
        
        <div className="max-w-xl relative z-10 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-full text-xs font-semibold">
            <Sparkles className="h-3 w-3 animate-pulse" />
            <span>AI Learning Copilot Active</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-sans font-bold tracking-tight">
            Nnoo! Welcome to your {targetExam} Success Tracker.
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Diagnose your weaknesses with AI, compile a weekly study calendar, and talk with <b>Uncle Chidi</b> to ace all your exams on one single try!
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => onNavigate('diagnostic')}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-sm font-semibold rounded-xl transition-all duration-200 shadow-md shadow-emerald-500/20"
              id="dash-btn-diagnostic"
            >
              Start AI Diagnostic
            </button>
            <button
              onClick={() => onNavigate('planner')}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 text-sm font-semibold rounded-xl transition-all duration-200"
              id="dash-btn-schedule"
            >
              View Study Path
            </button>
            <button
              onClick={onOpenSetup}
              className="px-4 py-2.5 text-xs text-emerald-300 hover:text-white font-semibold flex items-center gap-1.5"
              id="dash-btn-settings"
            >
              Configure Target Subjects
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Streak Metric */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Streak Count</span>
            <p className="text-3xl font-bold text-slate-800">{streak} Days</p>
            <p className="text-xs text-amber-600 font-medium font-sans">Consistency is key!</p>
          </div>
          <div className="bg-amber-50 text-amber-500 p-3.5 rounded-xl border border-amber-100">
            <Flame className="h-6 w-6 fill-amber-500 text-amber-500" />
          </div>
        </div>

        {/* Study Hours Metric */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Completed Hours</span>
            <p className="text-3xl font-bold text-slate-800">{completedHours}h</p>
            <p className="text-xs text-blue-600 font-medium font-sans">Total intensive focus time</p>
          </div>
          <div className="bg-blue-50 text-blue-500 p-3.5 rounded-xl border border-blue-100">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        {/* Exam Focus */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Target Exam</span>
            <p className="text-3xl font-bold text-emerald-700">{targetExam}</p>
            <p className="text-xs text-slate-500 font-medium font-sans">Preparing {selectedSubjects.length} subjects</p>
          </div>
          <div className="bg-emerald-50 text-emerald-600 p-3.5 rounded-xl border border-emerald-100">
            <Award className="h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Grid: Selected Curriculum Subjects */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-bold text-lg text-slate-800 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-600" />
              <span>Target Subject Diagnostics</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">Syllabus-Aligned</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {selectedSubjects.map((sub) => {
              const score = subjectsPerformance[sub];
              const scoreText = score !== undefined ? `${score * 20}%` : 'Not run';
              const code = sub.substring(0, 3).toUpperCase();
              
              return (
                <div
                  key={sub}
                  className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div className="bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                      {code}
                    </div>
                    {score !== undefined ? (
                      <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-emerald-600" />
                        <span>Score: {score}/5</span>
                      </span>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-amber-500" />
                        <span>Baseline diagnostic pending</span>
                      </span>
                    )}
                  </div>

                  <div className="my-4">
                    <h4 className="font-sans font-bold text-sm text-slate-800">{sub}</h4>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                      Aligned with standard {targetExam} High School examinations.
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                    {score !== undefined ? (
                      <button
                        onClick={() => onNavigate('planner')}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                        id={`btn-plan-${sub}`}
                      >
                        <span>Build Exam Path</span>
                        <TrendingUp className="h-3 w-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => onNavigate('diagnostic')}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1"
                        id={`btn-diag-${sub}`}
                      >
                        <span>Take AI Assessment</span>
                        <Sparkles className="h-3 w-3" />
                      </button>
                    )}

                    <button
                      onClick={() => onNavigate('chat')}
                      className="text-xs font-medium text-slate-400 hover:text-slate-600 flex items-center gap-1"
                      id={`btn-chat-${sub}`}
                    >
                      <MessageSquare className="h-3 w-3" />
                      <span>Ask Uncle Chidi</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Grid: Achievement Badges & Honor Roll */}
        <div className="lg:col-span-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-sans font-bold text-lg text-slate-800 flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-600" />
              <span>Unlocked Badges ({badges.length})</span>
            </h3>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 space-y-4 shadow-sm">
            {badges.length === 0 ? (
              <div className="text-center py-6 px-4">
                <div className="inline-flex items-center justify-center p-3.5 bg-slate-50 rounded-2xl text-slate-400 border border-slate-100 mb-3">
                  <Award className="h-7 w-7 text-slate-300" />
                </div>
                <p className="font-sans font-bold text-sm text-slate-700">No achievements yet</p>
                <p className="text-xs text-slate-400 max-w-[200px] mx-auto mt-1 leading-relaxed">
                  Take dynamic quizzes and keep up daily streaks to unlock prestigious honors!
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {badges.map((badge) => (
                  <div
                    key={badge.id}
                    className="flex gap-3.5 items-center p-3 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-950 border border-emerald-100/30 rounded-xl"
                  >
                    <div className="bg-emerald-600 text-white p-2 text-base rounded-lg flex items-center justify-center font-bold">
                      {badge.icon}
                    </div>
                    <div>
                      <p className="font-sans font-bold text-xs text-slate-800">{badge.badgeName}</p>
                      <p className="text-[10px] text-slate-500 font-medium">{badge.description}</p>
                      <p className="text-[9px] text-emerald-700 font-mono mt-0.5">Unlocked {new Date(badge.unlockedAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
