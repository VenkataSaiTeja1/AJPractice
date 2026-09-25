'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase, getCurrentSession, updateLocalSession } from '@/lib/supabase';
import { 
  Award, CheckCircle, Clock, XCircle, Code, HelpCircle, Server, 
  BookOpen, ChevronRight, BarChart3, Star, RefreshCw, Key, ShieldAlert 
} from 'lucide-react';

const units = [1, 2, 3, 4, 5];

export default function StudentDashboard() {
  const router = useRouter();
  
  // Auth state
  const [profile, setProfile] = useState<any>(null);
  
  // First login password reset states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [passError, setPassError] = useState('');

  // App data states
  const [tasks, setTasks] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    rate: 0,
    quizScore: 0,
    codingScore: 0
  });

  const fetchData = async (userProfile: any) => {
    try {
      setLoading(true);

      // Fetch fresh profile from database to get latest quiz and program grades
      const { data: dbProfile, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userProfile.id)
        .single();
      
      if (!profileErr && dbProfile) {
        setProfile(dbProfile);
      }

      // Fetch Tasks
      const { data: dbTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('unit_number', { ascending: true })
        .order('title', { ascending: true });

      if (tasksError) throw tasksError;

      // Filter tasks by the student's Year of Study and Section (if 2nd Year)
      const studentYear = userProfile.year || 3;
      const yearTasks = (dbTasks || []).filter(t => {
        if (t.year !== studentYear) return false;
        if (studentYear === 2) {
          const studentSection = userProfile.section || 'A';
          return t.section === studentSection || t.section === 'All' || !t.section;
        }
        return true;
      });
      setTasks(yearTasks);

      // Fetch Submissions for this student (excluding runs)
      const { data: dbSubmissions, error: subError } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', userProfile.id)
        .eq('is_run', false);

      if (subError) throw subError;
      setSubmissions(dbSubmissions || []);

      // Compute statistics for the filtered year tasks
      if (yearTasks.length > 0) {
        const total = yearTasks.length;
        const activeTaskIds = yearTasks.map(t => t.id);
        const filteredSubs = (dbSubmissions || []).filter(s => activeTaskIds.includes(s.task_id));
        
        // Find highest score submission per task
        const bestSubmissions: { [key: string]: any } = {};
        filteredSubs.forEach(sub => {
          if (!bestSubmissions[sub.task_id] || sub.status === 'passed') {
            bestSubmissions[sub.task_id] = sub;
          }
        });

        const completed = Object.values(bestSubmissions).filter((s: any) => s.status === 'passed').length;
        const failed = Object.values(bestSubmissions).filter((s: any) => s.status === 'failed').length;
        const rate = Math.round((completed / total) * 100);

        const now = new Date();

        // Calculate Quiz Score
        const scheduledQuizzes = yearTasks.filter(t => {
          if (t.type !== 'quiz') return false;
          return !t.start_time || new Date(t.start_time) <= now;
        });
        const attemptedQuizzes = scheduledQuizzes.filter(t => !!bestSubmissions[t.id]);
        const attemptedQuizCount = attemptedQuizzes.length;
        const missedQuizCount = scheduledQuizzes.length - attemptedQuizCount;

        let calculatedQuizScore = 0;
        if (attemptedQuizCount > 0) {
          const totalQuizScoreSum = attemptedQuizzes.reduce((sum, t) => sum + (bestSubmissions[t.id].score || 0), 0);
          const averageQuizPercent = totalQuizScoreSum / attemptedQuizCount;
          calculatedQuizScore = Math.max(0, (averageQuizPercent / 10) - missedQuizCount);
        }

        // Calculate Coding Score
        const scheduledCoding = yearTasks.filter(t => {
          if (t.type !== 'coding') return false;
          return !t.start_time || new Date(t.start_time) <= now;
        });
        const attemptedCoding = scheduledCoding.filter(t => !!bestSubmissions[t.id]);
        const attemptedCodingCount = attemptedCoding.length;

        let calculatedCodingScore = 0;
        if (attemptedCodingCount > 0) {
          const totalCodingScoreSum = attemptedCoding.reduce((sum, t) => sum + (bestSubmissions[t.id].score || 0), 0);
          const averageCodingPercent = totalCodingScoreSum / attemptedCodingCount;
          calculatedCodingScore = averageCodingPercent / 10;
        }

        // Merge with database profile score (handles wiped tasks)
        const finalQuizScore = Math.max(Number(dbProfile?.overall_quiz_score || 0), calculatedQuizScore);
        const finalCodingScore = Math.max(Number(dbProfile?.overall_coding_score || 0), calculatedCodingScore);

        setStats({ 
          total, 
          completed, 
          failed, 
          rate,
          quizScore: finalQuizScore,
          codingScore: finalCodingScore
        });
      } else {
        setStats({ 
          total: 0, 
          completed: 0, 
          failed: 0, 
          rate: 0,
          quizScore: Number(dbProfile?.overall_quiz_score || 0),
          codingScore: Number(dbProfile?.overall_coding_score || 0)
        });
      }

    } catch (err: any) {
      console.error('Error fetching dashboard data:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const session = getCurrentSession();
    if (!session) {
      router.push('/login');
      return;
    }

    if (session.role === 'faculty') {
      router.push('/admin');
      return;
    }

    setProfile(session);
    fetchData(session);
  }, [router]);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (newPassword.length < 5) {
      setPassError('Password must be at least 5 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassError('Passwords do not match.');
      return;
    }

    setChangingPassword(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          password: newPassword,
          first_login: false
        })
        .eq('id', profile.id);

      if (error) throw error;

      const updatedProfile = { ...profile, first_login: false, password: newPassword };
      updateLocalSession(updatedProfile);
      setProfile(updatedProfile);
    } catch (err: any) {
      setPassError(err.message || 'Failed to update password.');
    } finally {
      setChangingPassword(false);
    }
  };

  const getTaskStatus = (taskId: string) => {
    const taskSubs = submissions.filter(s => s.task_id === taskId);
    if (taskSubs.length === 0) return 'unattempted';
    
    if (taskSubs.some(s => s.status === 'passed')) return 'passed';
    if (taskSubs.some(s => s.status === 'pending')) return 'pending';
    return 'failed';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-rose-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <HelpCircle className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">Passed</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 border border-rose-200">Failed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">Pending Review</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 border border-slate-200">Unattempted</span>;
    }
  };

  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'quiz':
        return <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 border border-indigo-200"><HelpCircle className="h-3 w-3" /> Quiz</span>;
      case 'coding':
        return <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700 border border-violet-200"><Code className="h-3 w-3" /> Code Sandbox</span>;
      case 'cloud_lab':
        return <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-2.5 py-0.5 text-xs font-semibold text-pink-700 border border-pink-200"><Server className="h-3 w-3" /> Cloud Lab</span>;
      default:
        return null;
    }
  };

  const getUnitName = (num: number) => {
    switch (num) {
      case 1: return 'Unit I: JDBC and Database Connectivity';
      case 2: return 'Unit II: J2EE Servlets & HTTP Protocol';
      case 3: return 'Unit III: JSP, Directives & Scripting Elements';
      case 4: return 'Unit IV: JSTL & MVC Architecture';
      case 5: return 'Unit V: Spring Framework Core & Aspect Oriented Programming (AOP)';
      default: return `Unit ${num}`;
    }
  };

  // Filter for active scheduled mandatory tasks (start_time <= now <= end_time)
  const getActiveMandatoryTasks = () => {
    const now = new Date();
    return tasks.filter(t => {
      if (!t.start_time || !t.end_time) return false;
      const start = new Date(t.start_time);
      const end = new Date(t.end_time);
      return now >= start && now <= end;
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-[75vh]">
        <div className="text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto">
            <RefreshCw className="h-7 w-7 text-indigo-500 animate-spin" />
          </div>
          <p className="text-sm text-slate-500 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Force first-time users to change password
  if (profile?.first_login) {
    return (
      <div className="fixed inset-0 z-50 bg-white/95 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 border border-slate-200 shadow-xl shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute -top-24 -left-24 h-48 w-48 bg-indigo-100/60 blur-3xl rounded-full" />
          <div className="absolute -bottom-20 -right-20 h-40 w-40 bg-violet-100/50 blur-3xl rounded-full" />
          
          <div className="relative space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                <Key className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Change Your Password</h2>
              <p className="text-sm text-slate-500 leading-relaxed mt-2 max-w-[300px]">
                This is your first login. For security reasons, you must update your password before proceeding.
              </p>
            </div>

            {passError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{passError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 5 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 py-3 text-sm font-bold text-white transition-all shadow-lg shadow-indigo-500/25 cursor-pointer active:scale-[0.98]"
              >
                {changingPassword ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Updating Password...
                  </>
                ) : (
                  'Save & Continue'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const activeMandatory = getActiveMandatoryTasks();

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Student Welcome & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Welcome message */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-50 blur-2xl rounded-full opacity-80" />
          <div className="absolute bottom-0 left-0 h-28 w-28 bg-violet-50 blur-2xl rounded-full opacity-60" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Online</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Welcome back, <span className="text-indigo-600">{profile?.full_name}</span>!
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Master Java exercises scheduled by your faculty administrator. Verify outputs inside code environments.
            </p>
          </div>
          <div className="relative flex items-center gap-4 mt-6 text-xs text-slate-500 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-slate-400" />
              Roll Number: <span className="text-slate-800 font-semibold">{profile?.roll_number || 'N/A'}</span>
            </div>
            <div className="h-3.5 w-px bg-slate-200" />
            <div className="text-slate-400">Java Practice Portal</div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Passed */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Passed</span>
              <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5 mt-3">
              <span className="text-3xl font-extrabold text-emerald-600">{stats.completed}</span>
              <span className="text-sm text-slate-400 font-medium">/ {stats.total}</span>
            </div>
            <div className="mt-2.5 text-[11px] text-emerald-600/80 font-medium">
              Tasks cleared
            </div>
          </div>

          {/* Failed */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Failed</span>
              <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center">
                <XCircle className="h-4 w-4 text-rose-500" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-extrabold text-rose-600">{stats.failed}</span>
            </div>
            <div className="mt-2.5 text-[11px] text-rose-600/80 font-medium">
              Re-runs allowed
            </div>
          </div>

          {/* Completion */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Completion</span>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-0.5 mt-3">
              <span className="text-3xl font-extrabold text-indigo-600">{stats.rate}</span>
              <span className="text-lg font-bold text-indigo-400">%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-violet-500 h-1.5 rounded-full transition-all duration-700" 
                style={{ width: `${stats.rate}%` }}
              />
            </div>
          </div>

          {/* Quiz Grade */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quiz Grade</span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Award className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-3xl font-extrabold text-amber-600">{stats.quizScore.toFixed(1)}</span>
              <span className="text-sm text-slate-400 font-medium">/ 10</span>
            </div>
            <div className="mt-2.5 text-[11px] text-amber-600/80 font-semibold uppercase tracking-wide">
              Avg − Penalty
            </div>
          </div>

          {/* Coding Grade */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Coding Grade</span>
              <div className="h-8 w-8 rounded-lg bg-teal-50 flex items-center justify-center">
                <Code className="h-4 w-4 text-teal-500" />
              </div>
            </div>
            <div className="flex items-baseline gap-1 mt-3">
              <span className="text-3xl font-extrabold text-teal-600">{stats.codingScore.toFixed(1)}</span>
              <span className="text-sm text-slate-400 font-medium">/ 10</span>
            </div>
            <div className="mt-2.5 text-[11px] text-teal-600/80 font-semibold uppercase tracking-wide">
              Program Avg
            </div>
          </div>
        </div>
      </div>

      {/* TODAY'S MANDATORY SCHEDULED TASKS */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 h-40 w-40 bg-indigo-50/50 blur-3xl rounded-full" />
        
        <div className="relative flex items-center gap-3 mb-5">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 flex items-center justify-center">
            <Star className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Today&apos;s Mandatory Tasks</h3>
            <p className="text-xs text-slate-500">Active scheduled exercises you need to complete</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-xs font-semibold text-indigo-600">{activeMandatory.length} Active</span>
          </div>
        </div>

        {activeMandatory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeMandatory.map(task => {
              const status = getTaskStatus(task.id);
              const isPassed = status === 'passed';
              const endFormatted = new Date(task.end_time).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });

              return (
                <Link
                  key={task.id}
                  href={`/practice/${task.id}`}
                  className={`group p-5 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-4 cursor-pointer hover:scale-[1.01] hover:shadow-lg ${
                    isPassed 
                      ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50 hover:shadow-emerald-100/50' 
                      : 'border-slate-200 bg-slate-50/30 hover:bg-white hover:shadow-slate-200/50'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      {getTaskTypeBadge(task.type)}
                      {getStatusBadge(status)}
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 mt-1 leading-snug group-hover:text-indigo-700 transition-colors">{task.title}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{task.description}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1 text-[11px]">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Until: <strong className="text-slate-700 font-semibold">{endFormatted}</strong>
                    </span>
                    <span className={`font-bold uppercase tracking-wider text-xs flex items-center gap-1 ${isPassed ? 'text-emerald-600' : 'text-indigo-600 group-hover:gap-2 transition-all'}`}>
                      {isPassed ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5" />
                          Completed
                        </>
                      ) : (
                        <>
                          Practice Now
                          <ChevronRight className="h-3.5 w-3.5" />
                        </>
                      )}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto">
              <CheckCircle className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">All Scheduled Tasks Cleared</p>
            <p className="text-xs max-w-sm mx-auto text-slate-500 leading-relaxed">There are no scheduled mandatory exercises active at the moment. Please check back later when your faculty schedules a task.</p>
          </div>
        )}
      </div>
    </div>
  );
}
