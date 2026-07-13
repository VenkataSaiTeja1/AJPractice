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
    rate: 0
  });

  const fetchData = async (userProfile: any) => {
    try {
      setLoading(true);

      // Fetch Tasks
      const { data: dbTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('unit_number', { ascending: true })
        .order('title', { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(dbTasks || []);

      // Fetch Submissions for this student
      const { data: dbSubmissions, error: subError } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', userProfile.id);

      if (subError) throw subError;
      setSubmissions(dbSubmissions || []);

      // Compute statistics
      if (dbTasks && dbTasks.length > 0) {
        const total = dbTasks.length;
        
        // Find highest score submission per task
        const bestSubmissions: { [key: string]: any } = {};
        (dbSubmissions || []).forEach(sub => {
          if (!bestSubmissions[sub.task_id] || sub.status === 'passed') {
            bestSubmissions[sub.task_id] = sub;
          }
        });

        const completed = Object.values(bestSubmissions).filter((s: any) => s.status === 'passed').length;
        const failed = Object.values(bestSubmissions).filter((s: any) => s.status === 'failed').length;
        const rate = Math.round((completed / total) * 100);

        setStats({ total, completed, failed, rate });
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
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-rose-400" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-400" />;
      default:
        return <HelpCircle className="h-5 w-5 text-slate-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'passed':
        return <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">Passed</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400 border border-rose-500/20">Failed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400 border border-amber-500/20">Pending Review</span>;
      default:
        return <span className="inline-flex items-center gap-1 rounded bg-slate-800/80 px-2 py-0.5 text-xs font-medium text-slate-400">Unattempted</span>;
    }
  };

  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'quiz':
        return <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20"><HelpCircle className="h-3 w-3" /> Quiz</span>;
      case 'coding':
        return <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-400 border border-purple-500/20"><Code className="h-3 w-3" /> Code Sandbox</span>;
      case 'cloud_lab':
        return <span className="inline-flex items-center gap-1 rounded bg-pink-500/10 px-2.5 py-0.5 text-xs font-medium text-pink-400 border border-pink-500/20"><Server className="h-3 w-3" /> Cloud Lab</span>;
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
        <div className="text-center space-y-3">
          <RefreshCw className="h-10 w-10 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading student dashboard...</p>
        </div>
      </div>
    );
  }

  // Force first-time users to change password
  if (profile?.first_login) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/95 flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-card p-8 border border-indigo-500/20 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-24 -left-24 h-48 w-48 bg-indigo-500/10 blur-3xl rounded-full" />
          
          <div className="relative space-y-6">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 shadow">
                <Key className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Change Your Password</h2>
              <p className="text-xs text-slate-400 leading-normal mt-1 max-w-[280px]">
                This is your first login. For security reasons, you must update your password before proceeding.
              </p>
            </div>

            {passError && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-400">
                {passError}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 5 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Confirm Password</label>
                <input
                  type="password"
                  required
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={changingPassword}
                className="w-full flex items-center justify-center gap-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 py-2.5 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
              >
                {changingPassword ? 'Updating Password...' : 'Save & Continue'}
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Welcome message */}
        <div className="lg:col-span-2 glass-card p-6 border border-slate-800 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-2xl rounded-full" />
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              Welcome back, <span className="text-indigo-400">{profile?.full_name}</span>!
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed font-light">
              Master Java exercises scheduled by your faculty administrator. Verify outputs inside code environments.
            </p>
          </div>
          <div className="flex items-center gap-4 mt-6 text-xs text-slate-400">
            <div>Roll Number: <span className="text-white font-medium">{profile?.roll_number || 'N/A'}</span></div>
            <div className="h-3 w-px bg-slate-800" />
            <div>Overall Syllabus: <span className="text-indigo-400 font-medium">{stats.rate}%</span></div>
          </div>
        </div>

        {/* Stats card */}
        <div className="lg:col-span-2 grid grid-cols-3 gap-4">
          <div className="glass-card p-4 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Passed</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-extrabold text-emerald-400">{stats.completed}</span>
              <span className="text-xs text-slate-400">/ {stats.total}</span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-500/90 font-medium">
              <CheckCircle className="h-3.5 w-3.5" /> Checked
            </div>
          </div>

          <div className="glass-card p-4 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Failed</span>
            <div className="mt-2">
              <span className="text-3xl font-extrabold text-rose-400">{stats.failed}</span>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-rose-500/90 font-medium">
              <XCircle className="h-3.5 w-3.5" /> Re-runs allowed
            </div>
          </div>

          <div className="glass-card p-4 border border-slate-800 flex flex-col justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Completion</span>
            <div className="flex items-baseline gap-1 mt-2">
              <span className="text-3xl font-extrabold text-indigo-400">{stats.rate}%</span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-1.5 mt-4 overflow-hidden border border-slate-800">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-1.5 rounded-full" 
                style={{ width: `${stats.rate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* TODAY'S MANDATORY SCHEDULED TASKS */}
      <div className="glass-card p-6 border border-indigo-500/20 relative overflow-hidden shadow-xl bg-indigo-950/5">
        <div className="absolute top-0 right-0 h-32 w-32 bg-indigo-500/5 blur-3xl rounded-full" />
        
        <div className="flex items-center gap-2 mb-4">
          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Today&apos;s Mandatory Tasks</h3>
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
                  className={`p-5 rounded-lg border transition-all flex flex-col justify-between gap-4 cursor-pointer hover:scale-[1.01] ${
                    isPassed 
                      ? 'border-emerald-500/20 bg-emerald-950/5 hover:border-emerald-500/40' 
                      : 'border-indigo-500/20 bg-slate-950/65 hover:border-indigo-500/40'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      {getTaskTypeBadge(task.type)}
                      {getStatusBadge(status)}
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-white mt-1 leading-snug">{task.title}</h4>
                    <p className="text-xs text-slate-400 font-light leading-normal line-clamp-2">{task.description}</p>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-900 pt-3 mt-1 text-[10px]">
                    <span className="text-slate-500">Scheduled Until: <strong className="text-indigo-400 font-medium">{endFormatted}</strong></span>
                    <span className={`font-semibold uppercase tracking-wider ${isPassed ? 'text-emerald-400' : 'text-indigo-400'}`}>
                      {isPassed ? 'Completed' : 'Practice Now ➔'}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-500 space-y-1.5 font-light">
            <CheckCircle className="h-8 w-8 text-indigo-500/40 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">All Scheduled Tasks Cleared</p>
            <p className="text-xs max-w-sm mx-auto">There are no scheduled mandatory exercises active today. You can select standard topics from the syllabus below.</p>
          </div>
        )}
      </div>

      {/* SYLLABUS UNITS */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-400" /> Advanced Java Syllabus Units
        </h3>

        {units.map((unitNum) => {
          const unitTasks = tasks.filter(t => t.unit_number === unitNum);
          
          if (unitTasks.length === 0) return null;

          return (
            <div key={unitNum} className="glass-card border border-slate-800 overflow-hidden shadow-lg">
              <div className="bg-slate-900/40 border-b border-slate-800 px-6 py-4">
                <h4 className="text-sm font-bold text-white tracking-wide uppercase">
                  {getUnitName(unitNum)}
                </h4>
              </div>

              <div className="divide-y divide-slate-800/80">
                {unitTasks.map((task) => {
                  const status = getTaskStatus(task.id);
                  return (
                    <Link 
                      key={task.id}
                      href={`/practice/${task.id}`}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-slate-900/20 transition-all group gap-4 cursor-pointer"
                    >
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-white font-semibold text-base group-hover:text-indigo-400 transition-colors">
                            {task.title}
                          </span>
                          {getTaskTypeBadge(task.type)}
                        </div>
                        <p className="text-xs text-slate-400 font-light leading-relaxed">
                          {task.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(status)}
                          {getStatusBadge(status)}
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
